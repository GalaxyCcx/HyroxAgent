#!/usr/bin/env python3
"""
章节生成测试脚本

用法：
    python scripts/test_section.py --section overview
    python scripts/test_section.py --section running --athlete "张三" --season 2024 --location Shanghai
"""

import argparse
import asyncio
import json
import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))

from backend.app.services.report.researcher_agent import ResearcherAgent
from backend.app.services.report.section_definitions import SECTION_DEFINITIONS
from backend.app.services.report.data_executor import DataExecutor
from backend.app.llm.client import LLMClient


def get_section_definition(section_id: str) -> dict:
    """获取章节定义"""
    for section in SECTION_DEFINITIONS:
        if section["id"] == section_id:
            return section
    raise ValueError(f"未找到章节定义: {section_id}")


async def test_section(
    section_id: str,
    athlete_name: str = "测试运动员",
    season: int = 2024,
    location: str = "Shanghai"
):
    """测试单个章节生成"""
    print(f"\n{'='*60}")
    print(f"测试章节: {section_id}")
    print(f"{'='*60}")
    
    # 获取章节定义
    section_def = get_section_definition(section_id)
    print(f"\n章节标题: {section_def['title']}")
    print(f"章节目标: {section_def['objective'][:100]}...")
    
    # 构建上下文
    context = {
        "athlete_name": athlete_name,
        "season": season,
        "location": location,
        "division": "MEN PRO",  # 默认值
    }
    
    # 初始化组件
    llm_client = LLMClient(agent_type="research")
    data_executor = DataExecutor()
    researcher = ResearcherAgent(llm_client, data_executor)
    
    print(f"\n开始生成章节...")
    print("-" * 40)
    
    try:
        # 执行章节分析
        result = await researcher.analyze(section_def, context)
        
        print(f"\n✅ 章节生成成功!")
        print(f"\n{'='*60}")
        print("生成结果:")
        print(f"{'='*60}")
        
        # 输出发现
        discoveries = result.get("discoveries", [])
        print(f"\n📊 发现 ({len(discoveries)} 条):")
        for i, discovery in enumerate(discoveries, 1):
            print(f"\n  {i}. {discovery.get('finding', '')}")
            if discovery.get('evidence'):
                print(f"     证据: {discovery['evidence']}")
            if discovery.get('insight'):
                print(f"     洞察: {discovery['insight']}")
        
        # 输出结论
        conclusion = result.get("conclusion", "")
        print(f"\n📝 结论:")
        print(f"  {conclusion[:500]}{'...' if len(conclusion) > 500 else ''}")
        
        # 输出图表需求
        chart_req = result.get("chart_requirements")
        if chart_req:
            print(f"\n📈 图表需求:")
            print(f"  类型: {chart_req.get('chart_type', 'N/A')}")
            print(f"  标题: {chart_req.get('title', 'N/A')}")
        else:
            print(f"\n⚠️ 未生成图表需求")
        
        # 保存完整结果
        output_file = f"test_section_{section_id}_output.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"\n💾 完整结果已保存到: {output_file}")
        
        return result
        
    except Exception as e:
        print(f"\n❌ 章节生成失败: {e}")
        import traceback
        traceback.print_exc()
        return None


def list_sections():
    """列出所有可用章节"""
    print("\n可用章节:")
    print("-" * 40)
    for section in SECTION_DEFINITIONS:
        print(f"  - {section['id']}: {section['title']}")


def main():
    parser = argparse.ArgumentParser(description="测试章节生成")
    parser.add_argument("--section", "-s", help="章节 ID")
    parser.add_argument("--athlete", "-a", default="测试运动员", help="运动员姓名")
    parser.add_argument("--season", type=int, default=2024, help="赛季")
    parser.add_argument("--location", "-l", default="Shanghai", help="比赛地点")
    parser.add_argument("--list", action="store_true", help="列出所有章节")
    
    args = parser.parse_args()
    
    if args.list:
        list_sections()
        return
    
    if not args.section:
        print("请指定章节 ID，使用 --list 查看可用章节")
        return
    
    asyncio.run(test_section(
        section_id=args.section,
        athlete_name=args.athlete,
        season=args.season,
        location=args.location
    ))


if __name__ == "__main__":
    main()
