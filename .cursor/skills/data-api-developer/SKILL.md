---
name: data-api-developer
description: 基于项目数据库和需求开发数据接口。帮助设计、实现 FastAPI 数据 API，包括 Schema 定义、Service 层、API 端点开发。当用户需要开发新接口、查询数据库、或者需要数据支持功能时使用。
---

# 数据接口开发 Agent

帮助基于 HyroxAgent 项目的数据库和用户需求，设计和实现数据接口。

## 快速开始

当用户需要开发数据接口时，按以下流程执行：

```
任务进度:
- [ ] 1. 理解需求 - 明确数据需求和使用场景
- [ ] 2. 设计数据结构 - 设计 Schema 和响应格式
- [ ] 3. 实现 Service 层 - 编写数据库查询逻辑
- [ ] 4. 实现 API 端点 - 创建 FastAPI 路由
- [ ] 5. 注册路由 - 将路由添加到主 router
- [ ] 6. 测试验证 - 确保接口正常工作
```

## 项目数据库结构

### 核心数据表

| 表名 | 用途 | 关键字段 |
|-----|------|---------|
| `results` | 比赛成绩 | season, location, name, total_time, 各分段时间 |
| `races` | 比赛信息 | season, location, file_last_modified |
| `users` | 微信用户 | openid, nickname, avatar_url |
| `claimed_races` | 用户认领 | user_id, season, location, athlete_name |
| `pro_reports` | 分析报告 | report_id, athlete_name, sections, charts |
| `analysis_cache` | LLM分析缓存 | athlete_name, summary, strengths, weaknesses |

### Result 表关键字段

```python
# 比赛标识
season: int          # 赛季 (1-10)
location: str        # 比赛地点
event_id: str        # 比赛 ID
name: str            # 选手姓名
gender: str          # 性别
division: str        # 组别
age_group: str       # 年龄组

# 时间字段 (单位: 分钟)
total_time: float    # 总成绩
run_time: float      # 跑步总时间
work_time: float     # 功能站总时间
roxzone_time: float  # Roxzone 时间

# 跑步分段
run1_time ~ run8_time: float

# 功能站分段
skierg_time, sled_push_time, sled_pull_time,
burpee_broad_jump_time, row_erg_time, farmers_carry_time,
sandbag_lunges_time, wall_balls_time: float
```

## 开发流程

### 步骤 1: 设计 Schema

在 `backend/app/models/schemas.py` 中定义：

```python
from pydantic import BaseModel, Field
from typing import Optional

# 1. 定义数据项模型
class YourDataItem(BaseModel):
    """单条数据项"""
    id: str = Field(..., description="唯一标识")
    name: str = Field(..., description="名称")
    value: float = Field(..., description="数值")
    # 添加其他需要的字段

# 2. 定义数据容器
class YourData(BaseModel):
    """响应数据体"""
    items: list[YourDataItem] = Field(default_factory=list)
    total: int = Field(default=0, description="总数")

# 3. 定义响应模型 (继承 ResponseBase)
class YourResponse(ResponseBase[YourData]):
    """API 响应"""
    pass
```

### 步骤 2: 实现 Service 层

在 `backend/app/services/` 中创建或修改 Service：

```python
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import async_session_maker
from app.db.models import Result

class YourService:
    """数据服务类"""
    
    async def get_data(
        self,
        season: int,
        location: str,
        limit: int = 100
    ) -> YourData:
        """
        获取数据
        
        Args:
            season: 赛季
            location: 比赛地点
            limit: 数量限制
        """
        async with async_session_maker() as session:
            # 构建查询
            stmt = (
                select(Result)
                .where(Result.season == season)
                .where(Result.location == location)
                .order_by(Result.total_time)
                .limit(limit)
            )
            
            result = await session.execute(stmt)
            rows = result.scalars().all()
            
            # 转换数据
            items = [self._convert_row(r) for r in rows]
            
        return YourData(items=items, total=len(items))
    
    def _convert_row(self, row: Result) -> YourDataItem:
        """转换数据库行为数据项"""
        return YourDataItem(
            id=str(row.id),
            name=row.name,
            value=row.total_time or 0
        )

# 全局实例
_your_service: Optional[YourService] = None

def get_your_service() -> YourService:
    global _your_service
    if _your_service is None:
        _your_service = YourService()
    return _your_service
```

