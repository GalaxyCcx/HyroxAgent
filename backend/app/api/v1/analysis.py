"""
LLM 分析 API
"""
import json
import logging
from urllib.parse import unquote

from fastapi import APIRouter, Depends, Path
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError

from app.db.database import get_db
from app.db.models import AnalysisCache
from app.models.schemas import AnalysisResponse, AnalysisData, AnalysisItem
from app.services.llm_service import LLMService, get_llm_service
from app.services.result_service import ResultService, get_result_service
from app.services.analytics_service import (
    AnalyticsService,
    get_analytics_service,
    SEGMENT_NAME_TO_KEY,
)

logger = logging.getLogger(__name__)


# 优势/短板按百分位划分：top 前 25% 及以内算优势，top 前 30% 及以外算短板（与数据一致，避免 LLM 错分）
STRENGTH_PERCENTILE_MAX = 25   # 前 25% 水平及更好 -> 优势
WEAKNESS_PERCENTILE_MIN = 30   # 前 30% 水平及更差 -> 短板（即 70% 以后）


def _repartition_by_percentile(
    strengths_items: list[AnalysisItem],
    weaknesses_items: list[AnalysisItem],
) -> tuple[list[AnalysisItem], list[AnalysisItem]]:
    """
    按百分位重新划分优势/短板，保证展示与数据一致。
    - 优势：仅保留 percentile 为 None 或 <= STRENGTH_PERCENTILE_MAX 的项；从短板中移入 percentile < WEAKNESS_PERCENTILE_MIN 的项。
    - 短板：仅保留 percentile 为 None 或 >= WEAKNESS_PERCENTILE_MIN 的项；从优势中移入 percentile > STRENGTH_PERCENTILE_MAX 的项。
    """
    strengths_final: list[AnalysisItem] = []
    weaknesses_final: list[AnalysisItem] = []
    for s in strengths_items:
        if s.percentile is None:
            strengths_final.append(s)
        elif s.percentile <= STRENGTH_PERCENTILE_MAX:
            strengths_final.append(s)
        else:
            weaknesses_final.append(s)
    for w in weaknesses_items:
        if w.percentile is None:
            weaknesses_final.append(w)
        elif w.percentile < WEAKNESS_PERCENTILE_MIN:
            strengths_final.append(w)
        else:
            weaknesses_final.append(w)
    return strengths_final, weaknesses_final


def _normalize_to_analysis_items(raw: list) -> list[AnalysisItem]:
    """将缓存的 strengths/weaknesses 转为 list[AnalysisItem]。支持旧格式 [str] 或新格式 [{text, percentile}]。"""
    if not raw:
        return []
    items = []
    for x in raw:
        if isinstance(x, str):
            items.append(AnalysisItem(text=x, percentile=None))
        elif isinstance(x, dict) and x.get("text") is not None:
            items.append(AnalysisItem(text=x["text"], percentile=x.get("percentile")))
        else:
            continue
    return items


def _segment_name_variants(seg: str) -> list[str]:
    """返回 segment 的常见变体，便于匹配 LLM 返回或文案中的分段名。"""
    if not seg:
        return []
    s = seg.strip()
    variants = [s]
    # 无空格变体
    if " " in s:
        variants.append(s.replace(" ", ""))
    return variants


