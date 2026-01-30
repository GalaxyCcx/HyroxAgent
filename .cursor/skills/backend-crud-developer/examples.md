# CRUD 接口示例

## 示例 1: 简单配置接口

用于读写系统配置的小型 CRUD。

### Schema

```python
class ConfigItem(BaseModel):
    key: str
    value: str
    description: Optional[str] = None

class ConfigListData(BaseModel):
    items: list[ConfigItem] = Field(default_factory=list)
```

### API 端点

```python
router = APIRouter(prefix="/config", tags=["Config"])

@router.get("", summary="获取所有配置")
async def get_all_configs():
    async with async_session_maker() as session:
        stmt = select(Config).where(Config.is_active == True)
        result = await session.execute(stmt)
        rows = result.scalars().all()
    
    return ResponseBase(
        code=0,
        data={"items": [ConfigItem(key=r.key, value=r.value) for r in rows]}
    )

@router.get("/{key}", summary="获取单个配置")
async def get_config(key: str):
    async with async_session_maker() as session:
        stmt = select(Config).where(Config.key == key)
        row = await session.scalar(stmt)
    
    if not row:
        raise HTTPException(404, f"Config '{key}' not found")
    
    return ResponseBase(code=0, data=ConfigItem(key=row.key, value=row.value))

@router.put("/{key}", summary="更新配置")
async def update_config(key: str, value: str = Query(...)):
    async with async_session_maker() as session:
        stmt = select(Config).where(Config.key == key)
        config = await session.scalar(stmt)
        
        if not config:
            raise HTTPException(404, f"Config '{key}' not found")
        
        config.value = value
        config.updated_at = datetime.utcnow()
        await session.commit()
    
    return ResponseBase(code=0, message="配置已更新")
```

---

## 示例 2: 用户反馈功能

简单的用户反馈收集接口。

### Schema

```python
class FeedbackCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)
    contact: Optional[str] = Field(None, max_length=100)
    type: str = Field(default="general", pattern="^(bug|feature|general)$")

class FeedbackData(BaseModel):
    id: int
    content: str
    type: str
    status: str
    created_at: str
```

### API 端点

```python
router = APIRouter(prefix="/feedback", tags=["Feedback"])

@router.post("", summary="提交反馈")
async def submit_feedback(
    data: FeedbackCreate,
    user_id: Optional[int] = None  # 从认证获取
):
    async with async_session_maker() as session:
        feedback = Feedback(
            content=data.content,
            contact=data.contact,
            type=data.type,
            user_id=user_id,
            status="pending"
        )
        session.add(feedback)
        await session.commit()
        await session.refresh(feedback)
    
    return ResponseBase(
        code=0,
        message="反馈已提交",
        data={"id": feedback.id}
    )

@router.get("", summary="获取反馈列表")
async def list_feedback(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    async with async_session_maker() as session:
        stmt = select(Feedback).order_by(Feedback.created_at.desc())
        
        if status:
            stmt = stmt.where(Feedback.status == status)
        
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        result = await session.execute(stmt)
        rows = result.scalars().all()
    
    return ResponseBase(
        code=0,
        data={
            "items": [FeedbackData(
                id=r.id,
                content=r.content,
                type=r.type,
                status=r.status,
                created_at=r.created_at.isoformat()
            ) for r in rows]
        }
    )
```

---

## 示例 3: 带软删除的资源管理

### 数据库模型

```python
class Resource(Base):
    __tablename__ = "resources"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    url = Column(String(500))
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
```

### API 端点

```python
@router.get("")
async def list_resources(include_deleted: bool = False):
    async with async_session_maker() as session:
        stmt = select(Resource)
        if not include_deleted:
            stmt = stmt.where(Resource.is_deleted == False)
        result = await session.execute(stmt)
        rows = result.scalars().all()
    return ResponseBase(code=0, data={"items": rows})

@router.delete("/{id}")
async def delete_resource(id: int, hard_delete: bool = False):
    async with async_session_maker() as session:
        resource = await session.get(Resource, id)
        if not resource:
            raise HTTPException(404, "Resource not found")
        
        if hard_delete:
            await session.delete(resource)
        else:
            resource.is_deleted = True
            resource.deleted_at = datetime.utcnow()
        
        await session.commit()
    
    return ResponseBase(code=0, message="已删除")

@router.post("/{id}/restore")
async def restore_resource(id: int):
    async with async_session_maker() as session:
        resource = await session.get(Resource, id)
        if not resource:
            raise HTTPException(404, "Resource not found")
        
        resource.is_deleted = False
        resource.deleted_at = None
        await session.commit()
    
    return ResponseBase(code=0, message="已恢复")
```

---

## 常用导入模板

```python
from fastapi import APIRouter, HTTPException, Query, Path, Depends
from sqlalchemy import select, func, delete, update
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import datetime

from app.models.schemas import ResponseBase
from app.db.database import async_session_maker
from app.db.models import YourModel

router = APIRouter(prefix="/your-path", tags=["YourTag"])
```
