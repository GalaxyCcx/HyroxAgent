"""
Demo: 提升时间计算小 Agent（测试用，不植入主项目）

用与章节 1 相同口径的 mock 数据，调用 qwen3-coder-plus，
让 LLM 输出 Run 5 / Run 8 的「可提升时间」及理由。
约束：跑步段提升不可能超过与 Top 10% 的差距。

运行方式（在 backend 目录）:
  python scripts/demo_improvement_agent.py

环境：
  - API：读取 backend/data/llm_config.json 的 api_key、base_url，
    或环境变量 DASHSCOPE_API_KEY / OPENAI_API_KEY、LLM_BASE_URL
  - 模型：默认 qwen3-coder-plus；若不可用可在 call_llm() 中改为 qwen-max-latest 等

Windows 下若中文乱码，可先执行：chcp 65001 或 set PYTHONIOENCODING=utf-8
"""

import asyncio
import json
import os
import sys
from pathlib import Path

# 允许从 backend 外执行时找到 backend 模块
BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

# Mock：与章节 1 用过的数据同结构的输入（对应你当前跑报告用的数据）
MOCK_CHAPTER1_INPUT = {
    "athlete_result": {
        "total_time": 86.1,  # 1:26:06
        "total_time_seconds": 5166,
        "run1_time": 5.17,
        "run2_time": 4.33,
        "run3_time": 4.75,
        "run4_time": 4.85,
        "run5_time": 5.18,
        "run6_time": 4.88,
        "run7_time": 4.97,
        "run8_time": 6.12,
        "roxzone_time": 8.2,
    },
    "time_loss_analysis": {
        "total_loss_seconds": 169,
        "theoretical_best": "1:23:17",
        "total_loss_display": "-2:49",
        "transition_loss": None,
        "pacing_losses": [
            {"description": "配速损耗（Run 8 vs 前4段平均）", "loss_seconds": 80},
            {"description": "配速损耗（Run 5 vs 前4段平均）", "loss_seconds": 24},
        ],
        "station_losses": [
            {"description": "Sled Push 技术损耗（vs 平均值）", "loss_seconds": 26},
            {"description": "Farmers Carry 技术损耗（vs 平均值）", "loss_seconds": 15},
            {"description": "Sandbag Lunges 技术损耗（vs 平均值）", "loss_seconds": 11},
            {"description": "Burpee Broad Jump 技术损耗（vs 平均值）", "loss_seconds": 7},
            {"description": "Sled Pull 技术损耗（vs 平均值）", "loss_seconds": 6},
        ],
        "canonical_loss_items": [
            {"source": "Run 8 (配速)", "loss_seconds": 80, "loss_display": "-1:20"},
            {"source": "Run 5 (配速)", "loss_seconds": 24, "loss_display": "-0:24"},
            {"source": "Sled Push", "loss_seconds": 26, "loss_display": "-0:26"},
            {"source": "Farmers Carry", "loss_seconds": 15, "loss_display": "-0:15"},
            {"source": "Sandbag Lunges", "loss_seconds": 11, "loss_display": "-0:11"},
            {"source": "Burpee Broad Jump", "loss_seconds": 7, "loss_display": "-0:07"},
            {"source": "Sled Pull", "loss_seconds": 6, "loss_display": "-0:06"},
        ],
    },
    "segment_comparison_running": {
        "table_data": [
            {"segment": "Run 1", "you": "5:10", "top10": "3:43", "diff": "-1:27"},
            {"segment": "Run 2", "you": "4:20", "top10": "3:01", "diff": "-1:19"},
            {"segment": "Run 3", "you": "4:45", "top10": "3:12", "diff": "-1:33"},
            {"segment": "Run 4", "you": "4:51", "top10": "3:12", "diff": "-1:39"},
            {"segment": "Run 5", "you": "5:11", "top10": "4:55", "diff": "-0:16", "highlight": True},
            {"segment": "Run 6", "you": "4:53", "top10": "3:01", "diff": "-1:52"},
            {"segment": "Run 7", "you": "4:58", "top10": "3:09", "diff": "-1:49"},
            {"segment": "Run 8", "you": "6:07", "top10": "5:30", "diff": "-0:37", "highlight": True},
        ],
    },
}

# 将 diff 如 "-0:16" 转为秒，便于 LLM 理解
def diff_to_seconds(diff: str) -> int:
    """e.g. '-0:16' -> 16, '-1:58' -> 118"""
    diff = diff.strip()
    if not diff or diff == "0" or diff == "0:00":
        return 0
    sign = -1 if diff.startswith("-") else 1
    diff = diff.lstrip("-+")
    parts = diff.split(":")
    if len(parts) == 2:
        m, s = int(parts[0]), int(parts[1])
        return sign * (m * 60 + s)
    return 0


