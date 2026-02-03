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
    ConfigLoader, get_config_loader, reset_config_loader,
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


def _parse_diff_to_seconds(diff_str: str) -> Optional[int]:
    """把表格「差距」字符串（如 -1:10、-0:21）解析为秒数（非负）。"""
    if not diff_str:
        return None
    s = (diff_str or "").strip().lstrip("-+")
    if not s or s == "0" or s == "0:00":
        return 0
    parts = s.split(":")
    if len(parts) == 2:
        try:
            m, s = int(parts[0]), int(parts[1])
            return m * 60 + s
        except ValueError:
            return None
    return None


def _patch_time_loss_agent_result(
    section_output: Any,
    improvement_agent_result: Optional[Dict[str, Any]] = None,
    running_vs_top10_table: Optional[List[Dict[str, Any]]] = None,
    workout_vs_top10_table: Optional[List[Dict[str, Any]]] = None,
    roxzone_comparison: Optional[Dict[str, Any]] = None,
    canonical_loss_items: Optional[List[Dict[str, Any]]] = None,
) -> None:
    """
    1) 用后端预计算表覆盖 1.2 三 Tab 的表格/对比，保证 you/top10/diff 等全部来自取数与后端计算；
    2) 若有 improvement_agent_result，再覆盖 1.1/1.2 的 improvement_display；
    3) 若 canonical 中有 ROXZONE 且 Agent 有 roxzone 但 1.1 items 漏列，则补一条（兜底保证 1.1 与 1.3 一致）。
    """
    import re
    from .improvement_agent import format_improvement_display

    args = getattr(section_output, "arguments", None)
    if not args:
        return

    seg_comp = args.get("segment_comparison") or {}
    running = seg_comp.get("running") or {}
    table_data = running.get("table_data") or []

    # 1) Running：后端表覆盖 table_data
    if running_vs_top10_table:
        llm_highlights = { (r.get("segment") or "").strip(): r.get("highlight", False) for r in table_data }
        running["table_data"] = [
            { "segment": row["segment"], "you": row["you"], "top10": row["top10"], "diff": row["diff"], "highlight": llm_highlights.get((row.get("segment") or "").strip(), False) }
            for row in running_vs_top10_table
        ]
        table_data = running["table_data"]

    # 2) Workout：后端表覆盖 table_data（保留 LLM 的 highlight）；缺 conclusion_blocks 时按 highlight 行合成卡片
    workout = seg_comp.get("workout") or {}
    workout_map_early = {
        (w.get("segment") or "").strip(): w
        for w in (improvement_agent_result or {}).get("workout") or []
    }
    if workout_vs_top10_table:
        wt_data = workout.get("table_data") or []
        llm_highlights_w = { (r.get("segment") or "").strip(): r.get("highlight", False) for r in wt_data }
        workout["table_data"] = [
            { "segment": row["segment"], "you": row["you"], "top10": row["top10"], "diff": row["diff"], "highlight": llm_highlights_w.get((row.get("segment") or "").strip(), False) }
            for row in workout_vs_top10_table
        ]
        # 有 highlight 行但缺/少 conclusion_blocks 时，按 Running 格式合成多张卡片（每站一张）
        wt_table = workout.get("table_data") or []
        highlight_rows = [r for r in wt_table if r.get("highlight")]
        existing_blocks = workout.get("conclusion_blocks") or []
        if highlight_rows and len(existing_blocks) != len(highlight_rows):
            blocks = []
            for r in highlight_rows:
                seg = (r.get("segment") or "").strip()
                you = r.get("you") or ""
                top10 = r.get("top10") or ""
                diff = r.get("diff") or ""
                gap_text = f"你 {you}，Top 10% {top10}，差距 {diff}"
                w_agent = workout_map_early.get(seg)
                rec_sec = int(w_agent.get("recommended_improvement_seconds", 0)) if w_agent else 0
                improvement_display = format_improvement_display(rec_sec)
                blocks.append({
                    "segment": seg,
                    "gap_vs_top10": gap_text,
                    "pacing_issue": "相对同组 Top 10% 用时偏长，存在技术或节奏空间。",
                    "improvement_display": improvement_display,
                    "improvement_logic": f"本站与 Top 10% 的差距为 {diff}；可提升上限取该差距与 1.1 该站损耗的较小值。推荐可争取 {improvement_display}，理由：与组别参考一致。",
                })
            workout["conclusion_blocks"] = blocks

    # 3) Roxzone：后端 comparison 覆盖
    roxzone = seg_comp.get("roxzone") or {}
    if roxzone_comparison and isinstance(roxzone_comparison, dict):
        roxzone["comparison"] = dict(roxzone_comparison)

    if not improvement_agent_result:
        logger.info("[ReportGenerator] time_loss 已用后端表覆盖 running/workout/roxzone 数据")
        return

    running_map = {
        (r.get("segment") or "").strip(): r
        for r in (improvement_agent_result.get("running") or [])
    }
    workout_map = {
        (w.get("segment") or "").strip(): w
        for w in (improvement_agent_result.get("workout") or [])
    }
    roxzone_agent = improvement_agent_result.get("roxzone")

    # 从表格取「差距」作为跑步段可提升上限
    table_diff_seconds: Dict[str, int] = {}
    for row in table_data:
        seg = (row.get("segment") or "").strip()
        diff_str = row.get("diff") or ""
        sec = _parse_diff_to_seconds(diff_str)
        if seg and sec is not None:
            table_diff_seconds[seg] = sec

    def _cap_run_improvement(segment: str, agent_seconds: int) -> int:
        cap = table_diff_seconds.get(segment)
        if cap is not None and agent_seconds > cap:
            return cap
        return agent_seconds

    # 1. 覆盖 loss_overview.items 的 improvement_display（跑步段用表格差距做上限）；漏列 ROXZONE 时兜底补一条
    loss_overview = args.get("loss_overview") or {}
    items = loss_overview.get("items") or []
    has_roxzone_item = any(
        ("ROXZONE" in ((i.get("source") or "").strip()) or "转换区" in ((i.get("source") or "").strip()))
        for i in items
    )
    if roxzone_agent and (canonical_loss_items or []) and not has_roxzone_item:
        roxzone_canonical = next(
            (c for c in canonical_loss_items if ("ROXZONE" in (c.get("source") or "") or "转换区" in (c.get("source") or ""))),
            None,
        )
        if roxzone_canonical:
            sec = roxzone_agent.get("recommended_improvement_seconds") or 0
            items.append({
                "source": roxzone_canonical.get("source") or "ROXZONE (转换区)",
                "source_desc": "转换区相对组别平均的损耗",
                "loss_seconds": roxzone_canonical.get("loss_seconds"),
                "loss_display": roxzone_canonical.get("loss_display") or "",
                "difficulty": "容易",
                "difficulty_level": "easy",
                "improvement_display": format_improvement_display(int(sec)),
            })
            logger.info("[ReportGenerator] time_loss 1.1 已兜底补入 ROXZONE (转换区) 项")
    for item in items:
        source = (item.get("source") or "").strip()
        run_m = re.search(r"Run\s*(\d+)", source)
        if run_m:
            seg = f"Run {run_m.group(1)}"
            r = running_map.get(seg)
            if r:
                sec = r.get("recommended_improvement_seconds") or 0
                sec = _cap_run_improvement(seg, int(sec))
                item["improvement_display"] = format_improvement_display(sec)
                continue
        if source in workout_map:
            w = workout_map[source]
            sec = w.get("recommended_improvement_seconds") or 0
            item["improvement_display"] = format_improvement_display(sec)
            continue
        if "ROXZONE" in source or "转换区" in source:
            if roxzone_agent:
                sec = roxzone_agent.get("recommended_improvement_seconds") or 0
                item["improvement_display"] = format_improvement_display(sec)

    # 2. 覆盖 segment_comparison.running.conclusion_blocks 的 improvement_display（计算逻辑由 LLM 写详细版，不覆盖）
    blocks = running.get("conclusion_blocks") or []
    for block in blocks:
        seg = (block.get("segment") or "").strip()
        r = running_map.get(seg)
        if r:
            sec = r.get("recommended_improvement_seconds") or 0
            sec = _cap_run_improvement(seg, int(sec))
            block["improvement_display"] = format_improvement_display(sec)

    # 4) Workout conclusion_blocks：用 Agent 结果覆盖 improvement_display（计算逻辑由 LLM 写详细版）
    workout_blocks = workout.get("conclusion_blocks") or []
    for wblock in workout_blocks:
        seg = (wblock.get("segment") or "").strip()
        w = workout_map.get(seg)
        if w:
            sec = w.get("recommended_improvement_seconds") or 0
            wblock["improvement_display"] = format_improvement_display(sec)

    logger.info("[ReportGenerator] time_loss 已用 Agent 结果覆盖 improvement_display（running/workout）；running 计算逻辑由 LLM 写详细版；running/workout/roxzone 表已用后端数据覆盖")


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
    
    def _find_athlete_result(self, db: Session, season: int, location: str, athlete_name: str):
        """查找运动员成绩：先精确匹配，再尝试规范化姓名匹配"""
        # 1. 精确匹配
        result = db.query(Result).filter(
            Result.season == season,
            Result.location == location,
            Result.name == athlete_name,
        ).first()
        if result:
            return result
        # 2. 规范化姓名：去首尾空格、合并连续空格
        name_clean = (athlete_name or "").strip()
        if not name_clean:
            return None
        name_normalized = " ".join(name_clean.split())
        result = db.query(Result).filter(
            Result.season == season,
            Result.location == location,
            Result.name == name_normalized,
        ).first()
        if result:
            return result
        # 3. 同场次所有选手，按姓名包含/相似匹配（兼容 "Chen, Yuanmin" vs "Yuanmin Chen" 等）
        candidates = db.query(Result).filter(
            Result.season == season,
            Result.location == location,
            Result.total_time.isnot(None),
        ).all()
        a_lower = name_normalized.lower()
        for r in candidates:
            if (r.name or "").strip().lower() == a_lower:
                return r
            # 姓, 名 与 名 姓 互换
            if "," in name_normalized and "," in (r.name or ""):
                parts_a = [p.strip() for p in name_normalized.split(",", 1)]
                parts_b = [p.strip() for p in (r.name or "").split(",", 1)]
                if len(parts_a) == 2 and len(parts_b) == 2:
                    if parts_a[0].lower() == parts_b[0].lower() and parts_a[1].lower() == parts_b[1].lower():
                        return r
                    if parts_a[0].lower() == parts_b[1].lower() and parts_a[1].lower() == parts_b[0].lower():
                        return r
        return None

    def get_report(self, db: Session, report_id: str) -> Optional[Dict[str, Any]]:
        """获取报告详情（包含运动员比赛数据）；sections 按当前配置过滤，只返回已启用章节"""
        report = db.query(ProReport).filter(ProReport.report_id == report_id).first()
        if not report:
            return None
        
        # 获取基础报告数据
        report_data = report.to_dict()
        
        # 查询运动员的比赛成绩（支持多种姓名匹配）
        result = self._find_athlete_result(
            db, report.season, report.location, report.athlete_name
        )
        
        if result:
            # 添加比赛详细信息
            report_data["event_name"] = result.event_name
            report_data["age_group"] = result.age_group
            
            # 将总时间从分钟转换为可读格式
            if result.total_time:
                total_minutes = result.total_time
                hours = int(total_minutes // 60)
                minutes = int(total_minutes % 60)
                seconds = int((total_minutes * 60) % 60)
                if hours > 0:
                    report_data["total_time"] = f"{hours}:{minutes:02d}:{seconds:02d}"
                else:
                    report_data["total_time"] = f"{minutes}:{seconds:02d}"
                report_data["total_time_minutes"] = total_minutes
            
            # 计算总排名（同场比赛、同组别、同性别）
            overall_rank = db.query(Result).filter(
                Result.season == report.season,
                Result.location == report.location,
                Result.division == result.division,
                Result.gender == result.gender,
                Result.total_time < result.total_time
            ).count() + 1
            report_data["overall_rank"] = overall_rank
            
            # 计算同场比赛总人数
            total_participants = db.query(Result).filter(
                Result.season == report.season,
                Result.location == report.location,
                Result.division == result.division,
                Result.gender == result.gender,
                Result.total_time != None
            ).count()
            report_data["total_participants"] = total_participants
            
            # 计算年龄组排名
            if result.age_group:
                age_group_rank = db.query(Result).filter(
                    Result.season == report.season,
                    Result.location == report.location,
                    Result.division == result.division,
                    Result.gender == result.gender,
                    Result.age_group == result.age_group,
                    Result.total_time < result.total_time
                ).count() + 1
                report_data["age_group_rank"] = age_group_rank
                
                # 计算年龄组总人数
                age_group_total = db.query(Result).filter(
                    Result.season == report.season,
                    Result.location == report.location,
                    Result.division == result.division,
                    Result.gender == result.gender,
                    Result.age_group == result.age_group,
                    Result.total_time != None
                ).count()
                report_data["age_group_total"] = age_group_total
        
        # 按当前配置过滤 sections：只返回已启用的章节，避免老报告展示多章节
        try:
            config_loader = get_config_loader()
            config_loader.load_all(force_reload=False)
            enabled_ids = set(config_loader.get_dynamic_section_ids())
            if enabled_ids:
                sections_raw = report_data.get("sections") or []
                if isinstance(sections_raw, list):
                    report_data["sections"] = [
                        s for s in sections_raw
                        if isinstance(s, dict) and s.get("section_id") in enabled_ids
                    ]
        except Exception as e:
            logger.warning(f"[ReportGenerator] 按配置过滤 sections 失败: {e}")
        
        return report_data
    
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
            
            # 1. 初始化配置加载器（强制重置实例以获取最新配置）
            logger.info("[ReportGenerator V3] 初始化配置加载器...")
            config_loader = reset_config_loader()
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
                        # time_loss 章节前先调用提升空间 Agent，结果注入 context
                        section_context = dict(context)
                        if section_id == "time_loss":
                            improvement_result = None
                            try:
                                from .improvement_agent import call_improvement_agent
                                improvement_result = await call_improvement_agent(report_data)
                                section_context["improvement_agent_result"] = improvement_result
                                n_run = len(improvement_result.get("running") or [])
                                n_work = len(improvement_result.get("workout") or [])
                                has_rox = improvement_result.get("roxzone") is not None
                                logger.info(f"[ReportGenerator] 提升空间 Agent 已调用: running={n_run}, workout={n_work}, roxzone={has_rox}")
                            except Exception as agent_err:
                                logger.warning(f"[ReportGenerator] 提升空间 Agent 调用失败: {agent_err}", exc_info=True)
                                section_context["improvement_agent_result"] = None
                        # 构建章节输入
                        section_input = input_builder.build_section_input(
                            section_id=section_id,
                            report_id=report_id,
                            context=section_context,
                        )
                        
                        # 生成章节
                        section_output = await section_generator.generate_section(
                            section_id=section_id,
                            section_input=section_input,
                        )
                        
                        # time_loss：用后端预计算表覆盖 1.2 三 Tab；覆盖 improvement_display；漏列 ROXZONE 时兜底补入 1.1
                        if section_id == "time_loss" and section_output.success:
                            seg_data = data_registry.get_data("segment_comparison")
                            running_table = seg_data.get("running_vs_top10_table") if seg_data and isinstance(seg_data.get("running_vs_top10_table"), list) else None
                            workout_table = seg_data.get("workout_vs_top10_table") if seg_data and isinstance(seg_data.get("workout_vs_top10_table"), list) else None
                            roxzone_comp = seg_data.get("roxzone_comparison") if seg_data and isinstance(seg_data.get("roxzone_comparison"), dict) else None
                            tla_data = data_registry.get_data("time_loss_analysis")
                            canonical_items = (tla_data.get("canonical_loss_items") or []) if tla_data and isinstance(tla_data.get("canonical_loss_items"), list) else None
                            _patch_time_loss_agent_result(
                                section_output,
                                improvement_agent_result=section_context.get("improvement_agent_result"),
                                running_vs_top10_table=running_table,
                                workout_vs_top10_table=workout_table,
                                roxzone_comparison=roxzone_comp,
                                canonical_loss_items=canonical_items,
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
