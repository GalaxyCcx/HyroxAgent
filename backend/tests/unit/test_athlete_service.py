"""
运动员搜索服务单元测试
"""
import pytest
import pandas as pd
from unittest.mock import MagicMock, patch

from app.services.athlete_service import AthleteService
from app.models.schemas import AthleteSearchItem, AthleteSearchData


@pytest.fixture
def mock_hyrox_client():
    """模拟 HyroxClient"""
    mock_client = MagicMock()
    return mock_client


@pytest.fixture
def sample_season_data():
    """示例赛季数据"""
    return pd.DataFrame([
        {
            "name": "Chen, Yuanmin",
            "nationality": "CHN",
            "gender": "male",
            "division": "open",
            "age_group": "35-39",
            "event_id": "LR3MS4JIFA2",
            "event_name": "2025 Shanghai",
            "total_time": 85.5,
        },
        {
            "name": "Chen, Mitch",
            "nationality": "HKG",
            "gender": "male",
            "division": "open",
            "age_group": "30-34",
            "event_id": "LR3MS4JI36D4F8",
            "event_name": "2025 Hong Kong",
            "total_time": 94.75,
        },
        {
            "name": "Magill, Connor",
            "nationality": "IRL",
            "gender": "male",
            "division": "pro",
            "age_group": "25-29",
            "event_id": "LR3MS4JIF7D",
            "event_name": "2025 Dublin",
            "total_time": 55.0,
        },
    ])


@pytest.fixture
def sample_races():
    """示例比赛列表"""
    return pd.DataFrame([
        {"season": 8, "location": "shanghai"},
        {"season": 8, "location": "hong-kong"},
        {"season": 8, "location": "dublin"},
    ])


