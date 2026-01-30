"""
Pydantic 数据模型定义
"""
from typing import Generic, Optional, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class ResponseBase(BaseModel, Generic[T]):
    """统一响应格式"""
    code: int = Field(default=0, description="状态码，0表示成功")
    message: str = Field(default="success", description="响应消息")
    data: Optional[T] = Field(default=None, description="响应数据")


# ==================== 搜索相关模型 ====================

class AthleteSearchItem(BaseModel):
    """搜索结果单条运动员数据"""
    id: str = Field(..., description="唯一标识 (event_id + name)")
    name: str = Field(..., description="运动员姓名")
    nationality: Optional[str] = Field(None, description="国籍代码")
    event_id: str = Field(..., description="比赛ID")
    event_name: str = Field(..., description="比赛名称")
    location: str = Field(..., description="比赛地点")
    season: int = Field(..., description="赛季")
    total_time: str = Field(..., description="总成绩 (格式化)")
    total_time_minutes: float = Field(..., description="总成绩 (分钟)")
    gender: str = Field(..., description="性别")
    division: str = Field(..., description="组别")
    age_group: Optional[str] = Field(None, description="年龄组")


class AthleteSearchData(BaseModel):
    """搜索结果数据"""
    items: list[AthleteSearchItem] = Field(default_factory=list)
    total: int = Field(default=0, description="结果总数")
    has_more: bool = Field(default=False, description="是否还有更多")


class AthleteSearchResponse(ResponseBase[AthleteSearchData]):
    """搜索响应"""
    pass


# ==================== 详情相关模型 ====================

class AthleteInfo(BaseModel):
    """运动员信息"""
    name: str = Field(..., description="运动员姓名")
    nationality: Optional[str] = Field(None, description="国籍代码")
    nationality_name: Optional[str] = Field(None, description="国籍名称")
    gender: str = Field(..., description="性别")
    division: str = Field(..., description="组别")
    age_group: Optional[str] = Field(None, description="年龄组")


class RaceInfo(BaseModel):
    """比赛信息"""
    event_id: str = Field(..., description="比赛ID")
    event_name: str = Field(..., description="比赛名称")
    location: str = Field(..., description="比赛地点")
    season: int = Field(..., description="赛季")
    date: Optional[str] = Field(None, description="比赛日期")


class ResultsInfo(BaseModel):
    """成绩信息"""
    total_time: str = Field(..., description="总成绩 (格式化)")
    total_time_minutes: float = Field(..., description="总成绩 (分钟)")
    run_time: str = Field(..., description="跑步总时间 (格式化)")
    run_time_minutes: float = Field(..., description="跑步总时间 (分钟)")
    run_time_percent: float = Field(..., description="跑步时间占比")
    work_time: str = Field(..., description="功能站总时间 (格式化)")
    work_time_minutes: float = Field(..., description="功能站总时间 (分钟)")
    work_time_percent: float = Field(..., description="功能站时间占比")
    roxzone_time: str = Field(..., description="过渡区总时间 (格式化)")
    roxzone_time_minutes: float = Field(..., description="过渡区总时间 (分钟)")
    roxzone_time_percent: float = Field(..., description="过渡区时间占比")


class RankingsInfo(BaseModel):
    """排名信息"""
    overall_rank: int = Field(..., description="总排名")
    overall_total: int = Field(..., description="总参赛人数")
    gender_rank: int = Field(..., description="性别组排名")
    gender_total: int = Field(..., description="性别组总人数")
    division_rank: int = Field(..., description="组别排名")
    division_total: int = Field(..., description="组别总人数")
    age_group_rank: Optional[int] = Field(None, description="年龄组排名")
    age_group_total: Optional[int] = Field(None, description="年龄组总人数")


class SplitItem(BaseModel):
    """分段成绩项"""
    name: str = Field(..., description="项目名称")
    time: str = Field(..., description="时间 (格式化)")
    time_minutes: Optional[float] = Field(None, description="时间 (分钟)")
    distance: Optional[str] = Field(None, description="距离/次数")


class SplitsInfo(BaseModel):
    """分段成绩"""
    runs: list[SplitItem] = Field(default_factory=list, description="跑步分段")
    workouts: list[SplitItem] = Field(default_factory=list, description="功能站分段")


