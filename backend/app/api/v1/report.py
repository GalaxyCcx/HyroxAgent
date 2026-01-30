"""
专业分析报告 API

V2 更新：
- 新增 /generate/v2/{report_id} 端点使用新架构
- 支持心率图片参数
"""
import json
import asyncio
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query, Body
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ...db.database import get_sync_db, sync_session_maker
from ...services.report import report_generator


router = APIRouter(prefix="/reports", tags=["reports"])


class CreateReportRequest(BaseModel):
    """创建报告请求（默认走 V3 配置化架构）"""
    season: int
    location: str
    athlete_name: str
    user_id: Optional[int] = None
    heart_rate_images: Optional[List[str]] = None
    force_regenerate: bool = False


class CreateReportRequestV2(BaseModel):
    """V2 创建报告请求（支持心率图片）"""
    season: int
    location: str
    athlete_name: str
    user_id: Optional[int] = None
    heart_rate_images: Optional[List[str]] = None  # 心率图片路径列表
    force_regenerate: bool = False  # 强制重新生成（忽略已存在的报告）


class CreateReportResponse(BaseModel):
    """创建报告响应"""
    report_id: str
    status: str
    message: str


@router.post("/create", response_model=CreateReportResponse)
async def create_report(request: CreateReportRequest):
    """
    创建专业分析报告（V3 配置化架构）
    
    - 检查是否已存在相同报告（除非 force_regenerate=True）
    - 创建报告记录
    - 返回 report_id，前端可通过 /generate/{report_id} 订阅生成进度
    """
    with get_sync_db() as db:
        existing_id = report_generator.check_existing_report(
            db=db,
            season=request.season,
            location=request.location,
            athlete_name=request.athlete_name,
        )
        if existing_id:
            status = report_generator.get_report_status(db, existing_id)
            if request.force_regenerate:
                report_generator.reset_report_for_regeneration(db, existing_id)
                return CreateReportResponse(
                    report_id=existing_id,
                    status="created",
                    message="报告已重置，请订阅生成进度",
                )
            if status and status.get("status") == "completed":
                return CreateReportResponse(
                    report_id=existing_id,
                    status="exists",
                    message="该运动员的报告已存在",
                )
            if status and status.get("status") == "generating":
                return CreateReportResponse(
                    report_id=existing_id,
                    status="generating",
                    message="报告正在生成中",
                )
        report_id = await report_generator.create_report(
            db=db,
            season=request.season,
            location=request.location,
            athlete_name=request.athlete_name,
            user_id=request.user_id,
        )
        return CreateReportResponse(
            report_id=report_id,
            status="created",
            message="报告创建成功，请订阅生成进度",
        )


@router.get("/generate/{report_id}")
async def generate_report_stream(
    report_id: str,
    heart_rate_images: Optional[str] = Query(None, description="心率图片路径，逗号分隔"),
):
    """
    生成报告（V3 配置化架构 + SSE 流式响应）
    
    - 订阅此接口可实时获取生成进度
    - 事件类型: progress, complete, error
    """
    hr_images = [img.strip() for img in heart_rate_images.split(",")] if heart_rate_images else None
    async def event_generator():
        db = sync_session_maker()
        try:
            async for event in report_generator.generate_report_stream_v3(db, report_id, heart_rate_images=hr_images):
                event_type = event.get("event", "message")
                event_data = json.dumps(event.get("data", {}), ensure_ascii=False)
                yield f"event: {event_type}\ndata: {event_data}\n\n"
                await asyncio.sleep(0.1)
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"
        finally:
            db.close()
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


@router.get("/status/{report_id}")
async def get_report_status(report_id: str):
    """
    获取报告状态
    
    - 用于轮询查询报告生成进度
    - 返回: report_id, status, progress, current_step, title
    """
    with get_sync_db() as db:
        status = report_generator.get_report_status(db, report_id)
        if not status:
            raise HTTPException(status_code=404, detail="报告不存在")
        return status


@router.get("/detail/{report_id}")
async def get_report_detail(report_id: str):
    """
    获取报告详情
    
    - 返回完整报告内容
    - 仅在状态为 completed 时有完整内容
    """
    with get_sync_db() as db:
        report = report_generator.get_report(db, report_id)
        if not report:
            raise HTTPException(status_code=404, detail="报告不存在")
        return report


