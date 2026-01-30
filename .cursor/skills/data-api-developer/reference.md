# 数据接口开发参考文档

## 数据库表详细结构

### results 表 - 比赛成绩

```sql
CREATE TABLE results (
    id INTEGER PRIMARY KEY,
    
    -- 比赛标识
    season INTEGER NOT NULL,        -- 赛季 (1-10)
    location VARCHAR(50) NOT NULL,  -- 比赛地点代码
    event_id VARCHAR(50),           -- 比赛 ID
    event_name VARCHAR(100),        -- 比赛名称
    
    -- 选手信息
    name VARCHAR(100) NOT NULL,     -- 选手姓名 (有索引)
    nationality VARCHAR(20),        -- 国籍代码 (CHN, USA, GBR...)
    gender VARCHAR(10),             -- 性别 (Male, Female)
    division VARCHAR(20),           -- 组别 (PRO, OPEN, DOUBLES...)
    age_group VARCHAR(20),          -- 年龄组 (24-29, 30-34...)
    
    -- 总成绩 (单位: 分钟)
    total_time FLOAT,               -- 总成绩
    run_time FLOAT,                 -- 跑步总时间
    work_time FLOAT,                -- 功能站总时间
    roxzone_time FLOAT,             -- Roxzone 过渡区时间
    
    -- 跑步分段 (1km x 8)
    run1_time FLOAT,
    run2_time FLOAT,
    run3_time FLOAT,
    run4_time FLOAT,
    run5_time FLOAT,
    run6_time FLOAT,
    run7_time FLOAT,
    run8_time FLOAT,
    
    -- 功能站分段
    skierg_time FLOAT,              -- SkiErg (1000m)
    sled_push_time FLOAT,           -- Sled Push (50m)
    sled_pull_time FLOAT,           -- Sled Pull (50m)
    burpee_broad_jump_time FLOAT,   -- Burpee Broad Jump (80m)
    row_erg_time FLOAT,             -- Row Erg (1000m)
    farmers_carry_time FLOAT,       -- Farmers Carry (200m)
    sandbag_lunges_time FLOAT,      -- Sandbag Lunges (100m)
    wall_balls_time FLOAT,          -- Wall Balls (100 reps)
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_results_season_location ON results(season, location);
CREATE INDEX idx_results_name ON results(name);
CREATE INDEX idx_results_nationality ON results(nationality);
CREATE INDEX idx_results_total_time ON results(total_time);
```

### races 表 - 比赛信息

```sql
CREATE TABLE races (
    id INTEGER PRIMARY KEY,
    season INTEGER NOT NULL,
    location VARCHAR(50) NOT NULL,
    file_last_modified VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(season, location)
);
```

### users 表 - 微信用户

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    openid VARCHAR(64) UNIQUE NOT NULL,
    nickname VARCHAR(100) DEFAULT '运动员',
    avatar_url VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);
```

### claimed_races 表 - 用户认领

```sql
CREATE TABLE claimed_races (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    season INTEGER NOT NULL,
    location VARCHAR(50) NOT NULL,
    athlete_name VARCHAR(100) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, season, location, athlete_name)
);
```

## 常用查询模式

### 1. 基础查询

```python
from sqlalchemy import select
from app.db.models import Result

# 按条件查询
stmt = (
    select(Result)
    .where(Result.season == 1)
    .where(Result.location == "NYC")
    .where(Result.gender == "Male")
    .order_by(Result.total_time)
    .limit(100)
)
```

### 2. 聚合查询

```python
from sqlalchemy import func, select

# 统计参赛人数
stmt = (
    select(func.count(Result.id))
    .where(Result.season == 1)
    .where(Result.location == "NYC")
)
count = await session.scalar(stmt)

# 计算平均成绩
stmt = (
    select(func.avg(Result.total_time))
    .where(Result.season == 1)
    .where(Result.total_time.isnot(None))
)
avg_time = await session.scalar(stmt)

# 分组统计
stmt = (
    select(
        Result.gender,
        func.count(Result.id).label("count"),
        func.avg(Result.total_time).label("avg_time"),
        func.min(Result.total_time).label("best_time")
    )
    .where(Result.season == 1)
    .group_by(Result.gender)
)
```

### 3. 排名计算

```python
# 方法一: 使用子查询
from sqlalchemy import func, select

async def get_rank(session, season, location, target_time):
    """计算排名 (比目标时间快的人数 + 1)"""
    stmt = (
        select(func.count(Result.id) + 1)
        .where(Result.season == season)
        .where(Result.location == location)
        .where(Result.total_time < target_time)
        .where(Result.total_time.isnot(None))
    )
    return await session.scalar(stmt)

# 方法二: 批量计算所有人的排名 (使用 row_number)
from sqlalchemy import over

