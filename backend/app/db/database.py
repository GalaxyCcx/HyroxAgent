"""
SQLite 数据库连接管理

数据库路径配置优先级:
1. DATABASE_PATH 环境变量
2. 默认路径: 项目根目录/data/db/hyrox.db
"""
import logging
from pathlib import Path
from typing import AsyncGenerator, Generator
from contextlib import contextmanager

from sqlalchemy import text, create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config.settings import settings

logger = logging.getLogger(__name__)


def get_db_path() -> Path:
    """
    获取数据库文件路径
    
    使用 settings 中的配置，支持环境变量覆盖
    """
    db_path = settings.get_database_path()
    # 确保目录存在
    db_path.parent.mkdir(parents=True, exist_ok=True)
    return db_path


def get_database_url() -> str:
    """获取数据库连接 URL"""
    db_path = get_db_path()
    return f"sqlite+aiosqlite:///{db_path}"


# 创建异步引擎
engine = create_async_engine(
    get_database_url(),
    echo=False,
    connect_args={"check_same_thread": False},
)

# 创建异步会话工厂
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# 创建同步引擎（用于报告生成等长时间任务）
def get_sync_database_url() -> str:
    """获取同步数据库连接 URL"""
    db_path = get_db_path()
    return f"sqlite:///{db_path}"


sync_engine = create_engine(
    get_sync_database_url(),
    echo=False,
    connect_args={"check_same_thread": False},
)

# 创建同步会话工厂
sync_session_maker = sessionmaker(
    bind=sync_engine,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@contextmanager
def get_sync_db() -> Generator[Session, None, None]:
    """获取同步数据库会话（用于后台任务）"""
    session = sync_session_maker()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """获取数据库会话 (FastAPI 依赖注入)"""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """初始化数据库表"""
    from app.db.models import Base
    
    logger.info(f"Initializing database at {get_db_path()}")
    
    async with engine.begin() as conn:
        # 创建所有表
        await conn.run_sync(Base.metadata.create_all)
        
        # 启用 WAL 模式提升性能
        await conn.execute(text("PRAGMA journal_mode=WAL"))
        await conn.execute(text("PRAGMA synchronous=NORMAL"))
    
    logger.info("Database initialized successfully")


async def get_db_stats() -> dict:
    """获取数据库统计信息"""
    from app.db.models import Race, Result, SyncLog
    from sqlalchemy import func, select
    
    db_path = get_db_path()
    
    async with async_session_maker() as session:
        # 统计各表记录数
        races_count = await session.scalar(select(func.count(Race.id)))
        results_count = await session.scalar(select(func.count(Result.id)))
        
        # 获取最后同步时间
        last_sync = await session.scalar(
            select(SyncLog.synced_at)
            .where(SyncLog.status == "success")
            .order_by(SyncLog.synced_at.desc())
            .limit(1)
        )
    
    return {
        "database_path": str(db_path),
        "database_size_mb": round(db_path.stat().st_size / 1024 / 1024, 2) if db_path.exists() else 0,
        "total_races": races_count or 0,
        "total_results": results_count or 0,
        "last_sync": last_sync.isoformat() if last_sync else None,
    }

