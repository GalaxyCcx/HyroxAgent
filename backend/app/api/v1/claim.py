"""
比赛认领相关 API 路由
"""
import logging
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import ClaimedRace, Result
from app.api.v1.auth import get_current_user_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/claim", tags=["认领"])


# ==================== 请求/响应模型 ====================

class ClaimRequest(BaseModel):
    """认领/取消认领请求"""
    season: int
    location: str
    athlete_name: str


class ClaimResponse(BaseModel):
    """认领响应"""
    code: int = 0
    message: str = "success"
    data: Optional[dict] = None


class ClaimListResponse(BaseModel):
    """认领列表响应"""
    code: int = 0
    message: str = "success"
    data: Optional[dict] = None


class ClaimCheckResponse(BaseModel):
    """检查认领状态响应"""
    code: int = 0
    message: str = "success"
    data: Optional[dict] = None


# ==================== 辅助函数 ====================

def format_time(minutes: float) -> str:
    """将分钟数转换为 HH:MM:SS 格式"""
    if not minutes:
        return "--:--:--"
    total_seconds = int(minutes * 60)
    hours = total_seconds // 3600
    mins = (total_seconds % 3600) // 60
    secs = total_seconds % 60
    return f"{hours:02d}:{mins:02d}:{secs:02d}"


# ==================== API 路由 ====================

@router.post("/add", response_model=ClaimResponse)
async def add_claim(
    request: ClaimRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    认领比赛
    
    将指定比赛成绩绑定到当前登录用户。
    需要在请求头携带 Authorization: Bearer <token>
    """
    try:
        # 检查是否已认领
        stmt = select(ClaimedRace).where(
            ClaimedRace.user_id == user_id,
            ClaimedRace.season == request.season,
            ClaimedRace.location == request.location,
            ClaimedRace.athlete_name == request.athlete_name
        )
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()
        
        if existing:
            return ClaimResponse(
                code=1,
                message="该比赛已认领",
                data={"claimed": True}
            )
        
        # 创建认领记录
        claim = ClaimedRace(
            user_id=user_id,
            season=request.season,
            location=request.location,
            athlete_name=request.athlete_name
        )
        db.add(claim)
        await db.commit()
        await db.refresh(claim)
        
        logger.info(f"User {user_id} claimed race: {request.athlete_name} @ S{request.season} {request.location}")
        
        return ClaimResponse(
            data={
                "claimed": True,
                "claim_id": claim.id
            }
        )
        
    except Exception as e:
        logger.error(f"Add claim failed: {e}")
        await db.rollback()
        return ClaimResponse(
            code=1,
            message=str(e),
            data=None
        )


@router.post("/remove", response_model=ClaimResponse)
async def remove_claim(
    request: ClaimRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    取消认领
    
    解除指定比赛成绩与当前用户的绑定。
    需要在请求头携带 Authorization: Bearer <token>
    """
    try:
        stmt = delete(ClaimedRace).where(
            ClaimedRace.user_id == user_id,
            ClaimedRace.season == request.season,
            ClaimedRace.location == request.location,
            ClaimedRace.athlete_name == request.athlete_name
        )
        result = await db.execute(stmt)
        await db.commit()
        
        if result.rowcount > 0:
            logger.info(f"User {user_id} unclaimed race: {request.athlete_name} @ S{request.season} {request.location}")
            return ClaimResponse(
                data={"claimed": False}
            )
        else:
            return ClaimResponse(
                code=1,
                message="未找到认领记录",
                data={"claimed": False}
            )
        
    except Exception as e:
        logger.error(f"Remove claim failed: {e}")
        await db.rollback()
        return ClaimResponse(
            code=1,
            message=str(e),
            data=None
        )


@router.get("/list", response_model=ClaimListResponse)
async def get_claim_list(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    获取用户已认领列表
    
    返回当前用户认领的所有比赛，包含比赛详情。
    需要在请求头携带 Authorization: Bearer <token>
    """
    try:
        # 获取用户的所有认领记录
        stmt = select(ClaimedRace).where(
            ClaimedRace.user_id == user_id
        ).order_by(ClaimedRace.created_at.desc())
        
        result = await db.execute(stmt)
        claims = result.scalars().all()
        
        # 获取每个认领记录对应的比赛详情
        items = []
        for claim in claims:
            # 查询比赛成绩
            result_stmt = select(Result).where(
                Result.season == claim.season,
                Result.location == claim.location,
                Result.name == claim.athlete_name
            )
            result_data = await db.execute(result_stmt)
            race_result = result_data.scalar_one_or_none()
            
            item = {
                "id": claim.id,
                "season": claim.season,
                "location": claim.location,
                "athlete_name": claim.athlete_name,
                "claimed_at": claim.created_at.isoformat() if claim.created_at else None,
            }
            
            # 如果找到比赛数据，添加详情
            if race_result:
                item.update({
                    "event_name": race_result.event_name,
                    "total_time": format_time(race_result.total_time),
                    "division": race_result.division,
                })
            else:
                item.update({
                    "event_name": f"S{claim.season} {claim.location.title()}",
                    "total_time": "--:--:--",
                    "division": None,
                })
            
            items.append(item)
        
        return ClaimListResponse(
            data={
                "items": items,
                "total": len(items)
            }
        )
        
    except Exception as e:
        logger.error(f"Get claim list failed: {e}")
        return ClaimListResponse(
            code=1,
            message=str(e),
            data=None
        )


@router.get("/check", response_model=ClaimCheckResponse)
async def check_claim(
    season: int,
    location: str,
    athlete_name: str,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    检查某比赛是否已被当前用户认领
    
    需要在请求头携带 Authorization: Bearer <token>
    """
    try:
        stmt = select(ClaimedRace).where(
            ClaimedRace.user_id == user_id,
            ClaimedRace.season == season,
            ClaimedRace.location == location,
            ClaimedRace.athlete_name == athlete_name
        )
        result = await db.execute(stmt)
        claim = result.scalar_one_or_none()
        
        return ClaimCheckResponse(
            data={
                "claimed": claim is not None,
                "claim_id": claim.id if claim else None
            }
        )
        
    except Exception as e:
        logger.error(f"Check claim failed: {e}")
        return ClaimCheckResponse(
            code=1,
            message=str(e),
            data=None
        )
