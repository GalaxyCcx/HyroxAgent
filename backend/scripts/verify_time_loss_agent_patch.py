"""
验证 time_loss 章节的 Agent 结果后处理逻辑。

不依赖 LLM/DB，用 mock 的 section_output 与 improvement_agent_result
调用 _patch_time_loss_agent_result，检查 loss_overview.items 与
segment_comparison.running.conclusion_blocks 的 improvement_display/improvement_logic
是否被正确覆盖。

运行（在 backend 目录）:
  python scripts/verify_time_loss_agent_patch.py
"""

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def _mock_section_output():
    """模拟 LLM 输出的 arguments（未填或填错的 improvement_display/improvement_logic）。"""
    from app.services.report.core.section_generator import SectionOutput

    args = {
        "value_proposition": "同样的体能付出，通过战术执行修正，你本场比赛的理论上限是 1:21:06",
        "intro_text": "",
        "loss_overview": {
            "total_loss_seconds": 169,
            "total_loss_display": "-2:49",
            "items": [
                {"source": "Run 8 (配速)", "source_desc": "配速策略失误", "loss_seconds": 80, "loss_display": "-1:20", "difficulty": "⭐⭐⭐", "difficulty_level": 3},
                {"source": "Run 5 (配速)", "source_desc": "配速波动过大", "loss_seconds": 24, "loss_display": "-0:24", "difficulty": "⭐⭐", "difficulty_level": 2},
                {"source": "Sled Push", "source_desc": "技术损耗", "loss_seconds": 26, "loss_display": "-0:26", "difficulty": "⭐", "difficulty_level": 1},
            ],
        },
        "segment_comparison": {
            "running": {
                "chart_data": [],
                "table_data": [
                    {"segment": "Run 5", "you": "5:11", "top10": "4:56", "diff": "-0:15", "highlight": True},
                    {"segment": "Run 8", "you": "6:07", "top10": "5:32", "diff": "-0:35", "highlight": True},
                ],
                "conclusion_blocks": [
                    {"segment": "Run 5", "gap_vs_top10": "你的用时 5:11，Top 10% 为 4:56，差距 -0:15。", "pacing_issue": "相对前4段明显掉速。", "improvement_display": "约15秒", "improvement_logic": "以本场同组 Top 10% 该段平均用时为参照..."},
                    {"segment": "Run 8", "gap_vs_top10": "你的用时 6:07，Top 10% 为 5:32，差距 -0:35。", "pacing_issue": "相对前7段显著掉速。", "improvement_display": "约35秒", "improvement_logic": "以本场同组 Top 10% 该段平均用时为参照..."},
                ],
            },
            "workout": {},
            "roxzone": {},
        },
        "deep_analysis": {"categories": []},
    }
    out = SectionOutput(section_id="time_loss", title="时间损耗", success=True, arguments=args)
    return out


def _mock_agent_result():
    """模拟提升空间 Agent 返回（跑步段 ≤ Top 10% 差距）。"""
    return {
        "running": [
            {"segment": "Run 8", "recommended_improvement_seconds": 32, "reason": "后半程糖原与神经疲劳导致掉速，可争取空间以 Top 10% 为上限。"},
            {"segment": "Run 5", "recommended_improvement_seconds": 12, "reason": "中段节奏略慢，有明确提升空间。"},
        ],
        "workout": [
            {"segment": "Sled Push", "recommended_improvement_seconds": 20, "reason": "与组别参考的损耗，可作为可争取空间。"},
        ],
        "roxzone": None,
    }


def main():
    from app.services.report.report_generator import _patch_time_loss_agent_result

    section_output = _mock_section_output()
    agent_result = _mock_agent_result()

    # 覆盖前
    items_before = [item.get("improvement_display") for item in section_output.arguments["loss_overview"]["items"]]
    blocks_before = [(b.get("improvement_display"), b.get("improvement_logic")) for b in section_output.arguments["segment_comparison"]["running"]["conclusion_blocks"]]

    _patch_time_loss_agent_result(section_output, agent_result)

    # 覆盖后
    items = section_output.arguments["loss_overview"]["items"]
    blocks = section_output.arguments["segment_comparison"]["running"]["conclusion_blocks"]

    # 1.1 loss_overview.items：Run 8 / Run 5 / Sled Push 应有 improvement_display（来自 Agent）
    run8_item = next((x for x in items if "Run 8" in x.get("source", "")), None)
    run5_item = next((x for x in items if "Run 5" in x.get("source", "")), None)
    sled_item = next((x for x in items if x.get("source") == "Sled Push"), None)

    assert run8_item and run8_item.get("improvement_display") == "约 32 秒", f"Run 8 improvement_display 应为「约 32 秒」，实际: {run8_item}"
    assert run5_item and run5_item.get("improvement_display") == "约 12 秒", f"Run 5 improvement_display 应为「约 12 秒」，实际: {run5_item}"
    assert sled_item and sled_item.get("improvement_display") == "约 20 秒", f"Sled Push improvement_display 应为「约 20 秒」，实际: {sled_item}"

    # 1.2 conclusion_blocks：Run 5 / Run 8 应有 improvement_display 与 improvement_logic（来自 Agent）
    run5_block = next((b for b in blocks if b.get("segment") == "Run 5"), None)
    run8_block = next((b for b in blocks if b.get("segment") == "Run 8"), None)
    assert run5_block and run5_block.get("improvement_display") == "约 12 秒", f"Run 5 block improvement_display 应为「约 12 秒」，实际: {run5_block}"
    assert run5_block and "中段节奏" in (run5_block.get("improvement_logic") or ""), f"Run 5 block improvement_logic 应含 Agent reason，实际: {run5_block}"
    assert run8_block and run8_block.get("improvement_display") == "约 32 秒", f"Run 8 block improvement_display 应为「约 32 秒」，实际: {run8_block}"
    assert run8_block and "糖原" in (run8_block.get("improvement_logic") or ""), f"Run 8 block improvement_logic 应含 Agent reason，实际: {run8_block}"

    print("OK: _patch_time_loss_agent_result 验证通过。")
    print("  - 1.1 loss_overview.items: Run 8/Run 5/Sled Push 的 improvement_display 已由 Agent 结果覆盖。")
    print("  - 1.2 conclusion_blocks: Run 5/Run 8 的 improvement_display 与 improvement_logic 已由 Agent 结果覆盖。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
