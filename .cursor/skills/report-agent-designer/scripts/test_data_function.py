#!/usr/bin/env python3
"""
数据函数测试脚本

用法：
    python scripts/test_data_function.py --function GetAthleteResult --params '{"season":2024,"location":"Shanghai","athlete_name":"张三"}'
    python scripts/test_data_function.py --list
"""

import argparse
import asyncio
import json
import sys
import os
from datetime import datetime

# 添加项目根目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))

from backend.app.services.report.data_executor import DataExecutor
from backend.app.services.report.data_functions import ALL_FUNCTIONS


def list_functions():
    """列出所有可用的数据函数"""
    print("\n可用数据函数:")
    print("=" * 60)
    
    for func in ALL_FUNCTIONS:
        func_def = func.get("function", {})
        name = func_def.get("name", "Unknown")
        desc = func_def.get("description", "无描述")
        params = func_def.get("parameters", {}).get("properties", {})
        required = func_def.get("parameters", {}).get("required", [])
        
        print(f"\n📌 {name}")
        print(f"   描述: {desc}")
        print(f"   参数:")
        for param_name, param_info in params.items():
            req_mark = "*" if param_name in required else " "
            print(f"     {req_mark} {param_name}: {param_info.get('type', 'any')} - {param_info.get('description', '')}")
    
    print("\n" + "=" * 60)
    print("* 表示必需参数")


async def test_function(function_name: str, params: dict, verbose: bool = False):
    """测试单个数据函数"""
    print(f"\n{'='*60}")
    print(f"测试函数: {function_name}")
    print(f"{'='*60}")
    print(f"参数: {json.dumps(params, ensure_ascii=False)}")
    
    executor = DataExecutor()
    
    start_time = datetime.now()
    
    try:
        print(f"\n执行中...")
        result = await executor.execute(function_name, params)
        
        elapsed = (datetime.now() - start_time).total_seconds()
        
        print(f"\n✅ 执行成功! (耗时: {elapsed:.2f}s)")
        print(f"\n{'='*60}")
        print("返回结果:")
        print(f"{'='*60}")
        
        if verbose:
            print(json.dumps(result, ensure_ascii=False, indent=2))
        else:
            # 简化输出
            if isinstance(result, dict):
                print(f"\n返回类型: dict")
                print(f"字段: {list(result.keys())}")
                
                # 显示部分内容
                for key, value in result.items():
                    if isinstance(value, (str, int, float)):
                        print(f"  {key}: {value}")
                    elif isinstance(value, list):
                        print(f"  {key}: [{len(value)} items]")
                    elif isinstance(value, dict):
                        print(f"  {key}: {{...}} ({len(value)} keys)")
            else:
                print(result)
        
        # 保存完整结果
        output_file = f"test_function_{function_name}_output.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"\n💾 完整结果已保存到: {output_file}")
        
        return result
        
    except Exception as e:
        elapsed = (datetime.now() - start_time).total_seconds()
        print(f"\n❌ 执行失败! (耗时: {elapsed:.2f}s)")
        print(f"错误: {e}")
        import traceback
        traceback.print_exc()
        return None


async def test_all_functions(athlete_name: str, season: int, location: str):
    """测试所有数据函数"""
    print(f"\n{'='*60}")
    print("批量测试所有数据函数")
    print(f"{'='*60}")
    
    # 基础参数
    base_params = {
        "athlete_name": athlete_name,
        "season": season,
        "location": location,
    }
    
    # 各函数的特定参数
    function_params = {
        "GetAthleteResult": base_params,
        "GetDivisionStats": {**base_params, "division": "MEN PRO"},
        "GetDivisionRanking": {**base_params, "division": "MEN PRO", "limit": 10},
        "GetSegmentComparison": base_params,
        "GetAthleteHistory": {"athlete_name": athlete_name, "limit": 5},
        "GetPacingAnalysis": base_params,
        "GetStationDeepAnalysis": base_params,
    }
    
    results = {}
    
    for func in ALL_FUNCTIONS:
        func_name = func.get("function", {}).get("name")
        if func_name in function_params:
            print(f"\n--- 测试 {func_name} ---")
            try:
                result = await test_function(func_name, function_params[func_name])
                results[func_name] = {"status": "success", "result": result}
            except Exception as e:
                results[func_name] = {"status": "error", "error": str(e)}
    
    # 汇总
    print(f"\n{'='*60}")
    print("测试汇总")
    print(f"{'='*60}")
    
    success_count = sum(1 for r in results.values() if r["status"] == "success")
    print(f"\n成功: {success_count}/{len(results)}")
    
    for func_name, result in results.items():
        status = "✅" if result["status"] == "success" else "❌"
        print(f"  {status} {func_name}")


def main():
    parser = argparse.ArgumentParser(description="测试数据函数")
    parser.add_argument("--function", "-f", help="函数名称")
    parser.add_argument("--params", "-p", help="函数参数 (JSON 格式)")
    parser.add_argument("--list", action="store_true", help="列出所有函数")
    parser.add_argument("--all", action="store_true", help="测试所有函数")
    parser.add_argument("--athlete", "-a", default="测试运动员", help="运动员姓名")
    parser.add_argument("--season", type=int, default=2024, help="赛季")
    parser.add_argument("--location", "-l", default="Shanghai", help="比赛地点")
    parser.add_argument("--verbose", "-v", action="store_true", help="详细输出")
    
    args = parser.parse_args()
    
    if args.list:
        list_functions()
        return
    
    if args.all:
        asyncio.run(test_all_functions(args.athlete, args.season, args.location))
        return
    
    if not args.function:
        print("请指定函数名称，使用 --list 查看可用函数")
        return
    
    params = json.loads(args.params) if args.params else {}
    asyncio.run(test_function(args.function, params, args.verbose))


if __name__ == "__main__":
    main()