def _infer_percentile_from_text(
    text: str,
    segment_percentiles_by_name: dict,
    segment_percentiles_by_key: dict,
    is_top10: bool,
) -> float | None:
    """
    从优势/短板文案中推断对应分段并返回百分位（用于旧缓存无 segment 时补算）。
    按关键词匹配：Row/Row Erg、Sled Push、Wall Balls、SkiErg、跑步/Run 等。
    """
    if not text:
        return None
    t = text.lower()
    # 分段关键词 -> (segment_name for by_name, segment_key for by_key)
    # 使用与 SEGMENT_NAME_TO_KEY 一致的英文名
    if "row" in t or "划船" in t:
        name, key = "Row", "rowErg_time"
    elif "sled push" in t or "sledpush" in t or "推橇" in t:
        name, key = "Sled Push", "sledPush_time"
    elif "sled pull" in t or "拉橇" in t:
        name, key = "Sled Pull", "sledPull_time"
    elif "wall ball" in t or "墙球" in t:
        name, key = "Wall Balls", "wallBalls_time"
    elif "skierg" in t or "滑雪" in t:
        name, key = "SkiErg", "skiErg_time"
    elif "farmers" in t or "农夫" in t:
        name, key = "Farmers Carry", "farmersCarry_time"
    elif "sandbag" in t or "沙袋" in t:
        name, key = "Sandbag Lunges", "sandbagLunges_time"
    elif "burpee" in t or "波比" in t:
        name, key = "Burpee Broad Jump", "burpeeBroadJump_time"
    elif "跑步" in t or " run " in t or "run1" in t or "run 1" in t:
        # 跑步：取 Run 1..Run 8 中最佳（最小）百分位
        run_names = [f"Run {i}" for i in range(1, 9)]
        vals = [segment_percentiles_by_name.get(n) for n in run_names]
        vals = [v for v in vals if v is not None]
        if vals:
            return round(min(vals), 1)
        if is_top10 and segment_percentiles_by_key:
            run_keys = [f"run{i}_time" for i in range(1, 9)]
            vals = [segment_percentiles_by_key.get(k) for k in run_keys]
            vals = [v for v in vals if v is not None]
            return round(min(vals), 1) if vals else None
        return None
    else:
        name, key = None, None
    if name is None:
        return None
    if is_top10 and segment_percentiles_by_key:
        p = segment_percentiles_by_key.get(key)
    else:
        p = segment_percentiles_by_name.get(name)
    return round(p, 1) if p is not None else None


