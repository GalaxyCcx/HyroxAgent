"""
运动员搜索 API
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_athlete_service_dep
from app.config.settings import settings
from app.core.exceptions import ValidationError
from app.models.schemas import AthleteSearchResponse, AthleteSearchData
from app.services.athlete_service import AthleteService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/athletes", tags=["运动员"])


@router.get(
    "/search",
    response_model=AthleteSearchResponse,
    summary="搜索运动员",
    description="根据姓名模糊搜索运动员，返回匹配的比赛成绩列表"
)
async def search_athletes(
    name: str = Query(
        ...,
        min_length=1,
        description="搜索关键词（支持模糊匹配，不区分大小写）"
    ),
    season: Optional[int] = Query(
        None,
        ge=1,
        le=10,
        description="赛季筛选 (1-10)"
    ),
    limit: int = Query(
        default=settings.DEFAULT_SEARCH_LIMIT,
        ge=1,
        le=settings.MAX_SEARCH_LIMIT,
        description="返回结果数量限制"
    ),
    service: AthleteService = Depends(get_athlete_service_dep)
) -> AthleteSearchResponse:
    """
    搜索运动员
    
    - **name**: 搜索关键词，必填
    - **season**: 赛季筛选，可选
    - **limit**: 返回数量限制，默认20，最大100
    """
    # 校验 name 不能为空白字符串
    if not name.strip():
        raise ValidationError(message="搜索关键词不能为空")
    
    logger.info(f"API: Search athletes - name={name}, season={season}, limit={limit}")
    
    data = await service.search(
        name=name.strip(),
        season=season,
        limit=limit
    )
    
    return AthleteSearchResponse(
        code=0,
        message="success",
        data=data
    )




