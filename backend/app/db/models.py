"""
SQLAlchemy 数据库模型定义
"""
from sqlalchemy import Column, Float, Index, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    """SQLAlchemy 基类"""
    pass


class Race(Base):
    """比赛表"""
    __tablename__ = "races"
    
    id = Column(Integer, primary_key=True)
    season = Column(Integer, nullable=False, comment="赛季编号")
    location = Column(String(50), nullable=False, comment="比赛地点")
    file_last_modified = Column(String(50), comment="数据更新时间")
    created_at = Column(DateTime, server_default=func.now(), comment="入库时间")
    
    __table_args__ = (
        Index("uq_races_season_location", "season", "location", unique=True),
    )
    
    def __repr__(self):
        return f"<Race(season={self.season}, location='{self.location}')>"


class Result(Base):
    """比赛成绩表"""
    __tablename__ = "results"
    
    id = Column(Integer, primary_key=True)
    
    # 比赛信息
    season = Column(Integer, nullable=False, comment="赛季")
    location = Column(String(50), nullable=False, comment="比赛地点")
    event_id = Column(String(50), comment="比赛 ID")
    event_name = Column(String(100), comment="比赛名称")
    
    # 选手信息
    name = Column(String(100), nullable=False, index=True, comment="选手姓名")
    nationality = Column(String(20), comment="国籍代码")
    gender = Column(String(10), comment="性别")
    division = Column(String(20), comment="组别")
    age_group = Column(String(20), comment="年龄组")
    
    # 总成绩 (单位: 分钟)
    total_time = Column(Float, comment="总成绩")
    run_time = Column(Float, comment="跑步总时间")
    work_time = Column(Float, comment="功能站总时间")
    roxzone_time = Column(Float, comment="Roxzone 时间")
    
    # 跑步分段 (单位: 分钟)
    run1_time = Column(Float, comment="跑步1")
    run2_time = Column(Float, comment="跑步2")
    run3_time = Column(Float, comment="跑步3")
    run4_time = Column(Float, comment="跑步4")
    run5_time = Column(Float, comment="跑步5")
    run6_time = Column(Float, comment="跑步6")
    run7_time = Column(Float, comment="跑步7")
    run8_time = Column(Float, comment="跑步8")
    
    # 功能站分段 (单位: 分钟)
    skierg_time = Column(Float, comment="SkiErg")
    sled_push_time = Column(Float, comment="Sled Push")
    sled_pull_time = Column(Float, comment="Sled Pull")
    burpee_broad_jump_time = Column(Float, comment="Burpee Broad Jump")
    row_erg_time = Column(Float, comment="Row Erg")
    farmers_carry_time = Column(Float, comment="Farmers Carry")
    sandbag_lunges_time = Column(Float, comment="Sandbag Lunges")
    wall_balls_time = Column(Float, comment="Wall Balls")
    
    created_at = Column(DateTime, server_default=func.now(), comment="入库时间")
    
    __table_args__ = (
        Index("idx_results_season_location", "season", "location"),
        Index("idx_results_nationality", "nationality"),
        Index("idx_results_total_time", "total_time"),
    )
    
    def __repr__(self):
        return f"<Result(name='{self.name}', season={self.season}, location='{self.location}')>"
    
    @classmethod
    def from_dataframe_row(cls, row: dict, season: int, location: str) -> "Result":
        """从 DataFrame 行创建 Result 对象"""
        return cls(
            season=season,
            location=location,
            event_id=row.get("event_id"),
            event_name=row.get("event_name"),
            name=row.get("name"),
            nationality=row.get("nationality"),
            gender=row.get("gender"),
            division=row.get("division"),
            age_group=row.get("age_group"),
            total_time=row.get("total_time"),
            run_time=row.get("run_time"),
            work_time=row.get("work_time"),
            roxzone_time=row.get("roxzone_time"),
            run1_time=row.get("run1_time"),
            run2_time=row.get("run2_time"),
            run3_time=row.get("run3_time"),
            run4_time=row.get("run4_time"),
            run5_time=row.get("run5_time"),
            run6_time=row.get("run6_time"),
            run7_time=row.get("run7_time"),
            run8_time=row.get("run8_time"),
            skierg_time=row.get("skiErg_time"),
            sled_push_time=row.get("sledPush_time"),
            sled_pull_time=row.get("sledPull_time"),
            burpee_broad_jump_time=row.get("burpeeBroadJump_time"),
            row_erg_time=row.get("rowErg_time"),
            farmers_carry_time=row.get("farmersCarry_time"),
            sandbag_lunges_time=row.get("sandbagLunges_time"),
            wall_balls_time=row.get("wallBalls_time"),
        )


