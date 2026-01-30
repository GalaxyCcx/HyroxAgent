"""
Report Generator - 报告生成器（V3 配置化架构）

负责：协调配置化模块，生成完整的专业分析报告。
- ConfigLoader / InputBuilder / SectionGenerator / FunctionExecutor / ReportAssembler
- SnapshotManager / DataRegistry
- 支持心率图片提取和映射
"""
import json
import asyncio
import logging
import uuid
from datetime import datetime
from typing import Dict, Any, Callable, Optional, List, AsyncGenerator

from sqlalchemy.orm import Session

from ...db.models import ProReport, Result
from ...db.database import get_sync_db

from .data_provider import get_data_provider, MappedHeartRateData
from .heart_rate_extractor import heart_rate_extractor
from .heart_rate_mapper import heart_rate_mapper
from .core import (
    ConfigLoader, get_config_loader,
    InputBuilder, get_input_builder,
    SectionGenerator, get_section_generator,
    FunctionExecutor, get_function_executor,
    ReportAssembler, get_report_assembler,
)
from .data import (
    SnapshotManager, get_snapshot_manager,
    DataRegistry, get_data_registry,
)

logger = logging.getLogger(__name__)


class ReportGenerator:
    """报告生成器"""
    
    def __init__(self):
        self.progress_callback: Optional[Callable[[int, str], None]] = None
    
    def set_progress_callback(self, callback: Callable[[int, str], None]):
        """设置进度回调"""
        self.progress_callback = callback
    
    def _update_progress(self, progress: int, message: str):
        """更新进度"""
        print(f"[ReportGenerator] 进度: {progress}% - {message}")
        if self.progress_callback:
            self.progress_callback(progress, message)

    def check_existing_report(
        self, db: Session, season: int, location: str, athlete_name: str
    ) -> Optional[str]:
        """检查是否已存在报告"""
        report = db.query(ProReport).filter(
            ProReport.season == season,
            ProReport.location == location,
            ProReport.athlete_name == athlete_name,
        ).first()
        
        if report:
            return report.report_id
        return None
    
    def reset_report_for_regeneration(self, db: Session, report_id: str) -> bool:
        """
        重置报告状态以便重新生成
        
        Args:
            db: 数据库会话
            report_id: 报告ID
            
        Returns:
            是否成功重置
        """
        report = db.query(ProReport).filter(ProReport.report_id == report_id).first()
        if not report:
            return False
        
        # 重置状态和内容
        report.status = "pending"
        report.progress = 0
        report.current_step = None
        report.sections = None
        report.charts = None
        report.introduction = None
        report.conclusion = None
        report.error_message = None
        report.completed_at = None
        
        db.commit()
        logger.info(f"[ReportGenerator] 报告已重置: {report_id}")
        return True
    
    def get_report_status(self, db: Session, report_id: str) -> Optional[Dict[str, Any]]:
        """获取报告状态"""
        report = db.query(ProReport).filter(ProReport.report_id == report_id).first()
        if not report:
            return None
        return {
            "report_id": report.report_id,
            "status": report.status,
            "progress": report.progress,
            "current_step": report.current_step,
            "title": report.title,
        }
    
    async def create_report(
        self, db: Session, season: int, location: str, athlete_name: str, user_id: Optional[int] = None
    ) -> str:
        """创建新报告记录"""
        import uuid
        
        # 获取运动员信息
        result = db.query(Result).filter(
            Result.season == season,
            Result.location == location,
            Result.name == athlete_name
        ).first()
        
        report_uuid = str(uuid.uuid4())
        
        report = ProReport(
            report_id=report_uuid,
            user_id=user_id,
            season=season,
            location=location,
            athlete_name=athlete_name,
            gender=result.gender if result else None,
            division=result.division if result else None,
            title=f"{athlete_name} - HYROX {location} S{season} 专业分析报告",
            status="pending",
            progress=0,
        )
        
        db.add(report)
        db.commit()
        
        return report_uuid
    
    def get_report(self, db: Session, report_id: str) -> Optional[Dict[str, Any]]:
        """获取报告详情"""
        report = db.query(ProReport).filter(ProReport.report_id == report_id).first()
        if not report:
            return None
        return report.to_dict()
    
    def list_user_reports(
        self, db: Session, user_id: Optional[int] = None, athlete_name: Optional[str] = None
    ) -> list:
        """列出用户报告"""
        query = db.query(ProReport)
        if user_id:
            query = query.filter(ProReport.user_id == user_id)
        if athlete_name:
            query = query.filter(ProReport.athlete_name == athlete_name)
        reports = query.order_by(ProReport.created_at.desc()).all()
        return [r.to_summary_dict() for r in reports]

    
    async def _process_heart_rate_images(
        self,
        heart_rate_images: List[str],
        total_time_minutes: float = 75.0,
    ) -> Optional[MappedHeartRateData]:
        """
        处理心率图片，提取并映射心率数据
        
        Args:
            heart_rate_images: 心率图片路径列表
            total_time_minutes: 预期比赛总时长（分钟）
            
        Returns:
            MappedHeartRateData 或 None
        """
        
        if not heart_rate_images:
            return None
        
        logger.info(f"[ReportGenerator] 开始处理 {len(heart_rate_images)} 张心率图片")
        
        try:
            
            # 提取心率数据
            if len(heart_rate_images) == 1:
                extraction_result = await heart_rate_extractor.extract_from_image(
                    image_path=heart_rate_images[0],
                    total_time_minutes=total_time_minutes,
                )
            else:
                images = [{"path": img} for img in heart_rate_images]
                extraction_result = await heart_rate_extractor.extract_from_multiple_images(
                    images=images,
                    total_time_minutes=total_time_minutes,
                )
            
            if not extraction_result.success:
                logger.warning(f"[ReportGenerator] 心率提取失败: {extraction_result.error_message}")
                return None
            
            # 导入数据点类型
            from .data_provider import HeartRateDataPoint
            
            # 转换数据点
            data_points = [
                HeartRateDataPoint(
                    timestamp_seconds=dp.timestamp_seconds,
                    heart_rate=dp.heart_rate
                )
                for dp in extraction_result.data_points
            ]
            
            # 构建 MappedHeartRateData（包含完整时序数据）
            return MappedHeartRateData(
                avg_heart_rate=extraction_result.avg_hr,
                max_heart_rate=extraction_result.max_hr,
                min_heart_rate=extraction_result.min_hr,
                zones={},  # 暂时留空，可以后续添加心率区间计算
                data_points=data_points,
                peak_moments=extraction_result.peak_moments,
                low_moments=extraction_result.low_moments,
            )
            
        except Exception as e:
            logger.error(f"[ReportGenerator] 心率处理异常: {e}")
            return None
    
    # ==================== V3 配置化架构方法 ====================
    
    async def generate_report_stream_v3(
        self, 
        db: Session, 
        report_id: str,
        heart_rate_images: Optional[List[str]] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        V3 报告生成（配置化架构 + SSE 流式）
        
        使用新架构：ConfigLoader + InputBuilder + SectionGenerator + FunctionExecutor + ReportAssembler
        
        Args:
            db: 数据库会话
            report_id: 报告 UUID
            heart_rate_images: 心率图片路径列表（可选）
            
        Yields:
            SSE 事件字典
        """
        from ...llm import llm_client
        
        report = db.query(ProReport).filter(ProReport.report_id == report_id).first()
        if not report:
            yield {"event": "error", "data": {"message": "报告不存在"}}
            return
        
        # 更新状态
        report.status = "generating"
        db.commit()
        
        try:
            logger.info(f"[ReportGenerator V3] 开始生成报告: {report_id}")
            yield {"event": "progress", "data": {"progress": 5, "step": "初始化报告生成 (V3 配置化架构)..."}}
            
            # 1. 初始化配置加载器
            logger.info("[ReportGenerator V3] 初始化配置加载器...")
            config_loader = get_config_loader()
            config_loader.load_all()
            logger.info("[ReportGenerator V3] 配置加载完成")
            
            yield {"event": "progress", "data": {"progress": 8, "step": "加载配置完成..."}}
            
            # 2. 心率数据处理（如果有图片）
            heart_rate_data = None
            if heart_rate_images:
                yield {"event": "progress", "data": {"progress": 10, "step": "正在分析心率图片..."}}
                
                hr_task = asyncio.create_task(self._process_heart_rate_images(
                    heart_rate_images,
                    total_time_minutes=75.0  # 默认值
                ))
                
                heartbeat_count = 0
                while not hr_task.done():
                    await asyncio.sleep(5)
                    heartbeat_count += 1
                    yield {"event": "heartbeat", "data": {"message": f"心率分析中... ({heartbeat_count * 5}秒)"}}
                
                heart_rate_data = await hr_task
            
            yield {"event": "progress", "data": {"progress": 15, "step": "数据预计算中..."}}
            
            # 3. 数据预计算
            data_provider = get_data_provider()
            report_data = await data_provider.prepare_all_data(
                season=report.season,
                location=report.location,
                athlete_name=report.athlete_name,
                heart_rate_data=heart_rate_data,
            )
            
            if not report_data.is_valid():
                report.status = "error"
                db.commit()
                yield {"event": "error", "data": {"message": "未找到运动员数据"}}
                return
            
            yield {"event": "progress", "data": {"progress": 25, "step": "数据预计算完成，初始化数据层..."}}
            
            # 4. 初始化数据层模块（使用同步会话）
            # 注意：使用独立的同步数据库会话用于快照管理
            from ...db.database import get_sync_db
            
            with get_sync_db() as sync_db:
                snapshot_manager = get_snapshot_manager(sync_db)
                data_registry = get_data_registry(report_data)
                
                # 5. 初始化核心模块
                input_builder = InputBuilder(config_loader, snapshot_manager, data_registry)
                section_generator = SectionGenerator(config_loader, llm_client)
                function_executor = FunctionExecutor(config_loader)
                
                # 构建上下文
                context = {
                    "season": report.season,
                    "location": report.location,
                    "athlete_name": report.athlete_name,
                    "gender": report.gender,
                    "division": report.division,
                }
                
                yield {"event": "progress", "data": {"progress": 30, "step": "开始生成章节..."}}
                
                # 6. 生成各章节
                section_ids = config_loader.get_dynamic_section_ids()
                section_outputs = {}
                
                total_sections = len(section_ids)
                section_progress_base = 35
                section_progress_span = 50  # 35% ~ 85%
                
                for i, section_id in enumerate(section_ids):
                    section_config = config_loader.get_section_config(section_id)
                    step_msg = f"正在生成: {section_config.title if section_config else section_id}"
                    
                    current_progress = section_progress_base + int((i / total_sections) * section_progress_span)
                    yield {"event": "progress", "data": {"progress": current_progress, "step": step_msg}}
                    
                    try:
                        # 构建章节输入
                        section_input = input_builder.build_section_input(
                            section_id=section_id,
                            report_id=report_id,
                            context=context,
                        )
                        
                        # 生成章节
                        section_output = await section_generator.generate_section(
                            section_id=section_id,
                            section_input=section_input,
                        )
                        
                        # 解析 Function Call 结果
                        if section_output.success:
                            data_id_map = section_input.get_data_id_map()
                            section_output = function_executor.execute_and_attach(
                                section_output,
                                data_id_map=data_id_map,
                            )
                        
                        section_outputs[section_id] = section_output
                        
                    except Exception as section_error:
                        logger.error(f"[ReportGenerator V3] 章节 {section_id} 生成失败: {section_error}")
                        from .core.section_generator import SectionOutput
                        section_outputs[section_id] = SectionOutput(
                            section_id=section_id,
                            title=section_config.title if section_config else section_id,
                            success=False,
                            error_message=str(section_error),
                        )
                    
                    # 更新进度
                    section_progress = section_progress_base + int(((i + 1) / total_sections) * section_progress_span)
                    report.progress = section_progress
                    sync_db.commit()
                
                yield {"event": "progress", "data": {"progress": 85, "step": "章节生成完成，组装报告..."}}
                
                # 7. 组装报告
                report_assembler = ReportAssembler(config_loader, snapshot_manager)
                
                # 生成报告标题
                title_template = config_loader.get_report_title_template()
                report_title = title_template.format(
                    athlete_name=report.athlete_name,
                    location=report.location,
                    season=report.season,
                )
                
                assembled_report = report_assembler.assemble_report(
                    report_id=report_id,
                    title=report_title,
                    section_outputs=section_outputs,
                )
                
                yield {"event": "progress", "data": {"progress": 90, "step": "保存报告..."}}
                
                # 8. 保存报告
                report.title = report_title
                report.sections = assembled_report.get_sections_json()
                
                # 将 data_snapshots 存储到 charts 字段（复用现有字段）
                report.charts = json.dumps(assembled_report.data_snapshots, ensure_ascii=False)
                
                # 提取 introduction 和 conclusion
                introduction_text = ""
                conclusion_text = ""
                
                summary_output = section_outputs.get("summary")
                if summary_output and summary_output.success:
                    # 从 summary 提取 summary_text 作为 introduction
                    introduction_text = summary_output.arguments.get("summary_text", "")
                    # 从 highlights 提取 conclusion
                    highlights = summary_output.arguments.get("highlights", [])
                    if highlights:
                        conclusion_text = "；".join(
                            h.get("content", "") if isinstance(h, dict) else str(h)
                            for h in highlights
                        )
                
                report.introduction = introduction_text
                report.conclusion = conclusion_text
                report.status = "completed"
                report.progress = 100
                report.completed_at = datetime.utcnow()
                
                # 提交快照数据（sync_db 会话）
                sync_db.commit()
            
            # 提交报告数据（db 会话）- report 对象属于外层 db 会话
            db.commit()
            logger.info(f"[ReportGenerator V3] 报告保存成功: {report_id}")
            
            yield {"event": "progress", "data": {"progress": 100, "step": "报告生成完成！"}}
            yield {"event": "complete", "data": {"report_id": report_id, "status": "completed"}}
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            
            report.status = "error"
            report.error_message = str(e)
            db.commit()
            yield {"event": "error", "data": {"message": str(e)}}


# 全局实例
report_generator = ReportGenerator()
