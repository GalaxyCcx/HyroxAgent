"""
VL (Vision-Language) 客户端封装
基于 OpenAI SDK 调用阿里云 VL API (qwen-vl-plus)
"""
import base64
import asyncio
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Union
from openai import AsyncOpenAI, APIError, RateLimitError, APIConnectionError

logger = logging.getLogger(__name__)

# VL 专用配置
VL_MODEL = "qwen3-vl-plus"  # 使用 qwen3 VL 模型
VL_API_KEY = "sk-00e62c79a61045d6b204ecbe94146c74"
VL_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"

# 重试配置
MAX_RETRIES = 3
RETRY_DELAY = 1.0
RETRY_MULTIPLIER = 2.0


class VLClient:
    """
    VL (Vision-Language) 客户端
    专用于处理图像分析任务，如心率图提取、运动数据分析等
    """
    
    _instance: Optional["VLClient"] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._client: Optional[AsyncOpenAI] = None
        logger.info("[VLClient] 初始化 VL 客户端")
    
    def _get_client(self) -> AsyncOpenAI:
        """获取或创建 OpenAI 客户端"""
        if self._client is None:
            self._client = AsyncOpenAI(
                api_key=VL_API_KEY,
                base_url=VL_BASE_URL,
            )
        return self._client
    
    @staticmethod
    def encode_image_to_base64(image_path: Union[str, Path]) -> str:
        """
        将本地图片文件编码为 base64 字符串
        
        Args:
            image_path: 图片文件路径
            
        Returns:
            base64 编码的字符串
        """
        path = Path(image_path)
        if not path.exists():
            raise FileNotFoundError(f"图片文件不存在: {image_path}")
        
        with open(path, "rb") as f:
            image_data = f.read()
        
        return base64.b64encode(image_data).decode("utf-8")
    
    @staticmethod
    def get_image_media_type(image_path: Union[str, Path]) -> str:
        """
        根据文件扩展名获取媒体类型
        
        Args:
            image_path: 图片文件路径
            
        Returns:
            媒体类型字符串 (如 "image/png")
        """
        path = Path(image_path)
        suffix = path.suffix.lower()
        
        media_types = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".bmp": "image/bmp",
        }
        
        return media_types.get(suffix, "image/png")
    
    def _build_image_content(
        self,
        image_source: str,
        is_base64: bool = False,
        media_type: str = "image/png"
    ) -> Dict[str, Any]:
        """
        构建图片内容块
        
        Args:
            image_source: 图片 URL 或 base64 字符串
            is_base64: 是否为 base64 编码
            media_type: 媒体类型
            
        Returns:
            图片内容字典
        """
        if is_base64:
            return {
                "type": "image_url",
                "image_url": {
                    "url": f"data:{media_type};base64,{image_source}"
                }
            }
        else:
            return {
                "type": "image_url",
                "image_url": {
                    "url": image_source
                }
            }
    
    async def analyze_image(
        self,
        prompt: str,
        image_path: Optional[Union[str, Path]] = None,
        image_url: Optional[str] = None,
        image_base64: Optional[str] = None,
        media_type: str = "image/png",
        max_tokens: int = 4096,
        temperature: float = 0.3,
    ) -> Dict[str, Any]:
        """
        分析单张图片
        
        Args:
            prompt: 分析提示词
            image_path: 本地图片路径 (三选一)
            image_url: 图片 URL (三选一)
            image_base64: base64 编码的图片 (三选一)
            media_type: 图片媒体类型
            max_tokens: 最大输出 token 数
            temperature: 温度参数
            
        Returns:
            分析结果字典，包含 content, usage 等
        """
        # 确定图片来源
        if image_path:
            path = Path(image_path)
            image_source = self.encode_image_to_base64(path)
            media_type = self.get_image_media_type(path)
            is_base64 = True
        elif image_url:
            image_source = image_url
            is_base64 = False
        elif image_base64:
            image_source = image_base64
            is_base64 = True
        else:
            raise ValueError("必须提供 image_path、image_url 或 image_base64 其中之一")
        
        # 构建消息内容
        content = [
            {"type": "text", "text": prompt},
            self._build_image_content(image_source, is_base64, media_type)
        ]
        
        messages = [{"role": "user", "content": content}]
        
        return await self._send_request(messages, max_tokens, temperature)
    
    async def analyze_multiple_images(
        self,
        prompt: str,
        images: List[Dict[str, Any]],
        max_tokens: int = 4096,
        temperature: float = 0.3,
    ) -> Dict[str, Any]:
        """
        分析多张图片
        
        Args:
            prompt: 分析提示词
            images: 图片列表，每个元素可包含:
                - path: 本地文件路径
                - url: 图片 URL
                - base64: base64 编码
                - media_type: 媒体类型 (可选)
            max_tokens: 最大输出 token 数
            temperature: 温度参数
            
        Returns:
            分析结果字典
        """
        content = [{"type": "text", "text": prompt}]
        
        for img in images:
            if "path" in img:
                path = Path(img["path"])
                image_source = self.encode_image_to_base64(path)
                media_type = img.get("media_type", self.get_image_media_type(path))
                content.append(self._build_image_content(image_source, True, media_type))
            elif "url" in img:
                content.append(self._build_image_content(img["url"], False))
            elif "base64" in img:
                media_type = img.get("media_type", "image/png")
                content.append(self._build_image_content(img["base64"], True, media_type))
        
        messages = [{"role": "user", "content": content}]
        
        return await self._send_request(messages, max_tokens, temperature)
    
    async def chat_with_images(
        self,
        messages: List[Dict[str, Any]],
        max_tokens: int = 4096,
        temperature: float = 0.3,
    ) -> Dict[str, Any]:
        """
        多轮对话（支持图片）
        
        Args:
            messages: 消息列表，支持带图片的 content
            max_tokens: 最大输出 token 数
            temperature: 温度参数
            
        Returns:
            响应结果字典
        """
        return await self._send_request(messages, max_tokens, temperature)
    
    async def _send_request(
        self,
        messages: List[Dict[str, Any]],
        max_tokens: int,
        temperature: float,
    ) -> Dict[str, Any]:
        """
        发送请求到 VL API（带重试机制）
        
        Args:
            messages: 消息列表
            max_tokens: 最大输出 token 数
            temperature: 温度参数
            
        Returns:
            响应结果字典
        """
        client = self._get_client()
        
        request_params = {
            "model": VL_MODEL,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        
        logger.info(f"[VLClient] 发送请求: model={VL_MODEL}, messages_count={len(messages)}")
        
        last_error = None
        for attempt in range(MAX_RETRIES):
            try:
                response = await client.chat.completions.create(**request_params)
                break
            except (APIError, RateLimitError, APIConnectionError) as e:
                last_error = e
                delay = RETRY_DELAY * (RETRY_MULTIPLIER ** attempt)
                logger.warning(f"[VLClient] 请求失败 (尝试 {attempt + 1}/{MAX_RETRIES}): {e}")
                
                if attempt < MAX_RETRIES - 1:
                    logger.info(f"[VLClient] 等待 {delay:.1f}s 后重试...")
                    await asyncio.sleep(delay)
                else:
                    logger.error("[VLClient] 重试次数已用尽")
                    raise
            except Exception as e:
                logger.error(f"[VLClient] 请求异常（不重试）: {e}")
                raise
        
        message = response.choices[0].message
        result = {
            "content": message.content,
            "role": message.role,
            "usage": {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens,
            } if response.usage else None
        }
        
        # 日志输出
        usage_str = f"tokens={result['usage']['total_tokens']}" if result['usage'] else "no_usage"
        content_preview = (result['content'][:100] + '...') if result['content'] and len(result['content']) > 100 else result['content']
        logger.info(f"[VLClient] 响应: {usage_str}, content={content_preview}")
        
        return result
    
    async def test_connection(self) -> Dict[str, Any]:
        """测试 VL API 连接"""
        try:
            # 使用简单的文本请求测试连接
            client = self._get_client()
            response = await client.chat.completions.create(
                model=VL_MODEL,
                messages=[{"role": "user", "content": "你好，请用一句话介绍 HYROX 比赛。"}],
                max_tokens=100,
            )
            
            return {
                "success": True,
                "message": "VL API 连接成功",
                "model": VL_MODEL,
                "response": response.choices[0].message.content[:100] if response.choices else "",
            }
        except Exception as e:
            logger.error(f"[VLClient] 连接测试失败: {e}")
            return {
                "success": False,
                "message": f"VL API 连接失败: {str(e)}",
                "model": VL_MODEL,
                "response": None,
            }


# 全局 VL 客户端实例
vl_client = VLClient()
