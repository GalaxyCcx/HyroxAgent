"""
InputBuilder - 输入数据构建器

根据 inputs.json 配置构建章节的 LLM 输入数据：
- 读取数据规则
- 从 DataRegistry 获取数据
- 创建数据快照获取 data_id
- 格式化为标准输入格式
"""

import json
import logging
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional

from .config_loader import ConfigLoader, SectionConfig, get_config_loader
from ..data.snapshot_manager import SnapshotManager
from ..data.data_registry import DataRegistry

logger = logging.getLogger(__name__)


@dataclass
class InputDataItem:
    """单个输入数据项"""
    data_id: str
    data_type: str
    name: str
    describe: str
    summary: str
    key_params: Dict[str, Any] = field(default_factory=dict)
    data_details: Optional[Dict[str, Any]] = None


@dataclass
class SectionInput:
    """章节输入数据"""
    section_id: str
    inputs: List[InputDataItem] = field(default_factory=list)
    has_heart_rate: bool = False
    is_degraded: bool = False
    
    def to_user_message(self) -> str:
        """转换为 LLM 用户消息"""
        parts = []
        parts.append("## 输入数据\n")
        
        for item in self.inputs:
            parts.append(f"### {item.name}")
            parts.append(f"- **data_id**: `{item.data_id}`")
            parts.append(f"- **描述**: {item.describe}")
            
            if item.summary:
                parts.append(f"- **摘要**: {item.summary}")
            
            if item.key_params:
                params_str = ", ".join(f"{k}={v}" for k, v in item.key_params.items())
                parts.append(f"- **关键参数**: {params_str}")
            
            if item.data_details:
                parts.append(f"- **数据明细**:\n```json\n{json.dumps(item.data_details, ensure_ascii=False, indent=2)}\n```")
            
            parts.append("")
        
        if self.is_degraded:
            parts.append("\n**注意**: 当前缺少心率数据，请使用降级分析模式。\n")
        
        return "\n".join(parts)
    
    def get_data_id_map(self) -> Dict[str, str]:
        """获取 data_type -> data_id 的映射"""
        return {item.data_type: item.data_id for item in self.inputs}


