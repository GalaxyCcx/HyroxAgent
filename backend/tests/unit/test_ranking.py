"""
排名计算单元测试
"""
import pytest
import pandas as pd

from app.services.ranking_service import calculate_rankings, get_percentile


class TestCalculateRankings:
    """calculate_rankings 函数测试"""
    
    @pytest.fixture
    def sample_data(self):
        """示例数据"""
        return pd.DataFrame([
            {"name": "A", "total_time": 60, "gender": "male", "division": "open", "age_group": "30-34"},
            {"name": "B", "total_time": 70, "gender": "male", "division": "open", "age_group": "30-34"},
            {"name": "C", "total_time": 80, "gender": "male", "division": "open", "age_group": "35-39"},
            {"name": "D", "total_time": 65, "gender": "female", "division": "open", "age_group": "30-34"},
        ])
    
    def test_basic_ranking(self, sample_data):
        """测试基本排名计算"""
        rankings = calculate_rankings(sample_data, "B")
        
        # 总排名: A(60) < D(65) < B(70) < C(80), B排第3
        assert rankings["overall_rank"] == 3
        assert rankings["overall_total"] == 4
        
        # 性别排名 (男子): A(60) < B(70) < C(80), B排第2
        assert rankings["gender_rank"] == 2
        assert rankings["gender_total"] == 3
        
        # 组别排名 (男子公开组): 同上
        assert rankings["division_rank"] == 2
        assert rankings["division_total"] == 3
        
        # 年龄组排名 (男子公开组 30-34): A(60) < B(70), B排第2
        assert rankings["age_group_rank"] == 2
        assert rankings["age_group_total"] == 2
    
    def test_first_place(self, sample_data):
        """测试第一名"""
        rankings = calculate_rankings(sample_data, "A")
        
        assert rankings["overall_rank"] == 1
        assert rankings["gender_rank"] == 1
        assert rankings["division_rank"] == 1
        assert rankings["age_group_rank"] == 1
    
    def test_female_athlete(self, sample_data):
        """测试女子运动员"""
        rankings = calculate_rankings(sample_data, "D")
        
        assert rankings["overall_rank"] == 2  # 总排名第2
        assert rankings["gender_rank"] == 1    # 女子第1
        assert rankings["gender_total"] == 1   # 女子只有1人
        assert rankings["division_rank"] == 1  # 女子公开组第1
    
    def test_single_athlete(self):
        """测试只有一人的情况"""
        single_data = pd.DataFrame([
            {"name": "A", "total_time": 60, "gender": "male", "division": "open", "age_group": "30-34"},
        ])
        
        rankings = calculate_rankings(single_data, "A")
        
        assert rankings["overall_rank"] == 1
        assert rankings["overall_total"] == 1
        assert rankings["gender_rank"] == 1
        assert rankings["gender_total"] == 1
    
    def test_athlete_not_found(self, sample_data):
        """测试运动员不存在"""
        with pytest.raises(ValueError) as exc_info:
            calculate_rankings(sample_data, "NotExist")
        
        assert "not found" in str(exc_info.value).lower()
    
    def test_with_invalid_times(self):
        """测试包含无效成绩的数据"""
        data = pd.DataFrame([
            {"name": "A", "total_time": 60, "gender": "male", "division": "open", "age_group": "30-34"},
            {"name": "B", "total_time": 70, "gender": "male", "division": "open", "age_group": "30-34"},
            {"name": "C", "total_time": None, "gender": "male", "division": "open", "age_group": "30-34"},
            {"name": "D", "total_time": 0, "gender": "male", "division": "open", "age_group": "30-34"},
        ])
        
        rankings = calculate_rankings(data, "B")
        
        # 只计算有效成绩: A(60) < B(70), total=2
        assert rankings["overall_rank"] == 2
        assert rankings["overall_total"] == 2
    
    def test_same_time(self):
        """测试相同成绩"""
        data = pd.DataFrame([
            {"name": "A", "total_time": 60, "gender": "male", "division": "open", "age_group": "30-34"},
            {"name": "B", "total_time": 60, "gender": "male", "division": "open", "age_group": "30-34"},
            {"name": "C", "total_time": 70, "gender": "male", "division": "open", "age_group": "30-34"},
        ])
        
        # A 和 B 成绩相同，都应该排第1
        rankings_a = calculate_rankings(data, "A")
        rankings_b = calculate_rankings(data, "B")
        
        assert rankings_a["overall_rank"] == 1
        assert rankings_b["overall_rank"] == 1  # 相同成绩并列第1


class TestGetPercentile:
    """get_percentile 函数测试"""
    
    def test_normal_percentile(self):
        """测试正常百分位"""
        assert get_percentile(1, 100) == 1.0
        assert get_percentile(50, 100) == 50.0
        assert get_percentile(100, 100) == 100.0
    
    def test_small_field(self):
        """测试小规模比赛"""
        assert get_percentile(1, 10) == 10.0
        assert get_percentile(5, 10) == 50.0
    
    def test_zero_total(self):
        """测试总人数为0"""
        assert get_percentile(1, 0) == 0.0
    
    def test_rounding(self):
        """测试四舍五入"""
        result = get_percentile(1, 3)
        assert result == 33.3




