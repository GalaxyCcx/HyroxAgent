"""
分段统计服务
使用本地 SQLite 数据库查询
"""
import logging
import math
from typing import Optional, List

import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import async_session_maker
from app.db.models import Result

from app.core.exceptions import AthleteNotFoundError, RaceNotFoundError
from app.models.schemas import SplitAnalyticsItem, SplitAnalyticsData
from app.utils.time_format import format_time_short
from app.utils.constants import WORKOUT_STATIONS, RUN_SEGMENTS

logger = logging.getLogger(__name__)


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
