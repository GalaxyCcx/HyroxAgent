"""
API 依赖注入
"""
from app.core.hyrox_client import HyroxClient, get_hyrox_client
from app.services.athlete_service import AthleteService, get_athlete_service


def get_hyrox_client_dep() -> HyroxClient:
    """获取 HyroxClient 依赖"""
    return get_hyrox_client()


def get_athlete_service_dep() -> AthleteService:
    """获取 AthleteService 依赖"""
    return get_athlete_service()




