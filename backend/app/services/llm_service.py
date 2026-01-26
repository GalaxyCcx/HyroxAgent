"""
LLM 服务 - 阿里云 Qwen 集成
"""
import json
import logging
from typing import Optional

import httpx

from app.config.settings import settings

logger = logging.getLogger(__name__)

# Prompt 模板
ANALYSIS_PROMPT = """你是一位专业的 HYROX 比赛数据分析师。请根据以下运动员的比赛数据，生成简洁的赛后分析。

## 运动员比赛数据
- 姓名: {athlete_name}
- 比赛: {race_name}
- 组别: {division}
- 总成绩: {total_time}
- 总排名: 第 {overall_rank} 名 / 共 {overall_total} 人
- 击败: {beat_percent}% 的参赛者

## 各分段表现 (top_percent 越小越好，diff_seconds 负数表示快于平均)
{splits_data}

## 输出要求
请用中文输出，严格按以下 JSON 格式返回（不要包含任何其他内容）:
{{
  "summary": "一句话总结（30-50字，指出核心优势和最需要改进的方面）",
  "strengths": ["优势1（10字以内）", "优势2（10字以内）"],
  "weaknesses": ["短板1（10字以内）", "短板2（10字以内）"]
}}

## 分析逻辑
- top_percent < 20% 的项目是优势
- top_percent > 50% 的项目是短板
- diff_seconds 负数越大说明比平均快越多
- 优势和短板各列出 2-3 个最突出的"""


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
    ) -> Optional[dict]:
        """
        调用 LLM 生成比赛分析
        
        Returns:
            dict: {"summary": str, "strengths": list, "weaknesses": list}
            None: 如果调用失败
        """
        # 计算击败百分比
        beat_percent = round((1 - overall_rank / overall_total) * 100, 1) if overall_total > 0 else 0
        
        # 格式化分段数据
        splits_lines = []
        for s in splits_analytics:
            line = f"- {s['name']}: 用时 {s['time']}, 排名前 {s['top_percent']}%, 比平均 {s['diff_display']}"
            splits_lines.append(line)
        splits_data = "\n".join(splits_lines)
        
        # 构建 Prompt
        prompt = ANALYSIS_PROMPT.format(
            athlete_name=athlete_name,
            race_name=race_name,
            division=division,
            total_time=total_time,
            overall_rank=overall_rank,
            overall_total=overall_total,
            beat_percent=beat_percent,
            splits_data=splits_data,
        )
        
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
                
                # 验证返回格式
                if not all(k in result for k in ["summary", "strengths", "weaknesses"]):
                    logger.error(f"LLM response missing required fields: {result}")
                    return None
                
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
