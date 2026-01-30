"""
数据预计算提供器 - Data Provider
并发预计算所有章节所需数据，替代旧架构中 Agent 动态调用 Search 的模式
"""
import asyncio
import logging
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ...db.database import async_session_maker
from ...db.models import Result

logger = logging.getLogger(__name__)


# ==================== 数据类型定义 ====================

@dataclass
class HeartRateDataPoint:
    """心率数据点"""
    timestamp_seconds: int  # 距离开始的秒数
    heart_rate: int  # 心率值 (bpm)


@dataclass
class MappedHeartRateData:
    """心率数据（可选）"""
    avg_heart_rate: Optional[float] = None
    max_heart_rate: Optional[float] = None
    min_heart_rate: Optional[float] = None
    zones: Dict[str, float] = field(default_factory=dict)  # zone_name -> time_in_zone
    # 时序心率数据（从 VL 模型提取）
    data_points: List[HeartRateDataPoint] = field(default_factory=list)
    # 关键事件
    peak_moments: List[Dict[str, Any]] = field(default_factory=list)
    low_moments: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class AthleteResultData:
    """运动员成绩详情"""
    name: str = ""
    nationality: Optional[str] = None
    gender: str = ""
    division: str = ""
    age_group: Optional[str] = None
    total_time: Optional[float] = None  # 分钟
    run_time: Optional[float] = None
    work_time: Optional[float] = None
    roxzone_time: Optional[float] = None
    # 8段跑步时间
    run1_time: Optional[float] = None
    run2_time: Optional[float] = None
    run3_time: Optional[float] = None
    run4_time: Optional[float] = None
    run5_time: Optional[float] = None
    run6_time: Optional[float] = None
    run7_time: Optional[float] = None
    run8_time: Optional[float] = None
    # 8个功能站时间
    skierg_time: Optional[float] = None
    sled_push_time: Optional[float] = None
    sled_pull_time: Optional[float] = None
    burpee_broad_jump_time: Optional[float] = None
    row_erg_time: Optional[float] = None
    farmers_carry_time: Optional[float] = None
    sandbag_lunges_time: Optional[float] = None
    wall_balls_time: Optional[float] = None
    

@dataclass
class FieldStats:
    """单个字段的统计数据"""
    avg: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None
    median: Optional[float] = None
    p10: Optional[float] = None  # 前10%阈值
    p25: Optional[float] = None  # 前25%阈值
    p75: Optional[float] = None  # 后25%阈值


@dataclass
class DivisionStatsData:
    """组别统计数据"""
    participant_count: int = 0
    gender: str = ""
    division: str = ""
    # 各字段统计 (字段名 -> FieldStats)
    total_time: Optional[FieldStats] = None
    run_time: Optional[FieldStats] = None
    work_time: Optional[FieldStats] = None
    roxzone_time: Optional[FieldStats] = None
    # 跑步分段统计
    run1_time: Optional[FieldStats] = None
    run2_time: Optional[FieldStats] = None
    run3_time: Optional[FieldStats] = None
    run4_time: Optional[FieldStats] = None
    run5_time: Optional[FieldStats] = None
    run6_time: Optional[FieldStats] = None
    run7_time: Optional[FieldStats] = None
    run8_time: Optional[FieldStats] = None
    # 功能站分段统计
    skierg_time: Optional[FieldStats] = None
    sled_push_time: Optional[FieldStats] = None
    sled_pull_time: Optional[FieldStats] = None
    burpee_broad_jump_time: Optional[FieldStats] = None
    row_erg_time: Optional[FieldStats] = None
    farmers_carry_time: Optional[FieldStats] = None
    sandbag_lunges_time: Optional[FieldStats] = None
    wall_balls_time: Optional[FieldStats] = None


@dataclass
class SegmentComparisonItem:
    """单段对比数据"""
    segment_name: str = ""
    segment_field: str = ""
    segment_type: str = ""  # "run" 或 "station"
    athlete_time: Optional[float] = None
    avg_time: Optional[float] = None
    min_time: Optional[float] = None
    diff_seconds: float = 0.0  # (运动员 - 平均) * 60
    diff_percent: float = 0.0  # 差异百分比
    percentile: float = 0.0  # 百分位 (1-100)
    rank: int = 0
    total_participants: int = 0


@dataclass
class SegmentComparisonData:
    """16段分段对比数据"""
    segments: List[SegmentComparisonItem] = field(default_factory=list)
    
    @property
    def running_segments(self) -> List[SegmentComparisonItem]:
        """跑步分段"""
        return [s for s in self.segments if s.segment_type == "run"]
    
    @property
    def station_segments(self) -> List[SegmentComparisonItem]:
        """功能站分段"""
        return [s for s in self.segments if s.segment_type == "station"]


@dataclass
class PercentileRankingData:
    """百分位排名数据"""
    overall_rank: int = 0
    overall_total: int = 0
    overall_percentile: float = 0.0  # 前X%
    gender_rank: int = 0
    gender_total: int = 0
    gender_percentile: float = 0.0
    division_rank: int = 0
    division_total: int = 0
    division_percentile: float = 0.0


@dataclass
class LapTimeData:
    """单圈时间数据"""
    lap: int = 0
    run_time: float = 0.0
    station_time: float = 0.0
    lap_time: float = 0.0  # run + station
    station_name: str = ""


@dataclass
class PacingAnalysisData:
    """配速分析数据"""
    first_half_time: float = 0.0  # 前4圈总时间
    second_half_time: float = 0.0  # 后4圈总时间
    half_diff_seconds: float = 0.0  # (后半程 - 前半程) * 60
    pace_decay_percent: float = 0.0  # 配速衰减百分比
    avg_pace_decay: float = 0.0  # 组别平均衰减
    strategy_type: str = ""  # "positive" / "negative" / "even"
    lap_times: List[LapTimeData] = field(default_factory=list)