class AthleteResultData(BaseModel):
    """运动员成绩详情数据"""
    athlete: AthleteInfo
    race: RaceInfo
    results: ResultsInfo
    rankings: RankingsInfo
    splits: SplitsInfo


class AthleteResultResponse(ResponseBase[AthleteResultData]):
    """成绩详情响应"""
    pass


# ==================== 分段统计模型 ====================

class SplitAnalyticsItem(BaseModel):
    """分段统计单项"""
    name: str = Field(..., description="分段名称 (如 Run 1, SkiErg)")
    type: str = Field(..., description="分段类型: run 或 workout")
    time: str = Field(..., description="时间 (格式化)")
    time_minutes: float = Field(..., description="时间 (分钟)")
    rank: int = Field(..., description="该分段在全场的排名")
    total: int = Field(..., description="全场有效数据总数")
    top_percent: float = Field(..., description="百分位 (0-100)")
    avg_time_minutes: float = Field(..., description="全场该分段平均时间 (分钟)")
    diff_seconds: int = Field(..., description="与平均的差距 (秒), 负数表示快于平均")
    diff_display: str = Field(..., description="差距展示文案 (如 -21s, +16s)")


class SplitAnalyticsData(BaseModel):
    """分段统计数据"""
    athlete_name: str = Field(..., description="运动员姓名")
    race_location: str = Field(..., description="比赛地点")
    season: int = Field(..., description="赛季")
    splits_analytics: list[SplitAnalyticsItem] = Field(default_factory=list, description="分段统计列表")


class SplitAnalyticsResponse(ResponseBase[SplitAnalyticsData]):
    """分段统计响应"""
    pass


# ==================== LLM 分析模型 ====================

class AnalysisData(BaseModel):
    """LLM 分析结果数据"""
    summary: str = Field(..., description="一句话总结")
    strengths: list[str] = Field(default_factory=list, description="优势列表")
    weaknesses: list[str] = Field(default_factory=list, description="短板列表")
    cached: bool = Field(default=False, description="是否为缓存数据")


class AnalysisResponse(ResponseBase[AnalysisData]):
    """LLM 分析响应"""
    pass


# ==================== 心率图片上传模型 ====================

class HeartRateImageCreate(BaseModel):
    """创建心率图片请求"""
    report_id: str = Field(..., description="关联的报告ID")
    user_id: Optional[int] = Field(None, description="用户ID（可选）")


class HeartRateExtractedData(BaseModel):
    """VL 提取的心率数据"""
    avg_heart_rate: Optional[int] = Field(None, description="平均心率")
    max_heart_rate: Optional[int] = Field(None, description="最大心率")
    min_heart_rate: Optional[int] = Field(None, description="最小心率")
    heart_rate_zones: Optional[dict] = Field(None, description="心率区间分布")
    duration_seconds: Optional[int] = Field(None, description="记录时长（秒）")
    raw_text: Optional[str] = Field(None, description="OCR 原始文本")


class HeartRateImageItem(BaseModel):
    """心率图片数据项"""
    id: int = Field(..., description="图片ID")
    report_id: str = Field(..., description="关联报告ID")
    user_id: Optional[int] = Field(None, description="用户ID")
    image_path: str = Field(..., description="图片存储路径")
    original_filename: str = Field(..., description="原始文件名")
    extracted_data: Optional[HeartRateExtractedData] = Field(None, description="提取的心率数据")
    extraction_status: str = Field(..., description="提取状态: pending/processing/completed/failed")
    created_at: Optional[str] = Field(None, description="创建时间")


class HeartRateImageUploadData(BaseModel):
    """上传响应数据"""
    uploaded: list[HeartRateImageItem] = Field(default_factory=list, description="上传成功的图片列表")
    failed: list[str] = Field(default_factory=list, description="上传失败的文件名列表")


class HeartRateImageUploadResponse(ResponseBase[HeartRateImageUploadData]):
    """上传响应"""
    pass


class HeartRateImageListData(BaseModel):
    """图片列表数据"""
    images: list[HeartRateImageItem] = Field(default_factory=list, description="图片列表")
    total: int = Field(default=0, description="总数")


class HeartRateImageListResponse(ResponseBase[HeartRateImageListData]):
    """图片列表响应"""
    pass


class HeartRateImageDeleteResponse(ResponseBase[None]):
    """删除响应"""
    pass