class TestAthleteServiceSearch:
    """AthleteService.search 方法测试"""
    
    @pytest.mark.asyncio
    async def test_exact_match(self, mock_hyrox_client, sample_season_data, sample_races):
        """测试精确匹配搜索"""
        mock_hyrox_client.get_season.return_value = sample_season_data
        mock_hyrox_client.list_races.return_value = sample_races
        
        service = AthleteService(hyrox_client=mock_hyrox_client)
        result = await service.search(name="Chen, Yuanmin", limit=10)
        
        assert isinstance(result, AthleteSearchData)
        assert result.total == 1
        assert len(result.items) == 1
        assert result.items[0].name == "Chen, Yuanmin"
    
    @pytest.mark.asyncio
    async def test_no_match(self, mock_hyrox_client, sample_season_data, sample_races):
        """测试无匹配结果"""
        mock_hyrox_client.get_season.return_value = sample_season_data
        mock_hyrox_client.list_races.return_value = sample_races
        
        service = AthleteService(hyrox_client=mock_hyrox_client)
        result = await service.search(name="NotExist, Person", limit=10)
        
        assert result.total == 0
        assert len(result.items) == 0
        assert result.has_more is False
    
    @pytest.mark.asyncio
    async def test_case_sensitive_exact_match(self, mock_hyrox_client, sample_season_data, sample_races):
        """测试大小写敏感的精确匹配"""
        mock_hyrox_client.get_season.return_value = sample_season_data
        mock_hyrox_client.list_races.return_value = sample_races
        
        service = AthleteService(hyrox_client=mock_hyrox_client)
        
        # 精确匹配需要完全一致（包括大小写）
        result = await service.search(name="chen, yuanmin", limit=10)
        assert result.total == 0  # 小写不匹配
        
        result = await service.search(name="Chen, Yuanmin", limit=10)
        assert result.total == 1  # 精确匹配
    
    @pytest.mark.asyncio
    async def test_limit_results(self, mock_hyrox_client, sample_races):
        """测试结果数量限制"""
        # 创建多个同名运动员记录
        large_data = pd.DataFrame([
            {
                "name": "Test, Athlete",
                "nationality": "USA",
                "gender": "male",
                "division": "open",
                "age_group": "30-34",
                "event_id": f"EVENT_{i}",
                "event_name": f"2025 Race {i}",
                "total_time": 80.0 + i,
            }
            for i in range(10)
        ])
        
        mock_hyrox_client.get_season.return_value = large_data
        mock_hyrox_client.list_races.return_value = sample_races
        
        service = AthleteService(hyrox_client=mock_hyrox_client)
        result = await service.search(name="Test, Athlete", limit=5)
        
        assert len(result.items) == 5
        assert result.total == 10
        assert result.has_more is True
    
    @pytest.mark.asyncio
    async def test_sorted_by_time(self, mock_hyrox_client, sample_races):
        """测试结果按时间排序"""
        data = pd.DataFrame([
            {
                "name": "Test, Athlete",
                "nationality": "USA",
                "gender": "male",
                "division": "open",
                "age_group": "30-34",
                "event_id": "EVENT_1",
                "event_name": "2025 Race 1",
                "total_time": 90.0,
            },
            {
                "name": "Test, Athlete",
                "nationality": "USA",
                "gender": "male",
                "division": "open",
                "age_group": "30-34",
                "event_id": "EVENT_2",
                "event_name": "2025 Race 2",
                "total_time": 85.0,
            },
            {
                "name": "Test, Athlete",
                "nationality": "USA",
                "gender": "male",
                "division": "open",
                "age_group": "30-34",
                "event_id": "EVENT_3",
                "event_name": "2025 Race 3",
                "total_time": 95.0,
            },
        ])
        
        mock_hyrox_client.get_season.return_value = data
        mock_hyrox_client.list_races.return_value = sample_races
        
        service = AthleteService(hyrox_client=mock_hyrox_client)
        result = await service.search(name="Test, Athlete", limit=10)
        
        # 应该按时间升序排列
        assert result.items[0].total_time_minutes == 85.0
        assert result.items[1].total_time_minutes == 90.0
        assert result.items[2].total_time_minutes == 95.0
    
    @pytest.mark.asyncio
    async def test_empty_season_data(self, mock_hyrox_client, sample_races):
        """测试空赛季数据"""
        mock_hyrox_client.get_season.return_value = pd.DataFrame()
        mock_hyrox_client.list_races.return_value = sample_races
        
        service = AthleteService(hyrox_client=mock_hyrox_client)
        result = await service.search(name="Chen, Yuanmin", limit=10)
        
        assert result.total == 0
        assert len(result.items) == 0
    
    @pytest.mark.asyncio
    async def test_search_item_fields(self, mock_hyrox_client, sample_season_data, sample_races):
        """测试搜索结果项字段完整性"""
        mock_hyrox_client.get_season.return_value = sample_season_data
        mock_hyrox_client.list_races.return_value = sample_races
        
        service = AthleteService(hyrox_client=mock_hyrox_client)
        result = await service.search(name="Chen, Yuanmin", limit=10)
        
        item = result.items[0]
        assert isinstance(item, AthleteSearchItem)
        assert item.name == "Chen, Yuanmin"
        assert item.nationality == "CHN"
        assert item.gender == "male"
        assert item.division == "open"
        assert item.age_group == "35-39"
        assert item.event_id == "LR3MS4JIFA2"
        assert item.event_name == "2025 Shanghai"
        assert item.total_time_minutes == 85.5
        assert item.total_time == "01:25:30"  # 格式化后的时间


class TestAthleteServiceEdgeCases:
    """AthleteService 边界情况测试"""
    
    @pytest.mark.asyncio
    async def test_client_error_handling(self, mock_hyrox_client):
        """测试客户端错误处理"""
        mock_hyrox_client.get_season.side_effect = Exception("Network error")
        
        service = AthleteService(hyrox_client=mock_hyrox_client)
        result = await service.search(name="Chen, Yuanmin", limit=10)
        
        # 应该返回空结果而不是抛出异常
        assert result.total == 0
        assert len(result.items) == 0
    
    @pytest.mark.asyncio
    async def test_none_total_time(self, mock_hyrox_client, sample_races):
        """测试 total_time 为 None 的情况"""
        data = pd.DataFrame([
            {
                "name": "Test, Athlete",
                "nationality": "USA",
                "gender": "male",
                "division": "open",
                "age_group": "30-34",
                "event_id": "EVENT_1",
                "event_name": "2025 Race 1",
                "total_time": None,
            },
        ])
        
        mock_hyrox_client.get_season.return_value = data
        mock_hyrox_client.list_races.return_value = sample_races
        
        service = AthleteService(hyrox_client=mock_hyrox_client)
        result = await service.search(name="Test, Athlete", limit=10)
        
        assert len(result.items) == 1
        assert result.items[0].total_time_minutes == 0.0



