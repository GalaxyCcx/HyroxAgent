# HYROX 数据接口文档

## 概述

本文档描述如何通过 `pyrox-client` Python 库获取 HYROX 比赛结果数据。

- **数据来源**: [https://results.hyrox.com](https://results.hyrox.com)
- **客户端库**: pyrox-client (非官方)
- **数据格式**: Pandas DataFrame / CSV

---

## 安装

```bash
pip install pyrox-client pandas
```

---

## 快速开始

```python
from pyrox import PyroxClient

# 初始化客户端
client = PyroxClient()

# 获取比赛列表
races = client.list_races(season=7)

# 获取比赛数据
data = client.get_race(season=7, location="amsterdam")
```

---

## API 接口详情

### 1. 初始化客户端

```python
PyroxClient(cache_dir: Optional[Path] = None)
```

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| cache_dir | Path | 否 | None | 本地缓存目录路径，用于缓存已下载的数据 |

**示例:**
```python
from pyrox import PyroxClient
from pathlib import Path

# 默认缓存
client = PyroxClient()

# 自定义缓存目录
client = PyroxClient(cache_dir=Path("./hyrox_cache"))
```

---

### 2. 获取比赛列表

```python
client.list_races(
    season: Optional[int] = None,
    force_refresh: bool = False
) -> pd.DataFrame
```

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| season | int | 否 | None | 赛季编号 (1-8)，不传则返回所有赛季 |
| force_refresh | bool | 否 | False | 是否强制刷新缓存 |

**返回值:** `pd.DataFrame`

| 字段 | 类型 | 说明 |
|------|------|------|
| season | int | 赛季编号 |
| location | str | 比赛地点 (小写，如 "amsterdam") |
| file_last_modified | str | 数据最后更新时间 (ISO 8601 格式) |

**示例:**
```python
# 获取所有赛季比赛
all_races = client.list_races()
print(f"总共 {len(all_races)} 场比赛")

# 获取 Season 7 比赛
s7_races = client.list_races(season=7)
print(f"Season 7 共 {len(s7_races)} 场比赛")
print(s7_races['location'].unique())
```

---

### 3. 获取单场比赛数据

```python
client.get_race(
    season: int,
    location: str,
    year: Optional[int] = None,
    gender: Optional[str] = None,
    division: Optional[str] = None,
    total_time: Optional[float | tuple[Optional[float], Optional[float]]] = None,
    use_cache: bool = True
) -> pd.DataFrame
```

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| season | int | **是** | - | 赛季编号 (1-8) |
| location | str | **是** | - | 比赛地点 (小写，如 "amsterdam", "berlin") |
| year | int | 否 | None | 比赛年份，用于区分同一地点多年比赛 |
| gender | str | 否 | None | 性别筛选: "male", "female", "mixed" |
| division | str | 否 | None | 组别筛选: "open", "pro", "doubles", "pro_doubles" |
| total_time | float/tuple | 否 | None | 总成绩筛选 (分钟)，可传单值或区间元组 |
| use_cache | bool | 否 | True | 是否使用本地缓存 |

**返回值:** `pd.DataFrame` - 包含选手成绩数据，详见[数据字段说明](./Data_Dictionary.md)

**示例:**
```python
# 获取完整比赛数据
data = client.get_race(season=7, location="amsterdam")

# 筛选男子公开组
male_open = client.get_race(
    season=7, 
    location="amsterdam",
    gender="male",
    division="open"
)

# 筛选成绩在 60-90 分钟之间的选手
filtered = client.get_race(
    season=7,
    location="amsterdam",
    total_time=(60, 90)
)

# 筛选成绩小于 70 分钟的选手
fast = client.get_race(
    season=7,
    location="amsterdam",
    total_time=70
)
```

---

### 4. 获取整个赛季数据

```python
client.get_season(
    season: int,
    locations: Optional[Iterable[str]] = None,
    gender: Optional[str] = None,
    division: Optional[str] = None,
    max_workers: int = 8,
    use_cache: bool = True
) -> pd.DataFrame
```

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| season | int | **是** | - | 赛季编号 (1-8) |
| locations | Iterable[str] | 否 | None | 指定比赛地点列表，不传则获取全部 |
| gender | str | 否 | None | 性别筛选 |
| division | str | 否 | None | 组别筛选 |
| max_workers | int | 否 | 8 | 并行下载线程数 |
| use_cache | bool | 否 | True | 是否使用本地缓存 |

**返回值:** `pd.DataFrame` - 合并后的所有比赛数据

**示例:**
```python
# 获取整个赛季数据 (可能较慢)
season_data = client.get_season(season=7)

# 获取指定几场比赛
selected = client.get_season(
    season=7,
    locations=["amsterdam", "berlin", "london"]
)

# 仅获取女子精英组
women_pro = client.get_season(
    season=7,
    gender="female",
    division="pro"
)
```

---

### 5. 获取特定选手数据

```python
client.get_athlete_in_race(
    season: int,
    location: str,
    athlete_name: str,
    year: Optional[int] = None,
    gender: Optional[str] = None,
    division: Optional[str] = None,
    use_cache: bool = True
)
```

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| season | int | **是** | - | 赛季编号 |
| location | str | **是** | - | 比赛地点 |
| athlete_name | str | **是** | - | 选手姓名 (格式: "姓, 名") |
| year | int | 否 | None | 比赛年份 |
| gender | str | 否 | None | 性别筛选 |
| division | str | 否 | None | 组别筛选 |
| use_cache | bool | 否 | True | 是否使用缓存 |

**示例:**
```python
# 查询特定选手
athlete = client.get_athlete_in_race(
    season=7,
    location="amsterdam",
    athlete_name="Magill, Connor"
)
print(athlete)
```

---

### 6. 缓存管理

```python
# 获取缓存信息
cache_info = client.cache_info()
print(cache_info)

# 清除所有缓存
client.clear_cache()

# 清除特定模式的缓存
client.clear_cache(pattern="season=7*")
```

---

## 枚举值参考

### gender (性别)
| 值 | 说明 |
|------|------|
| male | 男子组 |
| female | 女子组 |
| mixed | 混合组 (双人) |

### division (组别)
| 值 | 说明 |
|------|------|
| open | 公开组 |
| pro | 精英组 |
| doubles | 双人组 |
| pro_doubles | 精英双人组 |

### age_group (年龄组)
| 值 | 说明 |
|------|------|
| 16-24 | 16-24岁 |
| 25-29 | 25-29岁 |
| 30-34 | 30-34岁 |
| 35-39 | 35-39岁 |
| 40-44 | 40-44岁 |
| 45-49 | 45-49岁 |
| 50-54 | 50-54岁 |
| 55-59 | 55-59岁 |
| 60-64 | 60-64岁 |
| 65-69 | 65-69岁 |
| 70-74 | 70-74岁 |
| MU29 | 男子29岁以下 |
| WU29 | 女子29岁以下 |
| XU29 | 混合29岁以下 |

### season (赛季)
| 值 | 时间范围 |
|------|------|
| 1 | 2018/19 |
| 2 | 2019/20 |
| 3 | 2020/21 |
| 4 | 2021/22 |
| 5 | 2022/23 |
| 6 | 2023/24 |
| 7 | 2024/25 |
| 8 | 2025/26 |

---

## 错误处理

```python
from pyrox import PyroxClient
from pyrox.errors import RaceNotFound

client = PyroxClient()

try:
    data = client.get_race(season=7, location="invalid_location")
except FileNotFoundError as e:
    print(f"比赛不存在: {e}")
except RaceNotFound as e:
    print(f"筛选条件无匹配数据: {e}")
except Exception as e:
    print(f"其他错误: {e}")
```

---

## 完整示例

```python
from pyrox import PyroxClient
import pandas as pd

def fetch_hyrox_data():
    client = PyroxClient()
    
    # 1. 获取 Season 7 所有比赛列表
    races = client.list_races(season=7)
    print(f"Season 7 共有 {len(races)} 场比赛")
    
    # 2. 获取特定比赛数据
    amsterdam = client.get_race(season=7, location="amsterdam")
    print(f"阿姆斯特丹站共 {len(amsterdam)} 名选手")
    
    # 3. 数据分析示例
    # 按性别统计
    gender_stats = amsterdam.groupby('gender').agg({
        'total_time': ['count', 'mean', 'min', 'max']
    })
    print(gender_stats)
    
    # 4. 导出数据
    amsterdam.to_csv("amsterdam_results.csv", index=False, encoding="utf-8-sig")
    
    return amsterdam

if __name__ == "__main__":
    data = fetch_hyrox_data()
```

---

## 注意事项

1. **非官方接口**: pyrox-client 是非官方库，通过解析 HYROX 公开数据实现
2. **数据延迟**: 比赛结束后数据更新可能有延迟
3. **请求频率**: 建议合理使用缓存，避免频繁请求
4. **数据准确性**: 以官方网站 [results.hyrox.com](https://results.hyrox.com) 为准

---

## 相关链接

- HYROX 官方结果页: https://results.hyrox.com
- pyrox-client PyPI: https://pypi.org/project/pyrox-client/