stmt = (
    select(
        Result.name,
        Result.total_time,
        func.row_number().over(
            order_by=Result.total_time
        ).label("rank")
    )
    .where(Result.season == 1)
    .where(Result.location == "NYC")
    .where(Result.total_time.isnot(None))
)
```

### 4. 百分位计算

```python
def calculate_percentile(rank: int, total: int) -> float:
    """
    计算百分位 (Top X%)
    
    Args:
        rank: 排名 (1-based)
        total: 总人数
    
    Returns:
        百分位值 (0-100)
    """
    if total == 0:
        return 0.0
    return round((rank / total) * 100, 1)
```

### 5. 分段统计

```python
# 获取某人各分段在全场的排名
async def get_split_rankings(session, season, location, athlete_result):
    """获取分段排名"""
    splits = [
        ("skierg", athlete_result.skierg_time, Result.skierg_time),
        ("sled_push", athlete_result.sled_push_time, Result.sled_push_time),
        # ... 其他分段
    ]
    
    rankings = []
    for name, athlete_time, column in splits:
        if athlete_time is None:
            continue
            
        # 计算排名
        rank_stmt = (
            select(func.count(Result.id) + 1)
            .where(Result.season == season)
            .where(Result.location == location)
            .where(column < athlete_time)
            .where(column.isnot(None))
        )
        rank = await session.scalar(rank_stmt)
        
        # 计算总人数
        total_stmt = (
            select(func.count(Result.id))
            .where(Result.season == season)
            .where(Result.location == location)
            .where(column.isnot(None))
        )
        total = await session.scalar(total_stmt)
        
        rankings.append({
            "name": name,
            "time": athlete_time,
            "rank": rank,
            "total": total,
            "percentile": calculate_percentile(rank, total)
        })
    
    return rankings
```

### 6. 跨赛季比较

```python
# 获取某选手所有比赛记录
stmt = (
    select(Result)
    .where(Result.name == "John Doe")
    .order_by(Result.season, Result.location)
)

# 计算 PB (Personal Best)
stmt = (
    select(func.min(Result.total_time))
    .where(Result.name == "John Doe")
    .where(Result.total_time.isnot(None))
)
pb = await session.scalar(stmt)
```

### 7. 比赛数据分布

```python
# 成绩分布区间统计
from sqlalchemy import case, func

stmt = (
    select(
        case(
            (Result.total_time < 60, "< 1小时"),
            (Result.total_time < 70, "1:00-1:10"),
            (Result.total_time < 80, "1:10-1:20"),
            (Result.total_time < 90, "1:20-1:30"),
            else_="1:30+"
        ).label("time_range"),
        func.count(Result.id).label("count")
    )
    .where(Result.season == 1)
    .where(Result.location == "NYC")
    .where(Result.total_time.isnot(None))
    .group_by("time_range")
)
```

## 时间处理工具

### format_time 函数

```python
from app.utils.time_format import format_time

# 将分钟数转换为格式化字符串
format_time(65.5)      # "1:05:30"
format_time(120.25)    # "2:00:15"
format_time(None)      # "-"
```

### 时间差计算

```python
def format_time_diff(diff_minutes: float) -> str:
    """
    格式化时间差
    
    Args:
        diff_minutes: 差值 (分钟), 负数表示更快
    
    Returns:
        格式化字符串 (如 "-21s", "+1:30")
    """
    total_seconds = int(abs(diff_minutes) * 60)
    sign = "-" if diff_minutes < 0 else "+"
    
    if total_seconds < 60:
        return f"{sign}{total_seconds}s"
    else:
        minutes = total_seconds // 60
        seconds = total_seconds % 60
        return f"{sign}{minutes}:{seconds:02d}"
```

## 错误处理

### 自定义异常

```python
from app.core.exceptions import ValidationError, NotFoundError

# 参数校验
if not name.strip():
    raise ValidationError(message="姓名不能为空")

# 数据不存在
result = await session.get(Result, result_id)
if not result:
    raise NotFoundError(message=f"成绩记录不存在: {result_id}")
```

### 异常响应格式

```json
{
    "code": 400,
    "message": "参数校验失败: 姓名不能为空",
    "data": null
}
```

## 性能优化建议

1. **使用索引字段筛选**: season, location, name, nationality, total_time
2. **限制返回数量**: 始终使用 `.limit()` 
3. **只查询需要的字段**: 使用 `select(Result.name, Result.total_time)` 代替 `select(Result)`
4. **批量操作**: 使用 `insert().values([...])` 代替循环单条插入
5. **缓存热点数据**: 对于统计数据可以使用 Redis 或内存缓存

## 测试数据

### 常用测试参数

```python
# 测试赛季和地点
TEST_SEASON = 1
TEST_LOCATION = "NYC"

# 测试选手
TEST_ATHLETE = "John Doe"

# 测试成绩范围
ELITE_TIME = 60.0       # 精英级 < 1小时
GOOD_TIME = 75.0        # 优秀 1:00-1:15
AVERAGE_TIME = 90.0     # 普通 1:15-1:30
```
