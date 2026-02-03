"""
提升空间 Agent - 基于 1.1 损耗与 1.2 对比数据，由 LLM 输出各区域可提升时间及理由。

约束：跑步段可提升 ≤ 与 Top 10% 的差距；功能站/转换区可提升 ≤ 与参考的损耗。
用于 1.1 区域提升展示 与 1.2 running/workout/roxzone 三块分析内容。
"""

import json
import logging
import re
from typing import Dict, Any, List, Optional

from .data_provider import ReportData

logger = logging.getLogger(__name__)

# 跑步段字段名 -> 展示名
RUN_FIELD_TO_NAME = {f"run{i}_time": f"Run {i}" for i in range(1, 9)}
# 功能站字段名 -> 展示名（与 data_registry _build_canonical_loss_items 一致）
STATION_FIELD_TO_NAME = {
    "skierg_time": "SkiErg",
    "sled_push_time": "Sled Push",
    "sled_pull_time": "Sled Pull",
    "burpee_broad_jump_time": "Burpee Broad Jump",
    "row_erg_time": "Row Erg",
    "farmers_carry_time": "Farmers Carry",
    "sandbag_lunges_time": "Sandbag Lunges",
    "wall_balls_time": "Wall Balls",
}


def _extract_run_number_from_description(desc: str) -> Optional[int]:
    m = re.search(r"Run\s*(\d+)", desc or "")
    return int(m.group(1)) if m else None


def _format_loss_display(seconds: float) -> str:
    s = int(round(seconds))
    if s <= 0:
        return "0:00"
    m, sec = divmod(s, 60)
    h, m = divmod(m, 60)
    if h > 0:
        return f"{h}:{m:02d}:{sec:02d}"
    return f"{m}:{sec:02d}"


def format_improvement_display(seconds: float) -> str:
    """将推荐可提升秒数格式化为「约 X 秒」或「约 X 分 X 秒」，供 1.1/1.2 展示。"""
    s = int(round(seconds))
    if s <= 0:
        return "约 0 秒"
    if s < 60:
        return f"约 {s} 秒"
    m, sec = divmod(s, 60)
    if sec == 0:
        return f"约 {m} 分" if m > 0 else "约 0 秒"
    return f"约 {m} 分 {sec} 秒"


def _build_agent_input_from_report(report_data: ReportData) -> Dict[str, Any]:
    """从 ReportData 构建 Agent 输入：running / workout / roxzone 各段数据及约束上限。"""
    out: Dict[str, Any] = {"running": [], "workout": [], "roxzone": None}
    tla = report_data.time_loss_analysis
    seg_comp = report_data.segment_comparison
    div_stats = report_data.division_stats
    athlete = report_data.athlete_result
    if not tla or not athlete:
        return out

    # Running: 每个 pacing_loss 段 → 与 Top 10% 差距（p10）为上限
    run_field_to_p10: Dict[str, float] = {}
    if div_stats:
        for i in range(1, 9):
            f = f"run{i}_time"
            fs = getattr(div_stats, f, None)
            if fs and getattr(fs, "p10", None) is not None:
                run_field_to_p10[f] = fs.p10
    for pl in (tla.pacing_losses or []):
        if (pl.loss_seconds or 0) <= 0:
            continue
        run_num = _extract_run_number_from_description(pl.description or "")
        if run_num is None:
            continue
        field = f"run{run_num}_time"
        athlete_min = getattr(athlete, field, None)
        if athlete_min is None:
            continue
        p10 = run_field_to_p10.get(field)
        gap_to_top10_seconds = None
        if p10 is not None:
            gap_to_top10_seconds = max(0.0, (athlete_min - p10) * 60)
        out["running"].append({
            "segment": RUN_FIELD_TO_NAME.get(field, field),
            "segment_field": field,
            "pacing_loss_seconds": round(pl.loss_seconds, 1),
            "gap_to_top10_seconds": round(gap_to_top10_seconds, 1) if gap_to_top10_seconds is not None else None,
            "athlete_time_min": round(athlete_min, 2),
            "top10_time_min": round(p10, 2) if p10 is not None else None,
        })

    # Workout: 每个 station_loss → 损耗秒数为上限
    for sl in (tla.station_losses or []):
        if (sl.loss_seconds or 0) <= 0:
            continue
        name = (sl.description or "").replace(" 技术损耗（vs 平均值）", "").replace(" 技术损耗（vs TOP25%）", "").strip()
        out["workout"].append({
            "segment": name,
            "loss_seconds": round(sl.loss_seconds, 1),
            "ceiling_seconds": round(sl.loss_seconds, 1),
        })

    # Roxzone
    if tla.transition_loss and (tla.transition_loss.loss_seconds or 0) > 0:
        out["roxzone"] = {
            "loss_seconds": round(tla.transition_loss.loss_seconds, 1),
            "ceiling_seconds": round(tla.transition_loss.loss_seconds, 1),
        }
    return out


