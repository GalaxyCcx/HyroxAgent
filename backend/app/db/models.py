"""
SQLAlchemy 数据库模型定义
"""
from sqlalchemy import Column, Float, Index, Integer, String, Text, DateTime
from sqlalchemy.orm import DeclarativeBase
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

