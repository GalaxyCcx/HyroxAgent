"""
DataRegistry - 数据源注册表

管理可用的数据源类型及其获取方法，提供标准化的数据获取接口。
"""

import logging
import re
from dataclasses import asdict
from typing import Dict, Any, List, Optional, Callable, Awaitable

from ..data_provider import (
    DataProvider,  # 修正: 实际类名是 DataProvider 而非 ReportDataProvider
    ReportData,
    AthleteResultData,
    DivisionStatsData,
    SegmentComparisonData,
    PercentileRankingData,
    PacingAnalysisData,
    TimeLossAnalysisData,
    MappedHeartRateData,
)

logger = logging.getLogger(__name__)


# 数据类型与 ReportData 属性的映射
DATA_TYPE_MAPPING = {
    "athlete_result": "athlete_result",
    "division_stats": "division_stats",
    "segment_comparison": "segment_comparison",
    "percentile_ranking": "percentile_ranking",
    "pacing_analysis": "pacing_analysis",
    "pacing_consistency": "pacing_analysis",  # 共用配速分析数据
    "time_loss_analysis": "time_loss_analysis",
    "heart_rate_data": "heart_rate_data",
    "prediction_data": None,  # 需要额外查询
    "prediction_split_breakdown": None,  # 需要额外查询
    "athlete_history": None,  # 需要额外查询
}


