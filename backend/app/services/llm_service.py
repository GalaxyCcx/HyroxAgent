"""
LLM 服务 - 阿里云 Qwen 集成
"""
import json
import logging
from typing import Optional

import httpx

from app.config.settings import settings
from app.utils.constants import RUN_SEGMENTS, WORKOUT_STATIONS

logger = logging.getLogger(__name__)

# 分段名列表供 prompt 使用
SEGMENT_NAMES_FOR_PROMPT = ", ".join([s["name"] for s in RUN_SEGMENTS] + [s["name"] for s in WORKOUT_STATIONS])

# 普通用户：本场组别内排名对比
ANALYSIS_PROMPT_NORMAL = """你是一位专业的 HYROX 比赛数据分析师。请根据以下运动员的比赛数据，生成简洁的赛后分析。

## 运动员比赛数据
- 姓名: {athlete_name}
- 比赛: {race_name}
- 组别: {division}
- 总成绩: {total_time}
- 总排名: 第 {overall_rank} 名 / 共 {overall_total} 人
- 击败: {beat_percent}% 的参赛者
{age_group_line}

## 各分段表现 (top_percent 越小越好，diff_seconds 负数表示快于平均)
{splits_data}

## 分析口径
本分析以「本场同组别同性别」内排名为参照。

## 输出要求
请用中文输出，严格按以下 JSON 格式返回（不要包含任何其他内容）:
{{
  "summary": "一句话总结（30-50字，指出核心优势和最需要改进的方面）",
  "strengths": [{{"segment": "分段名（见下方列表）", "text": "优势描述（10字以内）"}}, ...],
  "weaknesses": [{{"segment": "分段名（见下方列表）", "text": "短板描述（10字以内）"}}, ...],
  "analysis_scope": "本场组别内排名对比"
}}

## 分段名列表（segment 必须从以下选）
{segment_names}

## 分析逻辑（必须严格遵守，否则前后文会矛盾）
- 优势：仅将 top_percent <= 25% 的分段放入 strengths，各 1-3 条
- 短板：仅将 top_percent >= 30% 的分段放入 weaknesses，各 1-3 条
- 一句话总结：必须与上述优势、短板一致。总结里提到的「表现出色/优势」只能来自 strengths 中的分段名；「需改进/短板」只能来自 weaknesses 中的分段名。不要提未列入优势或短板的分段。
- diff_seconds 负数越大说明比平均快越多"""

# 前10%用户：与全球同组别同性别前10%成绩对比
ANALYSIS_PROMPT_TOP10 = """你是一位专业的 HYROX 比赛数据分析师。该运动员在本场总排名已进入前10%，属于顶尖水平。请以「同组别（如 Open/Single）同性别下，全球所有比赛中排名前10%的成绩」为参照，做对比分析。

## 运动员比赛数据
- 姓名: {athlete_name}
- 比赛: {race_name}
- 组别: {division}
- 总成绩: {total_time}
- 总排名: 第 {overall_rank} 名 / 共 {overall_total} 人（前10%）
{age_group_line}

## 各分段表现 (top_percent 越小越好)
{splits_data}

## 分析口径
本分析以「全球同组别同性别前10%成绩」为参照，说明其与顶尖水平的相对优势与可提升空间。

## 输出要求
请用中文输出，严格按以下 JSON 格式返回（不要包含任何其他内容）:
{{
  "summary": "一句话总结（40-60字）：肯定其顶尖水平，并指出在顶尖选手中相对的优势与可突破点",
  "strengths": [{{"segment": "分段名（见下方列表）", "text": "相对顶尖水平的优势描述"}}, ...],
  "weaknesses": [{{"segment": "分段名（见下方列表）", "text": "相对顶尖水平可提升点描述"}}, ...],
  "analysis_scope": "全球同组别同性别前10%成绩对比"
}}

## 分段名列表（segment 必须从以下选）
{segment_names}

## 分析逻辑（必须严格遵守，否则前后文会矛盾）
- 优势：仅将 top_percent <= 25% 的分段放入 strengths（与全球前10%相比仍突出），各 1-3 条
- 短板：仅将 top_percent >= 30% 的分段放入 weaknesses（与全球前10%相比有差距），各 1-3 条
- 一句话总结：必须与上述优势、短板一致。总结里提到的「表现出色/优势」只能来自 strengths 中的分段名；「需改进/短板」只能来自 weaknesses 中的分段名。不要提未列入优势或短板的分段。
- 每条必须对应一个分段名，表述为「相对顶尖水平」的视角"""


