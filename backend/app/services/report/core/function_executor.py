"""
FunctionExecutor - Function Call 解析器

将 LLM 的 tool_calls arguments 转换为前端可渲染的 blocks：
- 解析 Function Call 参数
- 根据 blocks_mapping 映射到前端组件
- 生成标准化的 blocks 数组
"""

import logging
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional

from .config_loader import ConfigLoader, SectionConfig, get_config_loader
from .section_generator import SectionOutput

logger = logging.getLogger(__name__)


@dataclass
class ContentBlock:
    """内容块"""
    type: str  # "card", "chart", "text", "list", "table"
    component: str  # 前端组件名称
    props: Dict[str, Any] = field(default_factory=dict)
    order: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.type,
            "component": self.component,
            "props": self.props,
        }


# 参数到组件的默认顺序
DEFAULT_BLOCK_ORDER = {
    "roxscan_card": 1,
    "radar_chart": 2,
    "value_proposition": 1,
    "intro_text": 2,
    "loss_table": 3,
    "waterfall_chart": 4,
    "hr_pace_chart": 1,
    "phases": 2,
    "decoupling_metrics": 3,
    "pace_trend_chart": 4,
    "degraded_analysis": 5,
    "prediction_tiers": 1,
    "density_chart": 2,
    "key_improvements": 3,
    "split_breakdown_table": 4,
    "weakness_analysis": 1,
    "training_week": 2,
    "priority_matrix": 3,
    "key_workouts": 4,
    "nutrition_tips": 5,
    "summary_text": 10,
    "highlights": 11,
    "analysis_text": 100,
}


class FunctionExecutor:
    """Function Call 解析器"""
    
    def __init__(self, config_loader: ConfigLoader):
        """
        初始化 FunctionExecutor
        
        Args:
            config_loader: 配置加载器
        """
        self.config_loader = config_loader
    
    def parse_section_output(
        self, 
        section_output: SectionOutput,
        data_id_map: Optional[Dict[str, str]] = None,
    ) -> List[ContentBlock]:
        """
        解析章节输出，生成 blocks
        
        Args:
            section_output: 章节输出
            data_id_map: data_type -> data_id 映射
            
        Returns:
            内容块列表
        """
        if not section_output.success:
            logger.warning(f"[FunctionExecutor] 章节生成失败，跳过解析: {section_output.section_id}, error={section_output.error_message}")
            return []
        
        section_config = self.config_loader.get_section_config(section_output.section_id)
        if not section_config:
            logger.warning(f"[FunctionExecutor] 章节配置不存在: {section_output.section_id}")
            return []
        
        # 获取 blocks_mapping
        blocks_mapping = section_config.blocks_mapping or {}
        
        # 解析 arguments
        arguments = section_output.arguments
        blocks = []
        
        # #region agent log - 后端调试
        logger.info(f"[FunctionExecutor DEBUG] section_id={section_output.section_id}, success={section_output.success}")
        logger.info(f"[FunctionExecutor DEBUG] arguments keys: {list(arguments.keys())}")
        logger.info(f"[FunctionExecutor DEBUG] blocks_mapping keys: {list(blocks_mapping.keys())}")
        # #endregion
        
        for arg_name, arg_value in arguments.items():
            if arg_name.startswith("_"):
                continue  # 跳过内部字段
            
            mapping = blocks_mapping.get(arg_name)
            if not mapping:
                # 没有映射，创建默认的文本块
                block = self._create_default_block(arg_name, arg_value)
            else:
                # 根据映射创建块
                block = self._create_mapped_block(arg_name, arg_value, mapping, data_id_map)
            
            if block:
                block.order = DEFAULT_BLOCK_ORDER.get(arg_name, 50)
                blocks.append(block)
        
        # 按顺序排序
        blocks.sort(key=lambda b: b.order)
        
        logger.info(f"[FunctionExecutor] 解析章节 {section_output.section_id}: {len(blocks)} blocks")
        return blocks
    
    def _create_mapped_block(
        self, 
        arg_name: str, 
        arg_value: Any, 
        mapping: Dict[str, str],
        data_id_map: Optional[Dict[str, str]] = None,
    ) -> Optional[ContentBlock]:
        """根据映射创建块"""
        block_type = mapping.get("type", "text")
        component = mapping.get("component", "Paragraph")
        condition = mapping.get("condition")
        
        # 检查条件
        if condition:
            # 简单的条件检查（如 "has_heart_rate_data === true"）
            # 这里只是示例，实际可能需要更复杂的条件评估
            pass
        
        # 处理不同类型的值
        props = self._build_props(arg_name, arg_value, data_id_map)
        
        return ContentBlock(
            type=block_type,
            component=component,
            props=props,
        )
    
    def _create_default_block(self, arg_name: str, arg_value: Any) -> Optional[ContentBlock]:
        """创建默认块"""
        if isinstance(arg_value, str):
            return ContentBlock(
                type="text",
                component="Paragraph",
                props={"content": arg_value},
            )
        elif isinstance(arg_value, list):
            return ContentBlock(
                type="list",
                component="GenericList",
                props={"items": arg_value, "name": arg_name},
            )
        elif isinstance(arg_value, dict):
            return ContentBlock(
                type="card",
                component="GenericCard",
                props={**arg_value, "_name": arg_name},
            )
        else:
            return None
    
    def _build_props(
        self, 
        arg_name: str, 
        arg_value: Any,
        data_id_map: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """构建组件 props"""
        props = {}
        
        if isinstance(arg_value, dict):
            props = {**arg_value}
            
            # 如果有 data_id 字段且为空，尝试从 data_id_map 填充
            if data_id_map and props.get("data_id") is None:
                # 根据 arg_name 推断 data_type
                data_type = self._infer_data_type(arg_name)
                if data_type and data_type in data_id_map:
                    props["data_id"] = data_id_map[data_type]
        elif isinstance(arg_value, list):
            props = {"items": arg_value}
        elif isinstance(arg_value, str):
            props = {"content": arg_value}
        else:
            props = {"value": arg_value}
        
        return props
    
    def _infer_data_type(self, arg_name: str) -> Optional[str]:
        """从参数名推断数据类型"""
        mapping = {
            "radar_chart": "percentile_ranking",
            "loss_table": "time_loss_analysis",
            "waterfall_chart": "time_loss_analysis",
            "hr_pace_chart": "heart_rate_data",
            "pace_trend_chart": "pacing_analysis",
            "prediction_tiers": "prediction_data",
            "density_chart": "prediction_data",
            "split_breakdown_table": "prediction_split_breakdown",
            "priority_matrix": "time_loss_analysis",
        }
        return mapping.get(arg_name)
    
    def execute_and_attach(
        self, 
        section_output: SectionOutput,
        data_id_map: Optional[Dict[str, str]] = None,
    ) -> SectionOutput:
        """
        解析并将 blocks 附加到 section_output
        
        Args:
            section_output: 章节输出
            data_id_map: data_type -> data_id 映射
            
        Returns:
            更新后的章节输出
        """
        blocks = self.parse_section_output(section_output, data_id_map)
        section_output.arguments["_blocks"] = [b.to_dict() for b in blocks]
        return section_output


def get_function_executor(
    config_loader: Optional[ConfigLoader] = None,
) -> FunctionExecutor:
    """获取 FunctionExecutor 实例"""
    if config_loader is None:
        config_loader = get_config_loader()
    
    return FunctionExecutor(config_loader)
