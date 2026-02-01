"""
ReportAssembler - 报告组装器

将各章节输出组装成最终报告结构：
- 处理 introduction（静态，复制 summary 数据）
- 处理 conclusion（静态，汇总各章节 highlights）
- 组装完整的 sections 数组
- 包含 data_snapshots 引用
"""

import json
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Any, List, Optional

from sqlalchemy.orm import Session

from .config_loader import ConfigLoader, get_config_loader
from .section_generator import SectionOutput
from .function_executor import ContentBlock
from ..data.snapshot_manager import SnapshotManager

logger = logging.getLogger(__name__)


@dataclass
class AssembledSection:
    """组装后的章节"""
    section_id: str
    title: str
    order: int
    type: str
    blocks: List[Dict[str, Any]] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "section_id": self.section_id,
            "title": self.title,
            "order": self.order,
            "type": self.type,
            "blocks": self.blocks,
        }


@dataclass
class AssembledReport:
    """组装后的报告"""
    report_id: str
    title: str
    sections: List[AssembledSection] = field(default_factory=list)
    data_snapshots: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "sections": [s.to_dict() for s in self.sections],
            "data_snapshots": self.data_snapshots,
        }
    
    def get_sections_json(self) -> str:
        """获取 sections JSON 字符串（用于存储）"""
        return json.dumps([s.to_dict() for s in self.sections], ensure_ascii=False)


