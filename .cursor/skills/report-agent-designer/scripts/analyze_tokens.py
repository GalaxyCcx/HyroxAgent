#!/usr/bin/env python3
"""
Token 使用分析脚本

用法：
    python scripts/analyze_tokens.py --agent research
    python scripts/analyze_tokens.py --report <report_id>
    python scripts/analyze_tokens.py --estimate --text "你的文本"
"""

import argparse
import json
import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))


def estimate_tokens(text: str) -> dict:
    """估算 token 数量"""
    # 统计字符类型
    chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
    english_words = len([w for w in text.split() if w.isalpha()])
    numbers = sum(1 for c in text if c.isdigit())
    punctuation = sum(1 for c in text if not c.isalnum() and not c.isspace())
    whitespace = sum(1 for c in text if c.isspace())
    
    # 估算 tokens
    # 中文: 约 1.5-2 字符/token
    # 英文: 约 4 字符/token 或 0.75 词/token
    # 数字: 约 2-3 字符/token
    chinese_tokens = int(chinese_chars / 1.5)
    english_tokens = int(english_words * 1.3)
    number_tokens = int(numbers / 2.5)
    punct_tokens = int(punctuation / 2)
    
    total_tokens = chinese_tokens + english_tokens + number_tokens + punct_tokens
    
    return {
        "total_chars": len(text),
        "chinese_chars": chinese_chars,
        "english_words": english_words,
        "numbers": numbers,
        "punctuation": punctuation,
        "estimated_tokens": total_tokens,
        "breakdown": {
            "chinese_tokens": chinese_tokens,
            "english_tokens": english_tokens,
            "number_tokens": number_tokens,
            "punctuation_tokens": punct_tokens
        }
    }


def analyze_agent_costs(agent_name: str):
    """分析 Agent 的 token 成本"""
    print(f"\n{'='*60}")
    print(f"Agent Token 成本分析: {agent_name}")
    print(f"{'='*60}")
    
    # 加载 Agent 配置
    try:
        from backend.app.llm.config import LLMConfigManager
        config = LLMConfigManager().get_agent_config(agent_name)
        
        print(f"\n📊 配置信息:")
        print(f"   模型: {config.get('model', 'N/A')}")
        print(f"   最大 tokens: {config.get('max_tokens', 'N/A')}")
        print(f"   Temperature: {config.get('temperature', 'N/A')}")
    except Exception as e:
        print(f"⚠️ 无法加载配置: {e}")
    
    # 获取提示词
    prompts = get_agent_prompts(agent_name)
    
    print(f"\n📄 提示词 Token 估算:")
    total_prompt_tokens = 0
    
    for name, prompt in prompts.items():
        if isinstance(prompt, str):
            estimate = estimate_tokens(prompt)
            total_prompt_tokens += estimate["estimated_tokens"]
            print(f"   {name}: ~{estimate['estimated_tokens']} tokens")
    
    print(f"\n   总计: ~{total_prompt_tokens} tokens (系统提示词)")
    
    # 估算单次调用成本
    # 假设平均每次调用：输入 2000 tokens，输出 1000 tokens
    avg_input = total_prompt_tokens + 1000  # 系统提示词 + 用户消息
    avg_output = 800
    
    # Qwen 定价 (示例，需要根据实际更新)
    input_price = 0.004  # 元/1K tokens
    output_price = 0.012  # 元/1K tokens
    
    single_cost = (avg_input / 1000 * input_price) + (avg_output / 1000 * output_price)
    
    print(f"\n💰 成本估算 (基于 qwen-max):")
    print(f"   平均输入: ~{avg_input} tokens")
    print(f"   平均输出: ~{avg_output} tokens")
    print(f"   单次调用: ~¥{single_cost:.4f}")