class DataRegistry:
    """数据源注册表"""
    
    def __init__(self, report_data: ReportData):
        """
        初始化 DataRegistry
        
        Args:
            report_data: 预计算的报告数据
        """
        self.report_data = report_data
    
    def get_data(self, data_type: str) -> Optional[Dict[str, Any]]:
        """
        获取指定类型的数据
        
        Args:
            data_type: 数据类型
            
        Returns:
            数据字典，不存在则返回 None
        """
        attr_name = DATA_TYPE_MAPPING.get(data_type)
        
        if attr_name is None:
            # 特殊数据类型，需要额外处理
            return self._get_special_data(data_type)
        
        data_obj = getattr(self.report_data, attr_name, None)
        if data_obj is None:
            return None
        
        return self._convert_to_dict(data_obj, data_type)
    
    def _get_special_data(self, data_type: str) -> Optional[Dict[str, Any]]:
        """获取特殊类型的数据（需要额外查询）"""
        if data_type == "prediction_data":
            # TODO: 从 PredictionStats 表查询
            return self._build_prediction_data()
        
        if data_type == "prediction_split_breakdown":
            # TODO: 从 PredictionStats 表查询
            return self._build_split_breakdown()
        
        if data_type == "athlete_history":
            # TODO: 从历史数据查询
            return None
        
        return None
    
    def _convert_to_dict(self, data_obj: Any, data_type: str) -> Dict[str, Any]:
        """将数据对象转换为字典"""
        if hasattr(data_obj, "__dataclass_fields__"):
            # dataclass 对象
            result = asdict(data_obj)
        elif isinstance(data_obj, dict):
            result = data_obj
        else:
            # 其他类型，尝试转换
            result = {"value": data_obj}
        
        return self._enrich_data(result, data_type)
    
    def _enrich_data(self, data: Dict[str, Any], data_type: str) -> Dict[str, Any]:
        """根据数据类型添加额外字段"""
        # 添加基础元信息
        result = {
            "_data_type": data_type,
            "_source": "report_data_provider",
        }
        result.update(data)
        
        # 根据数据类型添加计算字段
        if data_type == "athlete_result":
            result = self._enrich_athlete_result(result)
        elif data_type == "pacing_analysis":
            result = self._enrich_pacing_analysis(result)
        elif data_type == "time_loss_analysis":
            result = self._enrich_time_loss_analysis(result)
        elif data_type == "segment_comparison":
            result = self._enrich_segment_comparison_with_top10(result)
        
        return result
    
    def _enrich_athlete_result(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """丰富运动员成绩数据"""
        # 添加格式化的总用时
        if data.get("total_time"):
            total_minutes = data["total_time"]
            hours = int(total_minutes // 60)
            minutes = int(total_minutes % 60)
            seconds = int((total_minutes * 60) % 60)
            data["total_time_formatted"] = f"{hours}:{minutes:02d}:{seconds:02d}"
            data["total_time_seconds"] = int(total_minutes * 60)
        
        # 添加 splits 数组
        data["splits"] = self._build_splits_array(data)
        
        return data
    
    def _build_splits_array(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """构建分段数组"""
        splits = []
        
        # 8 段跑步
        run_fields = [f"run{i}_time" for i in range(1, 9)]
        # 8 个功能站
        station_fields = [
            "skierg_time", "sled_push_time", "sled_pull_time", 
            "burpee_broad_jump_time", "row_erg_time", 
            "farmers_carry_time", "sandbag_lunges_time", "wall_balls_time"
        ]
        station_names = [
            "SkiErg", "Sled Push", "Sled Pull", 
            "Burpee Broad Jump", "Row Erg", 
            "Farmers Carry", "Sandbag Lunges", "Wall Balls"
        ]
        
        for i, (run_field, station_field, station_name) in enumerate(zip(run_fields, station_fields, station_names), 1):
            splits.append({
                "lap": i,
                "run_time": data.get(run_field),
                "run_time_seconds": int(data.get(run_field, 0) * 60) if data.get(run_field) else None,
                "station_name": station_name,
                "station_time": data.get(station_field),
                "station_time_seconds": int(data.get(station_field, 0) * 60) if data.get(station_field) else None,
            })
        
        return splits
    
    def _format_minutes_to_mss(self, minutes: Optional[float]) -> Optional[str]:
        """将分钟数格式化为 M:SS，如 6.117 -> 6:07"""
        if minutes is None:
            return None
        total_sec = int(round(minutes * 60))
        m, s = divmod(total_sec, 60)
        return f"{m}:{s:02d}"

    def _format_diff_display(self, diff_seconds: float) -> str:
        """将差距秒数格式化为 -M:SS（你比 Top 10% 慢的秒数）"""
        s = int(round(abs(diff_seconds)))
        m, sec = divmod(s, 60)
        return f"-{m}:{sec:02d}"

    def _enrich_segment_comparison_with_top10(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        用 athlete_result + division_stats(p10) 预计算「与 Top 10% 的差距」表格，
        保证同一份数据每次报告的 1.2 表格 you/top10/diff 固定，不由 LLM 改写。
        """
        athlete = self.report_data.athlete_result
        div_stats = self.report_data.division_stats
        if not athlete or not div_stats:
            return data
        table = []
        for i in range(1, 9):
            seg_name = f"Run {i}"
            field = f"run{i}_time"
            you_min = getattr(athlete, field, None)
            fs = getattr(div_stats, field, None)
            p10 = getattr(fs, "p10", None) if fs else None
            you_display = self._format_minutes_to_mss(you_min)
            top10_display = self._format_minutes_to_mss(p10)
            if you_min is not None and p10 is not None:
                diff_seconds = (you_min - p10) * 60
                diff_display = self._format_diff_display(diff_seconds)
            else:
                diff_seconds = None
                diff_display = "-0:00" if you_min is not None else None
            table.append({
                "segment": seg_name,
                "you": you_display or "",
                "top10": top10_display or "",
                "diff": diff_display or "-0:00",
                "you_minutes": round(you_min, 3) if you_min is not None else None,
                "top10_minutes": round(p10, 3) if p10 is not None else None,
                "diff_seconds": round(diff_seconds, 1) if diff_seconds is not None else None,
            })
        data["running_vs_top10_table"] = table

        # Workout：功能站与 Top 10% 的差距表（8 站，结构同 running）
        station_names_and_fields = [
            ("SkiErg", "skierg_time"),
            ("Sled Push", "sled_push_time"),
            ("Sled Pull", "sled_pull_time"),
            ("Burpee Broad Jump", "burpee_broad_jump_time"),
            ("Row Erg", "row_erg_time"),
            ("Farmers Carry", "farmers_carry_time"),
            ("Sandbag Lunges", "sandbag_lunges_time"),
            ("Wall Balls", "wall_balls_time"),
        ]
        workout_table = []
        for seg_name, field in station_names_and_fields:
            you_min = getattr(athlete, field, None)
            fs = getattr(div_stats, field, None)
            p10 = getattr(fs, "p10", None) if fs else None
            you_display = self._format_minutes_to_mss(you_min)
            top10_display = self._format_minutes_to_mss(p10)
            if you_min is not None and p10 is not None:
                diff_seconds = (you_min - p10) * 60
                diff_display = self._format_diff_display(diff_seconds)
            else:
                diff_seconds = None
                diff_display = "-0:00" if you_min is not None else None
            workout_table.append({
                "segment": seg_name,
                "you": you_display or "",
                "top10": top10_display or "",
                "diff": diff_display or "-0:00",
                "you_minutes": round(you_min, 3) if you_min is not None else None,
                "top10_minutes": round(p10, 3) if p10 is not None else None,
                "diff_seconds": round(diff_seconds, 1) if diff_seconds is not None else None,
            })
        data["workout_vs_top10_table"] = workout_table

        # Roxzone：转换区对比 you / top10 / avg，各 { value (M:SS), seconds }
        rox_you_min = getattr(athlete, "roxzone_time", None)
        rox_fs = getattr(div_stats, "roxzone_time", None)
        rox_p10 = getattr(rox_fs, "p10", None) if rox_fs else None
        rox_avg = getattr(rox_fs, "avg", None) if rox_fs else None
        roxzone_comparison = {}
        if rox_you_min is not None:
            you_sec = int(round(rox_you_min * 60))
            roxzone_comparison["you"] = {
                "value": self._format_minutes_to_mss(rox_you_min) or "0:00",
                "seconds": you_sec,
            }
        if rox_p10 is not None:
            p10_sec = int(round(rox_p10 * 60))
            roxzone_comparison["top10"] = {
                "value": self._format_minutes_to_mss(rox_p10) or "0:00",
                "seconds": p10_sec,
            }
        if rox_avg is not None:
            avg_sec = int(round(rox_avg * 60))
            roxzone_comparison["avg"] = {
                "value": self._format_minutes_to_mss(rox_avg) or "0:00",
                "seconds": avg_sec,
            }
        if roxzone_comparison:
            data["roxzone_comparison"] = roxzone_comparison

        return data

    def _enrich_pacing_analysis(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """丰富配速分析数据"""
        # 计算配速稳定性评分
        if data.get("pace_decay_percent") is not None:
            decay = abs(data["pace_decay_percent"])
            if decay < 5:
                data["stability_rating"] = "excellent"
            elif decay < 10:
                data["stability_rating"] = "good"
            elif decay < 15:
                data["stability_rating"] = "fair"
            else:
                data["stability_rating"] = "poor"
        
        return data
    
    def _enrich_time_loss_analysis(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """丰富时间损耗分析数据：理论最佳、总损耗展示、规范损耗明细（供 LLM 严格照抄）"""
        total_loss_seconds = data.get("total_loss_seconds") or 0
        # 计算理论最佳成绩
        if self.report_data.athlete_result and total_loss_seconds:
            total_seconds = self.report_data.athlete_result.total_time * 60 if self.report_data.athlete_result.total_time else 0
            theoretical_best_seconds = total_seconds - total_loss_seconds
            hours = int(theoretical_best_seconds // 3600)
            minutes = int((theoretical_best_seconds % 3600) // 60)
            seconds = int(theoretical_best_seconds % 60)
            data["theoretical_best"] = f"{hours}:{minutes:02d}:{seconds:02d}"
            data["theoretical_best_seconds"] = theoretical_best_seconds
        # 总损耗展示（与 total_loss_seconds 严格一致，供 LLM 照抄）
        data["total_loss_display"] = self._format_loss_display(total_loss_seconds)
        # 规范损耗明细：顺序与数值固定，LLM 的 loss_overview.items 必须与此一致
        data["canonical_loss_items"] = self._build_canonical_loss_items(data)
        return data
    
    def _format_loss_display(self, total_seconds: float) -> str:
        """格式化为 -H:MM:SS 或 -M:SS"""
        s = int(round(total_seconds))
        if s <= 0:
            return "0:00"
        neg = "-" if s > 0 else ""
        m, sec = divmod(s, 60)
        h, m = divmod(m, 60)
        if h > 0:
            return f"{neg}{h}:{m:02d}:{sec:02d}"
        return f"{neg}{m}:{sec:02d}"
    
    def _build_canonical_loss_items(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """从 transition_loss、pacing_losses、station_losses 构建规范明细，保证各项之和 = total_loss_seconds"""
        items = []
        # 转换区
        t = data.get("transition_loss")
        if t and (t.get("loss_seconds") or 0) > 0:
            items.append({
                "source": "ROXZONE (转换区)",
                "loss_seconds": round(float(t["loss_seconds"]), 1),
                "loss_display": self._format_loss_display(float(t["loss_seconds"])),
            })
        # 配速（多段）
        for p in data.get("pacing_losses") or []:
            if (p.get("loss_seconds") or 0) > 0:
                desc = (p.get("description") or "").strip()
                source = "配速崩盘"
                if "Run" in desc:
                    m = re.search(r"Run\s*(\d+)", desc)
                    source = f"Run {m.group(1)} (配速)" if m else "配速崩盘"
                items.append({
                    "source": source,
                    "loss_seconds": round(float(p["loss_seconds"]), 1),
                    "loss_display": self._format_loss_display(float(p["loss_seconds"])),
                })
        # 功能站
        for s in data.get("station_losses") or []:
            if (s.get("loss_seconds") or 0) > 0:
                name = (s.get("description") or "").replace(" 技术损耗（vs 平均值）", "").replace(" 技术损耗（vs TOP25%）", "").strip()
                items.append({
                    "source": name,
                    "loss_seconds": round(float(s["loss_seconds"]), 1),
                    "loss_display": self._format_loss_display(float(s["loss_seconds"])),
                })
        return items
    
    def _build_prediction_data(self) -> Optional[Dict[str, Any]]:
        """构建预测数据（从 PredictionStats 表）"""
        # TODO: 实现从数据库查询
        # 这里返回一个示例结构
        return {
            "tiers": {
                "excellent": {"percentile": 5, "time_seconds": 0, "delta": 0},
                "great": {"percentile": 25, "time_seconds": 0, "delta": 0},
                "expected": {"percentile": 50, "time_seconds": 0, "delta": 0},
                "subpar": {"percentile": 75, "time_seconds": 0, "delta": 0},
                "poor": {"percentile": 95, "time_seconds": 0, "delta": 0},
            },
            "sample_size": 0,
            "improvement_rate": 0,
        }
    
    def _build_split_breakdown(self) -> Optional[Dict[str, Any]]:
        """构建分段拆解数据"""
        # TODO: 实现
        return None
    
    def get_available_data_types(self) -> List[str]:
        """获取当前可用的数据类型"""
        available = []
        
        for data_type, attr_name in DATA_TYPE_MAPPING.items():
            if attr_name is not None:
                data_obj = getattr(self.report_data, attr_name, None)
                if data_obj is not None:
                    available.append(data_type)
        
        return available
    
    def has_heart_rate_data(self) -> bool:
        """检查是否有心率数据"""
        hr_data = self.report_data.heart_rate_data
        if hr_data is None:
            return False
        
        # 检查是否有有效的心率数据
        return bool(hr_data.avg_heart_rate or hr_data.data_points)


def get_data_registry(report_data: ReportData) -> DataRegistry:
    """获取 DataRegistry 实例"""
    return DataRegistry(report_data)