class ReportAssembler:
    """报告组装器"""
    
    def __init__(
        self, 
        config_loader: ConfigLoader,
        snapshot_manager: SnapshotManager,
    ):
        """
        初始化 ReportAssembler
        
        Args:
            config_loader: 配置加载器
            snapshot_manager: 数据快照管理器
        """
        self.config_loader = config_loader
        self.snapshot_manager = snapshot_manager
    
    def assemble_report(
        self,
        report_id: str,
        title: str,
        section_outputs: Dict[str, SectionOutput],
    ) -> AssembledReport:
        """
        组装报告
        
        Args:
            report_id: 报告 ID
            title: 报告标题
            section_outputs: 各章节的输出 {section_id: SectionOutput}
            
        Returns:
            组装后的报告
        """
        report = AssembledReport(report_id=report_id, title=title)
        
        # 获取章节定义
        section_definitions = self.config_loader.get_section_definitions()
        
        # #region agent log
        import json as _dbg_json
        import time as _dbg_time
        _dbg_log_path = r"e:\HyroxAgent 4 1\HyroxAgent\.cursor\debug.log"
        _dbg_all_defs = [(d.section_id, d.enabled, d.type) for d in section_definitions]
        _dbg_enabled_defs = [(d.section_id, d.type) for d in section_definitions if d.enabled]
        with open(_dbg_log_path, "a", encoding="utf-8") as _dbg_f:
            _dbg_f.write(_dbg_json.dumps({"location":"report_assembler.py:assemble_report","message":"Section definitions from ConfigLoader","data":{"all_definitions":_dbg_all_defs,"enabled_definitions":_dbg_enabled_defs,"section_outputs_keys":list(section_outputs.keys())},"timestamp":_dbg_time.time()*1000,"sessionId":"debug-session","hypothesisId":"B"}) + "\n")
        # #endregion
        
        for section_def in section_definitions:
            if not section_def.enabled:
                continue
            
            section_id = section_def.section_id
            
            if section_def.type == "static":
                # 静态章节特殊处理
                assembled = self._assemble_static_section(section_id, section_def, section_outputs)
            else:
                # 动态章节
                section_output = section_outputs.get(section_id)
                if section_output:
                    assembled = self._assemble_dynamic_section(section_output, section_def)
                else:
                    # 章节输出不存在，创建空章节
                    assembled = AssembledSection(
                        section_id=section_id,
                        title=section_def.title,
                        order=section_def.order,
                        type=section_def.type,
                    )
            
            report.sections.append(assembled)
        
        # 获取数据快照
        report.data_snapshots = self.snapshot_manager.get_snapshots_as_dict(report_id)
        
        logger.info(f"[ReportAssembler] 组装完成: {len(report.sections)} sections, {len(report.data_snapshots)} snapshots")
        return report
    
    def _assemble_dynamic_section(
        self, 
        section_output: SectionOutput,
        section_def: Any,
    ) -> AssembledSection:
        """组装动态章节"""
        blocks = section_output.arguments.get("_blocks", [])
        
        return AssembledSection(
            section_id=section_output.section_id,
            title=section_output.title,
            order=section_def.order,
            type="dynamic",
            blocks=blocks,
        )
    
    def _assemble_static_section(
        self, 
        section_id: str,
        section_def: Any,
        section_outputs: Dict[str, SectionOutput],
    ) -> AssembledSection:
        """组装静态章节"""
        if section_id == "introduction":
            return self._assemble_introduction(section_def, section_outputs)
        elif section_id == "conclusion":
            return self._assemble_conclusion(section_def, section_outputs)
        else:
            return AssembledSection(
                section_id=section_id,
                title=section_def.title,
                order=section_def.order,
                type="static",
            )
    
    def _assemble_introduction(
        self, 
        section_def: Any,
        section_outputs: Dict[str, SectionOutput],
    ) -> AssembledSection:
        """组装引言章节（从 summary 复制数据）"""
        blocks = []
        
        # 从 summary 章节获取数据
        summary_output = section_outputs.get("summary")
        if summary_output and summary_output.success:
            args = summary_output.arguments
            
            # 复制 roxscan_card
            if "roxscan_card" in args:
                blocks.append({
                    "type": "card",
                    "component": "RoxscanCard",
                    "props": args["roxscan_card"],
                })
            
            # 复制 radar_chart
            if "radar_chart" in args:
                blocks.append({
                    "type": "chart",
                    "component": "RadarChart",
                    "props": args["radar_chart"],
                })
        
        return AssembledSection(
            section_id="introduction",
            title=section_def.title,
            order=section_def.order,
            type="static",
            blocks=blocks,
        )
    
    def _assemble_conclusion(
        self, 
        section_def: Any,
        section_outputs: Dict[str, SectionOutput],
    ) -> AssembledSection:
        """组装总结章节（汇总各章节 highlights）"""
        blocks = []
        
        # 汇总优势
        strengths = []
        summary_output = section_outputs.get("summary")
        if summary_output and summary_output.success:
            highlights = summary_output.arguments.get("highlights", [])
            strengths = [h for h in highlights if h.get("type") == "strength"]
        
        if strengths:
            blocks.append({
                "type": "list",
                "component": "StrengthsList",
                "props": {"items": strengths, "title": "您的優勢"},
            })
        
        # 汇总改进方向
        improvements = []
        training_output = section_outputs.get("training")
        if training_output and training_output.success:
            weakness_analysis = training_output.arguments.get("weakness_analysis", [])
            improvements = weakness_analysis[:3]  # 取前3个
        
        if improvements:
            blocks.append({
                "type": "list",
                "component": "ImprovementsList",
                "props": {"items": improvements, "title": "重點改進方向"},
            })
        
        # 汇总行动项
        actions = []
        if training_output and training_output.success:
            key_workouts = training_output.arguments.get("key_workouts", [])
            actions = key_workouts[:3]  # 取前3个
        
        if actions:
            blocks.append({
                "type": "list",
                "component": "ActionItems",
                "props": {"items": actions, "title": "下一步行動"},
            })
        
        # 目标成绩
        prediction_output = section_outputs.get("prediction")
        if prediction_output and prediction_output.success:
            recommended_target = prediction_output.arguments.get("recommended_target")
            prediction_tiers = prediction_output.arguments.get("prediction_tiers", {})
            
            if recommended_target and prediction_tiers:
                tiers = prediction_tiers.get("tiers", {})
                target_tier = tiers.get(recommended_target, {})
                
                blocks.append({
                    "type": "card",
                    "component": "TargetCard",
                    "props": {
                        "target": recommended_target,
                        "time": target_tier.get("time_display"),
                        "title": "目標成績",
                    },
                })
        
        return AssembledSection(
            section_id="conclusion",
            title=section_def.title,
            order=section_def.order,
            type="static",
            blocks=blocks,
        )


def get_report_assembler(
    config_loader: Optional[ConfigLoader] = None,
    snapshot_manager: Optional[SnapshotManager] = None,
) -> ReportAssembler:
    """获取 ReportAssembler 实例"""
    if config_loader is None:
        config_loader = get_config_loader()
    
    if snapshot_manager is None:
        raise ValueError("snapshot_manager 必须提供")
    
    return ReportAssembler(config_loader, snapshot_manager)
