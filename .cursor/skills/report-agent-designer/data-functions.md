# 数据层设计指南

## 1. 数据函数概览

### 1.1 函数列表

| 函数名 | 描述 | 返回数据 |
|--------|------|----------|
| GetAthleteResult | 获取运动员单场成绩 | 完整比赛成绩 |
| GetDivisionStats | 获取组别统计数据 | 平均值、中位数等 |
| GetDivisionRanking | 获取组别排行榜 | Top N 排名 |
| GetSegmentComparison | 获取分段对比数据 | 各段与组别对比 |
| GetAthleteHistory | 获取运动员历史记录 | 多场比赛记录 |
| GetPacingAnalysis | 获取配速分析 | 各跑步段配速 |
| GetStationDeepAnalysis | 获取功能站深度分析 | 8 站详细分析 |

### 1.2 文件位置

- **函数定义**：`backend/app/services/report/data_functions.py`
- **执行逻辑**：`backend/app/services/report/data_executor.py`

## 2. 函数 Schema 定义

### 2.1 GetAthleteResult

```python
{
    "type": "function",
    "function": {
        "name": "GetAthleteResult",
        "description": "获取运动员在指定比赛中的完整成绩，包括总时间、各分段时间、排名等",
        "parameters": {
            "type": "object",
            "properties": {
                "season": {
                    "type": "integer",
                    "description": "赛季年份，如 2024"
                },
                "location": {
                    "type": "string",
                    "description": "比赛地点，如 Shanghai"
                },
                "athlete_name": {
                    "type": "string",
                    "description": "运动员姓名"
                }
            },
            "required": ["season", "location", "athlete_name"]
        }
    }
}
```

**返回示例：**
```json
{
    "athlete_name": "张三",
    "total_time": "01:15:30",
    "total_seconds": 4530,
    "division": "MEN PRO",
    "division_rank": 15,
    "overall_rank": 15,
    "segments": {
        "run1": {"time": "04:30", "seconds": 270},
        "skierg": {"time": "03:45", "seconds": 225},
        "run2": {"time": "04:35", "seconds": 275},
        "sled_push": {"time": "01:30", "seconds": 90},
        "run3": {"time": "04:40", "seconds": 280},
        "sled_pull": {"time": "01:45", "seconds": 105},
        "run4": {"time": "04:45", "seconds": 285},
        "burpee": {"time": "03:30", "seconds": 210},
        "run5": {"time": "04:50", "seconds": 290},
        "rowing": {"time": "04:00", "seconds": 240},
        "run6": {"time": "04:55", "seconds": 295},
        "farmers_carry": {"time": "01:15", "seconds": 75},
        "run7": {"time": "05:00", "seconds": 300},
        "lunges": {"time": "02:30", "seconds": 150},
        "run8": {"time": "05:10", "seconds": 310},
        "wall_balls": {"time": "03:00", "seconds": 180}
    }
}
```

### 2.2 GetDivisionStats

```python
{
    "type": "function",
    "function": {
        "name": "GetDivisionStats",
        "description": "获取指定组别的统计数据，包括平均成绩、中位数、标准差等",
        "parameters": {
            "type": "object",
            "properties": {
                "season": {"type": "integer"},
                "location": {"type": "string"},
                "division": {
                    "type": "string",
                    "description": "组别名称，如 MEN PRO, WOMEN PRO"
                }
            },
            "required": ["season", "location", "division"]
        }
    }
}
```

**返回示例：**
```json
{
    "division": "MEN PRO",
    "total_athletes": 156,
    "total_time": {
        "average": "01:18:45",
        "median": "01:17:30",
        "std_dev": "00:05:20",
        "min": "01:02:15",
        "max": "01:45:30"
    },
    "segments": {
        "run1": {"average": 285, "median": 280},
        "skierg": {"average": 230, "median": 225},
        // ... 其他分段
    }
}
```

### 2.3 GetDivisionRanking

```python
{
    "type": "function",
    "function": {
        "name": "GetDivisionRanking",
        "description": "获取组别排行榜，返回前 N 名运动员",
        "parameters": {
            "type": "object",
            "properties": {
                "season": {"type": "integer"},
                "location": {"type": "string"},
                "division": {"type": "string"},
                "limit": {
                    "type": "integer",
                    "description": "返回数量，默认 10",
                    "default": 10
                }
            },
            "required": ["season", "location", "division"]
        }
    }
}
```

### 2.4 GetSegmentComparison

```python
{
    "type": "function",
    "function": {
        "name": "GetSegmentComparison",
        "description": "获取运动员各分段与组别平均的对比数据",
        "parameters": {
            "type": "object",
            "properties": {
                "season": {"type": "integer"},
                "location": {"type": "string"},
                "athlete_name": {"type": "string"}
            },
            "required": ["season", "location", "athlete_name"]
        }
    }
}
```

