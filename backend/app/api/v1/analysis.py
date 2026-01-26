"""
LLM 分析 API
"""
import json
import logging
from urllib.parse import unquote

from fastapi import APIRouter, Depends, Path
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import AnalysisCache
from app.models.schemas import AnalysisResponse, AnalysisData
from app.services.llm_service import LLMService, get_llm_service
from app.services.result_service import ResultService, get_result_service
from app.services.analytics_service import AnalyticsService, get_analytics_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/results", tags=["LLM 分析"])


@router.get(
    "/{season}/{location}/{athlete_name}/analysis",
    response_model=AnalysisResponse,
    summary="获取运动员比赛分析",
    description="获取 LLM 生成的比赛分析，包括一句话总结、优势、短板。首次请求会调用 LLM 生成，后续请求返回缓存。"
)
async def get_athlete_analysis(
    season: int = Path(..., ge=1, le=10, description="赛季 (1-10)"),
    location: str = Path(..., min_length=1, description="比赛地点"),
    athlete_name: str = Path(..., min_length=1, description="运动员姓名 (URL编码)"),
    db: AsyncSession = Depends(get_db),
    llm_service: LLMService = Depends(get_llm_service),
    result_service: ResultService = Depends(get_result_service),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
) -> AnalysisResponse:
    """
    获取运动员比赛分析
    
    逻辑流程:
    1. 查询缓存表是否有数据
    2. 有缓存 -> 直接返回
    3. 无缓存 -> 调用 LLM 生成 -> 存入缓存 -> 返回
    """
    # URL 解码
    decoded_name = unquote(athlete_name)
    
    logger.info(f"API: Get analysis - season={season}, location={location}, name={decoded_name}")
    
    # 1. 查询缓存
    cache_result = await db.execute(
        select(AnalysisCache).where(
            AnalysisCache.season == season,
            AnalysisCache.location == location,
            AnalysisCache.athlete_name == decoded_name,
        )
    )
    cache = cache_result.scalar_one_or_none()
    
    if cache:
        logger.info(f"API: Cache hit for {decoded_name}")
        return AnalysisResponse(
            code=0,
            message="success",
            data=AnalysisData(
                summary=cache.summary,
                strengths=json.loads(cache.strengths) if cache.strengths else [],
                weaknesses=json.loads(cache.weaknesses) if cache.weaknesses else [],
                cached=True,
            )
        )
    
    # 2. 缓存未命中，获取比赛数据
    logger.info(f"API: Cache miss for {decoded_name}, generating analysis...")
    
    # 获取基础数据
    result_data = await result_service.get_athlete_result(
        season=season,
        location=location,
        athlete_name=decoded_name,
    )
    
    # 获取分段分析数据
    analytics_data = await analytics_service.get_split_analytics(
        season=season,
        location=location,
        athlete_name=decoded_name,
    )
    
    # 3. 调用 LLM 生成分析
    # 构建组别显示文本
    gender_text = "男子" if result_data.athlete.gender == "male" else "女子"
    division_text = "公开组" if result_data.athlete.division == "open" else "精英组"
    division_display = f"{gender_text}{division_text}"
    
    llm_result = await llm_service.generate_analysis(
        athlete_name=decoded_name,
        race_name=result_data.race.event_name,
        division=division_display,
        total_time=result_data.results.total_time,
        overall_rank=result_data.rankings.overall_rank,
        overall_total=result_data.rankings.overall_total,
        splits_analytics=[
            {
                "name": s.name,
                "time": s.time,
                "top_percent": s.top_percent,
                "diff_display": s.diff_display,
            }
            for s in analytics_data.splits_analytics
        ],
    )
    
    if not llm_result:
        # LLM 调用失败，返回默认分析
        logger.warning(f"API: LLM generation failed for {decoded_name}, using fallback")
        return AnalysisResponse(
            code=0,
            message="success",
            data=AnalysisData(
                summary="暂时无法生成分析，请稍后重试。",
                strengths=[],
                weaknesses=[],
                cached=False,
            )
        )
    
    # 4. 存入缓存
    new_cache = AnalysisCache(
        season=season,
        location=location,
        athlete_name=decoded_name,
        summary=llm_result["summary"],
        strengths=json.dumps(llm_result["strengths"], ensure_ascii=False),
        weaknesses=json.dumps(llm_result["weaknesses"], ensure_ascii=False),
    )
    db.add(new_cache)
    await db.commit()
    
    logger.info(f"API: Analysis cached for {decoded_name}")
    
    return AnalysisResponse(
        code=0,
        message="success",
        data=AnalysisData(
            summary=llm_result["summary"],
            strengths=llm_result["strengths"],
            weaknesses=llm_result["weaknesses"],
            cached=False,
        )
    )