def build_prompt(data: dict) -> str:
    run_table = data["segment_comparison_running"]["table_data"]
    pacing = {item["description"]: item["loss_seconds"] for item in data["time_loss_analysis"]["pacing_losses"]}

    run5_row = next((r for r in run_table if r["segment"] == "Run 5"), None)
    run8_row = next((r for r in run_table if r["segment"] == "Run 8"), None)
    # 与 Top 10% 的差距（秒）：取绝对值，表示比 Top 10% 慢了多少
    gap5_sec = abs(diff_to_seconds(run5_row["diff"])) if run5_row else 0
    gap8_sec = abs(diff_to_seconds(run8_row["diff"])) if run8_row else 0

    run5_pacing_sec = 24  # from pacing_losses
    run8_pacing_sec = 80

    return f"""你是一个 HYROX 赛事时间损耗分析助手。请根据下面与「章节 1」一致的数据，只对 **Run 5** 和 **Run 8** 给出「可提升时间」（单位：秒）及理由。

## 约束（必须满足）
- 跑步段的「可提升时间」**不可能超过**该段与 Top 10% 的差距。若选手本来就不在 Top 10% 内，不可能一步就超过 Top 10% 的水平。
- 即：Run 5 的可提升时间 ≤ Run 5 与 Top 10% 的差距（秒）；Run 8 的可提升时间 ≤ Run 8 与 Top 10% 的差距（秒）。

## 输入数据

**1.1 损耗总览（相对前 4 段平均的掉速 / 与组别平均的差距）**
- Run 5 配速损耗：{run5_pacing_sec} 秒（相对前4段平均掉速）
- Run 8 配速损耗：{run8_pacing_sec} 秒（相对前4段平均掉速）

**1.2 与 Top 10% 的对比（本场同组）**
- Run 5：你的用时 {run5_row['you']}，Top 10% 为 {run5_row['top10']}，差距 {run5_row['diff']}（即 {gap5_sec} 秒）
- Run 8：你的用时 {run8_row['you']}，Top 10% 为 {run8_row['top10']}，差距 {run8_row['diff']}（即 {gap8_sec} 秒）

## 要求
请对 Run 5 和 Run 8 分别给出：
1. **recommended_improvement_seconds**：推荐可提升时间（秒），且 Run 5 ≤ {gap5_sec}，Run 8 ≤ {gap8_sec}。
2. **reason**：简短理由（结合 1.1 掉速与 1.2 与 Top 10% 的差距，说明为何取该值）。

请**仅**输出一个 JSON 对象，不要其他解释，格式如下：
```json
{{
  "run5": {{ "recommended_improvement_seconds": <数字>, "reason": "<理由>" }},
  "run8": {{ "recommended_improvement_seconds": <数字>, "reason": "<理由>" }}
}}
```
"""


async def call_llm(prompt: str, model: str = "qwen3-coder-plus") -> str:
    """调用 LLM，使用 backend 的 llm_config 或环境变量。"""
    try:
        from openai import AsyncOpenAI
    except ImportError:
        raise SystemExit("请安装 openai: pip install openai")

    config_path = BACKEND_ROOT / "data" / "llm_config.json"
    api_key = os.environ.get("DASHSCOPE_API_KEY") or os.environ.get("OPENAI_API_KEY")
    base_url = os.environ.get("LLM_BASE_URL")

    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            cfg = json.load(f)
        api_key = api_key or cfg.get("api_key")
        base_url = base_url or cfg.get("base_url", "https://dashscope.aliyuncs.com/compatible-mode/v1")

    if not api_key:
        raise SystemExit("未配置 API Key：请设置 DASHSCOPE_API_KEY 或在 backend/data/llm_config.json 中配置 api_key")

    client = AsyncOpenAI(api_key=api_key, base_url=base_url or None)
    resp = await client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1024,
        temperature=0.3,
    )
    text = resp.choices[0].message.content or ""
    return text.strip()


def parse_result(raw: str) -> dict:
    """从返回中提取 JSON。"""
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()
    return json.loads(raw)


async def main():
    print("=== Demo: 提升时间计算 Agent（qwen3-coder-plus）===\n")
    print("Mock 数据摘要：")
    print("  1.1 配速损耗：Run 5 = 24s，Run 8 = 80s（相对前4段平均）")
    print("  1.2 与 Top 10% 差距：Run 5 = 16s，Run 8 = 37s")
    print("  约束：可提升 ≤ 与 Top 10% 的差距\n")

    prompt = build_prompt(MOCK_CHAPTER1_INPUT)
    print("正在调用 LLM...")
    try:
        out = await call_llm(prompt)
    except Exception as e:
        print(f"LLM 调用失败: {e}")
        return

    print("\n--- LLM 原始输出 ---\n")
    print(out)
    print("\n--- 解析结果 ---\n")

    try:
        result = parse_result(out)
        for seg, v in result.items():
            s = v.get("recommended_improvement_seconds", "?")
            r = v.get("reason", "")
            print(f"{seg}: 推荐可提升 {s} 秒")
            print(f"  理由: {r}")
        print("\n是否合理：Run 5 ≤ 16s，Run 8 ≤ 37s 即满足约束。")
    except json.JSONDecodeError as e:
        print(f"JSON 解析失败: {e}\n原始输出见上。")


if __name__ == "__main__":
    asyncio.run(main())
