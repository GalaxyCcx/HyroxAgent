#!/usr/bin/env python3
"""
API 接口测试脚本

用法:
    python scripts/test_api.py <endpoint> [--params key=value ...]

示例:
    python scripts/test_api.py /api/v1/athletes/search --params name=John season=1
    python scripts/test_api.py /api/v1/results --params season=1 location=NYC
"""
import argparse
import json
import sys
from urllib.parse import urljoin

try:
    import httpx
except ImportError:
    print("请安装 httpx: pip install httpx")
    sys.exit(1)


def parse_params(params_list: list[str]) -> dict:
    """解析 key=value 格式的参数列表"""
    result = {}
    for param in params_list:
        if "=" in param:
            key, value = param.split("=", 1)
            # 尝试转换为数字
            if value.isdigit():
                value = int(value)
            elif value.replace(".", "", 1).isdigit():
                value = float(value)
            result[key] = value
    return result


def test_api(base_url: str, endpoint: str, params: dict) -> None:
    """测试 API 端点"""
    url = urljoin(base_url, endpoint)
    
    print(f"请求: GET {url}")
    print(f"参数: {json.dumps(params, ensure_ascii=False, indent=2)}")
    print("-" * 50)
    
    try:
        with httpx.Client(timeout=30) as client:
            response = client.get(url, params=params)
            
            print(f"状态码: {response.status_code}")
            print(f"响应头: Content-Type={response.headers.get('content-type')}")
            print("-" * 50)
            
            try:
                data = response.json()
                print("响应内容:")
                print(json.dumps(data, ensure_ascii=False, indent=2))
                
                # 验证响应格式
                if isinstance(data, dict):
                    if "code" in data:
                        code = data.get("code")
                        if code == 0:
                            print("\n✅ 接口响应成功 (code=0)")
                        else:
                            print(f"\n⚠️ 接口返回错误 (code={code}): {data.get('message')}")
                    else:
                        print("\n⚠️ 响应缺少 code 字段")
                        
            except json.JSONDecodeError:
                print("响应内容 (非 JSON):")
                print(response.text[:1000])
                
    except httpx.RequestError as e:
        print(f"❌ 请求失败: {e}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="API 接口测试工具")
    parser.add_argument("endpoint", help="API 端点路径 (如 /api/v1/athletes/search)")
    parser.add_argument("--base-url", default="http://localhost:8000", help="API 基础 URL")
    parser.add_argument("--params", nargs="*", default=[], help="查询参数 (key=value 格式)")
    
    args = parser.parse_args()
    params = parse_params(args.params)
    
    test_api(args.base_url, args.endpoint, params)


if __name__ == "__main__":
    main()
