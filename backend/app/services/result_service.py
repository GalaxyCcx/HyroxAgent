"""
成绩详情服务
使用本地 SQLite 数据库查询
"""
import logging
import math
from typing import Optional, List

import pandas as pd
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import async_session_maker
from app.db.models import Result

from app.core.exceptions import AthleteNotFoundError, RaceNotFoundError
from app.models.schemas import (
    AthleteInfo,
    RaceInfo,
    ResultsInfo,
    RankingsInfo,
    SplitItem,
    SplitsInfo,
    AthleteResultData,
)
from app.utils.time_format import format_time, format_time_short, calculate_time_percent
from app.utils.constants import (
    WORKOUT_STATIONS,
    RUN_SEGMENTS,
    NATIONALITY_NAMES,
    RACE_DATES,
    LOCATION_NAMES,
)

logger = logging.getLogger(__name__)


class ResultService:
    """
    成绩详情服务
    
    使用本地 SQLite 数据库查询运动员单场比赛的详细成绩
    """
    
    async def get_athlete_result(
        self,
        season: int,
        location: str,
        athlete_name: str,
    ) -> AthleteResultData:
        """
        获取运动员单场比赛详细成绩
        
        Args:
            season: 赛季
            location: 比赛地点
            athlete_name: 运动员姓名
        
        Returns:
            AthleteResultData: 完整成绩数据
        
        Raises:
            RaceNotFoundError: 比赛不存在
            AthleteNotFoundError: 运动员不存在
        """
        logger.info(f"Getting result from DB: season={season}, location={location}, name={athlete_name}")
        
        async with async_session_maker() as session:
            # 查找运动员记录
            stmt = select(Result).where(
                Result.season == season,
                Result.location == location,
                Result.name == athlete_name
            )
            result = await session.execute(stmt)
            athlete_row = result.scalar_one_or_none()
            
            if athlete_row is None:
                # 尝试模糊匹配
                stmt = select(Result).where(
                    Result.season == season,
                    Result.location == location,
                    Result.name.ilike(f"%{athlete_name}%")
                ).limit(1)
                result = await session.execute(stmt)
                athlete_row = result.scalar_one_or_none()
                
                if athlete_row is None:
                    raise AthleteNotFoundError(athlete_name=athlete_name)
            
            # 获取该场比赛的所有数据用于计算排名
            race_stmt = select(Result).where(
                Result.season == season,
                Result.location == location
            )
            race_result = await session.execute(race_stmt)
            all_race_rows = race_result.scalars().all()
        
        # 转换为 DataFrame 以便计算排名
        race_data = self._rows_to_dataframe(all_race_rows)
        
        # 构建响应数据
        athlete_info = self._build_athlete_info(athlete_row)
        race_info = self._build_race_info(athlete_row, season, location)
        results_info = self._build_results_info(athlete_row)
        rankings_info = self._build_rankings_info(race_data, athlete_row.name)
        splits_info = self._build_splits_info(athlete_row)
        
        return AthleteResultData(
            athlete=athlete_info,
            race=race_info,
            results=results_info,
            rankings=rankings_info,
            splits=splits_info,
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
    
    def _build_athlete_info(self, row: Result) -> AthleteInfo:
        """构建运动员信息"""
        nationality = row.nationality
        nationality_name = NATIONALITY_NAMES.get(nationality) if nationality else None
        
        return AthleteInfo(
            name=str(row.name or ''),
            nationality=nationality,
            nationality_name=nationality_name,
            gender=str(row.gender or ''),
            division=str(row.division or ''),
            age_group=row.age_group,
        )
    
    def _build_race_info(
        self,
        row: Result,
        season: int,
        location: str
    ) -> RaceInfo:
        """构建比赛信息"""
        # 尝试从映射表获取日期
        date = RACE_DATES.get((location, season))
        
        # 格式化地点名称
        location_name = LOCATION_NAMES.get(location, location.replace('-', ' ').title())
        event_name = row.event_name or f"{season} {location_name}"
        
        return RaceInfo(
            event_id=str(row.event_id or ''),
            event_name=str(event_name),
            location=location,
            season=season,
            date=date,
        )
    
    def _build_results_info(self, row: Result) -> ResultsInfo:
        """构建成绩信息"""
        total_time = self._safe_float(row.total_time)
        run_time = self._safe_float(row.run_time)
        work_time = self._safe_float(row.work_time)
        roxzone_time = self._safe_float(row.roxzone_time)
        
        return ResultsInfo(
            total_time=format_time(total_time),
            total_time_minutes=total_time or 0.0,
            run_time=format_time(run_time),
            run_time_minutes=run_time or 0.0,
            run_time_percent=calculate_time_percent(run_time, total_time),
            work_time=format_time(work_time),
            work_time_minutes=work_time or 0.0,
            work_time_percent=calculate_time_percent(work_time, total_time),
            roxzone_time=format_time(roxzone_time),
            roxzone_time_minutes=roxzone_time or 0.0,
            roxzone_time_percent=calculate_time_percent(roxzone_time, total_time),
        )
    
    def _build_rankings_info(
        self,
        race_data: pd.DataFrame,
        athlete_name: str
    ) -> RankingsInfo:
        """构建排名信息"""
        try:
            from app.services.ranking_service import calculate_rankings
            rankings = calculate_rankings(race_data, athlete_name)
            return RankingsInfo(**rankings)
        except ValueError as e:
            logger.warning(f"Failed to calculate rankings: {e}")
            # 返回默认排名
            return RankingsInfo(
                overall_rank=0,
                overall_total=0,
                gender_rank=0,
                gender_total=0,
                division_rank=0,
                division_total=0,
            )
    
    def _build_splits_info(self, row: Result) -> SplitsInfo:
        """构建分段成绩信息"""
        runs = []
        workouts = []
        
        # 8段跑步 - 从数据库字段映射
        run_fields = [
            ('run1_time', 'Run 1', '1km'),
            ('run2_time', 'Run 2', '1km'),
            ('run3_time', 'Run 3', '1km'),
            ('run4_time', 'Run 4', '1km'),
            ('run5_time', 'Run 5', '1km'),
            ('run6_time', 'Run 6', '1km'),
            ('run7_time', 'Run 7', '1km'),
            ('run8_time', 'Run 8', '1km'),
        ]
        for field, name, distance in run_fields:
            time_minutes = self._safe_float(getattr(row, field, None))
            runs.append(SplitItem(
                name=name,
                time=format_time_short(time_minutes),
                time_minutes=time_minutes,
                distance=distance,
            ))
        
        # 8个功能站 - 从数据库字段映射
        workout_fields = [
            ('skierg_time', 'SkiErg', '1000m'),
            ('sled_push_time', 'Sled Push', '50m'),
            ('sled_pull_time', 'Sled Pull', '50m'),
            ('burpee_broad_jump_time', 'Burpee Broad Jump', '80m'),
            ('row_erg_time', 'Row Erg', '1000m'),
            ('farmers_carry_time', 'Farmers Carry', '200m'),
            ('sandbag_lunges_time', 'Sandbag Lunges', '100m'),
            ('wall_balls_time', 'Wall Balls', '100 reps'),
        ]
        for field, name, distance in workout_fields:
            time_minutes = self._safe_float(getattr(row, field, None))
            workouts.append(SplitItem(
                name=name,
                time=format_time_short(time_minutes),
                time_minutes=time_minutes,
                distance=distance,
            ))
        
        return SplitsInfo(runs=runs, workouts=workouts)
    
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
_result_service: Optional[ResultService] = None


def get_result_service() -> ResultService:
    """获取全局 ResultService 实例"""
    global _result_service
    if _result_service is None:
        _result_service = ResultService()
    return _result_service
