"""
应用配置管理
"""
from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings


def _get_project_root() -> Path:
    """获取项目根目录"""
    return Path(__file__).parent.parent.parent.parent


class Settings(BaseSettings):
    """应用配置类"""
    
    # 应用基础配置
    APP_NAME: str = "HyroxAgent"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    DEBUG: bool = True
    
    # API 配置
    API_V1_PREFIX: str = "/api/v1"
    
    # CORS 配置
    CORS_ORIGINS: list[str] = ["*"]
    
    # 数据库配置
    DATABASE_PATH: Optional[str] = None  # 为空时使用默认路径
    
    # 缓存配置
    CACHE_ENABLED: bool = True
    CACHE_TTL: int = 3600  # 1小时
    
    # 搜索配置
    DEFAULT_SEARCH_LIMIT: int = 20
    MAX_SEARCH_LIMIT: int = 100
    DEFAULT_SEARCH_SEASONS: list[int] = [8, 7, 6, 5, 4, 3, 2, 1]  # 搜索所有赛季（最新在前）
    
    # 微信小程序配置
    WECHAT_APP_ID: str = "wxcfed9bf3ed5976b7"
    WECHAT_APP_SECRET: str = "d050ab820b90b873016e65b8360ff65f"
    
    # JWT 配置
    JWT_SECRET_KEY: str = "hyrox_agent_jwt_secret_2026"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_DAYS: int = 30  # token 有效期 30 天
    
    # 阿里云 LLM 配置
    ALIYUN_LLM_API_KEY: str = "sk-5b02cdae243544b19250dca63bde621f"
    ALIYUN_LLM_MODEL: str = "qwen-max-latest"
    ALIYUN_LLM_BASE_URL: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    
    def get_database_path(self) -> Path:
        """
        获取数据库文件路径
        
        优先级:
        1. DATABASE_PATH 环境变量指定的路径
        2. 默认路径: 项目根目录/data/db/hyrox.db
        """
        if self.DATABASE_PATH:
            return Path(self.DATABASE_PATH)
        return _get_project_root() / "data" / "db" / "hyrox.db"
    
    def get_data_dir(self) -> Path:
        """获取数据根目录"""
        return _get_project_root() / "data"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache
def get_settings() -> Settings:
    """获取配置单例"""
    return Settings()


settings = get_settings()



