"""
认证相关 API 路由
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.services.auth_service import auth_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["认证"])


# ==================== 请求/响应模型 ====================

class LoginRequest(BaseModel):
    """登录请求"""
    code: str  # 微信 wx.login() 返回的 code


class LoginResponse(BaseModel):
    """登录响应"""
    code: int = 0
    message: str = "success"
    data: Optional[dict] = None


class ProfileUpdateRequest(BaseModel):
    """更新用户资料请求"""
    nickname: Optional[str] = None
    avatar_url: Optional[str] = None


class ProfileResponse(BaseModel):
    """用户资料响应"""
    code: int = 0
    message: str = "success"
    data: Optional[dict] = None


# ==================== 依赖函数 ====================

async def get_current_user_id(
    authorization: Optional[str] = Header(None, alias="Authorization")
) -> int:
    """
    从请求头获取当前用户 ID
    
    Args:
        authorization: Authorization 请求头，格式为 "Bearer <token>"
        
    Returns:
        用户 ID
        
    Raises:
        HTTPException: 未登录或 token 无效
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="未登录")
    
    # 解析 Bearer token
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="无效的认证格式")
    
    token = parts[1]
    user_id = auth_service.verify_token(token)
    
    if not user_id:
        raise HTTPException(status_code=401, detail="登录已过期，请重新登录")
    
    return user_id


# ==================== API 路由 ====================

@router.post("/login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    微信登录
    
    使用小程序 wx.login() 获取的 code 进行登录，
    返回用户信息和访问 token。
    """
    try:
        # 1. 调用微信接口获取 openid
        wx_data = await auth_service.wechat_code_to_session(request.code)
        openid = wx_data["openid"]
        
        # 2. 获取或创建用户
        user = await auth_service.get_or_create_user(db, openid)
        
        # 3. 生成 token
        token = auth_service.generate_token(user.id)
        
        logger.info(f"User {user.id} logged in successfully")
        
        return LoginResponse(
            data={
                "token": token,
                "user": user.to_dict(),
            }
        )
        
    except Exception as e:
        logger.error(f"Login failed: {e}")
        return LoginResponse(
            code=1,
            message=str(e),
            data=None
        )


@router.get("/profile", response_model=ProfileResponse)
async def get_profile(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    获取当前用户资料
    
    需要在请求头携带 Authorization: Bearer <token>
    """
    user = await auth_service.get_user_by_id(db, user_id)
    
    if not user:
        return ProfileResponse(
            code=1,
            message="用户不存在",
            data=None
        )
    
    return ProfileResponse(
        data={"user": user.to_dict()}
    )


@router.put("/profile", response_model=ProfileResponse)
async def update_profile(
    request: ProfileUpdateRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    更新用户资料
    
    可更新字段：nickname（昵称）、avatar_url（头像URL）
    需要在请求头携带 Authorization: Bearer <token>
    """
    user = await auth_service.update_user_profile(
        db, 
        user_id, 
        nickname=request.nickname,
        avatar_url=request.avatar_url
    )
    
    if not user:
        return ProfileResponse(
            code=1,
            message="用户不存在",
            data=None
        )
    
    logger.info(f"User {user_id} profile updated")
    
    return ProfileResponse(
        data={"user": user.to_dict()}
    )