def _attach_percentiles(
    llm_items: list[dict],
    segment_percentiles_by_name: dict,
    segment_percentiles_by_key: dict,
    is_top10: bool,
) -> list[AnalysisItem]:
    """为 LLM 返回的 strengths/weaknesses（含 segment, text）附加对应口径的百分位。"""
    out = []
    for it in llm_items:
        text = it.get("text") or ""
        seg = (it.get("segment") or "").strip()
        p = None
        if seg:
            for variant in _segment_name_variants(seg):
                key = SEGMENT_NAME_TO_KEY.get(variant)
                if is_top10 and segment_percentiles_by_key and key:
                    p = segment_percentiles_by_key.get(key)
                    break
                if segment_percentiles_by_name.get(variant) is not None:
                    p = segment_percentiles_by_name.get(variant)
                    break
            if p is None and seg in segment_percentiles_by_name:
                p = segment_percentiles_by_name.get(seg)
        if p is None and text:
            p = _infer_percentile_from_text(
                text, segment_percentiles_by_name, segment_percentiles_by_key, is_top10
            )
        out.append(AnalysisItem(text=text, percentile=round(p, 1) if p is not None else None))
    return out

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
        raw_strengths = json.loads(cache.strengths) if cache.strengths else []
        raw_weaknesses = json.loads(cache.weaknesses) if cache.weaknesses else []
        analysis_scope = getattr(cache, "analysis_scope", None) or "本场组别内排名对比"
        strengths_items = _normalize_to_analysis_items(raw_strengths)
        weaknesses_items = _normalize_to_analysis_items(raw_weaknesses)
        # 按当前总排名重新计算分析口径，并为旧缓存补算「处于对应口径的 x% 水平」
        try:
            result_data = await result_service.get_athlete_result(
                season=season,
                location=location,
                athlete_name=decoded_name,
            )
            overall_rank = result_data.rankings.overall_rank
            overall_total = result_data.rankings.overall_total
            is_top10 = overall_total > 0 and overall_rank / overall_total <= 0.1
            analysis_scope = "全球同组别同性别前10%成绩对比" if is_top10 else "本场组别内排名对比"
            # 若为旧格式（含纯字符串），拉取分段数据并补算百分位以便展示「处于对应口径的 x% 水平」
            need_percentiles = any(isinstance(x, str) for x in (raw_strengths + raw_weaknesses))
            if need_percentiles:
                analytics_data = await analytics_service.get_split_analytics(
                    season=season,
                    location=location,
                    athlete_name=decoded_name,
                )
                segment_percentiles_by_name = {
                    s.name: s.top_percent for s in analytics_data.splits_analytics
                }
                segment_percentiles_by_key = {}
                if is_top10:
                    athlete_segment_times = {}
                    for s in analytics_data.splits_analytics:
                        key = SEGMENT_NAME_TO_KEY.get(s.name)
                        if key and s.time_minutes and s.time_minutes > 0:
                            athlete_segment_times[key] = s.time_minutes
                    segment_percentiles_by_key = await analytics_service.get_global_top10_segment_percentiles(
                        gender=result_data.athlete.gender,
                        division=result_data.athlete.division,
                        athlete_segment_times=athlete_segment_times,
                    )
                strengths_items = []
                for x in raw_strengths:
                    if isinstance(x, str):
                        p = _infer_percentile_from_text(
                            x,
                            segment_percentiles_by_name,
                            segment_percentiles_by_key,
                            is_top10,
                        )
                        strengths_items.append(AnalysisItem(text=x, percentile=p))
                    elif isinstance(x, dict) and x.get("text") is not None:
                        strengths_items.append(
                            AnalysisItem(text=x["text"], percentile=x.get("percentile"))
                        )
                    else:
                        strengths_items.append(AnalysisItem(text=str(x), percentile=None))
                weaknesses_items = []
                for x in raw_weaknesses:
                    if isinstance(x, str):
                        p = _infer_percentile_from_text(
                            x,
                            segment_percentiles_by_name,
                            segment_percentiles_by_key,
                            is_top10,
                        )
                        weaknesses_items.append(AnalysisItem(text=x, percentile=p))
                    elif isinstance(x, dict) and x.get("text") is not None:
                        weaknesses_items.append(
                            AnalysisItem(text=x["text"], percentile=x.get("percentile"))
                        )
                    else:
                        weaknesses_items.append(AnalysisItem(text=str(x), percentile=None))
                strengths_items, weaknesses_items = _repartition_by_percentile(
                    strengths_items, weaknesses_items
                )
        except Exception:
            pass  # 保留上面默认的 analysis_scope, strengths_items, weaknesses_items
        return AnalysisResponse(
            code=0,
            message="success",
            data=AnalysisData(
                summary=cache.summary,
                strengths=strengths_items,
                weaknesses=weaknesses_items,
                cached=True,
                analysis_scope=analysis_scope,
            )
        )
    
    # 2. 缓存未命中，获取比赛数据并调用 LLM
    logger.info(f"API: Cache miss for {decoded_name}, generating analysis...")
    try:
        result_data = await result_service.get_athlete_result(
            season=season,
            location=location,
            athlete_name=decoded_name,
        )
        analytics_data = await analytics_service.get_split_analytics(
            season=season,
            location=location,
            athlete_name=decoded_name,
        )
        gender_text = "男子" if result_data.athlete.gender == "male" else "女子"
        division_text = "公开组" if result_data.athlete.division == "open" else "精英组"
        division_display = f"{gender_text}{division_text}"
        overall_rank = result_data.rankings.overall_rank
        overall_total = result_data.rankings.overall_total
        is_top10 = (overall_total > 0 and overall_rank / overall_total <= 0.1)
        # 本场口径：分段名 -> top_percent
        segment_percentiles_by_name = {s.name: s.top_percent for s in analytics_data.splits_analytics}
        # 全球前10% 口径：先算运动员各分段用时，再查全球前10% cohort 内百分位
        segment_percentiles_by_key = {}
        if is_top10:
            athlete_segment_times = {}
            for s in analytics_data.splits_analytics:
                key = SEGMENT_NAME_TO_KEY.get(s.name)
                if key and s.time_minutes and s.time_minutes > 0:
                    athlete_segment_times[key] = s.time_minutes
            segment_percentiles_by_key = await analytics_service.get_global_top10_segment_percentiles(
                gender=result_data.athlete.gender,
                division=result_data.athlete.division,
                athlete_segment_times=athlete_segment_times,
            )
        # 传给 LLM 的 top_percent：前10% 时用全球前10% 百分位覆盖，便于 LLM 写优势/短板
        splits_for_llm = []
        for s in analytics_data.splits_analytics:
            top_p = s.top_percent
            if is_top10 and segment_percentiles_by_key:
                key = SEGMENT_NAME_TO_KEY.get(s.name)
                if key and key in segment_percentiles_by_key:
                    top_p = segment_percentiles_by_key[key]
            splits_for_llm.append({
                "name": s.name,
                "time": s.time,
                "top_percent": top_p,
                "diff_display": s.diff_display,
            })
        llm_result = await llm_service.generate_analysis(
            athlete_name=decoded_name,
            race_name=result_data.race.event_name,
            division=division_display,
            total_time=result_data.results.total_time,
            overall_rank=overall_rank,
            overall_total=overall_total,
            splits_analytics=splits_for_llm,
            is_top10=is_top10,
            age_group_rank=result_data.rankings.age_group_rank,
            age_group_total=result_data.rankings.age_group_total,
        )
    except Exception as e:
        logger.exception(f"API: Analysis generation failed for {decoded_name}")
        return AnalysisResponse(
            code=0,
            message="success",
            data=AnalysisData(
                summary="分析生成时发生错误，请稍后重试。",
                strengths=[],
                weaknesses=[],
                cached=False,
                analysis_scope="本场组别内排名对比",
            )
        )

    if not llm_result:
        logger.warning(f"API: LLM generation failed for {decoded_name}, using fallback")
        return AnalysisResponse(
            code=0,
            message="success",
            data=AnalysisData(
                summary="暂时无法生成分析，请稍后重试。",
                strengths=[],
                weaknesses=[],
                cached=False,
                analysis_scope="本场组别内排名对比",
            )
        )

    # 为优势/短板附加对应口径的百分位（本场或全球前10%）
    strengths_items = _attach_percentiles(
        llm_result["strengths"],
        segment_percentiles_by_name,
        segment_percentiles_by_key,
        is_top10,
    )
    weaknesses_items = _attach_percentiles(
        llm_result["weaknesses"],
        segment_percentiles_by_name,
        segment_percentiles_by_key,
        is_top10,
    )
    # 按百分位重新划分，保证「优势」仅含前 25% 水平、「短板」仅含前 30% 及以外
    strengths_items, weaknesses_items = _repartition_by_percentile(
        strengths_items, weaknesses_items
    )

    # 4. 存入缓存（若表无 analysis_scope 列或写入失败则仅返回结果，不抛 500）
    analysis_scope = llm_result.get("analysis_scope") or ("全球同组别同性别前10%成绩对比" if is_top10 else "本场组别内排名对比")
    cache_payload_strengths = [{"text": x.text, "percentile": x.percentile} for x in strengths_items]
    cache_payload_weaknesses = [{"text": x.text, "percentile": x.percentile} for x in weaknesses_items]
    try:
        new_cache = AnalysisCache(
            season=season,
            location=location,
            athlete_name=decoded_name,
            summary=llm_result["summary"],
            strengths=json.dumps(cache_payload_strengths, ensure_ascii=False),
            weaknesses=json.dumps(cache_payload_weaknesses, ensure_ascii=False),
            analysis_scope=analysis_scope,
        )
        db.add(new_cache)
        await db.commit()
        logger.info(f"API: Analysis cached for {decoded_name}")
    except SQLAlchemyError as e:
        logger.warning(f"API: Cache write failed for {decoded_name}, returning without cache: {e}")
        await db.rollback()

    return AnalysisResponse(
        code=0,
        message="success",
        data=AnalysisData(
            summary=llm_result["summary"],
            strengths=strengths_items,
            weaknesses=weaknesses_items,
            cached=False,
            analysis_scope=analysis_scope,
        )
    )