@dataclass
class TimeLossItem:
    """时间损耗项"""
    category: str = ""  # "transition" / "pacing" / "station"
    description: str = ""
    loss_seconds: float = 0.0  # 损耗秒数
    reference_value: Optional[float] = None  # 参考值
    athlete_value: Optional[float] = None  # 运动员值


@dataclass
class TimeLossAnalysisData:
    """时间损耗分析数据"""
    total_loss_seconds: float = 0.0
    transition_loss: Optional[TimeLossItem] = None  # 转换区损耗
    pacing_loss: Optional[TimeLossItem] = None  # 配速崩盘损耗
    station_losses: List[TimeLossItem] = field(default_factory=list)  # 功能站技术损耗


@dataclass 
class CohortPeerData:
    """队列中的对手数据"""
    name: str = ""
    total_time: float = 0.0
    rank: int = 0


@dataclass
class CohortAnalysisData:
    """队列分析数据（同组中表现接近的选手）"""
    target_rank: int = 0
    peer_range: str = ""  # 例如 "排名 5-15"
    peers_ahead: List[CohortPeerData] = field(default_factory=list)  # 前面的5名
    peers_behind: List[CohortPeerData] = field(default_factory=list)  # 后面的5名
    time_to_next_level: Optional[float] = None  # 距离前一档的时间差（秒）


@dataclass
class HistoryRaceData:
    """历史比赛记录"""
    season: int = 0
    location: str = ""
    division: str = ""
    total_time: float = 0.0
    division_rank: int = 0
    participant_count: int = 0


@dataclass
class AthleteHistoryData:
    """运动员历史成绩数据"""
    races: List[HistoryRaceData] = field(default_factory=list)
    total_races: int = 0
    best_time: Optional[float] = None
    best_rank: Optional[int] = None
    improvement_trend: Optional[str] = None  # "improving" / "stable" / "declining"


@dataclass
class PredictionData:
    """预测数据 (V2.1新增)"""
    time_bin: str = ""
    current_time_seconds: int = 0
    sample_size: int = 0
    improvement_rate: float = 0.0
    avg_improvement: int = 0
    variance: int = 0
    tiers: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    distribution_curve: List[List[float]] = field(default_factory=list)


@dataclass
class PredictionSplitBreakdown:
    """预测分段拆解数据 (V2.1新增)"""
    time_bin: str = ""
    split_breakdown: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class PacingConsistencyData:
    """配速一致性数据 (V2.1新增)"""
    lap_swing: float = 0.0
    max_lap_swing: float = 0.0
    avg_pace_middle: float = 0.0
    spread: float = 0.0
    cohort_avg_spread: float = 0.0
    vs_cohort: float = 0.0
    consistency_rating: str = ""
    lap_deviations: List[Dict[str, Any]] = field(default_factory=list)
    fastest_lap: int = 0
    slowest_lap: int = 0


@dataclass
class ReportData:
    """报告所需的全部预计算数据"""
    # 基础信息
    season: int = 0
    location: str = ""
    athlete_name: str = ""
    
    # 8种核心数据
    athlete_result: Optional[AthleteResultData] = None
    division_stats: Optional[DivisionStatsData] = None
    segment_comparison: Optional[SegmentComparisonData] = None
    percentile_ranking: Optional[PercentileRankingData] = None
    pacing_analysis: Optional[PacingAnalysisData] = None
    time_loss_analysis: Optional[TimeLossAnalysisData] = None
    cohort_analysis: Optional[CohortAnalysisData] = None
    athlete_history: Optional[AthleteHistoryData] = None
    
    # 可选的心率数据
    heart_rate_data: Optional[MappedHeartRateData] = None
    
    # V2.1 新增预测数据
    prediction_data: Optional[PredictionData] = None
    prediction_split_breakdown: Optional[PredictionSplitBreakdown] = None
    pacing_consistency: Optional[PacingConsistencyData] = None
    
    # 元数据
    data_fetch_errors: Dict[str, str] = field(default_factory=dict)
    
    def is_valid(self) -> bool:
        """检查数据是否有效（至少有运动员成绩）"""
        return self.athlete_result is not None


# ==================== DataProvider 类 ====================

