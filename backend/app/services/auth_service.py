"""
认证服务 - 微信登录和 JWT 处理
"""
import logging
from datetime import datetime, timedelta
from typing import Optional

import httpx
import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.settings import settings
from app.db.models import User

logger = logging.getLogger(__name__)

# 微信登录接口
WECHAT_CODE2SESSION_URL = "https://api.weixin.qq.com/sns/jscode2session"


class AuthService:
    """认证服务类"""
    
    @staticmethod
    async def wechat_code_to_session(code: str) -> dict:
        """
        调用微信 code2Session 接口
        
        Args:
            code: 小程序 wx.login() 获取的临时登录凭证
            
        Returns:
            微信返回的数据，包含 openid 和 session_key
            
        Raises:
            Exception: 微信接口调用失败
        """
        params = {
            "appid": settings.WECHAT_APP_ID,
            "secret": settings.WECHAT_APP_SECRET,
            "js_code": code,
            "grant_type": "authorization_code",
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(WECHAT_CODE2SESSION_URL, params=params)
            data = response.json()
        
        logger.info(f"WeChat code2Session response: {data}")
        
        if "errcode" in data and data["errcode"] != 0:
            error_msg = data.get("errmsg", "未知错误")
            logger.error(f"WeChat login failed: {error_msg}")
            raise Exception(f"微信登录失败: {error_msg}")
        
        if "openid" not in data:
            raise Exception("微信登录失败: 未获取到 openid")
        
        return data
    
    @staticmethod
    async def get_or_create_user(db: AsyncSession, openid: str) -> User:
        """
        根据 openid 获取或创建用户
        
        Args:
            db: 数据库会话
            openid: 微信 OpenID
            
        Returns:
            User 对象
        """
        # 查找现有用户
        result = await db.execute(
            select(User).where(User.openid == openid)
        )
        user = result.scalar_one_or_none()
        
        if user:
            logger.info(f"Found existing user: {user.id}")
            return user
        
        # 创建新用户
        user = User(openid=openid)
        db.add(user)
        await db.flush()
        await db.refresh(user)
        
        logger.info(f"Created new user: {user.id}")
        return user
    
    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
        """
        根据 ID 获取用户
        
        Args:
            db: 数据库会话
            user_id: 用户 ID
            
        Returns:
            User 对象或 None
        """
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def update_user_profile(
        db: AsyncSession, 
        user_id: int, 
        nickname: Optional[str] = None,
        avatar_url: Optional[str] = None
    ) -> Optional[User]:
        """
        更新用户资料
        
        Args:
            db: 数据库会话
            user_id: 用户 ID
            nickname: 新昵称
            avatar_url: 新头像 URL
            
        Returns:
            更新后的 User 对象或 None
        """
        user = await AuthService.get_user_by_id(db, user_id)
        if not user:
            return None
        
        if nickname is not None:
            user.nickname = nickname
        if avatar_url is not None:
            user.avatar_url = avatar_url
        
        await db.flush()
        await db.refresh(user)
        
        logger.info(f"Updated user profile: {user.id}")
        return user
    
    @staticmethod
    def generate_token(user_id: int) -> str:
        """
        生成 JWT token
        
        Args:
            user_id: 用户 ID
            
        Returns:
            JWT token 字符串
        """
        payload = {
            "user_id": user_id,
            "exp": datetime.utcnow() + timedelta(days=settings.JWT_EXPIRE_DAYS),
            "iat": datetime.utcnow(),
        }
        
        token = jwt.encode(
            payload, 
            settings.JWT_SECRET_KEY, 
            algorithm=settings.JWT_ALGORITHM
        )
        
        return token
    
    @staticmethod
    def verify_token(token: str) -> Optional[int]:
        """
        验证 JWT token
        
        Args:
            token: JWT token 字符串
            
        Returns:
            用户 ID 或 None（验证失败）
        """
        try:
            payload = jwt.decode(
                token, 
                settings.JWT_SECRET_KEY, 
                algorithms=[settings.JWT_ALGORITHM]
            )
            return payload.get("user_id")
        except jwt.ExpiredSignatureError:
            logger.warning("Token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {e}")
            return None


# 创建服务实例
auth_service = AuthService()
