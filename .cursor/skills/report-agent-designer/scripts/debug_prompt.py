#!/usr/bin/env python3
"""
提示词调试脚本

用法：
    python scripts/debug_prompt.py --agent research
    python scripts/debug_prompt.py --agent chart --show-tools
"""

import argparse
import json
import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))


def get_agent_prompt(agent_name: str) -> dict:
    """获取指定 Agent 的提示词配置"""
    
    prompts = {}
    
    # ResearcherAgent
    if agent_name == "research":
        from backend.app.services.report.researcher_agent import ResearcherAgent
        # 尝试获取系统提示词
        prompts["system_prompt"] = getattr(ResearcherAgent, 'SYSTEM_PROMPT', '未找到')
        prompts["tools"] = getattr(ResearcherAgent, 'TOOLS', [])
    
    # ChartAgent
    elif agent_name == "chart":
        from backend.app.services.report.chart_agent import ChartAgent
        prompts["system_prompt"] = getattr(ChartAgent, 'SYSTEM_PROMPT', '未找到')
    
    # SummaryAgent
    elif agent_name == "summary":
        from backend.app.services.report.summary_agent import SummaryAgent
        prompts["intro_prompt"] = getattr(SummaryAgent, 'INTRO_PROMPT', '未找到')
        prompts["conclusion_prompt"] = getattr(SummaryAgent, 'CONCLUSION_PROMPT', '未找到')
    
    # CenterAgent
    elif agent_name == "center":
        from backend.app.services.report.center_agent import CenterAgent
        prompts["system_prompt"] = getattr(CenterAgent, 'SYSTEM_PROMPT', '未找到')
    
    else:
        raise ValueError(f"未知的 Agent: {agent_name}")
    
    return prompts


def count_tokens_estimate(text: str) -> int:
    """估算 token 数量 (粗略估计: 中文约 1.5 字符/token)"""
    # 简单估算：英文约 4 字符/token，中文约 1.5 字符/token
    chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
    other_chars = len(text) - chinese_chars
    return int(chinese_chars / 1.5 + other_chars / 4)


def analyze_prompt(prompt: str, name: str):
    """分析提示词"""
    print(f"\n{'='*60}")
    print(f"提示词: {name}")
    print(f"{'='*60}")
    
    # 基础统计
    lines = prompt.strip().split('\n')
    print(f"\n📊 统计:")
    print(f"   字符数: {len(prompt)}")
    print(f"   行数: {len(lines)}")
    print(f"   估计 tokens: ~{count_tokens_estimate(prompt)}")
    
    # 结构分析
    print(f"\n📋 结构:")
    sections = []
    current_section = None
    
    for line in lines:
        if line.startswith('# '):
            current_section = line[2:].strip()
            sections.append({"name": current_section, "lines": 0})
        elif current_section and sections:
            sections[-1]["lines"] += 1
    
    for section in sections:
        print(f"   - {section['name']} ({section['lines']} 行)")
    
    # 内容预览
    print(f"\n📄 内容预览 (前 500 字符):")
    print("-" * 40)
    print(prompt[:500])
    if len(prompt) > 500:
        print("...")
    print("-" * 40)


def main():
    parser = argparse.ArgumentParser(description="调试 Agent 提示词")
    parser.add_argument("--agent", "-a", required=True, 
                       choices=["research", "chart", "summary", "center"],
                       help="Agent 名称")
    parser.add_argument("--show-tools", action="store_true", help="显示工具定义")
    parser.add_argument("--full", action="store_true", help="显示完整提示词")
    parser.add_argument("--export", "-e", help="导出到文件")
    
    args = parser.parse_args()
    
    try:
        prompts = get_agent_prompt(args.agent)
        
        # 分析各个提示词
        for name, content in prompts.items():
            if name == "tools":
                if args.show_tools:
                    print(f"\n{'='*60}")
                    print("工具定义:")
                    print(f"{'='*60}")
                    print(json.dumps(content, ensure_ascii=False, indent=2))
                continue
            
            if isinstance(content, str):
                if args.full:
                    print(f"\n{'='*60}")
                    print(f"完整提示词: {name}")
                    print(f"{'='*60}")
                    print(content)
                else:
                    analyze_prompt(content, name)
        
        # 导出
        if args.export:
            with open(args.export, "w", encoding="utf-8") as f:
                json.dump(prompts, f, ensure_ascii=False, indent=2)
            print(f"\n💾 已导出到: {args.export}")
            
    except Exception as e:
        print(f"❌ 错误: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
