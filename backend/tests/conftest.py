"""
pytest 配置和共享 fixtures
"""
import sys
from pathlib import Path

import pytest

# 添加 backend 到路径
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))


@pytest.fixture
def sample_time_data():
    """示例时间数据"""
    return {
        "valid_time": 94.75,      # 1小时34分45秒
        "short_time": 4.5,        # 4分30秒
        "zero_time": 0,           # 0
        "none_time": None,        # None
    }


@pytest.fixture
def sample_athlete_data():
    """示例运动员数据"""
    import pandas as pd
    return pd.DataFrame([
        {
            "name": "Test, Athlete A",
            "total_time": 60.0,
            "gender": "male",
            "division": "open",
            "age_group": "30-34",
            "nationality": "CHN"
        },
        {
            "name": "Test, Athlete B",
            "total_time": 70.0,
            "gender": "male",
            "division": "open",
            "age_group": "30-34",
            "nationality": "HKG"
        },
        {
            "name": "Test, Athlete C",
            "total_time": 80.0,
            "gender": "male",
            "division": "open",
            "age_group": "35-39",
            "nationality": "USA"
        },
        {
            "name": "Test, Athlete D",
            "total_time": 65.0,
            "gender": "female",
            "division": "open",
            "age_group": "30-34",
            "nationality": "GBR"
        },
    ])




