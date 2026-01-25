"""
近期赛事 API
"""
import logging
import re
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy import select, func, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import Race, Result
from app.utils.time_format import format_time

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/races", tags=["Races"])


@router.get("/recent")
async def get_recent_races(
    limit: int = Query(default=5, ge=1, le=20, description="返回数量"),
    db: AsyncSession = Depends(get_db)
):
    """
    获取最近的比赛列表（已完赛）
    
    返回最近同步的比赛，包含每场比赛的参赛人数
    """
    try:
        # 查询最近的比赛，按赛季降序、入库时间降序排列
        races_query = (
            select(Race)
            .order_by(desc(Race.season), desc(Race.created_at))
            .limit(limit)
        )
        races_result = await db.execute(races_query)
        races = races_result.scalars().all()
        
        # 获取每场比赛的参赛人数和年份
        race_list = []
        for race in races:
            # 查询该场比赛的参赛人数
            count_query = select(func.count(Result.id)).where(
                Result.season == race.season,
                Result.location == race.location
            )
            count_result = await db.execute(count_query)
            participants = count_result.scalar() or 0
            
            # 从 Result 表获取 event_name 以提取年份
            event_query = select(Result.event_name).where(
                Result.season == race.season,
                Result.location == race.location
            ).limit(1)
            event_result = await db.execute(event_query)
            event_name = event_result.scalar()
            
            # 从 event_name (如 "2025 Hong Kong") 提取年份
            year = None
            if event_name:
                year_match = re.match(r'^(\d{4})', event_name)
                if year_match:
                    year = int(year_match.group(1))
            
            # 格式化地点名称（将 hong-kong 转为 Hong Kong）
            display_name = race.location.replace('-', ' ').title()
            
            race_list.append({
                "id": f"{race.season}_{race.location}",
                "season": race.season,
                "year": year,
                "location": race.location,
                "name": f"HYROX {display_name}",
                "venue": display_name,
                "participants": participants,
                "status": "completed",
                "synced_at": race.created_at.isoformat() if race.created_at else None,
            })
        
        logger.info(f"Retrieved {len(race_list)} recent races")
        
        return {
            "code": 0,
            "message": "success",
            "data": {
                "races": race_list,
                "total": len(race_list)
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get recent races: {e}")
        return {
            "code": -1,
            "message": str(e),
            "data": None
        }


@router.get("/{season}/{location}/leaderboard")
async def get_race_leaderboard(
    season: int = Path(..., description="赛季"),
    location: str = Path(..., description="比赛地点"),
    division: Optional[str] = Query(None, description="组别筛选: open/pro/doubles/pro_doubles"),
    gender: Optional[str] = Query(None, description="性别筛选: male/female/mixed"),
    age_group: Optional[str] = Query(None, description="年龄组筛选: 16-24/25-29/30-34/..."),
    limit: int = Query(default=50, ge=1, le=200, description="返回数量"),
    offset: int = Query(default=0, ge=0, description="偏移量"),
    db: AsyncSession = Depends(get_db)
):
    """
    获取赛事成绩排行榜
    
    按完赛时间升序排列，返回该场比赛的选手排名列表
    """
    try:
        # 构建查询
        query = select(Result).where(
            Result.season == season,
            Result.location == location,
            Result.total_time.isnot(None)  # 排除无成绩记录
        )
        
        # 筛选条件
        if division:
            query = query.where(Result.division == division)
        if gender:
            query = query.where(Result.gender == gender)
        if age_group:
            query = query.where(Result.age_group == age_group)
        
        # 按完赛时间排序
        query = query.order_by(asc(Result.total_time))
        
        # 统计总数（用于计算排名和 has_more）
        count_query = select(func.count(Result.id)).where(
            Result.season == season,
            Result.location == location,
            Result.total_time.isnot(None)
        )
        if division:
            count_query = count_query.where(Result.division == division)
        if gender:
            count_query = count_query.where(Result.gender == gender)
        if age_group:
            count_query = count_query.where(Result.age_group == age_group)
        
        total_count = (await db.execute(count_query)).scalar() or 0
        
        # 分页
        query = query.offset(offset).limit(limit)
        
        results = (await db.execute(query)).scalars().all()
        
        # 获取比赛信息
        race_query = select(Race).where(
            Race.season == season,
            Race.location == location
        )
        race = (await db.execute(race_query)).scalar_one_or_none()
        
        # 从 Result 获取 event_name
        event_name = results[0].event_name if results else None
        
        # 构建排行榜数据
        leaderboard = []
        for idx, result in enumerate(results):
            rank = offset + idx + 1  # 考虑偏移量计算真实排名
            
            leaderboard.append({
                "rank": rank,
                "name": result.name,
                "age_group": result.age_group,
                "total_time": format_time(result.total_time),
                "total_time_minutes": round(result.total_time, 2) if result.total_time else 0,
                "gender": result.gender,
                "division": result.division,
                "nationality": result.nationality,
            })
        
        # 格式化地点名称
        display_name = location.replace('-', ' ').title()
        
        logger.info(f"Retrieved leaderboard for {location} season {season}: {len(leaderboard)} entries")
        
        return {
            "code": 0,
            "message": "success",
            "data": {
                "race": {
                    "season": season,
                    "location": location,
                    "event_name": event_name or f"HYROX {display_name}",
                    "total_participants": total_count
                },
                "leaderboard": leaderboard,
                "total": total_count,
                "has_more": (offset + limit) < total_count
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get leaderboard for {location} season {season}: {e}")
        return {
            "code": -1,
            "message": str(e),
            "data": None
        }