### 步骤 3: 实现 API 端点

在 `backend/app/api/v1/` 中创建路由：

```python
from fastapi import APIRouter, Depends, Query
from app.models.schemas import YourResponse
from app.services.your_service import YourService, get_your_service

router = APIRouter(prefix="/your-endpoint", tags=["功能名称"])

@router.get(
    "/data",
    response_model=YourResponse,
    summary="获取数据",
    description="详细描述接口功能"
)
async def get_data(
    season: int = Query(..., ge=1, le=10, description="赛季"),
    location: str = Query(..., description="比赛地点"),
    limit: int = Query(default=100, ge=1, le=1000, description="数量限制"),
    service: YourService = Depends(get_your_service)
) -> YourResponse:
    """
    接口文档说明
    
    - **season**: 赛季编号 (1-10)
    - **location**: 比赛地点代码
    """
    data = await service.get_data(season=season, location=location, limit=limit)
    
    return YourResponse(code=0, message="success", data=data)
```

### 步骤 4: 注册路由

在 `backend/app/api/v1/router.py` 中添加：

```python
from app.api.v1 import your_endpoint

api_router.include_router(your_endpoint.router)
```

## 常用查询模式

### 聚合统计

```python
from sqlalchemy import func, select

# 按条件统计数量
stmt = select(func.count(Result.id)).where(Result.season == season)
count = await session.scalar(stmt)

# 分组统计
stmt = (
    select(
        Result.location,
        func.count(Result.id).label("count"),
        func.avg(Result.total_time).label("avg_time")
    )
    .where(Result.season == season)
    .group_by(Result.location)
)
```

### 排名计算

```python
from sqlalchemy import func

# 计算排名 (使用子查询)
subq = (
    select(func.count(Result.id) + 1)
    .where(Result.season == season)
    .where(Result.location == location)
    .where(Result.total_time < target_time)
    .scalar_subquery()
)
```

### 百分位计算

```python
# 计算 top percent
rank = your_rank
total = total_count
top_percent = round((rank / total) * 100, 1)
```

### 时间格式化

```python
from app.utils.time_format import format_time

# 将分钟数转换为 "HH:MM:SS" 格式
formatted = format_time(total_time_minutes)  # "1:23:45"
```

## 响应格式规范

所有 API 遵循统一响应格式：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    // 具体数据
  }
}
```

错误响应：

```json
{
  "code": 400,
  "message": "错误信息",
  "data": null
}
```

## 依赖注入模式

在 `backend/app/api/deps.py` 中添加依赖：

```python
from app.services.your_service import YourService, get_your_service

def get_your_service_dep() -> YourService:
    """API 依赖注入"""
    return get_your_service()
```

## 验证清单

完成开发后验证：

- [ ] Schema 定义正确，字段描述完整
- [ ] Service 方法有完整的类型标注
- [ ] API 端点有 summary 和 description
- [ ] 路由已注册到主 router
- [ ] 错误处理覆盖主要场景
- [ ] 可选：添加单元测试

## 常见问题

### Q: 如何处理可选参数？

```python
@router.get("/data")
async def get_data(
    required_param: str = Query(..., description="必填"),
    optional_param: Optional[str] = Query(None, description="可选")
):
    stmt = select(Result)
    if optional_param:
        stmt = stmt.where(Result.field == optional_param)
```

### Q: 如何实现分页？

```python
class PagedData(BaseModel):
    items: list[Item]
    total: int
    page: int
    page_size: int
    has_more: bool

async def get_paged_data(page: int = 1, page_size: int = 20):
    offset = (page - 1) * page_size
    stmt = select(Result).offset(offset).limit(page_size)
```

### Q: 如何复用现有 Service？

查看 `backend/app/services/` 目录中的现有服务：
- `athlete_service.py` - 运动员搜索
- `result_service.py` - 成绩详情
- `ranking_service.py` - 排名计算
- `analytics_service.py` - 数据分析

## 参考资源

- 数据库模型: `backend/app/db/models.py`
- 现有 Schema: `backend/app/models/schemas.py`
- 现有 API: `backend/app/api/v1/`
- 工具函数: `backend/app/utils/`
