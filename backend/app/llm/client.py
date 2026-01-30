"""
LLM 客户端封装
基于 OpenAI SDK 调用阿里云百炼 API
"""
import json
import asyncio
from typing import List, Dict, Any, Optional, AsyncGenerator, Union, Callable, Awaitable
from openai import AsyncOpenAI, APIError, RateLimitError, APIConnectionError
from .config import llm_config_manager


# Chunk 回调类型
ChunkCallback = Callable[[str, str], Awaitable[None]]  # (chunk_content, chunk_type) -> None

# 重试配置
MAX_RETRIES = 3
RETRY_DELAY = 1.0  # 初始重试延迟（秒）
RETRY_MULTIPLIER = 2.0  # 重试延迟倍增因子


class LLMClient:
    """LLM 客户端 - 封装阿里云百炼 API 调用"""
    
    _instance: Optional["LLMClient"] = None
    
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
    
    def _get_client(self) -> AsyncOpenAI:
        """获取或创建 OpenAI 客户端"""
        client_config = llm_config_manager.get_llm_client_config()
        
        if not client_config["api_key"]:
            raise ValueError("API Key 未配置，请先设置 API Key")
        
        # 每次都重新创建客户端以确保使用最新配置
        self._client = AsyncOpenAI(
            api_key=client_config["api_key"],
            base_url=client_config["base_url"],
        )
        return self._client
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        agent_name: str = "default",
        tools: Optional[List[Dict]] = None,
        tool_choice: Optional[Union[str, Dict]] = None,
        stream: bool = False,
        chunk_callback: Optional[ChunkCallback] = None,
    ) -> Union[Dict[str, Any], AsyncGenerator[str, None]]:
        """
        发送聊天请求
        
        Args:
            messages: 消息列表，格式 [{"role": "user", "content": "..."}]
            agent_name: Agent 名称，用于获取对应配置
            tools: 工具定义列表
            stream: 是否流式返回
            chunk_callback: 流式接收时的回调函数
        
        Returns:
            如果 stream=False，返回完整响应
            如果 stream=True，返回异步生成器
        """
        client = self._get_client()
        agent_config = llm_config_manager.get_agent_config(agent_name)
        
        # 如果有 chunk_callback，使用流式接收（但仍返回完整结果）
        use_streaming = stream or (chunk_callback is not None)
        
        request_params = {
            "model": agent_config["model"],
            "messages": messages,
            "max_tokens": agent_config["max_tokens"],
            "temperature": agent_config["temperature"],
            "top_p": agent_config["top_p"],
            "stream": use_streaming,
        }
        
        # 添加工具
        if tools:
            request_params["tools"] = tools
            # 如果指定了 tool_choice，添加到请求参数
            if tool_choice:
                request_params["tool_choice"] = tool_choice
        
        # 处理思考模式（qwen3 特有参数）
        if agent_config.get("enable_thinking"):
            request_params["extra_body"] = {
                "enable_thinking": True
            }
        
        if stream:
            return self._stream_chat(client, request_params)
        elif chunk_callback:
            return await self._streaming_complete_chat(client, request_params, chunk_callback)
        else:
            return await self._complete_chat(client, request_params)
    
    async def _complete_chat(
        self, 
        client: AsyncOpenAI, 
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """非流式聊天（带重试机制）"""
        print(f"\n[LLM] 发送请求: model={params.get('model')}, messages={len(params.get('messages', []))}")
        
        last_error = None
        for attempt in range(MAX_RETRIES):
            try:
                response = await client.chat.completions.create(**params)
                break
            except (APIError, RateLimitError, APIConnectionError) as e:
                last_error = e
                delay = RETRY_DELAY * (RETRY_MULTIPLIER ** attempt)
                print(f"[LLM] 请求失败 (尝试 {attempt + 1}/{MAX_RETRIES}): {e}")
                
                if attempt < MAX_RETRIES - 1:
                    print(f"[LLM] 等待 {delay:.1f}s 后重试...")
                    await asyncio.sleep(delay)
                else:
                    print(f"[LLM] 重试次数已用尽，抛出异常")
                    raise
            except Exception as e:
                print(f"[LLM] 请求异常（不重试）: {e}")
                raise
        
        message = response.choices[0].message
        result = {
            "content": message.content,
            "role": message.role,
            "tool_calls": None,
            "thinking": None,
            "usage": {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens,
            } if response.usage else None
        }
        
        # 处理工具调用
        if message.tool_calls:
            result["tool_calls"] = [
                {
                    "id": tc.id,
                    "type": tc.type,
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments,
                    }
                }
                for tc in message.tool_calls
            ]
        
        # 日志输出
        usage_str = f"tokens={result['usage']['total_tokens']}" if result['usage'] else "no_usage"
        content_preview = (result['content'][:80] + '...') if result['content'] else 'None'
        tool_info = ""
        if result['tool_calls']:
            tool_names = [tc['function']['name'] for tc in result['tool_calls']]
            tool_info = f", tools={tool_names}"
        print(f"[LLM] 响应: {usage_str}, content={content_preview}{tool_info}")
        
        return result
    
    async def _streaming_complete_chat(
        self,
        client: AsyncOpenAI,
        params: Dict[str, Any],
        chunk_callback: ChunkCallback,
    ) -> Dict[str, Any]:
        """使用流式接收，但返回完整结果"""
        print(f"\n[LLM] 发送请求(流式): model={params.get('model')}, messages={len(params.get('messages', []))}")
        
        last_error = None
        for attempt in range(MAX_RETRIES):
            try:
                response = await client.chat.completions.create(**params)
                break
            except (APIError, RateLimitError, APIConnectionError) as e:
                last_error = e
                delay = RETRY_DELAY * (RETRY_MULTIPLIER ** attempt)
                print(f"[LLM] 请求失败 (尝试 {attempt + 1}/{MAX_RETRIES}): {e}")
                if attempt < MAX_RETRIES - 1:
                    print(f"[LLM] 等待 {delay:.1f}s 后重试...")
                    await asyncio.sleep(delay)
                else:
                    raise
            except Exception as e:
                print(f"[LLM] 请求异常（不重试）: {e}")
                raise
        
        # 聚合结果
        content_parts = []
        thinking_parts = []
        tool_calls_data = {}
        
        async for chunk in response:
            if not chunk.choices:
                continue
            
            delta = chunk.choices[0].delta
            
            # 处理思考内容
            reasoning_content = None
            if hasattr(delta, 'model_extra') and delta.model_extra:
                reasoning_content = delta.model_extra.get('reasoning_content')
            if not reasoning_content and hasattr(delta, 'reasoning_content'):
                reasoning_content = getattr(delta, 'reasoning_content', None)
            
            if reasoning_content:
                thinking_parts.append(reasoning_content)
                try:
                    await chunk_callback(reasoning_content, "thinking")
                except Exception as e:
                    print(f"[LLM] chunk_callback 错误: {e}")
            
            # 处理正常内容
            if delta.content:
                content_parts.append(delta.content)
                try:
                    await chunk_callback(delta.content, "content")
                except Exception as e:
                    print(f"[LLM] chunk_callback 错误: {e}")
            
            # 处理工具调用
            if delta.tool_calls:
                for tc in delta.tool_calls:
                    tc_index = tc.index
                    if tc_index is not None:
                        if tc_index not in tool_calls_data:
                            tool_calls_data[tc_index] = {
                                "id": tc.id or f"call_{tc_index}",
                                "type": tc.type or "function",
                                "function": {
                                    "name": "",
                                    "arguments": "",
                                }
                            }
                        if tc.id:
                            tool_calls_data[tc_index]["id"] = tc.id
                        if tc.type:
                            tool_calls_data[tc_index]["type"] = tc.type
                        if tc.function:
                            if tc.function.name:
                                tool_calls_data[tc_index]["function"]["name"] = tc.function.name
                            if tc.function.arguments:
                                tool_calls_data[tc_index]["function"]["arguments"] += tc.function.arguments
        
        result = {
            "content": "".join(content_parts) if content_parts else None,
            "role": "assistant",
            "tool_calls": list(tool_calls_data.values()) if tool_calls_data else None,
            "thinking": "".join(thinking_parts) if thinking_parts else None,
            "usage": None,
        }
        
        content_preview = (result['content'][:80] + '...') if result['content'] else 'None'
        tool_info = ""
        if result['tool_calls']:
            tool_names = [tc['function']['name'] for tc in result['tool_calls']]
            tool_info = f", tools={tool_names}"
        print(f"[LLM] 响应(流式完成): content={content_preview}{tool_info}")
        
        return result
    
    async def _stream_chat(
        self, 
        client: AsyncOpenAI, 
        params: Dict[str, Any]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """流式聊天"""
        response = await client.chat.completions.create(**params)
        
        async for chunk in response:
            if not chunk.choices:
                continue
            
            delta = chunk.choices[0].delta
            
            # 获取思考内容
            reasoning_content = None
            if hasattr(delta, 'model_extra') and delta.model_extra:
                reasoning_content = delta.model_extra.get('reasoning_content')
            if not reasoning_content and hasattr(delta, 'reasoning_content'):
                reasoning_content = getattr(delta, 'reasoning_content', None)
            
            if reasoning_content and len(reasoning_content) > 0:
                yield {"type": "thinking", "content": reasoning_content}
            
            if delta.content:
                yield {"type": "content", "content": delta.content}
    
    async def test_connection(self) -> Dict[str, Any]:
        """测试 API 连接"""
        try:
            result = await self.chat(
                messages=[{"role": "user", "content": "你好，请用一句话介绍自己。"}],
                agent_name="default",
                stream=False,
            )
            return {
                "success": True,
                "message": "连接成功",
                "response": result["content"][:100] if result["content"] else "",
                "usage": result["usage"],
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"连接失败: {str(e)}",
                "response": None,
                "usage": None,
            }


# 全局 LLM 客户端实例
llm_client = LLMClient()
