# 数据接口开发示例

## 示例 1: 比赛统计接口

**需求**: 获取某场比赛的统计数据 (参赛人数、平均成绩、最佳成绩等)

### Schema 定义

```python
# backend/app/models/schemas.py

class RaceStatsData(BaseModel):
    """比赛统计数据"""
    season: int = Field(..., description="赛季")
    location: str = Field(..., description="比赛地点")
    total_athletes: int = Field(..., description="总参赛人数")
    male_count: int = Field(..., description="男性参赛人数")
    female_count: int = Field(..., description="女性参赛人数")
    avg_time_minutes: float = Field(..., description="平均成绩 (分钟)")
    avg_time: str = Field(..., description="平均成绩 (格式化)")
    best_time_minutes: float = Field(..., description="最佳成绩 (分钟)")
    best_time: str = Field(..., description="最佳成绩 (格式化)")
    median_time_minutes: Optional[float] = Field(None, description="中位数成绩")

class RaceStatsResponse(ResponseBase[RaceStatsData]):
    """比赛统计响应"""
    pass
```

### Service 实现

```python
# backend/app/services/stats_service.py

from sqlalchemy import func, select
from app.db.database import async_session_maker
from app.db.models import Result
from app.utils.time_format import format_time

class StatsService:
    
    async def get_race_stats(self, season: int, location: str) -> RaceStatsData:
        async with async_session_maker() as session:
            # 基础统计
            stmt = (
                select(
                    func.count(Result.id).label("total"),
                    func.avg(Result.total_time).label("avg_time"),
                    func.min(Result.total_time).label("best_time"),
                )
                .where(Result.season == season)
                .where(Result.location == location)
                .where(Result.total_time.isnot(None))
            )
            result = await session.execute(stmt)
            row = result.one()
            
            # 性别统计
            gender_stmt = (
                select(Result.gender, func.count(Result.id))
                .where(Result.season == season)
                .where(Result.location == location)
                .group_by(Result.gender)
            )
            gender_result = await session.execute(gender_stmt)
            gender_counts = {r[0]: r[1] for r in gender_result}
            
        return RaceStatsData(
            season=season,
            location=location,
            total_athletes=row.total or 0,
            male_count=gender_counts.get("Male", 0),
            female_count=gender_counts.get("Female", 0),
            avg_time_minutes=round(row.avg_time or 0, 2),
            avg_time=format_time(row.avg_time),
            best_time_minutes=round(row.best_time or 0, 2),
            best_time=format_time(row.best_time),
        )
```

### API 端点

```python
# backend/app/api/v1/stats.py

from fastapi import APIRouter, Query
from app.models.schemas import RaceStatsResponse
from app.services.stats_service import StatsService

router = APIRouter(prefix="/stats", tags=["统计"])

@router.get(
    "/race",
    response_model=RaceStatsResponse,
    summary="获取比赛统计"
)
async def get_race_stats(
    season: int = Query(..., ge=1, le=10),
    location: str = Query(...)
) -> RaceStatsResponse:
    service = StatsService()
    data = await service.get_race_stats(season, location)
    return RaceStatsResponse(code=0, message="success", data=data)
```

---

## 示例 2: 排行榜接口

**需求**: 获取某场比赛的排行榜，支持分页和性别筛选

### Schema 定义

```python
class LeaderboardItem(BaseModel):
    """排行榜单项"""
    rank: int = Field(..., description="排名")
    name: str = Field(..., description="姓名")
    nationality: Optional[str] = Field(None, description="国籍")
    total_time: str = Field(..., description="成绩")
    total_time_minutes: float = Field(..., description="成绩 (分钟)")
    gender: str = Field(..., description="性别")
    division: str = Field(..., description="组别")

class LeaderboardData(BaseModel):
    """排行榜数据"""
    items: list[LeaderboardItem] = Field(default_factory=list)
    total: int = Field(..., description="总人数")
    page: int = Field(..., description="当前页")
    page_size: int = Field(..., description="每页数量")
    has_more: bool = Field(..., description="是否有更多")

class LeaderboardResponse(ResponseBase[LeaderboardData]):
    pass
```

### Service 实现

```python
class LeaderboardService:
    
    async def get_leaderboard(
        self,
        season: int,
        location: str,
        gender: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> LeaderboardData:
        async with async_session_maker() as session:
            # 基础查询
            base_query = (
                select(Result)
                .where(Result.season == season)
                .where(Result.location == location)
                .where(Result.total_time.isnot(None))
            )
            
            if gender:
                base_query = base_query.where(Result.gender == gender)
            
            # 统计总数
            count_stmt = select(func.count()).select_from(base_query.subquery())
            total = await session.scalar(count_stmt)
            
            # 分页查询
            offset = (page - 1) * page_size
            data_stmt = (
                base_query
                .order_by(Result.total_time)
                .offset(offset)
                .limit(page_size)
            )
            
            result = await session.execute(data_stmt)
            rows = result.scalars().all()
            
            # 转换数据
            items = []
            for i, row in enumerate(rows):
                items.append(LeaderboardItem(
                    rank=offset + i + 1,
                    name=row.name,
                    nationality=row.nationality,
                    total_time=format_time(row.total_time),
                    total_time_minutes=row.total_time,
                    gender=row.gender or "",
                    division=row.division or ""
                ))
        
        return LeaderboardData(
            items=items,
            total=total or 0,
            page=page,
            page_size=page_size,
            has_more=(offset + len(items)) < (total or 0)
        )
```

