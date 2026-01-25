"""
API 集成测试

测试 API 端点的响应格式和基本功能
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """创建测试客户端"""
    return TestClient(app)


class TestSuggestAPI:
    """名称建议 API 测试"""
    
    def test_suggest_success(self, client):
        """测试成功的建议请求"""
        response = client.get("/api/v1/athletes/suggest?keyword=chen")
        
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0
        assert data["message"] == "success"
        assert "suggestions" in data["data"]
        assert "total" in data["data"]
        assert isinstance(data["data"]["suggestions"], list)
    
    def test_suggest_with_limit(self, client):
        """测试带 limit 参数的请求"""
        response = client.get("/api/v1/athletes/suggest?keyword=chen&limit=3")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]["suggestions"]) <= 3
    
    def test_suggest_keyword_too_short(self, client):
        """测试关键词过短"""
        response = client.get("/api/v1/athletes/suggest?keyword=c")
        
        assert response.status_code == 422  # Validation error
    
    def test_suggest_keyword_empty(self, client):
        """测试空关键词"""
        response = client.get("/api/v1/athletes/suggest?keyword=")
        
        assert response.status_code == 422  # Validation error
    
    def test_suggest_keyword_missing(self, client):
        """测试缺少关键词参数"""
        response = client.get("/api/v1/athletes/suggest")
        
        assert response.status_code == 422  # Validation error
    
    def test_suggest_response_format(self, client):
        """测试响应格式"""
        response = client.get("/api/v1/athletes/suggest?keyword=mitch")
        
        assert response.status_code == 200
        data = response.json()
        
        # 检查响应结构
        assert "code" in data
        assert "message" in data
        assert "data" in data
        
        # 检查 data 结构
        assert "suggestions" in data["data"]
        assert "total" in data["data"]
        
        # 如果有结果，检查建议项结构
        if data["data"]["suggestions"]:
            suggestion = data["data"]["suggestions"][0]
            assert "name" in suggestion
            assert "match_count" in suggestion


class TestSearchAPI:
    """运动员搜索 API 测试"""
    
    def test_search_success(self, client):
        """测试成功的搜索请求"""
        response = client.get("/api/v1/athletes/search?name=Chen")
        
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0
        assert data["message"] == "success"
        assert "items" in data["data"]
        assert "total" in data["data"]
        assert "has_more" in data["data"]
    
    def test_search_with_limit(self, client):
        """测试带 limit 参数的请求"""
        response = client.get("/api/v1/athletes/search?name=Chen&limit=5")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]["items"]) <= 5
    
    def test_search_name_empty(self, client):
        """测试空 name 参数"""
        response = client.get("/api/v1/athletes/search?name=")
        
        assert response.status_code == 422  # Validation error
    
    def test_search_name_missing(self, client):
        """测试缺少 name 参数"""
        response = client.get("/api/v1/athletes/search")
        
        assert response.status_code == 422  # Validation error
    
    def test_search_no_results(self, client):
        """测试无结果的搜索"""
        response = client.get("/api/v1/athletes/search?name=XYZNOTEXIST12345")
        
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0
        assert data["data"]["total"] == 0
        assert len(data["data"]["items"]) == 0
    
    def test_search_response_item_format(self, client):
        """测试搜索结果项格式"""
        response = client.get("/api/v1/athletes/search?name=Chen&limit=1")
        
        assert response.status_code == 200
        data = response.json()
        
        if data["data"]["items"]:
            item = data["data"]["items"][0]
            # 检查必需字段
            assert "id" in item
            assert "name" in item
            assert "event_id" in item
            assert "event_name" in item
            assert "total_time" in item
            assert "total_time_minutes" in item
            assert "gender" in item
            assert "division" in item
            assert "season" in item
            assert "location" in item


class TestResultsAPI:
    """成绩详情 API 测试"""
    
    def test_results_success(self, client):
        """测试成功的详情请求"""
        # 先搜索获取一个有效的运动员
        search_response = client.get("/api/v1/athletes/search?name=Chen&limit=1")
        search_data = search_response.json()
        
        if search_data["data"]["items"]:
            item = search_data["data"]["items"][0]
            season = item["season"]
            location = item["location"]
            name = item["name"]
            
            # 请求详情
            response = client.get(f"/api/v1/results/{season}/{location}/{name}")
            
            assert response.status_code == 200
            data = response.json()
            assert data["code"] == 0
            assert "athlete" in data["data"]
            assert "race" in data["data"]
            assert "results" in data["data"]
            assert "rankings" in data["data"]
            assert "splits" in data["data"]
    
    def test_results_not_found(self, client):
        """测试不存在的运动员"""
        response = client.get("/api/v1/results/8/hong-kong/NotExist%2C%20Person")
        
        assert response.status_code == 404
    
    def test_results_response_structure(self, client):
        """测试响应结构完整性"""
        # 先搜索获取一个有效的运动员
        search_response = client.get("/api/v1/athletes/search?name=Magill&limit=1")
        search_data = search_response.json()
        
        if search_data["data"]["items"]:
            item = search_data["data"]["items"][0]
            
            response = client.get(
                f"/api/v1/results/{item['season']}/{item['location']}/{item['name']}"
            )
            
            if response.status_code == 200:
                data = response.json()["data"]
                
                # 检查 athlete 结构
                athlete = data["athlete"]
                assert "name" in athlete
                assert "gender" in athlete
                assert "division" in athlete
                
                # 检查 race 结构
                race = data["race"]
                assert "event_id" in race
                assert "event_name" in race
                
                # 检查 results 结构
                results = data["results"]
                assert "total_time" in results
                assert "run_time" in results
                assert "work_time" in results
                
                # 检查 rankings 结构
                rankings = data["rankings"]
                assert "overall_rank" in rankings
                assert "overall_total" in rankings
                assert "gender_rank" in rankings
                
                # 检查 splits 结构
                splits = data["splits"]
                assert "runs" in splits
                assert "workouts" in splits
                assert len(splits["runs"]) == 8
                assert len(splits["workouts"]) == 8


class TestHealthEndpoint:
    """健康检查端点测试"""
    
    def test_health(self, client):
        """测试健康检查"""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"


class TestRootEndpoint:
    """根端点测试"""
    
    def test_root(self, client):
        """测试根端点"""
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "version" in data



