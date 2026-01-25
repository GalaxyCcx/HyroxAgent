"""
自定义异常类
"""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class AppException(Exception):
    """应用异常基类"""
    
    def __init__(
        self,
        code: int,
        message: str,
        status_code: int = 400,
        data: dict | None = None
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.data = data
        super().__init__(message)


class ValidationError(AppException):
    """参数校验错误"""
    
    def __init__(self, message: str = "参数校验失败", data: dict | None = None):
        super().__init__(
            code=40001,
            message=message,
            status_code=400,
            data=data
        )


class NotFoundError(AppException):
    """资源不存在错误"""
    
    def __init__(self, message: str = "资源不存在", resource: str = ""):
        if resource:
            message = f"{resource}不存在"
        super().__init__(
            code=40401,
            message=message,
            status_code=404
        )


class AthleteNotFoundError(NotFoundError):
    """运动员不存在"""
    
    def __init__(self, athlete_name: str = ""):
        message = f"运动员 '{athlete_name}' 不存在" if athlete_name else "运动员不存在"
        super().__init__(message=message)
        self.code = 40401


class RaceNotFoundError(NotFoundError):
    """比赛不存在"""
    
    def __init__(self, location: str = "", season: int = 0):
        if location and season:
            message = f"比赛 Season {season} {location} 不存在"
        else:
            message = "比赛不存在"
        super().__init__(message=message)
        self.code = 40402


def setup_exception_handlers(app: FastAPI):
    """设置异常处理器"""
    
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "code": exc.code,
                "message": exc.message,
                "data": exc.data
            }
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        # 开发环境显示详细错误
        return JSONResponse(
            status_code=500,
            content={
                "code": 50000,
                "message": f"服务器内部错误: {str(exc)}",
                "data": None
            }
        )




