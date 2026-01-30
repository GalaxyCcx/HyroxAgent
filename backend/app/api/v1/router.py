"""
API v1 路由汇总
"""
from fastapi import APIRouter

from app.api.v1.athletes import router as athletes_router
from app.api.v1.suggest import router as suggest_router
from app.api.v1.results import router as results_router
from app.api.v1.sync import router as sync_router
from app.api.v1.races import router as races_router
from app.api.v1.auth import router as auth_router
from app.api.v1.claim import router as claim_router
from app.api.v1.analysis import router as analysis_router
from app.api.v1.report import router as report_router
from app.api.v1.upload import router as upload_router

# 创建 v1 路由
api_router = APIRouter()

# 注册子路由
api_router.include_router(auth_router)  # 认证路由
api_router.include_router(claim_router)  # 认领路由
api_router.include_router(suggest_router)  # suggest 在 athletes 之前，避免路由冲突
api_router.include_router(athletes_router)
api_router.include_router(results_router)
api_router.include_router(analysis_router)  # LLM 分析路由
api_router.include_router(report_router)  # 专业报告路由
api_router.include_router(upload_router)  # 文件上传路由
api_router.include_router(sync_router)  # 数据同步路由
api_router.include_router(races_router)  # 赛事列表路由

