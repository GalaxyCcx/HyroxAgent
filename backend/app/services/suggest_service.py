"""
名称建议服务
提供运动员姓名的模糊匹配建议功能
使用本地 SQLite 数据库查询
"""
import logging
from typing import Optional

from sqlalchemy import func, select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.settings import settings
from app.db.database import async_session_maker
from app.db.models import Result

logger = logging.getLogger(__name__)


class SuggestService:
    """
    名称建议服务
    
    功能：
    - 从本地 SQLite 查询运动员姓名
    - 提供模糊匹配建议
    - 统计参赛次数
    """
    
    async def suggest(
        self,
        keyword: str,
        limit: int = 5,
        season: Optional[int] = None,
    ) -> dict:
        """
        获取名称建议
        
        Args:
            keyword: 搜索关键词
            limit: 返回数量上限
            season: 指定赛季（可选）
        
        Returns:
            包含建议列表的字典
        """
        logger.info(f"Suggest: keyword={keyword}, limit={limit}, season={season}")
        
        if not keyword or len(keyword.strip()) < 1:
            return {"suggestions": [], "total": 0}
        
        async with async_session_maker() as session:
            
            # 构建子查询：按姓名分组统计参赛次数
            # 使用 LIKE 进行模糊匹配
            keywords = keyword.strip().split()
            
            # 基础查询：统计每个姓名的出现次数
            stmt = (
                select(
                    Result.name,
                    func.count(Result.id).label('match_count')
                )
                .group_by(Result.name)
            )
            
            # 如果指定了赛季
            if season:
                stmt = stmt.where(Result.season == season)
            
            # 添加模糊匹配条件
            # 所有关键词都必须匹配（AND 逻辑）
            for kw in keywords:
                # 支持匹配姓名中的任意位置
                stmt = stmt.where(Result.name.ilike(f"%{kw}%"))
            
            # 按参赛次数降序，限制数量
            stmt = stmt.order_by(func.count(Result.id).desc()).limit(limit * 2)
            
            result = await session.execute(stmt)
            
            rows = result.all()
            
            # 转换为响应格式
            matches = [
                {
                    "name": row.name,
                    "match_count": row.match_count
                }
                for row in rows
            ]
        
        # 限制返回数量
        limited = matches[:limit]
        
        logger.info(f"Suggest completed: found {len(matches)} matches, returning {len(limited)}")
        
        return {
            "suggestions": limited,
            "total": len(matches)
        }


# 全局服务实例
_suggest_service: Optional[SuggestService] = None


def get_suggest_service() -> SuggestService:
    """获取全局 SuggestService 实例（单例模式）"""
    global _suggest_service
    if _suggest_service is None:
        _suggest_service = SuggestService()
    return _suggest_service
