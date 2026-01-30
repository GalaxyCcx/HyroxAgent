#!/usr/bin/env python3
"""
报告生成端到端测试脚本

用法：
    python scripts/test_report_e2e.py --athlete "张三" --season 2024 --location Shanghai
    python scripts/test_report_e2e.py --quick  # 快速测试模式
"""

import argparse
import asyncio
import json
import sys
import os
from datetime import datetime
import uuid

# 添加项目根目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))

from backend.app.services.report.report_generator import ReportGenerator


async def test_report_generation(
    athlete_name: str,
    season: int,
    location: str,
    quick_mode: bool = False
):
    """测试完整报告生成流程"""
    print(f"\n{'='*60}")
    print("报告生成端到端测试")
    print(f"{'='*60}")
    print(f"\n参数:")
    print(f"   运动员: {athlete_name}")
    print(f"   赛季: {season}")
    print(f"   地点: {location}")
    print(f"   快速模式: {quick_mode}")
    
    # 生成测试报告 ID
    report_id = str(uuid.uuid4())
    print(f"\n报告 ID: {report_id}")
    
    # 初始化生成器
    generator = ReportGenerator()
    
    # 构建参数
    params = {
        "report_id": report_id,
        "athlete_name": athlete_name,
        "season": season,
        "location": location,
    }
    
    print(f"\n{'='*60}")
    print("开始生成")
    print(f"{'='*60}")
    
    start_time = datetime.now()
    progress_log = []
    sections_generated = []
    errors = []
    
    try:
        async for event in generator.generate(**params):
            event_type = event.get("event", "unknown")
            event_data = event.get("data", {})
            
            elapsed = (datetime.now() - start_time).total_seconds()
            
            if event_type == "progress":
                progress = event_data.get("progress", 0)
                step = event_data.get("current_step", "")
                print(f"   [{elapsed:.1f}s] 进度: {progress}% - {step}")
                progress_log.append({
                    "time": elapsed,
                    "progress": progress,
                    "step": step
                })
            
            elif event_type == "section_complete":
                section = event_data.get("section", {})
                section_id = section.get("id", "unknown")
                print(f"   [{elapsed:.1f}s] ✅ 章节完成: {section_id}")
                sections_generated.append(section)
            
            elif event_type == "error":
                error_msg = event_data.get("message", "未知错误")
                print(f"   [{elapsed:.1f}s] ❌ 错误: {error_msg}")
                errors.append(error_msg)
            
            elif event_type == "complete":
                print(f"   [{elapsed:.1f}s] 🎉 生成完成!")
            
            # 快速模式下只测试第一个章节
            if quick_mode and len(sections_generated) >= 1:
                print(f"\n   [快速模式] 跳过剩余章节")
                break
        
        total_time = (datetime.now() - start_time).total_seconds()
        
        # 输出报告
        print(f"\n{'='*60}")
        print("测试结果")
        print(f"{'='*60}")
        
        print(f"\n⏱️ 总耗时: {total_time:.1f}s")
        print(f"📊 进度记录: {len(progress_log)} 条")
        print(f"📄 生成章节: {len(sections_generated)} 个")
        print(f"❌ 错误: {len(errors)} 个")
        
        if sections_generated:
            print(f"\n章节详情:")
            for section in sections_generated:
                print(f"   - {section.get('id', 'N/A')}: {section.get('title', 'N/A')}")
                content_len = len(section.get('content', ''))
                charts_count = len(section.get('charts', []))
                print(f"     内容长度: {content_len} 字符, 图表: {charts_count} 个")
        
        if errors:
            print(f"\n错误详情:")
            for error in errors:
                print(f"   - {error}")
        
        # 保存完整结果
        result = {
            "report_id": report_id,
            "params": params,
            "total_time_seconds": total_time,
            "progress_log": progress_log,
            "sections": sections_generated,
            "errors": errors
        }
        
        output_file = f"test_report_{report_id[:8]}_result.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2, default=str)
        print(f"\n💾 完整结果已保存到: {output_file}")
        
        # 成功/失败判断
        success = len(errors) == 0 and len(sections_generated) > 0
        print(f"\n{'='*60}")
        if success:
            print("✅ 测试通过!")
        else:
            print("❌ 测试失败!")
        print(f"{'='*60}")
        
        return success
        
    except Exception as e:
        print(f"\n❌ 测试异常: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_multiple_reports(count: int = 3):
    """并发测试多份报告生成"""
    print(f"\n{'='*60}")
    print(f"并发测试: {count} 份报告")
    print(f"{'='*60}")
    
    # 测试数据
    test_cases = [
        {"athlete_name": "测试运动员A", "season": 2024, "location": "Shanghai"},
        {"athlete_name": "测试运动员B", "season": 2024, "location": "Beijing"},
        {"athlete_name": "测试运动员C", "season": 2023, "location": "Shanghai"},
    ][:count]
    
    tasks = []
    for case in test_cases:
        task = asyncio.create_task(
            test_report_generation(quick_mode=True, **case)
        )
        tasks.append(task)
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    print(f"\n{'='*60}")
    print("并发测试结果")
    print(f"{'='*60}")
    
    success_count = sum(1 for r in results if r is True)
    print(f"\n成功: {success_count}/{len(results)}")


def main():
    parser = argparse.ArgumentParser(description="报告生成端到端测试")
    parser.add_argument("--athlete", "-a", default="测试运动员", help="运动员姓名")
    parser.add_argument("--season", type=int, default=2024, help="赛季")
    parser.add_argument("--location", "-l", default="Shanghai", help="比赛地点")
    parser.add_argument("--quick", "-q", action="store_true", help="快速模式（只测试一个章节）")
    parser.add_argument("--concurrent", "-c", type=int, help="并发测试数量")
    
    args = parser.parse_args()
    
    if args.concurrent:
        asyncio.run(test_multiple_reports(args.concurrent))
    else:
        asyncio.run(test_report_generation(
            athlete_name=args.athlete,
            season=args.season,
            location=args.location,
            quick_mode=args.quick
        ))


if __name__ == "__main__":
    main()