**返回示例：**
```json
{
    "athlete_name": "张三",
    "division": "MEN PRO",
    "comparisons": [
        {
            "segment": "run1",
            "athlete_time": 270,
            "division_avg": 285,
            "difference": -15,
            "percentage": -5.3,
            "rank_in_segment": 12
        },
        // ... 其他分段
    ],
    "summary": {
        "above_average_segments": 10,
        "below_average_segments": 6,
        "total_time_vs_avg": -195
    }
}
```

### 2.5 GetAthleteHistory

```python
{
    "type": "function",
    "function": {
        "name": "GetAthleteHistory",
        "description": "获取运动员历史比赛记录",
        "parameters": {
            "type": "object",
            "properties": {
                "athlete_name": {"type": "string"},
                "limit": {
                    "type": "integer",
                    "description": "返回数量，默认 5",
                    "default": 5
                }
            },
            "required": ["athlete_name"]
        }
    }
}
```

### 2.6 GetPacingAnalysis

```python
{
    "type": "function",
    "function": {
        "name": "GetPacingAnalysis",
        "description": "获取运动员跑步段配速分析",
        "parameters": {
            "type": "object",
            "properties": {
                "season": {"type": "integer"},
                "location": {"type": "string"},
                "athlete_name": {"type": "string"}
            },
            "required": ["season", "location", "athlete_name"]
        }
    }
}
```

**返回示例：**
```json
{
    "athlete_name": "张三",
    "running_segments": [
        {"segment": "run1", "time": 270, "pace_per_km": "04:30"},
        {"segment": "run2", "time": 275, "pace_per_km": "04:35"},
        // ... run3-run8
    ],
    "analysis": {
        "total_running_time": 2225,
        "average_pace": "04:38",
        "fastest_segment": "run1",
        "slowest_segment": "run8",
        "pace_decline_rate": 2.3,
        "consistency_score": 85
    }
}
```

### 2.7 GetStationDeepAnalysis

```python
{
    "type": "function",
    "function": {
        "name": "GetStationDeepAnalysis",
        "description": "获取 8 个功能站的深度分析",
        "parameters": {
            "type": "object",
            "properties": {
                "season": {"type": "integer"},
                "location": {"type": "string"},
                "athlete_name": {"type": "string"}
            },
            "required": ["season", "location", "athlete_name"]
        }
    }
}
```

**返回示例：**
```json
{
    "athlete_name": "张三",
    "stations": [
        {
            "station": "skierg",
            "time": 225,
            "division_avg": 230,
            "percentile": 65,
            "rank": 54,
            "strength_indicator": "average"
        },
        // ... 其他 7 站
    ],
    "summary": {
        "strongest_station": "sled_push",
        "weakest_station": "wall_balls",
        "overall_station_rank": 35
    }
}
```

## 3. 添加新数据函数

### 3.1 步骤

1. **定义 Schema** (`data_functions.py`)
2. **实现执行逻辑** (`data_executor.py`)
3. **添加测试** (`tests/unit/test_data_functions.py`)
4. **更新工具描述**

### 3.2 模板

```python
# data_functions.py
NEW_FUNCTION_SCHEMA = {
    "type": "function",
    "function": {
        "name": "GetNewData",
        "description": "获取某类数据的详细描述",
        "parameters": {
            "type": "object",
            "properties": {
                "param1": {
                    "type": "string",
                    "description": "参数1描述"
                },
                "param2": {
                    "type": "integer",
                    "description": "参数2描述"
                }
            },
            "required": ["param1"]
        }
    }
}

# 添加到 ALL_FUNCTIONS 列表
ALL_FUNCTIONS = [
    # ... 现有函数
    NEW_FUNCTION_SCHEMA
]
```

```python
# data_executor.py
class DataExecutor:
    async def execute(self, function_name: str, params: dict) -> dict:
        # 添加新函数的处理
        if function_name == "GetNewData":
            return await self._execute_get_new_data(params)
        # ... 其他函数
    
    async def _execute_get_new_data(self, params: dict) -> dict:
        """执行 GetNewData 函数"""
        # 1. 参数验证
        param1 = params.get("param1")
        if not param1:
            return {"error": "param1 is required"}
        
        # 2. 数据查询
        query = select(Result).where(
            Result.some_field == param1
        )
        results = await self.db.execute(query)
        
        # 3. 数据处理
        processed_data = self._process_results(results)
        
        # 4. 返回结果
        return {
            "data": processed_data,
            "meta": {"count": len(processed_data)}
        }
```

### 3.3 最佳实践

**参数验证：**
```python
def _validate_params(self, params: dict, required: list) -> tuple[bool, str]:
    """验证必需参数"""
    missing = [p for p in required if p not in params or params[p] is None]
    if missing:
        return False, f"Missing required parameters: {missing}"
    return True, ""
```