@router.get("/list")
async def list_reports(
    user_id: Optional[int] = Query(None, description="用户ID"),
    athlete_name: Optional[str] = Query(None, description="运动员姓名"),
):
    """
    列出报告
    
    - 通过 user_id 或 athlete_name 筛选
    - 返回报告摘要列表
    """
    with get_sync_db() as db:
        reports = report_generator.list_user_reports(
            db=db,
            user_id=user_id,
            athlete_name=athlete_name,
        )
        return {"reports": reports}


# ==================== V2 端点 ====================

@router.post("/v2/create", response_model=CreateReportResponse)
async def create_report_v2(request: CreateReportRequestV2):
    """
    V2 创建专业分析报告
    
    - 支持心率图片参数
    - 使用新架构（DataProvider + SectionAgent）
    - 检查是否已存在相同报告（除非 force_regenerate=True）
    - 创建报告记录
    - 返回 report_id，前端可通过 SSE 订阅生成进度
    """
    with get_sync_db() as db:
        # 检查是否已存在
        existing_id = report_generator.check_existing_report(
            db=db,
            season=request.season,
            location=request.location,
            athlete_name=request.athlete_name,
        )
        
        if existing_id:
            status = report_generator.get_report_status(db, existing_id)
            
            # 如果强制重新生成，重置旧报告状态
            if request.force_regenerate:
                report_generator.reset_report_for_regeneration(db, existing_id)
                return CreateReportResponse(
                    report_id=existing_id,
                    status="created",
                    message="报告已重置，请使用 /v2/generate 端点重新生成",
                )
            
            # 否则检查状态并返回
            if status and status.get("status") == "completed":
                return CreateReportResponse(
                    report_id=existing_id,
                    status="exists",
                    message="该运动员的报告已存在",
                )
            elif status and status.get("status") == "generating":
                return CreateReportResponse(
                    report_id=existing_id,
                    status="generating",
                    message="报告正在生成中",
                )
        
        # 创建新报告
        report_id = await report_generator.create_report(
            db=db,
            season=request.season,
            location=request.location,
            athlete_name=request.athlete_name,
            user_id=request.user_id,
        )
        
        return CreateReportResponse(
            report_id=report_id,
            status="created",
            message="报告创建成功，请使用 /v2/generate 端点生成",
        )


@router.get("/v2/generate/{report_id}")
async def generate_report_stream_v2(
    report_id: str,
    heart_rate_images: Optional[str] = Query(None, description="心率图片路径，逗号分隔"),
):
    """
    V2 生成报告（SSE 流式响应）
    
    使用新架构：DataProvider + ChartDataBuilder + SectionAgent
    
    - 订阅此接口可实时获取生成进度
    - 事件类型: progress, complete, error
    - 支持心率图片参数（逗号分隔的路径列表）
    
    进度节点：
    - 5%: 初始化
    - 8%: 心率图片分析（如有）
    - 10%: 数据预计算开始
    - 25%: 数据预计算完成
    - 30%: 图表配置完成
    - 35-85%: 章节生成（5个章节）
    - 85%: 组装报告
    - 90%: 保存报告
    - 100%: 完成
    """
    # 解析心率图片参数
    hr_images = None
    if heart_rate_images:
        hr_images = [img.strip() for img in heart_rate_images.split(",") if img.strip()]
    
    async def event_generator():
        # 为 SSE 流创建独立的数据库会话
        db = sync_session_maker()
        try:
            async for event in report_generator.generate_report_stream_v3(
                db,
                report_id,
                heart_rate_images=hr_images
            ):
                event_type = event.get("event", "message")
                event_data = json.dumps(event.get("data", {}), ensure_ascii=False)
                
                yield f"event: {event_type}\ndata: {event_data}\n\n"
                
                # 给数据库和客户端一些处理时间
                await asyncio.sleep(0.1)
                
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"
        finally:
            db.close()
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.post("/v2/generate/{report_id}")
async def generate_report_stream_v2_post(
    report_id: str,
    heart_rate_images: Optional[List[str]] = Body(None, description="心率图片路径列表"),
):
    """
    V2 生成报告（SSE 流式响应，POST 版本）
    
    使用 POST 方法传递心率图片列表参数
    
    - 订阅此接口可实时获取生成进度
    - 事件类型: progress, complete, error
    """
    async def event_generator():
        db = sync_session_maker()
        try:
            async for event in report_generator.generate_report_stream_v3(
                db,
                report_id,
                heart_rate_images=heart_rate_images
            ):
                event_type = event.get("event", "message")
                event_data = json.dumps(event.get("data", {}), ensure_ascii=False)
                
                yield f"event: {event_type}\ndata: {event_data}\n\n"
                
                await asyncio.sleep(0.1)
                
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"
        finally:
            db.close()
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