class SyncLog(Base):
    """同步日志表"""
    __tablename__ = "sync_log"
    
    id = Column(Integer, primary_key=True)
    season = Column(Integer, comment="同步的赛季")
    location = Column(String(50), comment="同步的比赛")
    status = Column(String(20), nullable=False, comment="状态: success/failed")
    records_count = Column(Integer, default=0, comment="同步记录数")
    error_message = Column(Text, comment="错误信息")
    synced_at = Column(DateTime, server_default=func.now(), comment="同步时间")
    
    __table_args__ = (
        Index("idx_sync_log_season", "season"),
        Index("idx_sync_log_status", "status"),
    )
    
    def __repr__(self):
        return f"<SyncLog(season={self.season}, location='{self.location}', status='{self.status}')>"


class User(Base):
    """用户表 - 微信登录用户"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    openid = Column(String(64), unique=True, nullable=False, index=True, comment="微信 OpenID")
    nickname = Column(String(100), default="运动员", comment="用户昵称")
    avatar_url = Column(String(500), nullable=True, comment="头像 URL")
    created_at = Column(DateTime, server_default=func.now(), comment="注册时间")
    updated_at = Column(DateTime, onupdate=func.now(), comment="更新时间")
    
    def __repr__(self):
        return f"<User(id={self.id}, nickname='{self.nickname}')>"
    
    def to_dict(self):
        """转换为字典"""
        return {
            "id": self.id,
            "nickname": self.nickname,
            "avatar_url": self.avatar_url,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ClaimedRace(Base):
    """用户认领的比赛"""
    __tablename__ = "claimed_races"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False, index=True, comment="用户 ID")
    season = Column(Integer, nullable=False, comment="赛季")
    location = Column(String(50), nullable=False, comment="比赛地点")
    athlete_name = Column(String(100), nullable=False, comment="运动员姓名")
    created_at = Column(DateTime, server_default=func.now(), comment="认领时间")
    
    __table_args__ = (
        Index("uq_claimed_race", "user_id", "season", "location", "athlete_name", unique=True),
    )
    
    def __repr__(self):
        return f"<ClaimedRace(user_id={self.user_id}, athlete='{self.athlete_name}', season={self.season}, location='{self.location}')>"
    
    def to_dict(self):
        """转换为字典"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "season": self.season,
            "location": self.location,
            "athlete_name": self.athlete_name,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class AnalysisCache(Base):
    """LLM 分析结果缓存表"""
    __tablename__ = "analysis_cache"
    
    id = Column(Integer, primary_key=True)
    season = Column(Integer, nullable=False, comment="赛季")
    location = Column(String(50), nullable=False, comment="比赛地点")
    athlete_name = Column(String(100), nullable=False, comment="运动员姓名")
    
    # LLM 生成内容
    summary = Column(Text, comment="一句话总结")
    strengths = Column(Text, comment="优势 (JSON 数组)")
    weaknesses = Column(Text, comment="短板 (JSON 数组)")
    
    created_at = Column(DateTime, server_default=func.now(), comment="生成时间")
    
    __table_args__ = (
        Index("uq_analysis_cache", "season", "location", "athlete_name", unique=True),
    )
    
    def __repr__(self):
        return f"<AnalysisCache(athlete='{self.athlete_name}', season={self.season}, location='{self.location}')>"