**错误处理：**
```python
async def _execute_with_error_handling(self, func, params):
    try:
        result = await func(params)
        return {"success": True, "data": result}
    except ValueError as e:
        return {"success": False, "error": str(e), "type": "validation"}
    except DatabaseError as e:
        return {"success": False, "error": "Database error", "type": "database"}
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return {"success": False, "error": "Internal error", "type": "internal"}
```

**结果缓存：**
```python
from functools import lru_cache

@lru_cache(maxsize=100)
def _get_cached_stats(self, season: int, location: str, division: str):
    """缓存组别统计数据"""
    # 这些数据变化不频繁，可以缓存
    pass
```

## 4. 数据模型

### 4.1 核心表结构

```python
# backend/app/db/models.py

class Result(Base):
    """比赛成绩表"""
    __tablename__ = "results"
    
    id = Column(Integer, primary_key=True)
    season = Column(Integer, index=True)
    location = Column(String(50), index=True)
    athlete_name = Column(String(100), index=True)
    gender = Column(String(10))
    division = Column(String(20), index=True)
    
    # 总成绩
    total_time = Column(String(20))
    total_seconds = Column(Integer)
    division_rank = Column(Integer)
    overall_rank = Column(Integer)
    
    # 分段成绩 (JSON)
    segments = Column(JSON)  # {"run1": {"time": "04:30", "seconds": 270}, ...}
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 索引
    __table_args__ = (
        Index('idx_season_location_division', 'season', 'location', 'division'),
        Index('idx_athlete_name', 'athlete_name'),
    )


class ProReport(Base):
    """专业报告表"""
    __tablename__ = "pro_reports"
    
    id = Column(Integer, primary_key=True)
    report_id = Column(String(36), unique=True, index=True)
    user_id = Column(Integer, index=True, nullable=True)
    
    # 关联信息
    season = Column(Integer)
    location = Column(String(50))
    athlete_name = Column(String(100))
    gender = Column(String(10))
    division = Column(String(20))
    
    # 报告内容
    title = Column(String(200))
    introduction = Column(Text)
    sections = Column(Text)  # JSON 字符串
    charts = Column(Text)    # JSON 字符串
    conclusion = Column(Text)
    
    # 状态
    status = Column(String(20), default="pending")  # pending/generating/completed/error
    progress = Column(Integer, default=0)
    current_step = Column(String(100))
    error_message = Column(Text)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
```

### 4.2 查询优化

**索引策略：**
```python
# 常用查询模式 -> 对应索引

# 1. 按比赛查询运动员
#    WHERE season = ? AND location = ? AND athlete_name = ?
Index('idx_season_location_athlete', 'season', 'location', 'athlete_name')

# 2. 按组别查询排名
#    WHERE season = ? AND location = ? AND division = ? ORDER BY total_seconds
Index('idx_division_ranking', 'season', 'location', 'division', 'total_seconds')

# 3. 查询运动员历史
#    WHERE athlete_name = ? ORDER BY created_at DESC
Index('idx_athlete_history', 'athlete_name', 'created_at')
```

**批量查询：**
```python
async def get_division_data(self, season: int, location: str, division: str):
    """一次查询获取组别所有数据"""
    query = select(Result).where(
        Result.season == season,
        Result.location == location,
        Result.division == division
    ).order_by(Result.total_seconds)
    
    results = await self.db.execute(query)
    return results.scalars().all()
```

## 5. 数据质量保证

### 5.1 数据验证

```python
def validate_result(result: dict) -> list[str]:
    """验证成绩数据完整性"""
    errors = []
    
    # 必需字段
    required = ["athlete_name", "total_time", "division"]
    for field in required:
        if not result.get(field):
            errors.append(f"Missing required field: {field}")
    
    # 分段数据
    segments = result.get("segments", {})
    expected_segments = [
        "run1", "skierg", "run2", "sled_push", 
        "run3", "sled_pull", "run4", "burpee",
        "run5", "rowing", "run6", "farmers_carry",
        "run7", "lunges", "run8", "wall_balls"
    ]
    for seg in expected_segments:
        if seg not in segments:
            errors.append(f"Missing segment: {seg}")
    
    # 时间合理性
    total_seconds = result.get("total_seconds", 0)
    if total_seconds < 3000 or total_seconds > 9000:  # 50min - 150min
        errors.append(f"Suspicious total time: {total_seconds}s")
    
    return errors
```

### 5.2 缺失数据处理

```python
def handle_missing_data(self, data: dict, context: str) -> dict:
    """处理缺失数据"""
    if not data or data.get("error"):
        return {
            "available": False,
            "reason": data.get("error", "No data available"),
            "fallback": self._get_fallback_data(context)
        }
    return {"available": True, "data": data}

def _get_fallback_data(self, context: str) -> str:
    """返回降级说明"""
    fallback_messages = {
        "history": "该运动员无历史比赛记录，无法进行历史对比分析。",
        "division_stats": "该组别统计数据暂不可用。",
        "pacing": "配速数据不完整，无法进行详细分析。"
    }
    return fallback_messages.get(context, "数据暂不可用。")
```
