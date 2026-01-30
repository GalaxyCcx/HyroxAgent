"""
DataRegistry - 数据源注册表

管理可用的数据源类型及其获取方法，提供标准化的数据获取接口。
"""

import logging
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
        """丰富时间损耗分析数据"""
        # 计算理论最佳成绩
        if self.report_data.athlete_result and data.get("total_loss_seconds"):
            total_seconds = self.report_data.athlete_result.total_time * 60 if self.report_data.athlete_result.total_time else 0
            theoretical_best_seconds = total_seconds - data["total_loss_seconds"]
            hours = int(theoretical_best_seconds // 3600)
            minutes = int((theoretical_best_seconds % 3600) // 60)
            seconds = int(theoretical_best_seconds % 60)
            data["theoretical_best"] = f"{hours}:{minutes:02d}:{seconds:02d}"
            data["theoretical_best_seconds"] = theoretical_best_seconds
        
        return data
    
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
