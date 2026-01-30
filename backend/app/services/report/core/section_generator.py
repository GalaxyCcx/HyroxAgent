"""
SectionGenerator - 章节生成器

通过 One Call Function Call 调用 LLM 生成章节内容：
- 加载 tools.json 和 prompt.md
- 构建 messages（system + user）
- 调用 LLM（带 tools 和 tool_choice）
- 返回结构化输出
"""

import json
import logging
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Callable

from .config_loader import ConfigLoader, SectionConfig, ModelConfig, get_config_loader
from .input_builder import SectionInput

logger = logging.getLogger(__name__)


@dataclass
class SectionOutput:
    """章节输出"""
    section_id: str
    title: str
    success: bool = True
    function_name: Optional[str] = None
    arguments: Dict[str, Any] = field(default_factory=dict)
    raw_response: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    
    def get_blocks(self) -> List[Dict[str, Any]]:
        """获取 blocks（由 FunctionExecutor 填充）"""
        return self.arguments.get("_blocks", [])


class SectionGenerator:
    """章节生成器"""
    
    def __init__(
        self, 
        config_loader: ConfigLoader,
        llm_client: Any,  # LLMClient 实例
    ):
        """
        初始化 SectionGenerator
        
        Args:
            config_loader: 配置加载器
            llm_client: LLM 客户端
        """
        self.config_loader = config_loader
        self.llm_client = llm_client
    
    async def generate_section(
        self, 
        section_id: str, 
        section_input: SectionInput,
        progress_callback: Optional[Callable[[str], None]] = None,
    ) -> SectionOutput:
        """
        生成章节内容
        
        Args:
            section_id: 章节 ID
            section_input: 章节输入数据
            progress_callback: 进度回调函数
            
        Returns:
            章节输出
        """
        section_config = self.config_loader.get_section_config(section_id)
        if not section_config:
            logger.error(f"[SectionGenerator] 章节配置不存在: {section_id}")
            return SectionOutput(
                section_id=section_id,
                title="",
                success=False,
                error_message=f"章节配置不存在: {section_id}",
            )
        
        # 检查是否为静态章节
        if section_config.type == "static":
            logger.info(f"[SectionGenerator] 静态章节跳过 LLM 生成: {section_id}")
            return SectionOutput(
                section_id=section_id,
                title=section_config.title,
                success=True,
            )
        
        # 检查是否有 tool 定义
        if not section_config.tool:
            logger.error(f"[SectionGenerator] 章节无 tool 定义: {section_id}")
            return SectionOutput(
                section_id=section_id,
                title=section_config.title,
                success=False,
                error_message=f"章节无 tool 定义: {section_id}",
            )
        
        if progress_callback:
            progress_callback(f"正在生成章节: {section_config.title}")
        
        # 构建消息
        messages = self._build_messages(section_config, section_input)
        
        # 构建工具
        tools = [section_config.tool]
        
        # 获取模型配置
        model_config = section_config.model_config or self.config_loader.get_model_config()
        
        try:
            # 调用 LLM
            response = await self._call_llm(
                messages=messages,
                tools=tools,
                tool_choice=section_config.tool_choice,
                model_config=model_config,
            )
            
            # 解析响应
            return self._parse_response(section_id, section_config.title, response)
            
        except Exception as e:
            logger.error(f"[SectionGenerator] LLM 调用失败: {e}")
            return SectionOutput(
                section_id=section_id,
                title=section_config.title,
                success=False,
                error_message=str(e),
            )
    
    def _build_messages(
        self, 
        section_config: SectionConfig, 
        section_input: SectionInput,
    ) -> List[Dict[str, str]]:
        """构建 LLM 消息"""
        messages = []
        
        # System message: prompt.md
        if section_config.prompt:
            messages.append({
                "role": "system",
                "content": section_config.prompt,
            })
        
        # User message: 输入数据
        user_content = section_input.to_user_message()
        
        # 添加 data_id 映射提示
        data_id_map = section_input.get_data_id_map()
        if data_id_map:
            user_content += "\n## data_id 映射\n"
            user_content += "以下是各数据类型对应的 data_id，在 function call 中引用数据时请使用对应的 data_id:\n"
            for data_type, data_id in data_id_map.items():
                user_content += f"- {data_type}: `{data_id}`\n"
        
        messages.append({
            "role": "user",
            "content": user_content,
        })
        
        return messages
    
    async def _call_llm(
        self,
        messages: List[Dict[str, str]],
        tools: List[Dict[str, Any]],
        tool_choice: Optional[Dict[str, Any]],
        model_config: ModelConfig,
    ) -> Dict[str, Any]:
        """调用 LLM"""
        logger.info(f"[SectionGenerator] 调用 LLM: model={model_config.model_name}, tools={len(tools)}, tool_choice={tool_choice}")
        
        # 使用 LLM 客户端
        response = await self.llm_client.chat(
            messages=messages,
            tools=tools,
            tool_choice=tool_choice,  # 传递 tool_choice 强制使用指定工具
            agent_name="report_section",
        )
        
        return response
    
    def _parse_response(
        self, 
        section_id: str, 
        title: str,
        response: Dict[str, Any],
    ) -> SectionOutput:
        """解析 LLM 响应"""
        tool_calls = response.get("tool_calls")
        
        if not tool_calls:
            # 没有 tool_calls，检查是否有普通内容
            content = response.get("content", "")
            logger.warning(f"[SectionGenerator] LLM 未返回 tool_calls: {section_id}")
            
            return SectionOutput(
                section_id=section_id,
                title=title,
                success=False,
                error_message="LLM 未返回 tool_calls",
                raw_response=response,
            )
        
        # 取第一个 tool_call
        tool_call = tool_calls[0]
        function_name = tool_call.get("function", {}).get("name")
        arguments_str = tool_call.get("function", {}).get("arguments", "{}")
        
        try:
            arguments = json.loads(arguments_str)
        except json.JSONDecodeError as e:
            logger.error(f"[SectionGenerator] 解析 arguments 失败: {e}")
            return SectionOutput(
                section_id=section_id,
                title=title,
                success=False,
                error_message=f"解析 arguments 失败: {e}",
                raw_response=response,
            )
        
        logger.info(f"[SectionGenerator] 章节生成成功: {section_id}, function={function_name}")
        
        return SectionOutput(
            section_id=section_id,
            title=title,
            success=True,
            function_name=function_name,
            arguments=arguments,
            raw_response=response,
        )


def get_section_generator(
    config_loader: Optional[ConfigLoader] = None,
    llm_client: Any = None,
) -> SectionGenerator:
    """获取 SectionGenerator 实例"""
    if config_loader is None:
        config_loader = get_config_loader()
    
    if llm_client is None:
        from ....llm import llm_client as default_llm_client
        llm_client = default_llm_client
    
    return SectionGenerator(config_loader, llm_client)