class DataProvider:
    """
    数据预计算提供器
    
    并发获取所有章节所需数据，提供统一的数据访问接口
    """
    
    # 分段字段映射
    RUNNING_SEGMENTS = [
        ("Run 1", "run1_time"),
        ("Run 2", "run2_time"),
        ("Run 3", "run3_time"),
        ("Run 4", "run4_time"),
        ("Run 5", "run5_time"),
        ("Run 6", "run6_time"),
        ("Run 7", "run7_time"),
        ("Run 8", "run8_time"),
    ]
    
    STATION_SEGMENTS = [
        ("SkiErg", "skierg_time"),
        ("Sled Push", "sled_push_time"),
        ("Sled Pull", "sled_pull_time"),
        ("Burpee Broad Jump", "burpee_broad_jump_time"),
        ("Row Erg", "row_erg_time"),
        ("Farmers Carry", "farmers_carry_time"),
        ("Sandbag Lunges", "sandbag_lunges_time"),
        ("Wall Balls", "wall_balls_time"),
    ]
    
    # 统计字段列表
    STATS_FIELDS = [
        "total_time", "run_time", "work_time", "roxzone_time",
        "run1_time", "run2_time", "run3_time", "run4_time",
        "run5_time", "run6_time", "run7_time", "run8_time",
        "skierg_time", "sled_push_time", "sled_pull_time",
        "burpee_broad_jump_time", "row_erg_time", "farmers_carry_time",
        "sandbag_lunges_time", "wall_balls_time",
    ]
    
    async def prepare_all_data(
        self,
        season: int,
        location: str,
        athlete_name: str,
        heart_rate_data: Optional[MappedHeartRateData] = None,
    ) -> ReportData:
        """
        并发预计算所有章节数据
        
        Args:
            season: 赛季
            location: 比赛地点
            athlete_name: 运动员姓名
            heart_rate_data: 可选的心率数据
            
        Returns:
            ReportData: 包含所有预计算数据的对象
        """
        logger.info(f"开始预计算报告数据: season={season}, location={location}, athlete={athlete_name}")
        
        report_data = ReportData(
            season=season,
            location=location,
            athlete_name=athlete_name,
            heart_rate_data=heart_rate_data,
        )
        
        # Step 1: 首先获取运动员基础数据（其他数据依赖此数据）
        try:
            athlete_result = await self._fetch_athlete_result(season, location, athlete_name)
            report_data.athlete_result = athlete_result
        except Exception as e:
            logger.error(f"获取运动员成绩失败: {e}")
            report_data.data_fetch_errors["athlete_result"] = str(e)
            return report_data  # 无法继续，返回空数据
        
        if athlete_result is None:
            logger.warning(f"未找到运动员数据: {athlete_name}")
            report_data.data_fetch_errors["athlete_result"] = "未找到运动员数据"
            return report_data
        
        gender = athlete_result.gender
        division = athlete_result.division
        
        # Step 2: 并发获取其他所有数据
        tasks = [
            self._safe_fetch(
                "division_stats",
                self._fetch_division_stats(season, location, gender, division)
            ),
            self._safe_fetch(
                "segment_comparison",
                self._fetch_segment_comparison(season, location, athlete_name, athlete_result, gender, division)
            ),
            self._safe_fetch(
                "percentile_ranking",
                self._fetch_percentile_ranking(season, location, athlete_name, athlete_result, gender, division)
            ),
            self._safe_fetch(
                "pacing_analysis",
                self._fetch_pacing_analysis(season, location, athlete_result, gender, division)
            ),
            self._safe_fetch(
                "cohort_analysis",
                self._fetch_cohort_analysis(season, location, athlete_name, athlete_result, gender, division)
            ),
            self._safe_fetch(
                "athlete_history",
                self._fetch_athlete_history(athlete_name)
            ),
            # V2.1 新增: 预测数据
            self._safe_fetch(
                "prediction_data",
                self._fetch_prediction_data(athlete_result, gender, division)
            ),
            self._safe_fetch(
                "prediction_split_breakdown",
                self._fetch_prediction_split_breakdown(athlete_result, gender, division)
            ),
            self._safe_fetch(
                "pacing_consistency",
                self._fetch_pacing_consistency(season, location, athlete_result, gender, division)
            ),
        ]
        
        results = await asyncio.gather(*tasks)
        
        # 处理结果
        for data_type, result in results:
            if isinstance(result, Exception):
                report_data.data_fetch_errors[data_type] = str(result)
                logger.warning(f"获取 {data_type} 失败: {result}")
            else:
                setattr(report_data, data_type, result)
        
        # Step 3: 计算时间损耗分析（依赖前面的数据）
        try:
            time_loss = self._calculate_time_loss_analysis(
                athlete_result,
                report_data.division_stats,
                report_data.segment_comparison,
            )
            report_data.time_loss_analysis = time_loss
        except Exception as e:
            logger.warning(f"计算时间损耗分析失败: {e}")
            report_data.data_fetch_errors["time_loss_analysis"] = str(e)
        
        logger.info(f"报告数据预计算完成，错误数: {len(report_data.data_fetch_errors)}")
        
        
        return report_data
    
    async def _safe_fetch(self, data_type: str, coro) -> tuple:
        """安全执行异步任务，捕获异常"""
        try:
            result = await coro
            return (data_type, result)
        except Exception as e:
            return (data_type, e)
    
    # ==================== 数据获取方法 ====================
    
    async def _fetch_athlete_result(
        self,
        season: int,
        location: str,
        athlete_name: str,
    ) -> Optional[AthleteResultData]:
        """获取运动员单场成绩"""
        async with async_session_maker() as session:
            stmt = select(Result).where(
                Result.season == season,
                Result.location == location,
                Result.name == athlete_name,
            )
            result = await session.execute(stmt)
            row = result.scalar_one_or_none()
            
            if row is None:
                # 尝试模糊匹配
                stmt = select(Result).where(
                    Result.season == season,
                    Result.location == location,
                    Result.name.ilike(f"%{athlete_name}%"),
                ).limit(1)
                result = await session.execute(stmt)
                row = result.scalar_one_or_none()
            
            if row is None:
                return None
            
            return AthleteResultData(
                name=row.name or "",
                nationality=row.nationality,
                gender=row.gender or "",
                division=row.division or "",
                age_group=row.age_group,
                total_time=row.total_time,
                run_time=row.run_time,
                work_time=row.work_time,
                roxzone_time=row.roxzone_time,
                run1_time=row.run1_time,
                run2_time=row.run2_time,
                run3_time=row.run3_time,
                run4_time=row.run4_time,
                run5_time=row.run5_time,
                run6_time=row.run6_time,
                run7_time=row.run7_time,
                run8_time=row.run8_time,
                skierg_time=row.skierg_time,
                sled_push_time=row.sled_push_time,
                sled_pull_time=row.sled_pull_time,
                burpee_broad_jump_time=row.burpee_broad_jump_time,
                row_erg_time=row.row_erg_time,
                farmers_carry_time=row.farmers_carry_time,
                sandbag_lunges_time=row.sandbag_lunges_time,
                wall_balls_time=row.wall_balls_time,
            )
    
    async def _fetch_division_stats(
        self,
        season: int,
        location: str,
        gender: str,
        division: str,
    ) -> Optional[DivisionStatsData]:
        """获取组别统计数据"""
        async with async_session_maker() as session:
            stmt = select(Result).where(
                Result.season == season,
                Result.location == location,
                Result.gender == gender,
                Result.division == division,
                Result.total_time.isnot(None),
            ).order_by(Result.total_time)
            
            result = await session.execute(stmt)
            rows = result.scalars().all()
            
            if not rows:
                return None
            
            stats_data = DivisionStatsData(
                participant_count=len(rows),
                gender=gender,
                division=division,
            )
            
            # 计算各字段统计
            for field_name in self.STATS_FIELDS:
                values = [getattr(r, field_name) for r in rows if getattr(r, field_name) is not None]
                if values:
                    field_stats = self._calculate_field_stats(values)
                    setattr(stats_data, field_name, field_stats)
            
            return stats_data
    
    def _calculate_field_stats(self, values: List[float]) -> FieldStats:
        """计算单字段的统计数据"""
        sorted_vals = sorted(values)
        n = len(sorted_vals)
        
        return FieldStats(
            avg=sum(values) / n,
            min=min(values),
            max=max(values),
            median=sorted_vals[n // 2] if n > 0 else None,
            p10=sorted_vals[max(0, int(n * 0.1) - 1)] if n > 0 else None,
            p25=sorted_vals[max(0, int(n * 0.25) - 1)] if n > 0 else None,
            p75=sorted_vals[min(n - 1, int(n * 0.75))] if n > 0 else None,
        )
    
    async def _fetch_segment_comparison(
        self,
        season: int,
        location: str,
        athlete_name: str,
        athlete_result: AthleteResultData,
        gender: str,
        division: str,
    ) -> Optional[SegmentComparisonData]:
        """获取16段分段对比数据"""
        async with async_session_maker() as session:
            # 获取同组所有选手数据
            stmt = select(Result).where(
                Result.season == season,
                Result.location == location,
                Result.gender == gender,
                Result.division == division,
                Result.total_time.isnot(None),
            ).order_by(Result.total_time)
            
            result = await session.execute(stmt)
            peers = result.scalars().all()
            
            if not peers:
                return None
            
            segments = []
            
            # 跑步分段
            for seg_name, seg_field in self.RUNNING_SEGMENTS:
                item = self._calculate_segment_comparison(
                    seg_name, seg_field, "run",
                    athlete_result, peers
                )
                if item:
                    segments.append(item)
            
            # 功能站分段
            for seg_name, seg_field in self.STATION_SEGMENTS:
                item = self._calculate_segment_comparison(
                    seg_name, seg_field, "station",
                    athlete_result, peers
                )
                if item:
                    segments.append(item)
            
            return SegmentComparisonData(segments=segments)
    
    def _calculate_segment_comparison(
        self,
        seg_name: str,
        seg_field: str,
        seg_type: str,
        athlete_result: AthleteResultData,
        peers: List[Result],
    ) -> Optional[SegmentComparisonItem]:
        """计算单段对比数据"""
        athlete_time = getattr(athlete_result, seg_field)
        if athlete_time is None:
            return None
        
        peer_times = [getattr(p, seg_field) for p in peers if getattr(p, seg_field) is not None]
        if not peer_times:
            return None
        
        avg_time = sum(peer_times) / len(peer_times)
        min_time = min(peer_times)
        
        # 计算排名和百分位
        rank = sum(1 for t in peer_times if t < athlete_time) + 1
        percentile = (rank / len(peer_times)) * 100
        
        diff_seconds = (athlete_time - avg_time) * 60
        diff_percent = ((athlete_time - avg_time) / avg_time) * 100 if avg_time > 0 else 0
        
        return SegmentComparisonItem(
            segment_name=seg_name,
            segment_field=seg_field,
            segment_type=seg_type,
            athlete_time=athlete_time,
            avg_time=avg_time,
            min_time=min_time,
            diff_seconds=round(diff_seconds, 1),
            diff_percent=round(diff_percent, 1),
            percentile=round(percentile, 1),
            rank=rank,
            total_participants=len(peer_times),
        )
    
    async def _fetch_percentile_ranking(
        self,
        season: int,
        location: str,
        athlete_name: str,
        athlete_result: AthleteResultData,
        gender: str,
        division: str,
    ) -> Optional[PercentileRankingData]:
        """获取百分位排名数据"""
        athlete_time = athlete_result.total_time
        if athlete_time is None:
            return None
        
        async with async_session_maker() as session:
            # 总体排名
            overall_stmt = select(Result).where(
                Result.season == season,
                Result.location == location,
                Result.total_time.isnot(None),
            ).order_by(Result.total_time)
            overall_result = await session.execute(overall_stmt)
            overall_rows = overall_result.scalars().all()
            
            overall_rank = sum(1 for r in overall_rows if r.total_time and r.total_time < athlete_time) + 1
            overall_total = len(overall_rows)
            
            # 性别组排名
            gender_stmt = select(Result).where(
                Result.season == season,
                Result.location == location,
                Result.gender == gender,
                Result.total_time.isnot(None),
            ).order_by(Result.total_time)
            gender_result = await session.execute(gender_stmt)
            gender_rows = gender_result.scalars().all()
            
            gender_rank = sum(1 for r in gender_rows if r.total_time and r.total_time < athlete_time) + 1
            gender_total = len(gender_rows)
            
            # 组别排名
            division_stmt = select(Result).where(
                Result.season == season,
                Result.location == location,
                Result.gender == gender,
                Result.division == division,
                Result.total_time.isnot(None),
            ).order_by(Result.total_time)
            division_result = await session.execute(division_stmt)
            division_rows = division_result.scalars().all()
            
            division_rank = sum(1 for r in division_rows if r.total_time and r.total_time < athlete_time) + 1
            division_total = len(division_rows)
        
        return PercentileRankingData(
            overall_rank=overall_rank,
            overall_total=overall_total,
            overall_percentile=round((overall_rank / overall_total) * 100, 1) if overall_total > 0 else 0,
            gender_rank=gender_rank,
            gender_total=gender_total,
            gender_percentile=round((gender_rank / gender_total) * 100, 1) if gender_total > 0 else 0,
            division_rank=division_rank,
            division_total=division_total,
            division_percentile=round((division_rank / division_total) * 100, 1) if division_total > 0 else 0,
        )
    
    async def _fetch_pacing_analysis(
        self,
        season: int,
        location: str,
        athlete_result: AthleteResultData,
        gender: str,
        division: str,
    ) -> Optional[PacingAnalysisData]:
        """获取配速分析数据"""
        # 计算每圈时间
        lap_fields = [
            ("run1_time", "skierg_time", "SkiErg"),
            ("run2_time", "sled_push_time", "Sled Push"),
            ("run3_time", "sled_pull_time", "Sled Pull"),
            ("run4_time", "burpee_broad_jump_time", "Burpee Broad Jump"),
            ("run5_time", "row_erg_time", "Row Erg"),
            ("run6_time", "farmers_carry_time", "Farmers Carry"),
            ("run7_time", "sandbag_lunges_time", "Sandbag Lunges"),
            ("run8_time", "wall_balls_time", "Wall Balls"),
        ]
        
        lap_times = []
        for i, (run_field, station_field, station_name) in enumerate(lap_fields):
            run_time = getattr(athlete_result, run_field) or 0
            station_time = getattr(athlete_result, station_field) or 0
            lap_times.append(LapTimeData(
                lap=i + 1,
                run_time=run_time,
                station_time=station_time,
                lap_time=run_time + station_time,
                station_name=station_name,
            ))
        
        # 前后半程
        first_half = sum(lap.lap_time for lap in lap_times[:4])
        second_half = sum(lap.lap_time for lap in lap_times[4:])
        
        half_diff_seconds = (second_half - first_half) * 60
        pace_decay = ((second_half - first_half) / first_half * 100) if first_half > 0 else 0
        
        # 判断配速策略类型
        if pace_decay > 5:
            strategy_type = "positive"  # 前快后慢
        elif pace_decay < -5:
            strategy_type = "negative"  # 前慢后快
        else:
            strategy_type = "even"  # 均匀配速
        
        # 获取组别平均衰减
        avg_decay = await self._calculate_avg_pace_decay(season, location, gender, division)
        
        return PacingAnalysisData(
            first_half_time=first_half,
            second_half_time=second_half,
            half_diff_seconds=round(half_diff_seconds, 1),
            pace_decay_percent=round(pace_decay, 1),
            avg_pace_decay=round(avg_decay, 1),
            strategy_type=strategy_type,
            lap_times=lap_times,
        )
    
    async def _calculate_avg_pace_decay(
        self,
        season: int,
        location: str,
        gender: str,
        division: str,
    ) -> float:
        """计算组别平均配速衰减"""
        async with async_session_maker() as session:
            stmt = select(Result).where(
                Result.season == season,
                Result.location == location,
                Result.gender == gender,
                Result.division == division,
                Result.total_time.isnot(None),
            )
            result = await session.execute(stmt)
            peers = result.scalars().all()
        
        decays = []
        for p in peers:
            first_half = sum([
                getattr(p, f"run{i}_time") or 0 for i in range(1, 5)
            ]) + sum([
                p.skierg_time or 0,
                p.sled_push_time or 0,
                p.sled_pull_time or 0,
                p.burpee_broad_jump_time or 0,
            ])
            
            second_half = sum([
                getattr(p, f"run{i}_time") or 0 for i in range(5, 9)
            ]) + sum([
                p.row_erg_time or 0,
                p.farmers_carry_time or 0,
                p.sandbag_lunges_time or 0,
                p.wall_balls_time or 0,
            ])
            
            if first_half > 0:
                decays.append((second_half - first_half) / first_half * 100)
        
        return sum(decays) / len(decays) if decays else 0
    
    async def _fetch_cohort_analysis(
        self,
        season: int,
        location: str,
        athlete_name: str,
        athlete_result: AthleteResultData,
        gender: str,
        division: str,
    ) -> Optional[CohortAnalysisData]:
        """获取队列分析数据（排名相近的选手）"""
        athlete_time = athlete_result.total_time
        if athlete_time is None:
            return None
        
        async with async_session_maker() as session:
            stmt = select(Result).where(
                Result.season == season,
                Result.location == location,
                Result.gender == gender,
                Result.division == division,
                Result.total_time.isnot(None),
            ).order_by(Result.total_time)
            
            result = await session.execute(stmt)
            rows = result.scalars().all()
        
        if not rows:
            return None
        
        # 找到运动员的排名
        target_idx = -1
        for i, r in enumerate(rows):
            if r.name == athlete_name or (r.total_time and abs(r.total_time - athlete_time) < 0.001):
                target_idx = i
                break
        
        if target_idx == -1:
            return None
        
        target_rank = target_idx + 1
        
        # 获取前面5名和后面5名
        peers_ahead = []
        for i in range(max(0, target_idx - 5), target_idx):
            r = rows[i]
            peers_ahead.append(CohortPeerData(
                name=r.name or "",
                total_time=r.total_time or 0,
                rank=i + 1,
            ))
        
        peers_behind = []
        for i in range(target_idx + 1, min(len(rows), target_idx + 6)):
            r = rows[i]
            peers_behind.append(CohortPeerData(
                name=r.name or "",
                total_time=r.total_time or 0,
                rank=i + 1,
            ))
        
        # 计算距离前一档的时间差
        time_to_next = None
        if target_idx > 0:
            prev_time = rows[target_idx - 1].total_time
            if prev_time:
                time_to_next = (athlete_time - prev_time) * 60  # 转换为秒
        
        start_rank = max(1, target_rank - 5)
        end_rank = min(len(rows), target_rank + 5)
        
        return CohortAnalysisData(
            target_rank=target_rank,
            peer_range=f"排名 {start_rank}-{end_rank}",
            peers_ahead=peers_ahead,
            peers_behind=peers_behind,
            time_to_next_level=round(time_to_next, 1) if time_to_next else None,
        )
    
    async def _fetch_athlete_history(
        self,
        athlete_name: str,
        limit: int = 10,
    ) -> Optional[AthleteHistoryData]:
        """获取运动员历史成绩"""
        async with async_session_maker() as session:
            stmt = select(Result).where(
                Result.name == athlete_name,
                Result.total_time.isnot(None),
            ).order_by(Result.season.desc(), Result.id.desc()).limit(limit)
            
            result = await session.execute(stmt)
            rows = result.scalars().all()
        
        if not rows:
            return AthleteHistoryData(races=[], total_races=0)
        
        races = []
        best_time = None
        best_rank = None
        
        for r in rows:
            # 计算该场比赛的组别排名
            async with async_session_maker() as session:
                peers_stmt = select(Result).where(
                    Result.season == r.season,
                    Result.location == r.location,
                    Result.gender == r.gender,
                    Result.division == r.division,
                    Result.total_time.isnot(None),
                ).order_by(Result.total_time)
                peers_result = await session.execute(peers_stmt)
                peers = peers_result.scalars().all()
            
            rank = 1
            for i, p in enumerate(peers):
                if p.name == athlete_name:
                    rank = i + 1
                    break
            
            race_data = HistoryRaceData(
                season=r.season,
                location=r.location or "",
                division=r.division or "",
                total_time=r.total_time or 0,
                division_rank=rank,
                participant_count=len(peers),
            )
            races.append(race_data)
            
            # 更新最佳成绩
            if r.total_time:
                if best_time is None or r.total_time < best_time:
                    best_time = r.total_time
                    best_rank = rank
        
        # 分析进步趋势
        trend = None
        if len(races) >= 2:
            recent_times = [r.total_time for r in races[:3] if r.total_time > 0]
            older_times = [r.total_time for r in races[-3:] if r.total_time > 0]
            if recent_times and older_times:
                recent_avg = sum(recent_times) / len(recent_times)
                older_avg = sum(older_times) / len(older_times)
                if recent_avg < older_avg * 0.98:
                    trend = "improving"
                elif recent_avg > older_avg * 1.02:
                    trend = "declining"
                else:
                    trend = "stable"
        
        return AthleteHistoryData(
            races=races,
            total_races=len(races),
            best_time=best_time,
            best_rank=best_rank,
            improvement_trend=trend,
        )
    
    # ==================== 时间损耗计算 ====================
    
    def _calculate_time_loss_analysis(
        self,
        athlete_result: AthleteResultData,
        division_stats: Optional[DivisionStatsData],
        segment_comparison: Optional[SegmentComparisonData],
    ) -> TimeLossAnalysisData:
        """
        计算时间损耗分析
        
        损耗计算逻辑:
        1. 转换区损耗 = (运动员Roxzone - 组别平均Roxzone) * 60秒
        2. 配速崩盘损耗 = (Run8 - Run1~4平均) * 60秒
        3. 功能站技术损耗 = 与组别TOP25%差距
        """
        analysis = TimeLossAnalysisData()
        total_loss = 0.0
        
        
        # 1. 转换区损耗
        if athlete_result.roxzone_time and division_stats and division_stats.roxzone_time:
            avg_roxzone = division_stats.roxzone_time.avg
            if avg_roxzone:
                loss_seconds = (athlete_result.roxzone_time - avg_roxzone) * 60
                if loss_seconds > 0:  # 只计算正损耗
                    analysis.transition_loss = TimeLossItem(
                        category="transition",
                        description="转换区/Roxzone 损耗",
                        loss_seconds=round(loss_seconds, 1),
                        reference_value=round(avg_roxzone, 2),
                        athlete_value=round(athlete_result.roxzone_time, 2),
                    )
                    total_loss += loss_seconds
        
        # 2. 配速崩盘损耗（计算Run5-Run8相对于前4段平均的差距）
        run_times = [
            athlete_result.run1_time,
            athlete_result.run2_time,
            athlete_result.run3_time,
            athlete_result.run4_time,
        ]
        later_runs = [
            (5, athlete_result.run5_time),
            (6, athlete_result.run6_time),
            (7, athlete_result.run7_time),
            (8, athlete_result.run8_time),
        ]
        
        valid_run_times = [t for t in run_times if t is not None]
        if valid_run_times:
            avg_first_4 = sum(valid_run_times) / len(valid_run_times)
            pacing_losses = []
            
            for run_num, run_time in later_runs:
                if run_time:
                    pacing_loss_seconds = (run_time - avg_first_4) * 60
                    if pacing_loss_seconds > 20:  # 降低阈值到20秒，捕捉更多损耗
                        pacing_losses.append({
                            'run_num': run_num,
                            'loss_seconds': pacing_loss_seconds,
                            'run_time': run_time,
                        })
            
            # 如果有多段配速问题，选择最严重的一段作为主要损耗
            if pacing_losses:
                # 按损耗大小排序
                pacing_losses.sort(key=lambda x: x['loss_seconds'], reverse=True)
                main_loss = pacing_losses[0]
                
                # 如果有多个损耗段，在描述中说明
                if len(pacing_losses) > 1:
                    other_runs = [f"Run{p['run_num']}" for p in pacing_losses[1:]]
                    description = f"配速崩盘损耗（Run{main_loss['run_num']} vs 前4段平均，{', '.join(other_runs)}也有损耗）"
                else:
                    description = f"配速崩盘损耗（Run{main_loss['run_num']} vs 前4段平均）"
                
                analysis.pacing_loss = TimeLossItem(
                    category="pacing",
                    description=description,
                    loss_seconds=round(main_loss['loss_seconds'], 1),
                    reference_value=round(avg_first_4, 2),
                    athlete_value=round(main_loss['run_time'], 2),
                )
                total_loss += main_loss['loss_seconds']
        
        # 3. 功能站技术损耗（与平均值和TOP25%比较，取较大的正差距）
        if segment_comparison and division_stats:
            station_losses = []
            
            
            for segment in segment_comparison.station_segments:
                field_stats = getattr(division_stats, segment.segment_field, None)
                if field_stats and segment.athlete_time:
                    # 计算与平均值和TOP25%的差距，取较大的正差距
                    gap_vs_avg = None
                    gap_vs_p25 = None
                    
                    if field_stats.avg:
                        gap_vs_avg = (segment.athlete_time - field_stats.avg) * 60
                    if field_stats.p25:
                        gap_vs_p25 = (segment.athlete_time - field_stats.p25) * 60
                    
                    # 选择较大的正差距（优先使用平均值，如果平均值不可用则使用TOP25%）
                    gap_seconds = None
                    reference_value = None
                    reference_label = None
                    
                    if gap_vs_avg is not None and gap_vs_avg > 0:
                        gap_seconds = gap_vs_avg
                        reference_value = field_stats.avg
                        reference_label = "平均值"
                    elif gap_vs_p25 is not None and gap_vs_p25 > 0:
                        gap_seconds = gap_vs_p25
                        reference_value = field_stats.p25
                        reference_label = "TOP25%"
                    
                    # 如果与平均值差距为正但小于TOP25%，仍然计入损耗（说明有改进空间）
                    if gap_seconds is None and gap_vs_avg is not None and gap_vs_avg > 0:
                        gap_seconds = gap_vs_avg
                        reference_value = field_stats.avg
                        reference_label = "平均值"
                    
                    if gap_seconds and gap_seconds > 5:  # 降低阈值到5秒，捕捉更多损耗
                        station_losses.append(TimeLossItem(
                            category="station",
                            description=f"{segment.segment_name} 技术损耗（vs {reference_label}）",
                            loss_seconds=round(gap_seconds, 1),
                            reference_value=round(reference_value, 2),
                            athlete_value=round(segment.athlete_time, 2),
                        ))
                        total_loss += gap_seconds
            
            # 按损耗大小排序
            station_losses.sort(key=lambda x: x.loss_seconds, reverse=True)
            analysis.station_losses = station_losses
        
        analysis.total_loss_seconds = round(total_loss, 1)
        return analysis
    
    # ==================== V2.1 新增数据获取方法 ====================
    
    async def _fetch_prediction_data(
        self,
        athlete_result: AthleteResultData,
        gender: str,
        division: str,
    ) -> Optional[PredictionData]:
        """获取预测数据"""
        
        if not athlete_result or not athlete_result.total_time:
            return None
        
        try:
            from ...db.models import PredictionStats
            
            # 计算时间区间
            current_minutes = athlete_result.total_time
            bin_start = int(current_minutes // 5) * 5
            bin_end = bin_start + 5
            time_bin = f"{bin_start}-{bin_end}"
            current_seconds = int(current_minutes * 60)
            
            async with async_session_maker() as session:
                result = await session.execute(
                    select(PredictionStats).filter(
                        PredictionStats.time_bin == time_bin,
                        PredictionStats.gender == gender,
                        PredictionStats.division == division
                    )
                )
                stats = result.scalar_one_or_none()
                
                if stats:
                    import json
                    return PredictionData(
                        time_bin=time_bin,
                        current_time_seconds=current_seconds,
                        sample_size=stats.sample_size or 0,
                        improvement_rate=stats.improvement_rate or 0.68,
                        avg_improvement=stats.avg_improvement or 150,
                        variance=stats.variance or 600,
                        tiers={
                            "excellent": {
                                "percentile": 5,
                                "time_seconds": stats.percentile_5,
                                "delta": (stats.percentile_5 or current_seconds) - current_seconds,
                            },
                            "great": {
                                "percentile": 25,
                                "time_seconds": stats.percentile_25,
                                "delta": (stats.percentile_25 or current_seconds) - current_seconds,
                            },
                            "expected": {
                                "percentile": 50,
                                "time_seconds": stats.percentile_50,
                                "delta": (stats.percentile_50 or current_seconds) - current_seconds,
                            },
                            "subpar": {
                                "percentile": 75,
                                "time_seconds": stats.percentile_75,
                                "delta": (stats.percentile_75 or current_seconds) - current_seconds,
                            },
                            "poor": {
                                "percentile": 95,
                                "time_seconds": stats.percentile_95,
                                "delta": (stats.percentile_95 or current_seconds) - current_seconds,
                            },
                        },
                        distribution_curve=json.loads(stats.distribution_curve) if stats.distribution_curve else [],
                    )
            
            # 无预计算数据时使用默认值
            avg_improvement = 150
            variance = 600
            estimated_next = current_seconds - avg_improvement
            
            
            return PredictionData(
                time_bin=time_bin,
                current_time_seconds=current_seconds,
                sample_size=0,
                improvement_rate=0.68,
                avg_improvement=avg_improvement,
                variance=variance,
                tiers={
                    "excellent": {"percentile": 5, "time_seconds": int(estimated_next - 600), "delta": -750},
                    "great": {"percentile": 25, "time_seconds": int(estimated_next - 300), "delta": -450},
                    "expected": {"percentile": 50, "time_seconds": int(estimated_next), "delta": -150},
                    "subpar": {"percentile": 75, "time_seconds": int(estimated_next + 300), "delta": 150},
                    "poor": {"percentile": 95, "time_seconds": int(estimated_next + 600), "delta": 450},
                },
                distribution_curve=[],
            )
        except Exception as pred_err:
            # 返回 None 而不是抛出异常，允许报告继续生成
            return None
    
    async def _fetch_prediction_split_breakdown(
        self,
        athlete_result: AthleteResultData,
        gender: str,
        division: str,
    ) -> Optional[PredictionSplitBreakdown]:
        """获取预测分段拆解数据"""
        if not athlete_result or not athlete_result.total_time:
            return None
        
        async with async_session_maker() as session:
            from ...db.models import PredictionStats
            import json
            
            # 计算时间区间
            current_minutes = athlete_result.total_time
            bin_start = int(current_minutes // 5) * 5
            bin_end = bin_start + 5
            time_bin = f"{bin_start}-{bin_end}"
            
            result = await session.execute(
                select(PredictionStats).filter(
                    PredictionStats.time_bin == time_bin,
                    PredictionStats.gender == gender,
                    PredictionStats.division == division
                )
            )
            stats = result.scalar_one_or_none()
            
            if stats and stats.split_breakdown:
                return PredictionSplitBreakdown(
                    time_bin=time_bin,
                    split_breakdown=json.loads(stats.split_breakdown),
                )
            
            return PredictionSplitBreakdown(time_bin=time_bin, split_breakdown=[])
    
    async def _fetch_pacing_consistency(
        self,
        season: int,
        location: str,
        athlete_result: AthleteResultData,
        gender: str,
        division: str,
    ) -> Optional[PacingConsistencyData]:
        """获取配速一致性数据"""
        if not athlete_result:
            return None
        
        # 获取8段跑步时间
        run_times = []
        for i in range(1, 9):
            run_time = getattr(athlete_result, f"run{i}_time")
            if run_time:
                run_times.append(run_time * 60)  # 转为秒
        
        if len(run_times) < 2:
            return None
        
        # 计算 Lap-to-Lap Swing
        lap_swings = []
        for i in range(1, len(run_times)):
            swing = abs(run_times[i] - run_times[i-1])
            lap_swings.append(swing)
        
        max_lap_swing = max(lap_swings) if lap_swings else 0
        avg_lap_swing = sum(lap_swings) / len(lap_swings) if lap_swings else 0
        
        # 计算 Avg Pace (R2-R7)
        if len(run_times) >= 8:
            middle_runs = run_times[1:7]
            avg_pace_middle = sum(middle_runs) / len(middle_runs)
        else:
            avg_pace_middle = sum(run_times) / len(run_times)
        
        # 计算 Spread
        spread = max(run_times) - min(run_times)
        
        # 评估一致性等级
        if avg_lap_swing < 10:
            consistency_rating = "Excellent"
        elif avg_lap_swing < 20:
            consistency_rating = "Consistent"
        elif avg_lap_swing < 35:
            consistency_rating = "Variable"
        else:
            consistency_rating = "Erratic"
        
        # 计算每圈偏差
        avg_run = sum(run_times) / len(run_times)
        lap_deviations = []
        for i, rt in enumerate(run_times):
            lap_deviations.append({
                "lap": i + 1,
                "time": round(rt, 1),
                "deviation": round(rt - avg_run, 1),
            })
        
        # 组别平均 spread (简化: 使用默认值)
        cohort_avg_spread = spread * 0.85  # 假设组别平均略好
        
        return PacingConsistencyData(
            lap_swing=round(avg_lap_swing, 1),
            max_lap_swing=round(max_lap_swing, 1),
            avg_pace_middle=round(avg_pace_middle, 1),
            spread=round(spread, 1),
            cohort_avg_spread=round(cohort_avg_spread, 1),
            vs_cohort=round(spread - cohort_avg_spread, 1),
            consistency_rating=consistency_rating,
            lap_deviations=lap_deviations,
            fastest_lap=run_times.index(min(run_times)) + 1,
            slowest_lap=run_times.index(max(run_times)) + 1,
        )


# ==================== 全局实例 ====================

_data_provider: Optional[DataProvider] = None


def get_data_provider() -> DataProvider:
    """获取全局 DataProvider 实例"""
    global _data_provider
    if _data_provider is None:
        _data_provider = DataProvider()
    return _data_provider