class InputBuilder:
    """输入数据构建器"""
    
    def __init__(
        self, 
        config_loader: ConfigLoader,
        snapshot_manager: SnapshotManager,
        data_registry: DataRegistry,
    ):
        """
        初始化 InputBuilder
        
        Args:
            config_loader: 配置加载器
            snapshot_manager: 数据快照管理器
            data_registry: 数据源注册表
        """
        self.config_loader = config_loader
        self.snapshot_manager = snapshot_manager
        self.data_registry = data_registry
    
    def build_section_input(
        self, 
        section_id: str, 
        report_id: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> SectionInput:
        """
        构建章节输入数据
        
        Args:
            section_id: 章节 ID
            report_id: 报告 ID（用于创建数据快照）
            context: 额外上下文（如比赛信息）
            
        Returns:
            章节输入数据
        """
        section_config = self.config_loader.get_section_config(section_id)
        if not section_config or not section_config.inputs:
            logger.warning(f"[InputBuilder] 章节配置不存在或无输入定义: {section_id}")
            return SectionInput(section_id=section_id)
        
        inputs_config = section_config.inputs
        required_inputs = inputs_config.get("required_inputs", [])
        optional_inputs = inputs_config.get("optional_inputs", [])
        
        section_input = SectionInput(section_id=section_id)
        
        # time_loss 章节：优先注入提升空间 Agent 结果（放在首位，确保 LLM 使用）
        if section_id == "time_loss" and context:
            improvement_result = context.get("improvement_agent_result")
            if improvement_result is not None:
                n_r = len(improvement_result.get("running") or [])
                n_w = len(improvement_result.get("workout") or [])
                logger.info(f"[InputBuilder] time_loss 注入提升空间Agent结果: running={n_r}, workout={n_w}")
                section_input.inputs.insert(0, InputDataItem(
                    data_id="improvement_agent_result",
                    data_type="improvement_agent_result",
                    name="提升空间Agent结果（必用）",
                    describe="由 Agent 根据 1.1 损耗与 Top 10% 对比计算出的各区域可提升时间及理由。1.1 的 improvement_display 与 1.2 conclusion_blocks 的 improvement_display、improvement_logic 必须据此填写，不得使用其他口径。",
                    summary="",
                    key_params={},
                    data_details=improvement_result,
                ))
        
        # 处理必需输入
        for input_def in required_inputs:
            data_item = self._build_input_item(input_def, report_id, context)
            if data_item:
                section_input.inputs.append(data_item)
        
        # 处理可选输入
        for input_def in optional_inputs:
            data_type = input_def.get("data_type")
            
            # 检查是否需要降级处理
            if data_type == "heart_rate_data":
                if self.data_registry.has_heart_rate_data():
                    data_item = self._build_input_item(input_def, report_id, context)
                    if data_item:
                        section_input.inputs.append(data_item)
                        section_input.has_heart_rate = True
                else:
                    # 无心率数据，标记为降级模式
                    section_input.is_degraded = True
                    logger.info(f"[InputBuilder] 章节 {section_id} 使用降级模式（无心率数据）")
            else:
                data_item = self._build_input_item(input_def, report_id, context)
                if data_item:
                    section_input.inputs.append(data_item)
        
        logger.info(f"[InputBuilder] 构建章节输入: section={section_id}, inputs={len(section_input.inputs)}, degraded={section_input.is_degraded}")
        return section_input
    
    def _build_input_item(
        self, 
        input_def: Dict[str, Any], 
        report_id: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> Optional[InputDataItem]:
        """构建单个输入数据项"""
        data_type = input_def.get("data_type")
        if not data_type:
            return None
        
        # 从 DataRegistry 获取数据
        data = self.data_registry.get_data(data_type)
        if data is None:
            logger.warning(f"[InputBuilder] 数据不存在: {data_type}")
            return None
        
        # 创建数据快照
        data_id = self.snapshot_manager.create_snapshot(
            report_id=report_id,
            data_type=data_type,
            data_content=data,
        )
        
        # 提取关键参数
        key_params = self._extract_key_params(data, input_def.get("fields", {}).get("key_params", []))
        
        # 提取摘要
        summary = self._format_summary(data, input_def.get("summary_template", ""), context)
        
        # 提取数据明细（限制字段）
        details_fields = input_def.get("fields", {}).get("details", [])
        data_details = self._extract_details(data, details_fields)
        
        return InputDataItem(
            data_id=data_id,
            data_type=data_type,
            name=input_def.get("name", data_type),
            describe=input_def.get("describe", ""),
            summary=summary,
            key_params=key_params,
            data_details=data_details,
        )
    
    def _extract_key_params(self, data: Dict[str, Any], param_keys: List[str]) -> Dict[str, Any]:
        """提取关键参数"""
        params = {}
        for key in param_keys:
            if key in data:
                params[key] = data[key]
        return params
    
    def _format_summary(
        self, 
        data: Dict[str, Any], 
        template: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> str:
        """格式化摘要"""
        if not template:
            return ""
        
        # 合并数据和上下文
        format_data = {**data}
        if context:
            format_data.update(context)
        
        try:
            return template.format(**format_data)
        except KeyError as e:
            logger.warning(f"[InputBuilder] 摘要格式化失败: {e}")
            return template
    
    def _extract_details(self, data: Dict[str, Any], detail_keys: List[str]) -> Dict[str, Any]:
        """提取数据明细"""
        if not detail_keys:
            return {}
        
        details = {}
        for key in detail_keys:
            if key in data:
                value = data[key]
                # 跳过私有字段
                if key.startswith("_"):
                    continue
                details[key] = value
        
        return details


def get_input_builder(
    config_loader: Optional[ConfigLoader] = None,
    snapshot_manager: Optional[SnapshotManager] = None,
    data_registry: Optional[DataRegistry] = None,
) -> InputBuilder:
    """获取 InputBuilder 实例"""
    if config_loader is None:
        config_loader = get_config_loader()
    
    if snapshot_manager is None or data_registry is None:
        raise ValueError("snapshot_manager 和 data_registry 必须提供")
    
    return InputBuilder(config_loader, snapshot_manager, data_registry)
