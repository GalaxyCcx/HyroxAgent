"""
数据同步 API 端点
"""
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.sync_service import get_sync_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sync", tags=["sync"])


# ============== 请求/响应模型 ==============

class SyncRaceRequest(BaseModel):
    """同步单场比赛请求"""
    season: int = Field(..., ge=1, le=8, description="赛季编号 (1-8)")
    location: str = Field(..., min_length=1, description="比赛地点")


class SyncSeasonResponse(BaseModel):
    """同步赛季响应"""
    success: bool
    season: int
    races_count: int = 0
    records_count: int = 0
    duration_seconds: float = 0.0
    error_message: Optional[str] = None


class SyncRaceResponse(BaseModel):
    """同步单场比赛响应"""
    success: bool
    season: int
    location: str
    records_count: int = 0
    duration_seconds: float = 0.0
    error_message: Optional[str] = None


class SyncAllResponse(BaseModel):
    """同步所有数据响应"""
    success: bool
    seasons_synced: int
    total_races: int
    total_records: int
    duration_seconds: float


class SeasonStat(BaseModel):
    """赛季统计"""
    season: int
    races: int
    results: int
    last_sync: Optional[str] = None


class SyncStatusResponse(BaseModel):
    """同步状态响应"""
    database_path: str
    database_size_mb: float
    total_races: int
    total_results: int
    last_sync: Optional[str] = None
    seasons: list[SeasonStat] = []


class SeasonProgress(BaseModel):
    """赛季同步进度"""
    season: int
    synced_races: int
    total_races: int
    synced_results: int
    progress_percent: float
    last_sync: Optional[str] = None


class RecentSyncLog(BaseModel):
    """最近同步记录"""
    season: int
    location: str
    status: str
    records_count: int
    synced_at: str


class SyncProgressResponse(BaseModel):
    """同步进度响应（用于监控面板）"""
    # 总体统计
    total_synced_races: int
    total_target_races: int
    total_synced_results: int
    overall_progress_percent: float
    
    # 各赛季进度
    seasons: list[SeasonProgress]
    
    # 最近同步记录
    recent_syncs: list[RecentSyncLog]
    
    # 同步状态
    is_syncing: bool = False
    last_update: str


# ============== API 端点 ==============

@router.post("/season/{season}", response_model=SyncSeasonResponse)
async def sync_season(season: int):
    """
    同步指定赛季的全部比赛数据
    
    - **season**: 赛季编号 (1-8)
    """
    if season < 1 or season > 8:
        raise HTTPException(status_code=400, detail="Season must be between 1 and 8")
    
    logger.info(f"API: Sync season {season}")
    
    sync_service = get_sync_service()
    result = await sync_service.sync_season(season)
    
    return SyncSeasonResponse(
        success=result.success,
        season=season,
        races_count=result.races_count,
        records_count=result.records_count,
        duration_seconds=round(result.duration_seconds, 2),
        error_message=result.error_message
    )


@router.post("/race", response_model=SyncRaceResponse)
async def sync_race(request: SyncRaceRequest):
    """
    同步指定单场比赛数据
    
    - **season**: 赛季编号 (1-8)
    - **location**: 比赛地点 (小写英文，如 "shanghai", "amsterdam")
    """
    logger.info(f"API: Sync race season={request.season}, location={request.location}")
    
    sync_service = get_sync_service()
    result = await sync_service.sync_race(request.season, request.location)
    
    if not result.success:
        # 同步失败但不抛出异常，返回错误信息
        return SyncRaceResponse(
            success=False,
            season=request.season,
            location=request.location,
            error_message=result.error_message,
            duration_seconds=round(result.duration_seconds, 2)
        )
    
    return SyncRaceResponse(
        success=True,
        season=request.season,
        location=request.location,
        records_count=result.records_count,
        duration_seconds=round(result.duration_seconds, 2)
    )


@router.post("/all", response_model=SyncAllResponse)
async def sync_all():
    """
    同步所有赛季数据 (Season 1-8)
    
    **警告**: 此操作可能需要较长时间 (约 5-10 分钟)
    """
    logger.info("API: Sync all seasons")
    
    sync_service = get_sync_service()
    result = await sync_service.sync_all()
    
    return SyncAllResponse(
        success=result.success,
        seasons_synced=8,
        total_races=result.races_count,
        total_records=result.records_count,
        duration_seconds=round(result.duration_seconds, 2)
    )


@router.get("/status", response_model=SyncStatusResponse)
async def get_sync_status():
    """
    获取同步状态和数据库统计信息
    """
    logger.info("API: Get sync status")
    
    sync_service = get_sync_service()
    status = await sync_service.get_sync_status()
    
    return SyncStatusResponse(
        database_path=status["database_path"],
        database_size_mb=status["database_size_mb"],
        total_races=status["total_races"],
        total_results=status["total_results"],
        last_sync=status["last_sync"],
        seasons=[SeasonStat(**s) for s in status.get("seasons", [])]
    )


@router.get("/progress", response_model=SyncProgressResponse)
async def get_sync_progress():
    """
    获取详细的同步进度（用于监控面板）
    
    返回每个赛季的同步进度和最近的同步记录
    """
    from datetime import datetime
    
    sync_service = get_sync_service()
    progress = await sync_service.get_sync_progress()
    
    return SyncProgressResponse(
        total_synced_races=progress["total_synced_races"],
        total_target_races=progress["total_target_races"],
        total_synced_results=progress["total_synced_results"],
        overall_progress_percent=progress["overall_progress_percent"],
        seasons=[SeasonProgress(**s) for s in progress["seasons"]],
        recent_syncs=[RecentSyncLog(**r) for r in progress["recent_syncs"]],
        is_syncing=progress.get("is_syncing", False),
        last_update=datetime.now().isoformat()
    )

