"""
排名计算服务
"""
import logging
from typing import Optional

import pandas as pd

logger = logging.getLogger(__name__)


def calculate_rankings(
    race_data: pd.DataFrame,
    athlete_name: str
) -> dict:
    """
    计算运动员在比赛中的各项排名
    
    Args:
        race_data: 比赛数据 DataFrame，需包含:
            - name: 运动员姓名
            - total_time: 总成绩（分钟）
            - gender: 性别
            - division: 组别
            - age_group: 年龄组
        athlete_name: 目标运动员姓名
    
    Returns:
        排名信息字典:
            - overall_rank: 总排名
            - overall_total: 总参赛人数
            - gender_rank: 性别组排名
            - gender_total: 性别组总人数
            - division_rank: 组别排名 (同性别+组别)
            - division_total: 组别总人数
            - age_group_rank: 年龄组排名 (同性别+组别+年龄组)
            - age_group_total: 年龄组总人数
    
    Raises:
        ValueError: 运动员不存在
    """
    # 过滤无效成绩
    valid_data = race_data[
        race_data['total_time'].notna() & 
        (race_data['total_time'] > 0)
    ].copy()
    
    # 查找目标运动员
    athlete_rows = valid_data[valid_data['name'] == athlete_name]
    
    if len(athlete_rows) == 0:
        raise ValueError(f"Athlete '{athlete_name}' not found in race data")
    
    athlete = athlete_rows.iloc[0]
    athlete_time = athlete['total_time']
    athlete_gender = athlete.get('gender', '')
    athlete_division = athlete.get('division', '')
    athlete_age_group = athlete.get('age_group')
    
    # 1. 总排名
    overall_sorted = valid_data.sort_values('total_time')
    overall_rank = (overall_sorted['total_time'] < athlete_time).sum() + 1
    overall_total = len(valid_data)
    
    # 2. 性别组排名
    gender_data = valid_data[valid_data['gender'] == athlete_gender]
    gender_sorted = gender_data.sort_values('total_time')
    gender_rank = (gender_sorted['total_time'] < athlete_time).sum() + 1
    gender_total = len(gender_data)
    
    # 3. 组别排名 (同性别 + 同组别)
    division_data = valid_data[
        (valid_data['gender'] == athlete_gender) &
        (valid_data['division'] == athlete_division)
    ]
    division_sorted = division_data.sort_values('total_time')
    division_rank = (division_sorted['total_time'] < athlete_time).sum() + 1
    division_total = len(division_data)
    
    # 4. 年龄组排名 (同性别 + 同组别 + 同年龄组)
    age_group_rank = None
    age_group_total = None
    
    if athlete_age_group:
        age_group_data = valid_data[
            (valid_data['gender'] == athlete_gender) &
            (valid_data['division'] == athlete_division) &
            (valid_data['age_group'] == athlete_age_group)
        ]
        if len(age_group_data) > 0:
            age_group_sorted = age_group_data.sort_values('total_time')
            age_group_rank = (age_group_sorted['total_time'] < athlete_time).sum() + 1
            age_group_total = len(age_group_data)
    
    return {
        "overall_rank": overall_rank,
        "overall_total": overall_total,
        "gender_rank": gender_rank,
        "gender_total": gender_total,
        "division_rank": division_rank,
        "division_total": division_total,
        "age_group_rank": age_group_rank,
        "age_group_total": age_group_total,
    }


def get_percentile(rank: int, total: int) -> float:
    """
    计算百分位数
    
    Args:
        rank: 排名
        total: 总人数
    
    Returns:
        百分位数 (0-100)，数值越小表示排名越靠前
    """
    if total <= 0:
        return 0.0
    
    # 百分位 = (排名 / 总人数) * 100
    percentile = (rank / total) * 100
    return round(percentile, 1)