### API 端点

```python
@router.get("/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(
    season: int = Query(..., ge=1, le=10),
    location: str = Query(...),
    gender: Optional[str] = Query(None, description="性别筛选"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100)
) -> LeaderboardResponse:
    service = LeaderboardService()
    data = await service.get_leaderboard(
        season=season,
        location=location,
        gender=gender,
        page=page,
        page_size=page_size
    )
    return LeaderboardResponse(code=0, message="success", data=data)
```

---

## 示例 3: 选手对比接口

**需求**: 对比两名选手在同一场比赛中的表现

### Schema 定义

```python
class CompareItem(BaseModel):
    """对比项"""
    name: str = Field(..., description="项目名称")
    athlete1_time: str = Field(..., description="选手1成绩")
    athlete1_minutes: float = Field(..., description="选手1成绩 (分钟)")
    athlete2_time: str = Field(..., description="选手2成绩")
    athlete2_minutes: float = Field(..., description="选手2成绩 (分钟)")
    diff_seconds: int = Field(..., description="差距 (秒)")
    winner: int = Field(..., description="胜者 (1 或 2)")

class CompareData(BaseModel):
    """对比数据"""
    athlete1_name: str
    athlete2_name: str
    total: CompareItem = Field(..., description="总成绩对比")
    splits: list[CompareItem] = Field(default_factory=list, description="分段对比")

class CompareResponse(ResponseBase[CompareData]):
    pass
```

### Service 实现

```python
class CompareService:
    
    SPLIT_FIELDS = [
        ("总成绩", "total_time"),
        ("跑步", "run_time"),
        ("功能站", "work_time"),
        ("SkiErg", "skierg_time"),
        ("Sled Push", "sled_push_time"),
        ("Sled Pull", "sled_pull_time"),
        ("Burpee", "burpee_broad_jump_time"),
        ("Row", "row_erg_time"),
        ("Farmers Carry", "farmers_carry_time"),
        ("Lunges", "sandbag_lunges_time"),
        ("Wall Balls", "wall_balls_time"),
    ]
    
    async def compare(
        self,
        season: int,
        location: str,
        athlete1: str,
        athlete2: str
    ) -> CompareData:
        async with async_session_maker() as session:
            # 查询两名选手的数据
            stmt = (
                select(Result)
                .where(Result.season == season)
                .where(Result.location == location)
                .where(Result.name.in_([athlete1, athlete2]))
            )
            result = await session.execute(stmt)
            rows = {r.name: r for r in result.scalars().all()}
        
        r1 = rows.get(athlete1)
        r2 = rows.get(athlete2)
        
        if not r1 or not r2:
            raise NotFoundError("选手数据不存在")
        
        # 生成对比数据
        splits = []
        for name, field in self.SPLIT_FIELDS:
            t1 = getattr(r1, field) or 0
            t2 = getattr(r2, field) or 0
            diff = int((t1 - t2) * 60)
            
            splits.append(CompareItem(
                name=name,
                athlete1_time=format_time(t1),
                athlete1_minutes=t1,
                athlete2_time=format_time(t2),
                athlete2_minutes=t2,
                diff_seconds=diff,
                winner=1 if t1 < t2 else 2
            ))
        
        return CompareData(
            athlete1_name=athlete1,
            athlete2_name=athlete2,
            total=splits[0],
            splits=splits[1:]
        )
```

---

## 示例 4: 数据导出接口

**需求**: 导出比赛数据为 CSV 格式

### API 端点 (使用 StreamingResponse)

```python
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import csv
import io

@router.get("/export/csv")
async def export_csv(
    season: int = Query(...),
    location: str = Query(...)
):
    async with async_session_maker() as session:
        stmt = (
            select(Result)
            .where(Result.season == season)
            .where(Result.location == location)
            .order_by(Result.total_time)
        )
        result = await session.execute(stmt)
        rows = result.scalars().all()
    
    # 生成 CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # 写入表头
    writer.writerow(["排名", "姓名", "国籍", "性别", "总成绩", "跑步", "功能站"])
    
    # 写入数据
    for i, row in enumerate(rows):
        writer.writerow([
            i + 1,
            row.name,
            row.nationality or "",
            row.gender or "",
            format_time(row.total_time),
            format_time(row.run_time),
            format_time(row.work_time)
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=race_{season}_{location}.csv"
        }
    )
```

---

## 常见模式速查

### 可选参数处理

```python
stmt = select(Result)

if season:
    stmt = stmt.where(Result.season == season)
if gender:
    stmt = stmt.where(Result.gender == gender)
if min_time:
    stmt = stmt.where(Result.total_time >= min_time)
```

### 模糊搜索

```python
# 姓名模糊匹配 (不区分大小写)
stmt = select(Result).where(
    Result.name.ilike(f"%{keyword}%")
)
```

### 日期范围查询

```python
from datetime import datetime

stmt = select(Result).where(
    Result.created_at >= start_date,
    Result.created_at <= end_date
)
```

### 去重查询

```python
# 获取所有不重复的选手姓名
stmt = select(Result.name).distinct()
```

### IN 查询

```python
locations = ["NYC", "LON", "BER"]
stmt = select(Result).where(Result.location.in_(locations))
```
