"""
运动员搜索服务
使用本地 SQLite 数据库查询
"""
import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.settings import settings
from app.db.database import async_session_maker
from app.db.models import Result
from app.models.schemas import AthleteSearchItem, AthleteSearchData
from app.utils.time_format import format_time

logger = logging.getLogger(__name__)


class AthleteService:
    """
    运动员服务类
    
    提供运动员搜索功能（第二阶段：精确姓名搜索）
    使用本地 SQLite 数据库查询
    """
    
    async def search(
        self,
        name: str,
        season: Optional[int] = None,
        limit: int = 20,
    ) -> AthleteSearchData:
        """
        按精确姓名搜索运动员的所有比赛记录
        
        Args:
            name: 精确姓名（从 suggest 接口获取）
            season: 赛季限制，不传则搜索所有赛季
            limit: 返回结果数量限制
        
        Returns:
            AthleteSearchData: 搜索结果
        """
        logger.info(f"Searching athletes: name={name}, season={season}, limit={limit}")
        
        async with async_session_maker() as session:
            # 构建查询
            stmt = select(Result).where(Result.name == name)
            
            # 如果指定了赛季
            if season:
                stmt = stmt.where(Result.season == season)
            
            # 按总成绩排序，获取更多数据以便后续处理
            stmt = stmt.order_by(Result.total_time).limit(limit * 2)
            
            result = await session.execute(stmt)
            rows = result.scalars().all()
            
            # 转换为搜索结果项
            all_results = [
                self._convert_to_search_item(row)
                for row in rows
                if row.total_time is not None and row.total_time > 0
            ]
        
        # 按成绩排序（时间短的在前）
        all_results.sort(key=lambda x: x.total_time_minutes)
        
        # 限制返回数量
        limited_results = all_results[:limit]
        total = len(all_results)
        has_more = total > limit
        
        logger.info(f"Search completed: found {total} results, returning {len(limited_results)}")
        
        return AthleteSearchData(
            items=limited_results,
            total=total,
            has_more=has_more
        )
    
    def _convert_to_search_item(self, row: Result) -> AthleteSearchItem:
        """将数据库记录转换为搜索结果项"""
        total_time_minutes = float(row.total_time or 0)
        
        return AthleteSearchItem(
            id=f"{row.event_id or ''}_{row.name}",
            name=row.name,
            nationality=row.nationality,
            event_id=str(row.event_id or ''),
            event_name=str(row.event_name or ''),
            location=row.location,
            season=row.season,
            total_time=format_time(total_time_minutes),
            total_time_minutes=total_time_minutes,
            gender=str(row.gender or ''),
            division=str(row.division or ''),
            age_group=row.age_group,
        )


# 全局服务实例
_athlete_service: Optional[AthleteService] = None


def get_athlete_service() -> AthleteService:
    """获取全局 AthleteService 实例"""
    global _athlete_service
    if _athlete_service is None:
        _athlete_service = AthleteService()
    return _athlete_service