def _build_prompt(agent_input: Dict[str, Any]) -> str:
    running = agent_input.get("running") or []
    workout = agent_input.get("workout") or []
    roxzone = agent_input.get("roxzone")

    lines = [
        "你是一个 HYROX 赛事时间损耗分析助手。请根据下面与「章节 1」一致的数据，给出各区域「可提升时间」（单位：秒）及简短理由。",
        "",
        "## 约束（必须满足）",
        "- **跑步段**：可提升时间 ≤ 该段与 Top 10% 的差距（秒）。若选手不在 Top 10% 内，不可能一步超过 Top 10% 水平。",
        "- **功能站 / 转换区**：可提升时间 ≤ 与参考的损耗秒数。",
        "",
        "## 输入数据",
        "",
    ]
    if running:
        lines.append("### 跑步段（1.1 配速损耗 + 与 Top 10% 差距为可提升上限）")
        for r in running:
            gap = r.get("gap_to_top10_seconds")
            gap_str = f"，可提升上限 {int(gap)} 秒（与 Top 10% 的差距）" if gap is not None else "，可提升上限 0 秒（无 Top 10% 数据，不得输出正数）"
            lines.append(f"- **{r['segment']}**：1.1 配速损耗 {r['pacing_loss_seconds']} 秒{gap_str}；你的用时 {r.get('athlete_time_min')} 分钟，Top 10% {r.get('top10_time_min')} 分钟。")
        lines.append("")
    if workout:
        lines.append("### 功能站（1.1 损耗 = 可提升上限）")
        for w in workout:
            lines.append(f"- **{w['segment']}**：损耗 {w['loss_seconds']} 秒。")
        lines.append("")
    if roxzone:
        lines.append("### 转换区（Roxzone）")
        lines.append(f"- 损耗 {roxzone['loss_seconds']} 秒。")
        lines.append("")

    lines.extend([
        "## 要求",
        "对上述每个区域给出：recommended_improvement_seconds（推荐可提升秒数，满足约束）、reason（一句话理由）。",
        "请**仅**输出一个 JSON 对象，不要其他解释，格式如下：",
        "",
        "```json",
        "{",
        '  "running": [ { "segment": "Run 5", "recommended_improvement_seconds": 12, "reason": "..." }, ... ],',
        '  "workout": [ { "segment": "Sled Push", "recommended_improvement_seconds": 20, "reason": "..." }, ... ],',
        '  "roxzone": { "recommended_improvement_seconds": 30, "reason": "..." }  // 无则 null',
        "}",
        "```",
    ])
    return "\n".join(lines)


async def call_improvement_agent(report_data: ReportData) -> Dict[str, Any]:
    """
    调用提升空间 Agent，返回各区域推荐可提升秒数及理由。
    用于 1.1 区域提升 与 1.2 running/workout/roxzone 分析内容。
    """
    has_tla = getattr(report_data, "time_loss_analysis", None) is not None
    has_athlete = getattr(report_data, "athlete_result", None) is not None
    logger.info(f"[ImprovementAgent] 调用: time_loss_analysis={has_tla}, athlete_result={has_athlete}")
    agent_input = _build_agent_input_from_report(report_data)
    n_run = len(agent_input.get("running") or [])
    n_work = len(agent_input.get("workout") or [])
    has_rox = agent_input.get("roxzone") is not None
    if n_run == 0 and n_work == 0 and not has_rox:
        logger.warning("[ImprovementAgent] 无损耗项，返回空结果（请检查 time_loss_analysis 与 athlete_result）")
        return {"running": [], "workout": [], "roxzone": None}
    logger.info(f"[ImprovementAgent] 构建输入: running={n_run}, workout={n_work}, roxzone={has_rox}")

    prompt = _build_prompt(agent_input)
    try:
        from ...llm.config import llm_config_manager
        from openai import AsyncOpenAI
    except ImportError:
        logger.warning("[ImprovementAgent] 无法导入 llm_config_manager，返回 fallback")
        return _fallback_result(agent_input)

    client_cfg = llm_config_manager.get_llm_client_config()
    try:
        agent_cfg = llm_config_manager.get_agent_config("improvement_agent")
    except Exception:
        agent_cfg = {}
    model = agent_cfg.get("model", "qwen3-coder-plus")
    if not client_cfg.get("api_key"):
        logger.warning("[ImprovementAgent] 未配置 API Key，返回 fallback")
        return _fallback_result(agent_input)

    client = AsyncOpenAI(api_key=client_cfg["api_key"], base_url=client_cfg.get("base_url"))
    try:
        resp = await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1024,
            temperature=0.3,
        )
        text = (resp.choices[0].message.content or "").strip()
    except Exception as e:
        logger.warning(f"[ImprovementAgent] LLM 调用失败: {e}")
        return _fallback_result(agent_input)

    try:
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        raw = json.loads(text.strip())
        return _normalize_result(raw, agent_input)
    except json.JSONDecodeError as e:
        logger.warning(f"[ImprovementAgent] JSON 解析失败: {e}")
        return _fallback_result(agent_input)