def get_agent_prompts(agent_name: str) -> dict:
    """获取 Agent 提示词"""
    prompts = {}
    
    try:
        if agent_name == "research":
            from backend.app.services.report.researcher_agent import ResearcherAgent
            prompts["system_prompt"] = getattr(ResearcherAgent, 'SYSTEM_PROMPT', '')
        elif agent_name == "chart":
            from backend.app.services.report.chart_agent import ChartAgent
            prompts["system_prompt"] = getattr(ChartAgent, 'SYSTEM_PROMPT', '')
        elif agent_name == "summary":
            from backend.app.services.report.summary_agent import SummaryAgent
            prompts["intro_prompt"] = getattr(SummaryAgent, 'INTRO_PROMPT', '')
            prompts["conclusion_prompt"] = getattr(SummaryAgent, 'CONCLUSION_PROMPT', '')
        elif agent_name == "center":
            from backend.app.services.report.center_agent import CenterAgent
            prompts["system_prompt"] = getattr(CenterAgent, 'SYSTEM_PROMPT', '')
    except Exception as e:
        print(f"⚠️ 加载提示词失败: {e}")
    
    return prompts


def estimate_report_cost():
    """估算生成一份完整报告的成本"""
    print(f"\n{'='*60}")
    print("完整报告生成成本估算")
    print(f"{'='*60}")
    
    # 各 Agent 调用次数估算
    calls = {
        "research": 5,      # 5 个章节
        "chart": 5,         # 每章节可能 1 个图表
        "summary": 2,       # 引言 + 结论
    }
    
    # 各 Agent 平均 token 使用
    avg_tokens = {
        "research": {"input": 3000, "output": 1500},
        "chart": {"input": 1500, "output": 800},
        "summary": {"input": 4000, "output": 500},
    }
    
    # 定价
    input_price = 0.004   # 元/1K tokens
    output_price = 0.012  # 元/1K tokens
    
    total_input = 0
    total_output = 0
    total_cost = 0
    
    print(f"\n📊 调用明细:")
    
    for agent, count in calls.items():
        tokens = avg_tokens[agent]
        agent_input = tokens["input"] * count
        agent_output = tokens["output"] * count
        agent_cost = (agent_input / 1000 * input_price) + (agent_output / 1000 * output_price)
        
        total_input += agent_input
        total_output += agent_output
        total_cost += agent_cost
        
        print(f"   {agent}: {count} 次调用")
        print(f"      输入: {agent_input} tokens")
        print(f"      输出: {agent_output} tokens")
        print(f"      成本: ¥{agent_cost:.4f}")
    
    print(f"\n💰 总计:")
    print(f"   总输入 tokens: {total_input}")
    print(f"   总输出 tokens: {total_output}")
    print(f"   总成本: ¥{total_cost:.4f}")
    print(f"\n📈 规模估算:")
    print(f"   100 份报告: ~¥{total_cost * 100:.2f}")
    print(f"   1000 份报告: ~¥{total_cost * 1000:.2f}")


def main():
    parser = argparse.ArgumentParser(description="Token 使用分析")
    parser.add_argument("--agent", "-a", 
                       choices=["research", "chart", "summary", "center"],
                       help="分析指定 Agent")
    parser.add_argument("--estimate", "-e", action="store_true", 
                       help="估算文本 token 数")
    parser.add_argument("--text", "-t", help="要估算的文本")
    parser.add_argument("--file", "-f", help="要估算的文件")
    parser.add_argument("--report-cost", action="store_true", 
                       help="估算完整报告成本")
    
    args = parser.parse_args()
    
    if args.agent:
        analyze_agent_costs(args.agent)
    
    elif args.estimate:
        if args.file:
            with open(args.file, "r", encoding="utf-8") as f:
                text = f.read()
        elif args.text:
            text = args.text
        else:
            print("请提供 --text 或 --file")
            return
        
        result = estimate_tokens(text)
        print(f"\n{'='*60}")
        print("Token 估算结果")
        print(f"{'='*60}")
        print(json.dumps(result, ensure_ascii=False, indent=2))
    
    elif args.report_cost:
        estimate_report_cost()
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
