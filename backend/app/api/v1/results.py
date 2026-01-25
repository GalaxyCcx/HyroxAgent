"""
成绩详情 API
"""
import logging
from urllib.parse import unquote

from fastapi import APIRouter, Depends, Path, Query

from app.core.exceptions import AthleteNotFoundError, RaceNotFoundError
from app.models.schemas import AthleteResultResponse, SplitAnalyticsResponse
from app.services.result_service import ResultService, get_result_service
from app.services.analytics_service import AnalyticsService, get_analytics_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/results", tags=["成绩详情"])


@router.get(
    "/{season}/{location}/{athlete_name}",
    response_model=AthleteResultResponse,
    summary="获取运动员比赛详情",
    description="获取指定运动员在特定比赛中的完整成绩详情，包括排名、时间分布、分段成绩等"
)
async def get_athlete_result(
    season: int = Path(
        ...,
        ge=1,
        le=10,
        description="赛季 (1-10)"
    ),
    location: str = Path(
        ...,
        min_length=1,
        description="比赛地点 (如 hong-kong, amsterdam)"
    ),
    athlete_name: str = Path(
        ...,
        min_length=1,
        description="运动员姓名 (URL编码)"
    ),
    service: ResultService = Depends(get_result_service)
) -> AthleteResultResponse:
    """
    获取运动员比赛详情
    
    - **season**: 赛季编号 (1-10)
    - **location**: 比赛地点，小写，用连字符分隔 (如 hong-kong)
    - **athlete_name**: 运动员姓名，需要 URL 编码
    """
    # URL 解码运动员姓名
    decoded_name = unquote(athlete_name)
    
    logger.info(f"API: Get result - season={season}, location={location}, name={decoded_name}")
    
    data = await service.get_athlete_result(
        season=season,
        location=location,
        athlete_name=decoded_name,
    )
    
    return AthleteResultResponse(
        code=0,
        message="success",
        data=data
    )


@router.get(
    "/{season}/{location}/{athlete_name}/analytics",
    response_model=SplitAnalyticsResponse,
    summary="获取运动员分段统计",
    description="获取指定运动员在特定比赛中各分段的排名和与平均值的对比数据"
)
async def get_athlete_analytics(
    season: int = Path(
        ...,
        ge=1,
        le=10,
        description="赛季 (1-10)"
    ),
    location: str = Path(
        ...,
        min_length=1,
        description="比赛地点 (如 hong-kong, amsterdam)"
    ),
    athlete_name: str = Path(
        ...,
        min_length=1,
        description="运动员姓名 (URL编码)"
    ),
    service: AnalyticsService = Depends(get_analytics_service)
) -> SplitAnalyticsResponse:
    """
    获取运动员分段统计
    
    - **season**: 赛季编号 (1-10)
    - **location**: 比赛地点，小写，用连字符分隔 (如 hong-kong)
    - **athlete_name**: 运动员姓名，需要 URL 编码
    
    返回 16 个分段 (8 Run + 8 Station) 的统计数据，包括：
    - 排名 (rank)
    - 百分位 (top_percent)
    - 与平均的差距 (diff_seconds, diff_display)
    """
    # URL 解码运动员姓名
    decoded_name = unquote(athlete_name)
    
    logger.info(f"API: Get analytics - season={season}, location={location}, name={decoded_name}")
    
    data = await service.get_split_analytics(
        season=season,
        location=location,
        athlete_name=decoded_name,
    )
    
    return SplitAnalyticsResponse(
        code=0,
        message="success",
        data=data
    )
