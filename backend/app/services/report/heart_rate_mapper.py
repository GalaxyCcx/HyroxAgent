"""
心率数据映射器
将心率时序数据映射到 HYROX 赛事的 16 个阶段
"""
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum

from .heart_rate_extractor import HeartRateDataPoint, HeartRateExtractionResult

logger = logging.getLogger(__name__)


class HyroxStage(Enum):
    """HYROX 赛事阶段"""
    RUN1 = "run1"
    SKIERG = "skierg"
    RUN2 = "run2"
    SLED_PUSH = "sled_push"
    RUN3 = "run3"
    SLED_PULL = "sled_pull"
    RUN4 = "run4"
    BURPEE = "burpee"
    RUN5 = "run5"
    ROW_ERG = "row_erg"
    RUN6 = "run6"
    FARMERS = "farmers"
    RUN7 = "run7"
    LUNGES = "lunges"
    RUN8 = "run8"
    WALL_BALLS = "wall_balls"


# HYROX 16 阶段顺序和显示名称
HYROX_STAGES_ORDER = [
    (HyroxStage.RUN1, "跑步 1", "run1_time"),
    (HyroxStage.SKIERG, "SkiErg", "skierg_time"),
    (HyroxStage.RUN2, "跑步 2", "run2_time"),
    (HyroxStage.SLED_PUSH, "雪橇推", "sled_push_time"),
    (HyroxStage.RUN3, "跑步 3", "run3_time"),
    (HyroxStage.SLED_PULL, "雪橇拉", "sled_pull_time"),
    (HyroxStage.RUN4, "跑步 4", "run4_time"),
    (HyroxStage.BURPEE, "波比跳", "burpee_broad_jump_time"),
    (HyroxStage.RUN5, "跑步 5", "run5_time"),
    (HyroxStage.ROW_ERG, "划船机", "row_erg_time"),
    (HyroxStage.RUN6, "跑步 6", "run6_time"),
    (HyroxStage.FARMERS, "农夫走", "farmers_carry_time"),
    (HyroxStage.RUN7, "跑步 7", "run7_time"),
    (HyroxStage.LUNGES, "负重弓步", "sandbag_lunges_time"),
    (HyroxStage.RUN8, "跑步 8", "run8_time"),
    (HyroxStage.WALL_BALLS, "墙球", "wall_balls_time"),
]


@dataclass
class StageHeartRateStats:
    """阶段心率统计"""
    stage_id: str
    stage_name: str
    stage_type: str  # "run" 或 "workout"
    
    # 时间信息（秒）
    start_time: int
    end_time: int
    duration: int
    
    # 心率统计
    min_hr: Optional[int] = None
    max_hr: Optional[int] = None
    avg_hr: Optional[float] = None
    
    # 心率趋势
    trend: Optional[str] = None  # "rising", "falling", "stable", "variable"
    entry_hr: Optional[int] = None  # 进入阶段时的心率
    exit_hr: Optional[int] = None   # 离开阶段时的心率
    hr_change: Optional[int] = None  # 心率变化量
    
    # 原始数据点
    data_points: List[HeartRateDataPoint] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "stage_id": self.stage_id,
            "stage_name": self.stage_name,
            "stage_type": self.stage_type,
            "time_range": {
                "start_seconds": self.start_time,
                "end_seconds": self.end_time,
                "duration_seconds": self.duration,
                "start_formatted": self._format_time(self.start_time),
                "end_formatted": self._format_time(self.end_time),
            },
            "heart_rate": {
                "min": self.min_hr,
                "max": self.max_hr,
                "avg": round(self.avg_hr, 1) if self.avg_hr else None,
                "entry": self.entry_hr,
                "exit": self.exit_hr,
                "change": self.hr_change,
                "trend": self.trend,
            },
            "data_points_count": len(self.data_points),
        }
    
    @staticmethod
    def _format_time(seconds: int) -> str:
        """格式化秒数为 mm:ss"""
        minutes = seconds // 60
        secs = seconds % 60
        return f"{minutes:02d}:{secs:02d}"


