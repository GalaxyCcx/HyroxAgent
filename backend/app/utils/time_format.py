"""
时间格式化工具函数
"""
import math
from typing import Optional


def format_time(minutes: Optional[float]) -> str:
    """
    将分钟数格式化为 HH:MM:SS 格式
    
    Args:
        minutes: 分钟数（浮点数），如 94.75 表示 94分45秒
    
    Returns:
        格式化后的时间字符串，如 "01:34:45"
        无效值返回 "--:--:--"
    """
    if minutes is None or (isinstance(minutes, float) and math.isnan(minutes)):
        return "--:--:--"
    
    try:
        total_seconds = int(round(minutes * 60))
        hours = total_seconds // 3600
        remaining_seconds = total_seconds % 3600
        mins = remaining_seconds // 60
        secs = remaining_seconds % 60
        return f"{hours:02d}:{mins:02d}:{secs:02d}"
    except (TypeError, ValueError):
        return "--:--:--"


def format_time_short(minutes: Optional[float]) -> str:
    """
    将分钟数格式化为 MM:SS 格式（用于分段成绩）
    
    Args:
        minutes: 分钟数（浮点数），如 4.5 表示 4分30秒
    
    Returns:
        格式化后的时间字符串，如 "04:30"
        无效值返回 "--:--"
    """
    if minutes is None or (isinstance(minutes, float) and math.isnan(minutes)):
        return "--:--"
    
    try:
        total_seconds = int(round(minutes * 60))
        mins = total_seconds // 60
        secs = total_seconds % 60
        return f"{mins:02d}:{secs:02d}"
    except (TypeError, ValueError):
        return "--:--"


def calculate_time_percent(
    part_time: Optional[float],
    total_time: Optional[float]
) -> float:
    """
    计算时间占比百分比
    
    Args:
        part_time: 部分时间（分钟）
        total_time: 总时间（分钟）
    
    Returns:
        占比百分比，保留一位小数，如 48.5
        无效值返回 0.0
    """
    if part_time is None or total_time is None:
        return 0.0
    
    if isinstance(part_time, float) and math.isnan(part_time):
        return 0.0
    
    if isinstance(total_time, float) and math.isnan(total_time):
        return 0.0
    
    if total_time == 0:
        return 0.0
    
    try:
        percent = (part_time / total_time) * 100
        return round(percent, 1)
    except (TypeError, ValueError, ZeroDivisionError):
        return 0.0


def minutes_to_seconds(minutes: Optional[float]) -> Optional[int]:
    """
    将分钟转换为秒数
    
    Args:
        minutes: 分钟数
    
    Returns:
        秒数，无效值返回 None
    """
    if minutes is None or (isinstance(minutes, float) and math.isnan(minutes)):
        return None
    
    try:
        return int(round(minutes * 60))
    except (TypeError, ValueError):
        return None