def _empty_result(agent_input: Dict[str, Any]) -> Dict[str, Any]:
    out = {"running": [], "workout": [], "roxzone": None}
    for r in agent_input.get("running") or []:
        cap = r.get("gap_to_top10_seconds")
        sec = int(cap) if cap is not None else 0
        out["running"].append({
            "segment": r["segment"],
            "recommended_improvement_seconds": sec,
            "reason": "（未调用 Agent）",
        })
    for w in agent_input.get("workout") or []:
        out["workout"].append({
            "segment": w["segment"],
            "recommended_improvement_seconds": int(w["loss_seconds"]),
            "reason": "（未调用 Agent）",
        })
    if agent_input.get("roxzone"):
        out["roxzone"] = {
            "recommended_improvement_seconds": int(agent_input["roxzone"]["loss_seconds"]),
            "reason": "（未调用 Agent）",
        }
    return out


def _fallback_result(agent_input: Dict[str, Any]) -> Dict[str, Any]:
    """解析失败时跑步段仅用 gap_to_top10 作为推荐值，无 gap 则 0，与 _normalize_result 一致。"""
    out = {"running": [], "workout": [], "roxzone": None}
    for r in agent_input.get("running") or []:
        cap = r.get("gap_to_top10_seconds")
        sec = int(cap) if cap is not None else 0
        out["running"].append({
            "segment": r["segment"],
            "recommended_improvement_seconds": sec,
            "reason": "以 Top 10% 差距为上限的保守估计。" if sec else "无 Top 10% 数据，暂不给出可提升。",
        })
    for w in agent_input.get("workout") or []:
        s = int(w["loss_seconds"])
        out["workout"].append({
            "segment": w["segment"],
            "recommended_improvement_seconds": s,
            "reason": "与组别参考的损耗，可作为可争取空间。",
        })
    if agent_input.get("roxzone"):
        s = int(agent_input["roxzone"]["loss_seconds"])
        out["roxzone"] = {"recommended_improvement_seconds": s, "reason": "转换区损耗可作为可争取空间。"}
    return out


def _normalize_result(raw: Dict[str, Any], agent_input: Dict[str, Any]) -> Dict[str, Any]:
    """确保 running/workout/roxzone 结构一致，且跑步段可提升严格 ≤ 与 Top 10% 的差距（不落回配速损耗）。"""
    running_in = agent_input.get("running") or []
    # 跑步段上限仅用 gap_to_top10_seconds；无 Top 10% 数据时用 0，避免出现大于表格「差距」的 bug
    run_caps = {
        r["segment"]: r.get("gap_to_top10_seconds") if r.get("gap_to_top10_seconds") is not None else 0
        for r in running_in
    }
    out_run = []
    for r in raw.get("running") or []:
        seg = r.get("segment") or ""
        cap = run_caps.get(seg)
        rec = int(r.get("recommended_improvement_seconds") or 0)
        if cap is not None and rec > cap:
            rec = int(cap)
        out_run.append({
            "segment": seg,
            "recommended_improvement_seconds": rec,
            "reason": (r.get("reason") or "").strip() or "满足与 Top 10% 差距约束。",
        })
    out_work = []
    for w in raw.get("workout") or []:
        seg = w.get("segment") or ""
        rec = int(w.get("recommended_improvement_seconds") or 0)
        out_work.append({
            "segment": seg,
            "recommended_improvement_seconds": rec,
            "reason": (w.get("reason") or "").strip() or "与参考损耗一致。",
        })
    rox = raw.get("roxzone")
    out_rox = None
    if rox and isinstance(rox, dict):
        out_rox = {
            "recommended_improvement_seconds": int(rox.get("recommended_improvement_seconds") or 0),
            "reason": (rox.get("reason") or "").strip() or "转换区可争取空间。",
        }
    return {"running": out_run, "workout": out_work, "roxzone": out_rox}