@dataclass
class HeartRateMappingResult:
    """心率映射结果"""
    success: bool
    stages: List[StageHeartRateStats] = field(default_factory=list)
    
    # 整体统计
    total_min_hr: Optional[int] = None
    total_max_hr: Optional[int] = None
    total_avg_hr: Optional[float] = None
    
    # 分析结果
    run_avg_hr: Optional[float] = None      # 跑步阶段平均心率
    workout_avg_hr: Optional[float] = None  # 功能站平均心率
    hr_efficiency: Optional[float] = None   # 心率效率（跑步/功能站比值）
    
    # 心率配速脱钩分析
    decoupling_analysis: Optional[Dict[str, Any]] = None
    
    # 峰值阶段
    peak_hr_stage: Optional[str] = None
    lowest_hr_stage: Optional[str] = None
    
    error_message: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        result = {
            "success": self.success,
            "stages": [s.to_dict() for s in self.stages],
            "overall_statistics": {
                "min_hr": self.total_min_hr,
                "max_hr": self.total_max_hr,
                "avg_hr": round(self.total_avg_hr, 1) if self.total_avg_hr else None,
            },
            "category_analysis": {
                "run_avg_hr": round(self.run_avg_hr, 1) if self.run_avg_hr else None,
                "workout_avg_hr": round(self.workout_avg_hr, 1) if self.workout_avg_hr else None,
                "hr_efficiency": round(self.hr_efficiency, 2) if self.hr_efficiency else None,
            },
            "key_stages": {
                "peak_hr_stage": self.peak_hr_stage,
                "lowest_hr_stage": self.lowest_hr_stage,
            },
        }
        
        if self.decoupling_analysis:
            result["decoupling_analysis"] = self.decoupling_analysis
        
        if self.error_message:
            result["error_message"] = self.error_message
        
        return result


