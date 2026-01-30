---
name: backend-crud-developer
description: 开发后端小型功能和简单 CRUD 接口。用于添加新的 API 端点、实现简单的增删改查操作、工具类接口。当用户需要添加简单后端功能、CRUD 接口、或快速实现小需求时使用。
---

# 后端小功能开发 Agent

帮助快速实现 HyroxAgent 项目的后端小型功能和 CRUD 接口。

## 快速开始

```
任务进度:
- [ ] 1. 理解需求 - 明确功能目标
- [ ] 2. 设计 Schema - 定义请求/响应模型
- [ ] 3. 实现逻辑 - 编写业务代码
- [ ] 4. 创建端点 - 添加 API 路由
- [ ] 5. 注册路由 - 添加到主 router
- [ ] 6. 验证测试 - 确保功能正常
```

## 项目结构

```
backend/app/
├── api/v1/          # API 端点
│   ├── router.py    # 路由注册
│   └── *.py         # 各模块端点
├── models/
│   └── schemas.py   # Pydantic 模型
├── services/        # 业务逻辑层
├── db/
│   ├── models.py    # SQLAlchemy 模型
│   └── database.py  # 数据库连接
└── utils/           # 工具函数
```

## 开发模板

### 1. Schema 定义

在 `backend/app/models/schemas.py` 添加：

```python
from pydantic import BaseModel, Field
from typing import Optional

# 创建请求
class ItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    value: Optional[str] = None

# 更新请求
class ItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    value: Optional[str] = None

# 响应数据
class ItemData(BaseModel):
    id: int
    name: str
    value: Optional[str] = None
    created_at: str

# 列表响应
class ItemListData(BaseModel):
    items: list[ItemData] = Field(default_factory=list)
    total: int = 0

# 完整响应（继承 ResponseBase）
class ItemResponse(ResponseBase[ItemData]):
    pass

class ItemListResponse(ResponseBase[ItemListData]):
    pass
```

### 2. API 端点

在 `backend/app/api/v1/` 创建新文件：

```python
from fastapi import APIRouter, HTTPException, Query, Path
from app.models.schemas import (
    ItemCreate, ItemUpdate, ItemData,
    ItemResponse, ItemListResponse
)
from app.db.database import async_session_maker
from app.db.models import YourModel
from sqlalchemy import select

router = APIRouter(prefix="/items", tags=["Items"])

# 列表查询
@router.get("", response_model=ItemListResponse, summary="获取列表")
async def list_items(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    async with async_session_maker() as session:
        offset = (page - 1) * page_size
        stmt = select(YourModel).offset(offset).limit(page_size)
        result = await session.execute(stmt)
        rows = result.scalars().all()
        
        count_stmt = select(func.count(YourModel.id))
        total = await session.scalar(count_stmt)
    
    items = [ItemData(id=r.id, name=r.name, ...) for r in rows]
    return ItemListResponse(
        code=0,
        message="success",
        data={"items": items, "total": total}
    )

# 单个查询
@router.get("/{item_id}", response_model=ItemResponse, summary="获取详情")
async def get_item(item_id: int = Path(..., ge=1)):
    async with async_session_maker() as session:
        stmt = select(YourModel).where(YourModel.id == item_id)
        result = await session.execute(stmt)
        row = result.scalar_one_or_none()
        
    if not row:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return ItemResponse(
        code=0,
        message="success",
        data=ItemData(id=row.id, name=row.name, ...)
    )

# 创建
@router.post("", response_model=ItemResponse, summary="创建")
async def create_item(data: ItemCreate):
    async with async_session_maker() as session:
        item = YourModel(name=data.name, value=data.value)
        session.add(item)
        await session.commit()
        await session.refresh(item)
    
    return ItemResponse(
        code=0,
        message="success",
        data=ItemData(id=item.id, name=item.name, ...)
    )

# 更新
@router.put("/{item_id}", response_model=ItemResponse, summary="更新")
async def update_item(item_id: int, data: ItemUpdate):
    async with async_session_maker() as session:
        stmt = select(YourModel).where(YourModel.id == item_id)
        result = await session.execute(stmt)
        item = result.scalar_one_or_none()
        
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        
        if data.name is not None:
            item.name = data.name
        if data.value is not None:
            item.value = data.value
        
        await session.commit()
        await session.refresh(item)
    
    return ItemResponse(code=0, message="success", data=ItemData(...))

# 删除
@router.delete("/{item_id}", response_model=ResponseBase, summary="删除")
async def delete_item(item_id: int):
    async with async_session_maker() as session:
        stmt = select(YourModel).where(YourModel.id == item_id)
        result = await session.execute(stmt)
        item = result.scalar_one_or_none()
        
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        
        await session.delete(item)
        await session.commit()
    
    return ResponseBase(code=0, message="删除成功")
```

### 3. 注册路由

在 `backend/app/api/v1/router.py` 添加：

```python
from app.api.v1.items import router as items_router

api_router.include_router(items_router)
```

## 常用模式

### 可选参数查询

```python
@router.get("/search")
async def search(
    keyword: Optional[str] = Query(None),
    status: Optional[int] = Query(None)
):
    stmt = select(Model)
    if keyword:
        stmt = stmt.where(Model.name.contains(keyword))
    if status is not None:
        stmt = stmt.where(Model.status == status)
```

### 事务处理

```python
async with async_session_maker() as session:
    try:
        # 多个操作
        session.add(item1)
        session.add(item2)
        await session.commit()
    except Exception:
        await session.rollback()
        raise HTTPException(status_code=500, detail="操作失败")
```

### 批量操作

```python
@router.post("/batch-delete")
async def batch_delete(ids: list[int]):
    async with async_session_maker() as session:
        stmt = delete(Model).where(Model.id.in_(ids))
        result = await session.execute(stmt)
        await session.commit()
    return {"deleted": result.rowcount}
```

### 软删除

```python
# 模型添加 is_deleted 字段
@router.delete("/{item_id}")
async def soft_delete(item_id: int):
    async with async_session_maker() as session:
        item.is_deleted = True
        item.deleted_at = datetime.utcnow()
        await session.commit()
```

## 响应格式

统一使用 `ResponseBase`:

```python
# 成功
{"code": 0, "message": "success", "data": {...}}

# 错误
{"code": 400, "message": "错误信息", "data": null}
```

## 验证清单

- [ ] Schema 字段有 Field 描述
- [ ] 端点有 summary 和 response_model
- [ ] 路由已注册到 router.py
- [ ] 错误情况返回适当 HTTP 状态码
- [ ] 数据库操作使用 async with

## 参考文件

- 响应基类: `backend/app/models/schemas.py` → `ResponseBase`
- 数据库连接: `backend/app/db/database.py` → `async_session_maker`
- 现有端点示例: `backend/app/api/v1/claim.py`