# ==================== V3 配置化架构端点 ====================

class CreateReportRequestV3(BaseModel):
    """V3 创建报告请求（配置化架构）"""
    season: int
    location: str
    athlete_name: str
    user_id: Optional[int] = None
    heart_rate_images: Optional[List[str]] = None
    force_regenerate: bool = False


@router.post("/v3/create", response_model=CreateReportResponse)
async def create_report_v3(request: CreateReportRequestV3):
    """
    V3 创建专业分析报告（配置化架构）
    
    - 使用新配置化架构
    - 支持心率图片参数
    - 检查是否已存在相同报告（除非 force_regenerate=True）
    - 创建报告记录
    - 返回 report_id，前端可通过 /v3/generate 端点生成
    """
    with get_sync_db() as db:
        # 检查是否已存在
        existing_id = report_generator.check_existing_report(
            db=db,
            season=request.season,
            location=request.location,
            athlete_name=request.athlete_name,
        )
        
        if existing_id:
            status = report_generator.get_report_status(db, existing_id)
            
            if request.force_regenerate:
                report_generator.reset_report_for_regeneration(db, existing_id)
                return CreateReportResponse(
                    report_id=existing_id,
                    status="created",
                    message="报告已重置，请使用 /v3/generate 端点重新生成",
                )
            
            if status and status.get("status") == "completed":
                return CreateReportResponse(
                    report_id=existing_id,
                    status="exists",
                    message="该运动员的报告已存在",
                )
            elif status and status.get("status") == "generating":
                return CreateReportResponse(
                    report_id=existing_id,
                    status="generating",
                    message="报告正在生成中",
                )
        
        # 创建新报告
        report_id = await report_generator.create_report(
            db=db,
            season=request.season,
            location=request.location,
            athlete_name=request.athlete_name,
            user_id=request.user_id,
        )
        
        return CreateReportResponse(
            report_id=report_id,
            status="created",
            message="报告创建成功，请使用 /v3/generate 端点生成",
        )


@router.get("/v3/generate/{report_id}")
async def generate_report_stream_v3(
    report_id: str,
    heart_rate_images: Optional[str] = Query(None, description="心率图片路径，逗号分隔"),
):
    """
    V3 生成报告（配置化架构 + SSE 流式响应）
    
    使用新配置化架构：
    - ConfigLoader: 加载章节配置
    - InputBuilder: 构建输入数据
    - SectionGenerator: 生成章节（One Call Function）
    - FunctionExecutor: 解析 Function Call 结果
    - ReportAssembler: 组装报告
    - SnapshotManager: 管理数据快照
    
    进度节点：
    - 5%: 初始化
    - 8%: 加载配置
    - 10%: 心率图片分析（如有）
    - 15%: 数据预计算开始
    - 25%: 数据预计算完成
    - 30%: 初始化数据层
    - 35-85%: 章节生成
    - 85%: 组装报告
    - 90%: 保存报告
    - 100%: 完成
    """
    hr_images = None
    if heart_rate_images:
        hr_images = [img.strip() for img in heart_rate_images.split(",") if img.strip()]
    
    async def event_generator():
        db = sync_session_maker()
        try:
            async for event in report_generator.generate_report_stream_v3(
                db,
                report_id,
                heart_rate_images=hr_images
            ):
                event_type = event.get("event", "message")
                event_data = json.dumps(event.get("data", {}), ensure_ascii=False)
                
                yield f"event: {event_type}\ndata: {event_data}\n\n"
                
                await asyncio.sleep(0.1)
                
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"
        finally:
            db.close()
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.post("/v3/generate/{report_id}")
async def generate_report_stream_v3_post(
    report_id: str,
    heart_rate_images: Optional[List[str]] = Body(None, description="心率图片路径列表"),
):
    """
    V3 生成报告（配置化架构 + SSE，POST 版本）
    
    使用 POST 方法传递心率图片列表参数
    """
    async def event_generator():
        db = sync_session_maker()
        try:
            async for event in report_generator.generate_report_stream_v3(
                db,
                report_id,
                heart_rate_images=heart_rate_images
            ):
                event_type = event.get("event", "message")
                event_data = json.dumps(event.get("data", {}), ensure_ascii=False)
                
                yield f"event: {event_type}\ndata: {event_data}\n\n"
                
                await asyncio.sleep(0.1)
                
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"
        finally:
            db.close()
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
