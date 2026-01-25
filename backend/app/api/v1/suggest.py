"""
名称建议 API
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from app.core.exceptions import ValidationError
from app.services.suggest_service import SuggestService, get_suggest_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/athletes", tags=["运动员"])


class SuggestionItem(BaseModel):
    """单个建议项"""
    name: str = Field(..., description="运动员姓名")
    match_count: int = Field(..., description="匹配的比赛数量")


class SuggestResponse(BaseModel):
    """建议响应"""
    code: int = Field(default=0)
    message: str = Field(default="success")
    data: dict = Field(default_factory=dict)


@router.get(
    "/suggest",
    response_model=SuggestResponse,
    summary="名称建议",
    description="第一阶段搜索：根据关键词返回匹配的运动员姓名候选列表"
)
async def suggest_names(
    keyword: str = Query(
        ...,
        min_length=2,
        max_length=50,
        description="搜索关键词，至少2个字符"
    ),
    limit: int = Query(
        default=5,
        ge=1,
        le=10,
        description="返回候选数量上限，默认5，最大10"
    ),
    service: SuggestService = Depends(get_suggest_service)
) -> SuggestResponse:
    """
    名称建议接口
    
    - **keyword**: 搜索关键词，支持模糊匹配、姓名顺序无关
    - **limit**: 返回候选数量上限
    
    匹配规则：
    - 不区分大小写
    - 支持部分匹配（如 "chen yuan" 匹配 "Chen, Yuanmin"）
    - 姓名顺序无关（如 "yuan chen" 也能匹配 "Chen, Yuanmin"）
    """
    # 校验 keyword 不能为空白字符串
    if not keyword.strip():
        raise ValidationError(message="搜索关键词不能为空")
    
    if len(keyword.strip()) < 2:
        raise ValidationError(message="搜索关键词至少2个字符")
    
    logger.info(f"API: Suggest names - keyword={keyword}, limit={limit}")
    
    data = await service.suggest(
        keyword=keyword.strip(),
        limit=limit
    )
    
    return SuggestResponse(
        code=0,
        message="success",
        data=data
    )




