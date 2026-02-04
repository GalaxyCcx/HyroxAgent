"""
分段统计服务
使用本地 SQLite 数据库查询
"""
import logging
import math
from typing import Optional, List, Dict, Any

import pandas as pd
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import async_session_maker
from app.db.models import Result

from app.core.exceptions import AthleteNotFoundError, RaceNotFoundError
from app.models.schemas import SplitAnalyticsItem, SplitAnalyticsData
from app.utils.time_format import format_time_short
from app.utils.constants import WORKOUT_STATIONS, RUN_SEGMENTS

logger = logging.getLogger(__name__)

# 分段 key（与 constants 一致）到 Result 表字段名的映射
SEGMENT_KEY_TO_RESULT_ATTR: Dict[str, str] = {}
for seg in RUN_SEGMENTS:
    SEGMENT_KEY_TO_RESULT_ATTR[seg["key"]] = seg["key"]
for st in WORKOUT_STATIONS:
    k = st["key"]
    # Result 表为 snake_case：skiErg_time -> skierg_time, sledPush_time -> sled_push_time
    if k == "skiErg_time":
        SEGMENT_KEY_TO_RESULT_ATTR[k] = "skierg_time"
    elif k == "sledPush_time":
        SEGMENT_KEY_TO_RESULT_ATTR[k] = "sled_push_time"
    elif k == "sledPull_time":
        SEGMENT_KEY_TO_RESULT_ATTR[k] = "sled_pull_time"
    elif k == "burpeeBroadJump_time":
        SEGMENT_KEY_TO_RESULT_ATTR[k] = "burpee_broad_jump_time"
    elif k == "rowErg_time":
        SEGMENT_KEY_TO_RESULT_ATTR[k] = "row_erg_time"
    elif k == "farmersCarry_time":
        SEGMENT_KEY_TO_RESULT_ATTR[k] = "farmers_carry_time"
    elif k == "sandbagLunges_time":
        SEGMENT_KEY_TO_RESULT_ATTR[k] = "sandbag_lunges_time"
    elif k == "wallBalls_time":
        SEGMENT_KEY_TO_RESULT_ATTR[k] = "wall_balls_time"
    else:
        SEGMENT_KEY_TO_RESULT_ATTR[k] = k

# 分段显示名 -> key，供 LLM 返回的 segment 与百分位对应
SEGMENT_NAME_TO_KEY: Dict[str, str] = {s["name"]: s["key"] for s in RUN_SEGMENTS}
SEGMENT_NAME_TO_KEY.update({s["name"]: s["key"] for s in WORKOUT_STATIONS})
# Row Erg 与 constants 里 name 可能不一致，统一用 key
for st in WORKOUT_STATIONS:
    if st["name"] == "Row":
        SEGMENT_NAME_TO_KEY["Row Erg"] = st["key"]
        break


