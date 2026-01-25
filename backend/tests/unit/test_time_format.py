"""
时间格式化函数单元测试
"""
import math
import pytest

from app.utils.time_format import (
    format_time,
    format_time_short,
    calculate_time_percent,
)


class TestFormatTime:
    """format_time 函数测试"""
    
    def test_normal_value(self):
        """测试正常值"""
        assert format_time(94.75) == "01:34:45"
    
    def test_less_than_hour(self):
        """测试小于1小时"""
        assert format_time(45.5) == "00:45:30"
    
    def test_less_than_minute(self):
        """测试小于1分钟"""
        assert format_time(0.5) == "00:00:30"
    
    def test_none_value(self):
        """测试 None 值"""
        assert format_time(None) == "--:--:--"
    
    def test_nan_value(self):
        """测试 NaN 值"""
        assert format_time(math.nan) == "--:--:--"
    
    def test_zero_value(self):
        """测试 0 值"""
        assert format_time(0) == "00:00:00"
    
    def test_exact_hour(self):
        """测试整小时"""
        assert format_time(60) == "01:00:00"
    
    def test_two_hours(self):
        """测试超过两小时"""
        assert format_time(125.0) == "02:05:00"


class TestFormatTimeShort:
    """format_time_short 函数测试"""
    
    def test_normal_value(self):
        """测试正常值"""
        assert format_time_short(4.5) == "04:30"
    
    def test_more_than_10_minutes(self):
        """测试超过10分钟"""
        assert format_time_short(12.25) == "12:15"
    
    def test_none_value(self):
        """测试 None 值"""
        assert format_time_short(None) == "--:--"
    
    def test_nan_value(self):
        """测试 NaN 值"""
        assert format_time_short(math.nan) == "--:--"
    
    def test_zero_value(self):
        """测试 0 值"""
        assert format_time_short(0) == "00:00"
    
    def test_small_value(self):
        """测试小值"""
        assert format_time_short(0.5) == "00:30"


class TestCalculateTimePercent:
    """calculate_time_percent 函数测试"""
    
    def test_normal_calculation(self):
        """测试正常计算"""
        assert calculate_time_percent(45.5, 94.75) == 48.0
    
    def test_total_time_zero(self):
        """测试总时间为0"""
        assert calculate_time_percent(10, 0) == 0.0
    
    def test_part_time_none(self):
        """测试部分时间为 None"""
        assert calculate_time_percent(None, 100) == 0.0
    
    def test_total_time_none(self):
        """测试总时间为 None"""
        assert calculate_time_percent(50, None) == 0.0
    
    def test_both_none(self):
        """测试两者都为 None"""
        assert calculate_time_percent(None, None) == 0.0
    
    def test_part_time_nan(self):
        """测试部分时间为 NaN"""
        assert calculate_time_percent(math.nan, 100) == 0.0
    
    def test_total_time_nan(self):
        """测试总时间为 NaN"""
        assert calculate_time_percent(50, math.nan) == 0.0
    
    def test_50_percent(self):
        """测试50%的情况"""
        assert calculate_time_percent(50, 100) == 50.0
    
    def test_rounding(self):
        """测试四舍五入"""
        # 33.333... 应该四舍五入为 33.3
        result = calculate_time_percent(10, 30)
        assert result == 33.3