class HeartRateImage(Base):
    """心率图片表"""
    __tablename__ = "heart_rate_images"
    
    id = Column(Integer, primary_key=True)
    report_id = Column(String(36), index=True, comment="关联报告ID")
    user_id = Column(Integer, nullable=True, comment="用户ID")
    image_path = Column(String(500), comment="本地存储路径")
    original_filename = Column(String(200), comment="原始文件名")
    extracted_data = Column(Text, nullable=True, comment="VL提取的JSON数据")
    extraction_status = Column(String(20), default="pending", comment="提取状态: pending/processing/completed/failed")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")
    
    __table_args__ = (
        Index("idx_heart_rate_images_report_id", "report_id"),
        Index("idx_heart_rate_images_status", "extraction_status"),
    )
    
    def __repr__(self):
        return f"<HeartRateImage(id={self.id}, report_id='{self.report_id}', status='{self.extraction_status}')>"
    
    def to_dict(self):
        """转换为字典"""
        import json
        return {
            "id": self.id,
            "report_id": self.report_id,
            "user_id": self.user_id,
            "image_path": self.image_path,
            "original_filename": self.original_filename,
            "extracted_data": json.loads(self.extracted_data) if self.extracted_data else None,
            "extraction_status": self.extraction_status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ProReport(Base):
    """专业分析报告表"""
    __tablename__ = "pro_reports"
    
    id = Column(Integer, primary_key=True)
    report_id = Column(String(36), unique=True, nullable=False, index=True, comment="报告唯一ID")
    user_id = Column(Integer, nullable=True, index=True, comment="用户ID（可选）")
    
    # 关联的比赛信息
    season = Column(Integer, nullable=False, comment="赛季")
    location = Column(String(50), nullable=False, comment="比赛地点")
    athlete_name = Column(String(100), nullable=False, comment="运动员姓名")
    gender = Column(String(10), comment="性别")
    division = Column(String(20), comment="组别")
    
    # 报告内容
    title = Column(String(200), comment="报告标题")
    introduction = Column(Text, comment="引言")
    sections = Column(Text, comment="章节内容 (JSON)")
    charts = Column(Text, comment="图表配置 (JSON)")
    conclusion = Column(Text, comment="总结与建议")
    
    # 状态管理
    status = Column(String(20), default='pending', comment="状态: pending/generating/completed/error")
    progress = Column(Integer, default=0, comment="生成进度 0-100")
    current_step = Column(String(100), comment="当前步骤描述")
    error_message = Column(Text, comment="错误信息")
    
    # 时间戳
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")
    completed_at = Column(DateTime, comment="完成时间")
    
    __table_args__ = (
        Index("idx_pro_reports_user", "user_id"),
        Index("idx_pro_reports_status", "status"),
        Index("idx_pro_reports_athlete", "season", "location", "athlete_name"),
    )
    
    # Relationships
    data_snapshots = relationship("ReportDataSnapshot", back_populates="report", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<ProReport(report_id='{self.report_id}', athlete='{self.athlete_name}', status='{self.status}')>"
    
    def to_dict(self):
        """转换为字典"""
        import json
        return {
            "report_id": self.report_id,
            "user_id": self.user_id,
            "season": self.season,
            "location": self.location,
            "athlete_name": self.athlete_name,
            "gender": self.gender,
            "division": self.division,
            "title": self.title,
            "introduction": self.introduction,
            "sections": json.loads(self.sections) if self.sections else [],
            "charts": json.loads(self.charts) if self.charts else {},
            "conclusion": self.conclusion,
            "status": self.status,
            "progress": self.progress,
            "current_step": self.current_step,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }
    
    def to_summary_dict(self):
        """转换为摘要字典（列表展示用）"""
        return {
            "report_id": self.report_id,
            "season": self.season,
            "location": self.location,
            "athlete_name": self.athlete_name,
            "title": self.title,
            "status": self.status,
            "progress": self.progress,
            "current_step": self.current_step,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


class ReportDataSnapshot(Base):
    """报告数据快照表 - 存储报告生成时的数据副本，用于持久化 data_id"""
    __tablename__ = "report_data_snapshots"
    
    id = Column(Integer, primary_key=True)
    data_id = Column(String(36), unique=True, nullable=False, index=True, comment="数据唯一ID (UUID)")
    report_id = Column(String(36), ForeignKey("pro_reports.report_id", ondelete="CASCADE"), nullable=False, index=True, comment="关联的报告ID")
    
    # 数据类型和内容
    data_type = Column(String(50), nullable=False, comment="数据类型: athlete_result/percentile_ranking/time_loss_analysis/etc")
    data_content = Column(Text, nullable=False, comment="数据内容 (JSON)")
    
    # 元数据
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")
    
    __table_args__ = (
        Index("idx_report_data_snapshots_report", "report_id"),
        Index("idx_report_data_snapshots_type", "report_id", "data_type"),
    )
    
    # Relationships
    report = relationship("ProReport", back_populates="data_snapshots")
    
    def __repr__(self):
        return f"<ReportDataSnapshot(data_id='{self.data_id}', report_id='{self.report_id}', type='{self.data_type}')>"
    
    def to_dict(self):
        """转换为字典"""
        import json
        return {
            "data_id": self.data_id,
            "report_id": self.report_id,
            "data_type": self.data_type,
            "content": json.loads(self.data_content) if self.data_content else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class PredictionStats(Base):
    """预测统计表 - 预计算的各时间区间预测数据"""
    __tablename__ = "prediction_stats"
    
    id = Column(Integer, primary_key=True)
    time_bin = Column(String(20), nullable=False, comment="时间区间 (如 '85-90')")
    gender = Column(String(10), nullable=False, comment="性别")
    division = Column(String(20), nullable=False, comment="组别")
    
    # 样本统计
    sample_size = Column(Integer, default=0, comment="样本量")
    improvement_rate = Column(Float, comment="进步比例 (0-1)")
    avg_improvement = Column(Integer, comment="平均进步秒数")
    
    # 百分位预测 (秒)
    percentile_5 = Column(Integer, comment="5%分位 - Excellent")
    percentile_25 = Column(Integer, comment="25%分位 - Great")
    percentile_50 = Column(Integer, comment="50%分位 - Expected")
    percentile_75 = Column(Integer, comment="75%分位 - Subpar")
    percentile_95 = Column(Integer, comment="95%分位 - Poor")
    
    # 方差
    variance = Column(Integer, comment="典型方差 (秒)")
    
    # 分段拆解数据
    split_breakdown = Column(Text, comment="分段拆解目标 (JSON)")
    
    # 概率密度曲线数据
    distribution_curve = Column(Text, comment="概率密度曲线数据 (JSON)")
    
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, onupdate=func.now(), comment="更新时间")
    
    __table_args__ = (
        Index("uq_prediction_stats", "time_bin", "gender", "division", unique=True),
    )
    
    def __repr__(self):
        return f"<PredictionStats(time_bin='{self.time_bin}', gender='{self.gender}', division='{self.division}')>"
    
    def to_dict(self):
        """转换为字典"""
        import json
        return {
            "id": self.id,
            "time_bin": self.time_bin,
            "gender": self.gender,
            "division": self.division,
            "sample_size": self.sample_size,
            "improvement_rate": self.improvement_rate,
            "avg_improvement": self.avg_improvement,
            "percentiles": {
                "5": self.percentile_5,
                "25": self.percentile_25,
                "50": self.percentile_50,
                "75": self.percentile_75,
                "95": self.percentile_95,
            },
            "variance": self.variance,
            "split_breakdown": json.loads(self.split_breakdown) if self.split_breakdown else None,
            "distribution_curve": json.loads(self.distribution_curve) if self.distribution_curve else None,
        }


class AdjacentRacePairs(Base):
    """相邻比赛对表 - 存储运动员连续两场比赛数据用于预测"""
    __tablename__ = "adjacent_race_pairs"
    
    id = Column(Integer, primary_key=True)
    athlete_id = Column(String(50), index=True, comment="运动员ID/姓名")
    
    # Race 1 (当前比赛)
    race1_season = Column(Integer, comment="比赛1赛季")
    race1_location = Column(String(50), comment="比赛1地点")
    race1_total_seconds = Column(Integer, comment="比赛1总成绩(秒)")
    race1_time_bin = Column(String(20), index=True, comment="比赛1时间区间")
    race1_splits = Column(Text, comment="比赛1分段数据(JSON)")
    
    # Race 2 (下一场比赛)
    race2_season = Column(Integer, comment="比赛2赛季")
    race2_location = Column(String(50), comment="比赛2地点")
    race2_total_seconds = Column(Integer, comment="比赛2总成绩(秒)")
    race2_splits = Column(Text, comment="比赛2分段数据(JSON)")
    
    # 元数据
    gender = Column(String(10), comment="性别")
    division = Column(String(20), comment="组别")
    days_between = Column(Integer, comment="两场比赛间隔天数")
    
    # 计算字段
    delta_seconds = Column(Integer, comment="成绩变化(秒) race2-race1")
    improved = Column(Integer, default=0, comment="是否进步 (1=是, 0=否)")
    
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")
    
    __table_args__ = (
        Index("idx_adjacent_race_pairs_time_bin", "race1_time_bin", "gender", "division"),
        Index("idx_adjacent_race_pairs_athlete", "athlete_id"),
    )
    
    def __repr__(self):
        return f"<AdjacentRacePairs(athlete='{self.athlete_id}', race1={self.race1_total_seconds}s, race2={self.race2_total_seconds}s)>"
    
    def to_dict(self):
        """转换为字典"""
        import json
        return {
            "id": self.id,
            "athlete_id": self.athlete_id,
            "race1": {
                "season": self.race1_season,
                "location": self.race1_location,
                "total_seconds": self.race1_total_seconds,
                "time_bin": self.race1_time_bin,
                "splits": json.loads(self.race1_splits) if self.race1_splits else None,
            },
            "race2": {
                "season": self.race2_season,
                "location": self.race2_location,
                "total_seconds": self.race2_total_seconds,
                "splits": json.loads(self.race2_splits) if self.race2_splits else None,
            },
            "gender": self.gender,
            "division": self.division,
            "days_between": self.days_between,
            "delta_seconds": self.delta_seconds,
            "improved": bool(self.improved),
        }


class GlobalDistribution(Base):
    """全球分布统计表 - 预计算的各分段全球分布数据"""
    __tablename__ = "global_distribution"
    
    id = Column(Integer, primary_key=True)
    segment_type = Column(String(30), nullable=False, comment="分段类型: total/running/workout/skierg等")
    gender = Column(String(10), nullable=False, comment="性别")
    division = Column(String(20), nullable=False, comment="组别")
    
    # 统计数据
    total_athletes = Column(Integer, default=0, comment="总运动员数")
    histogram_bins = Column(Text, comment="直方图区间 (JSON数组)")
    histogram_counts = Column(Text, comment="直方图计数 (JSON数组)")
    
    # 百分位数据 (秒或分钟，取决于segment_type)
    percentile_5 = Column(Float, comment="5%分位")
    percentile_10 = Column(Float, comment="10%分位")
    percentile_25 = Column(Float, comment="25%分位")
    percentile_50 = Column(Float, comment="50%分位")
    percentile_75 = Column(Float, comment="75%分位")
    percentile_90 = Column(Float, comment="90%分位")
    percentile_95 = Column(Float, comment="95%分位")
    
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, onupdate=func.now(), comment="更新时间")
    
    __table_args__ = (
        Index("uq_global_distribution", "segment_type", "gender", "division", unique=True),
    )
    
    def __repr__(self):
        return f"<GlobalDistribution(segment='{self.segment_type}', gender='{self.gender}', division='{self.division}')>"
    
    def to_dict(self):
        """转换为字典"""
        import json
        return {
            "id": self.id,
            "segment_type": self.segment_type,
            "gender": self.gender,
            "division": self.division,
            "total_athletes": self.total_athletes,
            "histogram": {
                "bins": json.loads(self.histogram_bins) if self.histogram_bins else [],
                "counts": json.loads(self.histogram_counts) if self.histogram_counts else [],
            },
            "percentiles": {
                "5": self.percentile_5,
                "10": self.percentile_10,
                "25": self.percentile_25,
                "50": self.percentile_50,
                "75": self.percentile_75,
                "90": self.percentile_90,
                "95": self.percentile_95,
            },
        }