class AnalyticsService:
    """
    分段统计服务
    
    使用本地 SQLite 数据库计算运动员在单场比赛中各分段的排名和与平均值的对比
    """
    
    async def get_split_analytics(
        self,
        season: int,
        location: str,
        athlete_name: str,
    ) -> SplitAnalyticsData:
        """
        获取运动员单场比赛的分段统计
        
        Args:
            season: 赛季
            location: 比赛地点
            athlete_name: 运动员姓名
        
        Returns:
            SplitAnalyticsData: 分段统计数据
        
        Raises:
            RaceNotFoundError: 比赛不存在
            AthleteNotFoundError: 运动员不存在
        """
        logger.info(f"Getting analytics from DB: season={season}, location={location}, name={athlete_name}")
        
        async with async_session_maker() as session:
            # 获取该场比赛的所有数据
            race_stmt = select(Result).where(
                Result.season == season,
                Result.location == location
            )
            race_result = await session.execute(race_stmt)
            all_rows = race_result.scalars().all()
            
            if not all_rows:
                raise RaceNotFoundError(location=location, season=season)
        
        # 转换为 DataFrame
        race_data = self._rows_to_dataframe(all_rows)
        
        # 查找运动员
        athlete_rows = race_data[race_data['name'] == athlete_name]
        
        if len(athlete_rows) == 0:
            # 尝试模糊匹配
            athlete_rows = race_data[
                race_data['name'].str.contains(athlete_name, case=False, na=False)
            ]
            if len(athlete_rows) == 0:
                raise AthleteNotFoundError(athlete_name=athlete_name)
        
        athlete_row = athlete_rows.iloc[0]
        
        # 计算各分段统计
        splits_analytics = []
        
        # 8段跑步
        for segment in RUN_SEGMENTS:
            item = self._calculate_split_analytics(
                race_data=race_data,
                athlete_row=athlete_row,
                split_key=segment['key'],
                split_name=segment['name'],
                split_type='run'
            )
            if item:
                splits_analytics.append(item)
        
        # 8个站点
        for station in WORKOUT_STATIONS:
            item = self._calculate_split_analytics(
                race_data=race_data,
                athlete_row=athlete_row,
                split_key=station['key'],
                split_name=station['name'],
                split_type='workout'
            )
            if item:
                splits_analytics.append(item)
        
        return SplitAnalyticsData(
            athlete_name=athlete_name,
            race_location=location,
            season=season,
            splits_analytics=splits_analytics,
        )

    async def get_global_top10_segment_percentiles(
        self,
        gender: str,
        division: str,
        athlete_segment_times: Dict[str, float],
    ) -> Dict[str, float]:
        """
        计算运动员各分段在「全球同组别同性别前10%」 cohort 内的百分位。
        从数据库取全球同 gender+division 的 results，按 total_time 取前 10% 作为 cohort，
        再在该 cohort 内按各分段时间计算该运动员的 top_percent（越小越好）。

        Args:
            gender: 性别 (与 Result.gender 一致，如 male/female)
            division: 组别 (如 open/pro)
            athlete_segment_times: 运动员各分段用时（分钟），key 与 constants 一致，如 run1_time, skiErg_time

        Returns:
            dict: segment_key -> top_percent (0-100)，仅包含有有效数据的分段
        """
        if not gender or not division:
            return {}
        segment_keys = [s["key"] for s in RUN_SEGMENTS] + [s["key"] for s in WORKOUT_STATIONS]
        out: Dict[str, float] = {}

        async with async_session_maker() as session:
            # 1. 总人数
            count_stmt = select(func.count(Result.id)).where(
                Result.gender == gender,
                Result.division == division,
                Result.total_time.isnot(None),
                Result.total_time > 0,
            )
            total = (await session.execute(count_stmt)).scalar() or 0
            if total < 10:
                return {}

            top10_count = max(1, int(math.ceil(0.1 * total)))

            # 2. 前 10% 的 total_time 阈值（取第 top10_count 名的 total_time）
            threshold_subq = (
                select(Result.total_time)
                .where(
                    Result.gender == gender,
                    Result.division == division,
                    Result.total_time.isnot(None),
                    Result.total_time > 0,
                )
                .order_by(Result.total_time.asc())
                .offset(top10_count - 1)
                .limit(1)
            )
            threshold_row = await session.execute(threshold_subq)
            threshold_time = threshold_row.scalar_one_or_none()
            if threshold_time is None:
                return {}

            # 3. 前 10%  cohort 的所有行（total_time <= threshold）
            cohort_stmt = (
                select(Result)
                .where(
                    Result.gender == gender,
                    Result.division == division,
                    Result.total_time.isnot(None),
                    Result.total_time <= threshold_time,
                )
            )
            cohort_result = await session.execute(cohort_stmt)
            cohort_rows = cohort_result.scalars().all()
        if not cohort_rows:
            return {}

        # 4. 按分段收集 cohort 内的时间，并计算运动员百分位
        for seg_key in segment_keys:
            attr = SEGMENT_KEY_TO_RESULT_ATTR.get(seg_key, seg_key)
            values: List[float] = []
            for row in cohort_rows:
                v = getattr(row, attr, None)
                v = self._safe_float(v)
                if v is not None and v > 0:
                    values.append(v)
            if len(values) < 3:
                continue
            athlete_time = athlete_segment_times.get(seg_key)
            if athlete_time is None or athlete_time <= 0:
                continue
            values.sort()
            n = len(values)
            rank = sum(1 for x in values if x < athlete_time) + 1
            top_percent = round((rank / n) * 100, 1)
            out[seg_key] = min(100.0, max(0.1, top_percent))

        return out
    
    def _rows_to_dataframe(self, rows: List[Result]) -> pd.DataFrame:
        """将数据库行转换为 DataFrame"""
        data = []
        for row in rows:
            data.append({
                'name': row.name,
                'nationality': row.nationality,
                'gender': row.gender,
                'division': row.division,
                'age_group': row.age_group,
                'total_time': row.total_time,
                'run_time': row.run_time,
                'work_time': row.work_time,
                'roxzone_time': row.roxzone_time,
                'event_id': row.event_id,
                'event_name': row.event_name,
                'run1_time': row.run1_time,
                'run2_time': row.run2_time,
                'run3_time': row.run3_time,
                'run4_time': row.run4_time,
                'run5_time': row.run5_time,
                'run6_time': row.run6_time,
                'run7_time': row.run7_time,
                'run8_time': row.run8_time,
                'skiErg_time': row.skierg_time,
                'sledPush_time': row.sled_push_time,
                'sledPull_time': row.sled_pull_time,
                'burpeeBroadJump_time': row.burpee_broad_jump_time,
                'rowErg_time': row.row_erg_time,
                'farmersCarry_time': row.farmers_carry_time,
                'sandbagLunges_time': row.sandbag_lunges_time,
                'wallBalls_time': row.wall_balls_time,
            })
        return pd.DataFrame(data)
    
    def _calculate_split_analytics(
        self,
        race_data: pd.DataFrame,
        athlete_row: pd.Series,
        split_key: str,
        split_name: str,
        split_type: str,
    ) -> Optional[SplitAnalyticsItem]:
        """
        计算单个分段的统计数据
        
        Args:
            race_data: 全场比赛数据
            athlete_row: 运动员数据行
            split_key: 分段字段名
            split_name: 分段显示名称
            split_type: 分段类型 (run/workout)
        
        Returns:
            SplitAnalyticsItem 或 None (如果数据不足)
        """
        # 获取运动员该分段时间
        athlete_time = self._safe_float(athlete_row.get(split_key))
        if athlete_time is None:
            # 运动员该分段无数据，返回默认值
            return SplitAnalyticsItem(
                name=split_name,
                type=split_type,
                time="--:--",
                time_minutes=0.0,
                rank=0,
                total=0,
                top_percent=100.0,
                avg_time_minutes=0.0,
                diff_seconds=0,
                diff_display="N/A"
            )
        
        # 过滤有效数据（该分段非空）
        valid_data = race_data[race_data[split_key].notna()].copy()
        valid_data = valid_data[valid_data[split_key].apply(lambda x: not (isinstance(x, float) and math.isnan(x)))]
        
        total = len(valid_data)
        if total == 0:
            return SplitAnalyticsItem(
                name=split_name,
                type=split_type,
                time=format_time_short(athlete_time),
                time_minutes=athlete_time,
                rank=1,
                total=1,
                top_percent=100.0,
                avg_time_minutes=athlete_time,
                diff_seconds=0,
                diff_display="0s"
            )
        
        # 计算排名（时间越短排名越前）
        rank = int((valid_data[split_key] < athlete_time).sum()) + 1
        
        # 计算百分比
        top_percent = round((rank / total) * 100, 1)
        
        # 计算平均时间
        avg_time = valid_data[split_key].mean()
        avg_time_minutes = round(float(avg_time), 2)
        
        # 计算差距（秒）
        diff_minutes = athlete_time - avg_time
        diff_seconds = round(diff_minutes * 60)
        
        # 格式化差距显示
        if diff_seconds < 0:
            diff_display = f"{diff_seconds}s"
        elif diff_seconds == 0:
            diff_display = "0s"
        else:
            diff_display = f"+{diff_seconds}s"
        
        return SplitAnalyticsItem(
            name=split_name,
            type=split_type,
            time=format_time_short(athlete_time),
            time_minutes=round(athlete_time, 2),
            rank=rank,
            total=total,
            top_percent=top_percent,
            avg_time_minutes=avg_time_minutes,
            diff_seconds=diff_seconds,
            diff_display=diff_display
        )
    
    def _safe_float(self, value) -> Optional[float]:
        """安全转换为浮点数"""
        if value is None:
            return None
        if isinstance(value, float) and math.isnan(value):
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None


# 全局服务实例
_analytics_service: Optional[AnalyticsService] = None


def get_analytics_service() -> AnalyticsService:
    """获取全局 AnalyticsService 实例"""
    global _analytics_service
    if _analytics_service is None:
        _analytics_service = AnalyticsService()
    return _analytics_service