class LLMService:
    """LLM 服务类"""
    
    def __init__(self):
        self.api_key = settings.ALIYUN_LLM_API_KEY
        self.model = settings.ALIYUN_LLM_MODEL
        self.base_url = settings.ALIYUN_LLM_BASE_URL
    
    async def generate_analysis(
        self,
        athlete_name: str,
        race_name: str,
        division: str,
        total_time: str,
        overall_rank: int,
        overall_total: int,
        splits_analytics: list[dict],
        *,
        is_top10: bool = False,
        age_group_rank: Optional[int] = None,
        age_group_total: Optional[int] = None,
    ) -> Optional[dict]:
        """
        调用 LLM 生成比赛分析。
        总排名前10%（含）使用「全球同组别同性别前10%成绩」对比；否则使用「本场组别内」对比。

        Returns:
            dict: {"summary", "strengths", "weaknesses", "analysis_scope"}
            None: 如果调用失败
        """
        beat_percent = round((1 - overall_rank / overall_total) * 100, 1) if overall_total > 0 else 0

        age_group_line = ""
        if age_group_rank is not None and age_group_total is not None:
            age_group_line = f"- 年龄组排名: 第 {age_group_rank} 名 / 共 {age_group_total} 人"

        splits_lines = []
        for s in splits_analytics:
            line = f"- {s['name']}: 用时 {s['time']}, 排名前 {s['top_percent']}%, 比平均 {s['diff_display']}"
            splits_lines.append(line)
        splits_data = "\n".join(splits_lines)

        base_vars = dict(
            athlete_name=athlete_name,
            race_name=race_name,
            division=division,
            total_time=total_time,
            overall_rank=overall_rank,
            overall_total=overall_total,
            beat_percent=beat_percent,
            age_group_line=age_group_line,
            splits_data=splits_data,
            segment_names=SEGMENT_NAMES_FOR_PROMPT,
        )

        if is_top10:
            prompt = ANALYSIS_PROMPT_TOP10.format(**base_vars)
            logger.info(f"LLM: Generating TOP10 analysis for {athlete_name}")
        else:
            prompt = ANALYSIS_PROMPT_NORMAL.format(**base_vars)
            logger.info(f"LLM: Generating analysis for {athlete_name}")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.7,
                        "max_tokens": 500,
                    },
                )
                
                if response.status_code != 200:
                    logger.error(f"LLM API error: {response.status_code} - {response.text}")
                    return None
                
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                
                # 解析 JSON 响应
                # 有时 LLM 会返回 markdown 代码块，需要清理
                content = content.strip()
                if content.startswith("```"):
                    # 移除 markdown 代码块标记
                    lines = content.split("\n")
                    content = "\n".join(lines[1:-1]) if len(lines) > 2 else content
                
                result = json.loads(content)

                if not all(k in result for k in ["summary", "strengths", "weaknesses"]):
                    logger.error(f"LLM response missing required fields: {result}")
                    return None
                if "analysis_scope" not in result or not result["analysis_scope"]:
                    result["analysis_scope"] = "全球同组别同性别前10%成绩对比" if is_top10 else "本场组别内排名对比"
                # 兼容旧格式：strengths/weaknesses 可能是 ["s1","s2"] 或 [{"segment":"Run 1","text":"s1"},...]
                for key in ("strengths", "weaknesses"):
                    items = result.get(key) or []
                    normalized = []
                    for it in items:
                        if isinstance(it, str):
                            normalized.append({"segment": "", "text": it})
                        elif isinstance(it, dict) and "text" in it:
                            normalized.append({"segment": it.get("segment", ""), "text": it["text"]})
                        else:
                            continue
                    result[key] = normalized

                logger.info(f"LLM: Analysis generated successfully for {athlete_name}")
                return result
                
        except json.JSONDecodeError as e:
            logger.error(f"LLM: Failed to parse JSON response: {e}, content: {content}")
            return None
        except httpx.TimeoutException:
            logger.error("LLM: Request timeout")
            return None
        except Exception as e:
            logger.error(f"LLM: Unexpected error: {e}")
            return None


# 依赖注入
def get_llm_service() -> LLMService:
    """获取 LLM 服务实例"""
    return LLMService()