class HeartRateMapper:
    """
    心率数据映射器
    将心率时序数据映射到 HYROX 赛事的 16 个阶段
    """
    
    def __init__(self):
        """初始化映射器"""
        logger.info("[HeartRateMapper] 初始化心率映射器")
    
    def build_race_timeline(
        self,
        stage_times: Dict[str, float]
    ) -> List[Tuple[HyroxStage, str, int, int]]:
        """
        构建赛事时间线
        
        Args:
            stage_times: 各阶段用时字典，键为数据库字段名，值为分钟数
            
        Returns:
            时间线列表: [(阶段枚举, 阶段名称, 开始秒数, 结束秒数), ...]
        """
        timeline = []
        current_time = 0  # 累计时间（秒）
        
        for stage_enum, stage_name, db_field in HYROX_STAGES_ORDER:
            duration_minutes = stage_times.get(db_field, 0) or 0
            duration_seconds = int(duration_minutes * 60)
            
            if duration_seconds > 0:
                start_time = current_time
                end_time = current_time + duration_seconds
                timeline.append((stage_enum, stage_name, start_time, end_time))
                current_time = end_time
        
        logger.info(f"[HeartRateMapper] 构建时间线: {len(timeline)} 个阶段, 总时长 {current_time} 秒")
        
        return timeline
    
    def _classify_stage_type(self, stage_id: str) -> str:
        """判断阶段类型（跑步/功能站）"""
        if stage_id.startswith("run"):
            return "run"
        return "workout"
    
    def _calculate_trend(
        self,
        data_points: List[HeartRateDataPoint]
    ) -> str:
        """
        计算心率趋势
        
        Args:
            data_points: 数据点列表
            
        Returns:
            趋势描述: "rising", "falling", "stable", "variable"
        """
        if len(data_points) < 2:
            return "stable"
        
        # 计算整体变化
        first_hr = data_points[0].heart_rate
        last_hr = data_points[-1].heart_rate
        overall_change = last_hr - first_hr
        
        # 计算波动性
        hr_values = [dp.heart_rate for dp in data_points]
        avg_hr = sum(hr_values) / len(hr_values)
        variance = sum((hr - avg_hr) ** 2 for hr in hr_values) / len(hr_values)
        std_dev = variance ** 0.5
        
        # 判断趋势
        change_threshold = 10  # bpm
        variability_threshold = 8  # 标准差阈值
        
        if std_dev > variability_threshold:
            return "variable"
        elif overall_change > change_threshold:
            return "rising"
        elif overall_change < -change_threshold:
            return "falling"
        else:
            return "stable"
    
    def map_heart_rate_to_stages(
        self,
        hr_data: HeartRateExtractionResult,
        stage_times: Dict[str, float]
    ) -> HeartRateMappingResult:
        """
        将心率数据映射到各赛事阶段
        
        Args:
            hr_data: 心率提取结果
            stage_times: 各阶段用时字典
            
        Returns:
            HeartRateMappingResult 对象
        """
        if not hr_data.success or not hr_data.data_points:
            return HeartRateMappingResult(
                success=False,
                error_message="心率数据无效或为空"
            )
        
        logger.info(f"[HeartRateMapper] 映射 {len(hr_data.data_points)} 个心率点到赛事阶段")
        
        # 构建时间线
        timeline = self.build_race_timeline(stage_times)
        
        if not timeline:
            return HeartRateMappingResult(
                success=False,
                error_message="无法构建赛事时间线，阶段时间数据可能缺失"
            )
        
        # 创建结果
        result = HeartRateMappingResult(success=True)
        
        run_hr_values = []
        workout_hr_values = []
        all_hr_values = []
        
        peak_hr = 0
        peak_stage = None
        lowest_hr = float('inf')
        lowest_stage = None
        
        # 遍历每个阶段
        for stage_enum, stage_name, start_time, end_time in timeline:
            stage_id = stage_enum.value
            stage_type = self._classify_stage_type(stage_id)
            
            # 筛选属于该阶段的心率数据点
            stage_data_points = [
                dp for dp in hr_data.data_points
                if start_time <= dp.timestamp_seconds < end_time
            ]
            
            # 计算统计数据
            stage_stats = StageHeartRateStats(
                stage_id=stage_id,
                stage_name=stage_name,
                stage_type=stage_type,
                start_time=start_time,
                end_time=end_time,
                duration=end_time - start_time,
                data_points=stage_data_points
            )
            
            if stage_data_points:
                hr_values = [dp.heart_rate for dp in stage_data_points]
                stage_stats.min_hr = min(hr_values)
                stage_stats.max_hr = max(hr_values)
                stage_stats.avg_hr = sum(hr_values) / len(hr_values)
                stage_stats.entry_hr = stage_data_points[0].heart_rate
                stage_stats.exit_hr = stage_data_points[-1].heart_rate
                stage_stats.hr_change = stage_stats.exit_hr - stage_stats.entry_hr
                stage_stats.trend = self._calculate_trend(stage_data_points)
                
                # 收集统计数据
                all_hr_values.extend(hr_values)
                if stage_type == "run":
                    run_hr_values.extend(hr_values)
                else:
                    workout_hr_values.extend(hr_values)
                
                # 更新峰值/最低值阶段
                if stage_stats.max_hr > peak_hr:
                    peak_hr = stage_stats.max_hr
                    peak_stage = stage_name
                if stage_stats.min_hr < lowest_hr:
                    lowest_hr = stage_stats.min_hr
                    lowest_stage = stage_name
            
            result.stages.append(stage_stats)
        
        # 计算整体统计
        if all_hr_values:
            result.total_min_hr = min(all_hr_values)
            result.total_max_hr = max(all_hr_values)
            result.total_avg_hr = sum(all_hr_values) / len(all_hr_values)
        
        if run_hr_values:
            result.run_avg_hr = sum(run_hr_values) / len(run_hr_values)
        
        if workout_hr_values:
            result.workout_avg_hr = sum(workout_hr_values) / len(workout_hr_values)
        
        # 计算心率效率
        if result.run_avg_hr and result.workout_avg_hr:
            result.hr_efficiency = result.workout_avg_hr / result.run_avg_hr
        
        result.peak_hr_stage = peak_stage
        result.lowest_hr_stage = lowest_stage
        
        # 执行配速脱钩分析
        result.decoupling_analysis = self._analyze_decoupling(result.stages)
        
        logger.info(
            f"[HeartRateMapper] 映射完成: "
            f"跑步平均心率 {result.run_avg_hr:.1f if result.run_avg_hr else 'N/A'}, "
            f"功能站平均心率 {result.workout_avg_hr:.1f if result.workout_avg_hr else 'N/A'}"
        )
        
        return result
    
    def _analyze_decoupling(
        self,
        stages: List[StageHeartRateStats]
    ) -> Dict[str, Any]:
        """
        分析心率配速脱钩
        
        比较前半程和后半程的心率变化，
        如果后半程心率明显升高而配速不变或下降，说明存在心率脱钩
        
        Args:
            stages: 阶段心率统计列表
            
        Returns:
            脱钩分析结果
        """
        if len(stages) < 4:
            return {"analyzable": False, "reason": "阶段数据不足"}
        
        # 提取跑步阶段
        run_stages = [s for s in stages if s.stage_type == "run" and s.avg_hr is not None]
        
        if len(run_stages) < 4:
            return {"analyzable": False, "reason": "跑步阶段数据不足"}
        
        # 前半程和后半程
        mid_point = len(run_stages) // 2
        first_half = run_stages[:mid_point]
        second_half = run_stages[mid_point:]
        
        first_half_avg = sum(s.avg_hr for s in first_half) / len(first_half)
        second_half_avg = sum(s.avg_hr for s in second_half) / len(second_half)
        
        hr_drift = second_half_avg - first_half_avg
        hr_drift_pct = (hr_drift / first_half_avg) * 100
        
        # 判断脱钩程度
        if hr_drift_pct > 10:
            decoupling_level = "severe"
            interpretation = "严重脱钩：后半程心率显著升高，可能存在过度疲劳或配速策略问题"
        elif hr_drift_pct > 5:
            decoupling_level = "moderate"
            interpretation = "中度脱钩：后半程心率有所上升，建议优化配速策略"
        elif hr_drift_pct > 2:
            decoupling_level = "mild"
            interpretation = "轻度脱钩：心率漂移在可接受范围内"
        else:
            decoupling_level = "none"
            interpretation = "无明显脱钩：心率控制良好，配速策略合理"
        
        return {
            "analyzable": True,
            "first_half_avg_hr": round(first_half_avg, 1),
            "second_half_avg_hr": round(second_half_avg, 1),
            "hr_drift": round(hr_drift, 1),
            "hr_drift_percentage": round(hr_drift_pct, 1),
            "decoupling_level": decoupling_level,
            "interpretation": interpretation,
            "stages_analyzed": {
                "first_half": [s.stage_name for s in first_half],
                "second_half": [s.stage_name for s in second_half],
            }
        }
    
    def get_stage_comparison(
        self,
        mapping_result: HeartRateMappingResult
    ) -> Dict[str, Any]:
        """
        获取阶段对比分析
        
        Args:
            mapping_result: 映射结果
            
        Returns:
            阶段对比分析字典
        """
        if not mapping_result.success:
            return {"error": "映射结果无效"}
        
        run_stages = []
        workout_stages = []
        
        for stage in mapping_result.stages:
            stage_data = {
                "name": stage.stage_name,
                "avg_hr": round(stage.avg_hr, 1) if stage.avg_hr else None,
                "max_hr": stage.max_hr,
                "trend": stage.trend,
            }
            
            if stage.stage_type == "run":
                run_stages.append(stage_data)
            else:
                workout_stages.append(stage_data)
        
        return {
            "run_stages": run_stages,
            "workout_stages": workout_stages,
            "summary": {
                "highest_hr_run": max(
                    (s for s in run_stages if s["max_hr"]),
                    key=lambda x: x["max_hr"],
                    default=None
                ),
                "highest_hr_workout": max(
                    (s for s in workout_stages if s["max_hr"]),
                    key=lambda x: x["max_hr"],
                    default=None
                ),
                "most_demanding": mapping_result.peak_hr_stage,
                "best_recovery": mapping_result.lowest_hr_stage,
            }
        }
    
    def generate_chart_data(
        self,
        mapping_result: HeartRateMappingResult,
        hr_data: HeartRateExtractionResult
    ) -> Dict[str, Any]:
        """
        生成用于图表展示的数据
        
        Args:
            mapping_result: 映射结果
            hr_data: 原始心率数据
            
        Returns:
            图表数据字典
        """
        # 心率曲线数据
        timeline_data = [
            {
                "time": dp.timestamp_formatted,
                "seconds": dp.timestamp_seconds,
                "hr": dp.heart_rate
            }
            for dp in hr_data.data_points
        ]
        
        # 阶段标记数据
        stage_markers = []
        for stage in mapping_result.stages:
            stage_markers.append({
                "name": stage.stage_name,
                "start": stage.start_time,
                "end": stage.end_time,
                "type": stage.stage_type,
                "avg_hr": round(stage.avg_hr, 1) if stage.avg_hr else None,
            })
        
        # 阶段平均心率柱状图数据
        stage_bar_data = [
            {
                "name": stage.stage_name,
                "value": round(stage.avg_hr, 1) if stage.avg_hr else 0,
                "type": stage.stage_type,
            }
            for stage in mapping_result.stages
        ]
        
        return {
            "timeline": timeline_data,
            "stage_markers": stage_markers,
            "stage_bar": stage_bar_data,
            "statistics": {
                "overall_avg": round(mapping_result.total_avg_hr, 1) if mapping_result.total_avg_hr else None,
                "run_avg": round(mapping_result.run_avg_hr, 1) if mapping_result.run_avg_hr else None,
                "workout_avg": round(mapping_result.workout_avg_hr, 1) if mapping_result.workout_avg_hr else None,
            }
        }


# 全局心率映射器实例
heart_rate_mapper = HeartRateMapper()
