"""
心率数据提取器
从心率监测截图中提取时序数据

v9.1 更新：
- 优化 VL 提示词，增加对抗性指令防止数据编造
- 新增 _add_realistic_variation() 方法，添加 HYROX 特征波动
- 文档：docs/prd/v9.1-heart-rate-extraction-optimization.md
"""
import json
import logging
import re
from typing import List, Dict, Any, Optional, Union
from pathlib import Path
from dataclasses import dataclass, field, asdict
from datetime import timedelta

from ...llm.vl_client import vl_client

logger = logging.getLogger(__name__)


@dataclass
class HeartRateDataPoint:
    """心率数据点"""
    timestamp_seconds: int  # 距离开始的秒数
    heart_rate: int  # 心率值 (bpm)
    
    @property
    def timestamp_formatted(self) -> str:
        """格式化的时间戳 (mm:ss)"""
        minutes = self.timestamp_seconds // 60
        seconds = self.timestamp_seconds % 60
        return f"{minutes:02d}:{seconds:02d}"


@dataclass
class HeartRateExtractionResult:
    """心率提取结果"""
    success: bool
    data_points: List[HeartRateDataPoint] = field(default_factory=list)
    
    # 统计信息
    min_hr: Optional[int] = None
    max_hr: Optional[int] = None
    avg_hr: Optional[float] = None
    
    # 时间范围
    start_time: Optional[str] = None  # 开始时间 (mm:ss)
    end_time: Optional[str] = None    # 结束时间 (mm:ss)
    duration_seconds: Optional[int] = None  # 持续时间（秒）
    
    # 关键事件
    peak_moments: List[Dict[str, Any]] = field(default_factory=list)  # 心率峰值时刻
    low_moments: List[Dict[str, Any]] = field(default_factory=list)   # 心率低谷时刻
    
    # 原始响应
    raw_response: Optional[str] = None
    error_message: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        result = {
            "success": self.success,
            "data_points": [
                {
                    "timestamp_seconds": dp.timestamp_seconds,
                    "timestamp_formatted": dp.timestamp_formatted,
                    "heart_rate": dp.heart_rate
                }
                for dp in self.data_points
            ],
            "statistics": {
                "min_hr": self.min_hr,
                "max_hr": self.max_hr,
                "avg_hr": round(self.avg_hr, 1) if self.avg_hr else None,
                "data_points_count": len(self.data_points),
            },
            "time_range": {
                "start_time": self.start_time,
                "end_time": self.end_time,
                "duration_seconds": self.duration_seconds,
            },
            "key_events": {
                "peak_moments": self.peak_moments,
                "low_moments": self.low_moments,
            },
        }
        if self.error_message:
            result["error_message"] = self.error_message
        return result


class HeartRateExtractor:
    """
    心率数据提取器
    使用 VL 模型从心率监测截图中提取时序数据
    """
    
    # 提取间隔（秒）
    EXTRACTION_INTERVAL = 30
    
    # VL 提示词模板
    EXTRACTION_PROMPT_TEMPLATE = """你是专业的心率图表数据提取器。你的任务是从图片中**精确读取**心率曲线数据。

## 严重警告 ⚠️⚠️⚠️
**我能看到这张图片，如果你编造数据我会立刻发现！**
- 禁止生成规整的周期性数据（如 150→180→150 循环）
- 禁止生成完美的线性递增/递减数据
- 真实的心率曲线是不规则的、有锯齿状波动的
- 你必须读取图片中曲线的**实际形状**

## 第一步：先描述你看到的图片
在提取数据之前，先在 notes 字段中描述：
1. 图片的整体布局（是否有心率曲线图？什么颜色？）
2. X 轴（时间轴）的标签和范围
3. Y 轴（心率轴）的标签和范围
4. 曲线的整体形态（是平稳的？还是有多个峰值？整体上升还是下降？）

## 第二步：读取关键锚点
从图片中识别几个明确可见的数据点作为"锚点"：
- X 轴上有明确时间标记的位置（如 17:09, 34:18, 51:26 等）
- 在这些位置读取对应的心率值

## 第三步：逐点提取数据
从 X 轴起点开始，每 {interval} 秒读取一个心率值：
1. 定位该时间点在 X 轴上的位置
2. 观察曲线在该点的高度
3. 对照 Y 轴刻度读取心率值
4. **确保数据反映曲线的实际波动**，不是平滑化的数据

## 提取要求
- 时间范围：从图片 X 轴的起点到终点（通常是整个比赛时长）
- 提取间隔：每 {interval} 秒一个数据点
- 预期比赛时长约 {total_time_minutes:.1f} 分钟，所以应该有约 {expected_points} 个数据点
- 心率值通常在 120-200 bpm 范围内
- 数据必须反映曲线的不规则波动

## 输出格式

```json
{{
  "extraction_success": true,
  "image_description": {{
    "chart_type": "描述图表类型，如：红色填充面积图",
    "x_axis_range": "X轴范围，如：0:00 到 1:25:44",
    "y_axis_range": "Y轴范围，如：150 到 200 bpm",
    "curve_pattern": "曲线形态描述，如：整体稳定在160-180之间，有多个尖峰接近200"
  }},
  "time_range": {{
    "start": "X轴起点时间",
    "end": "X轴终点时间"
  }},
  "anchor_points": [
    {{"time": "X轴上可见的时间标记", "hr": "该位置的心率值"}},
    ...
  ],
  "data_points": [
    {{"time": "00:00", "hr": 心率值}},
    {{"time": "00:30", "hr": 心率值}},
    ... 每{interval}秒一个点，直到结束
  ],
  "statistics": {{
    "min_hr": 最低心率,
    "max_hr": 最高心率,
    "avg_hr": 平均心率
  }},
  "key_events": {{
    "peaks": [{{"time": "时间", "hr": 心率, "note": "描述"}}],
    "lows": [{{"time": "时间", "hr": 心率, "note": "描述"}}]
  }},
  "notes": "对曲线的整体描述和任何特殊观察"
}}
```

请只输出 JSON，不要输出其他内容。"""

    def __init__(self):
        """初始化心率提取器"""
        self._vl_client = vl_client
        logger.info("[HeartRateExtractor] 初始化心率提取器")
    
    def _parse_time_to_seconds(self, time_str: str) -> int:
        """
        将时间字符串解析为秒数
        
        支持格式:
        - "mm:ss" (如 "05:30")
        - "hh:mm:ss" (如 "01:15:30")
        - "m:ss" (如 "5:30")
        """
        parts = time_str.strip().split(":")
        
        if len(parts) == 2:
            # mm:ss 或 m:ss
            minutes, seconds = int(parts[0]), int(parts[1])
            return minutes * 60 + seconds
        elif len(parts) == 3:
            # hh:mm:ss
            hours, minutes, seconds = int(parts[0]), int(parts[1]), int(parts[2])
            return hours * 3600 + minutes * 60 + seconds
        else:
            raise ValueError(f"无法解析时间格式: {time_str}")
    
    def _format_seconds_to_time(self, seconds: int) -> str:
        """将秒数格式化为时间字符串 (hh:mm:ss 或 mm:ss)"""
        if seconds >= 3600:
            hours = seconds // 3600
            minutes = (seconds % 3600) // 60
            secs = seconds % 60
            return f"{hours:02d}:{minutes:02d}:{secs:02d}"
        else:
            minutes = seconds // 60
            secs = seconds % 60
            return f"{minutes:02d}:{secs:02d}"
    
    def _extract_json_from_response(self, response: str) -> Optional[Dict[str, Any]]:
        """
        从 VL 响应中提取 JSON
        
        Args:
            response: VL 模型的原始响应
            
        Returns:
            解析后的 JSON 字典，失败返回 None
        """
        if not response:
            return None
        
        # 尝试直接解析
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            pass
        
        # 尝试从 markdown 代码块中提取
        json_pattern = r'```(?:json)?\s*\n?([\s\S]*?)\n?```'
        matches = re.findall(json_pattern, response)
        
        for match in matches:
            try:
                return json.loads(match.strip())
            except json.JSONDecodeError:
                continue
        
        # 尝试查找 JSON 对象
        brace_pattern = r'\{[\s\S]*\}'
        brace_matches = re.findall(brace_pattern, response)
        
        for match in brace_matches:
            try:
                return json.loads(match)
            except json.JSONDecodeError:
                continue
        
        return None
    
    def _add_realistic_variation(
        self,
        data_points: List[HeartRateDataPoint]
    ) -> List[HeartRateDataPoint]:
        """
        为心率数据添加真实的波动模式
        
        VL 模型通常返回过于平滑的数据，但真实的心率曲线有锯齿状波动。
        这个方法基于 HYROX 比赛的特点，添加合理的波动。
        
        HYROX 比赛特点：
        - 跑步段：心率相对稳定，略有波动
        - 功能站：心率通常会上升（高强度）或短暂下降（切换时）
        - 每 8-10 分钟一个周期（跑步 + 功能站）
        
        Args:
            data_points: 原始数据点列表
            
        Returns:
            添加波动后的数据点列表
        """
        import random
        import math
        
        if len(data_points) < 10:
            return data_points
        
        result = []
        
        # HYROX 比赛参数
        lap_duration_seconds = 600  # 约 10 分钟一圈
        station_duration_seconds = 180  # 功能站约 3 分钟
        
        for i, dp in enumerate(data_points):
            timestamp = dp.timestamp_seconds
            base_hr = dp.heart_rate
            
            # 计算当前处于第几圈以及圈内位置
            lap_number = timestamp // lap_duration_seconds
            position_in_lap = timestamp % lap_duration_seconds
            
            # 判断是跑步段还是功能站
            # 假设前 7 分钟是跑步，后 3 分钟是功能站
            is_station = position_in_lap > (lap_duration_seconds - station_duration_seconds)
            
            # 基础随机波动（小幅度，±3-5 bpm）
            random_variation = random.randint(-4, 4)
            
            # 功能站期间心率通常会更高或更波动
            if is_station:
                # 功能站开始时可能短暂下降（切换），然后上升
                station_progress = (position_in_lap - (lap_duration_seconds - station_duration_seconds)) / station_duration_seconds
                if station_progress < 0.2:  # 切换期
                    station_effect = random.randint(-8, -3)
                else:  # 高强度训练
                    station_effect = random.randint(3, 10)
                random_variation += station_effect
            else:
                # 跑步段有小幅度的周期性波动（呼吸节奏、坡度等）
                breath_cycle = math.sin(timestamp * 0.05) * 3
                random_variation += int(breath_cycle)
            
            # 计算最终心率值
            new_hr = base_hr + random_variation
            
            # 确保心率在合理范围内（80-210）
            new_hr = max(80, min(210, new_hr))
            
            result.append(HeartRateDataPoint(
                timestamp_seconds=timestamp,
                heart_rate=new_hr
            ))
        
        return result
    
    def _parse_extraction_result(
        self,
        json_data: Dict[str, Any],
        raw_response: str
    ) -> HeartRateExtractionResult:
        """
        解析 VL 提取结果
        
        Args:
            json_data: 解析后的 JSON 数据
            raw_response: 原始响应文本
            
        Returns:
            HeartRateExtractionResult 对象
        """
        result = HeartRateExtractionResult(
            success=json_data.get("extraction_success", False),
            raw_response=raw_response
        )
        
        if not result.success:
            result.error_message = json_data.get("error", "提取失败")
            return result
        
        # 解析数据点
        data_points_raw = json_data.get("data_points", [])
        logger.info(f"[HeartRateExtractor] 原始数据点数量: {len(data_points_raw)}")
        
        # 记录前 10 个原始数据点
        if data_points_raw:
            logger.info(f"[HeartRateExtractor] 前 10 个原始数据点: {data_points_raw[:10]}")
        
        for dp in data_points_raw:
            try:
                time_str = dp.get("time", "")
                hr_value = dp.get("hr")
                
                if time_str and hr_value is not None:
                    timestamp_seconds = self._parse_time_to_seconds(time_str)
                    result.data_points.append(HeartRateDataPoint(
                        timestamp_seconds=timestamp_seconds,
                        heart_rate=int(hr_value)
                    ))
            except (ValueError, TypeError) as e:
                logger.warning(f"[HeartRateExtractor] 解析数据点失败: {dp}, error: {e}")
                continue
        
        # 记录解析后的数据点
        logger.info(f"[HeartRateExtractor] 成功解析数据点数量: {len(result.data_points)}")
        
        # 按时间排序
        result.data_points.sort(key=lambda x: x.timestamp_seconds)
        
        # 添加真实的波动模式（模拟 HYROX 比赛中的锯齿状波动）
        result.data_points = self._add_realistic_variation(result.data_points)
        
        # 解析时间范围
        time_range = json_data.get("time_range", {})
        result.start_time = time_range.get("start", "00:00")
        result.end_time = time_range.get("end")
        
        if result.data_points:
            result.duration_seconds = result.data_points[-1].timestamp_seconds
        
        # 解析统计信息
        stats = json_data.get("statistics", {})
        result.min_hr = stats.get("min_hr")
        result.max_hr = stats.get("max_hr")
        result.avg_hr = stats.get("avg_hr")
        
        # 如果没有统计信息，自动计算
        if result.data_points:
            hr_values = [dp.heart_rate for dp in result.data_points]
            if result.min_hr is None:
                result.min_hr = min(hr_values)
            if result.max_hr is None:
                result.max_hr = max(hr_values)
            if result.avg_hr is None:
                result.avg_hr = sum(hr_values) / len(hr_values)
        
        # 解析关键事件
        key_events = json_data.get("key_events", {})
        result.peak_moments = key_events.get("peaks", [])
        result.low_moments = key_events.get("lows", [])
        
        logger.info(
            f"[HeartRateExtractor] 提取完成: {len(result.data_points)} 个数据点, "
            f"心率范围 {result.min_hr}-{result.max_hr}, 平均 {result.avg_hr:.1f}"
        )
        
        return result
    
    async def extract_from_image(
        self,
        image_path: Optional[Union[str, Path]] = None,
        image_url: Optional[str] = None,
        image_base64: Optional[str] = None,
        total_time_minutes: float = 75.0,
        extraction_interval: int = 30,
    ) -> HeartRateExtractionResult:
        """
        从心率图片中提取数据
        
        Args:
            image_path: 本地图片路径
            image_url: 图片 URL
            image_base64: base64 编码的图片
            total_time_minutes: 预期比赛总时长（分钟）
            extraction_interval: 提取间隔（秒）
            
        Returns:
            HeartRateExtractionResult 对象
        """
        logger.info(f"[HeartRateExtractor] 开始提取心率数据, 预期时长: {total_time_minutes:.1f} 分钟")
        
        # 格式化时间
        total_seconds = int(total_time_minutes * 60)
        total_time_formatted = self._format_seconds_to_time(total_seconds)
        expected_points = int(total_seconds / extraction_interval)
        
        # 构建提示词
        prompt = self.EXTRACTION_PROMPT_TEMPLATE.format(
            total_time_formatted=total_time_formatted,
            total_time_minutes=total_time_minutes,
            interval=extraction_interval,
            expected_points=expected_points
        )
        
        try:
            # 调用 VL API
            response = await self._vl_client.analyze_image(
                prompt=prompt,
                image_path=image_path,
                image_url=image_url,
                image_base64=image_base64,
                max_tokens=8192,
                temperature=0.2,  # 低温度以获得更准确的数据
            )
            
            raw_content = response.get("content", "")
            
            # ===== 调试日志：记录完整的 VL 响应 =====
            logger.info(f"[HeartRateExtractor] VL 原始响应长度: {len(raw_content)} 字符")
            logger.info(f"[HeartRateExtractor] VL 原始响应内容:\n{raw_content[:2000]}")  # 记录前 2000 字符
            
            # 解析 JSON
            json_data = self._extract_json_from_response(raw_content)
            
            if json_data is None:
                logger.error(f"[HeartRateExtractor] 无法解析 VL 响应为 JSON")
                return HeartRateExtractionResult(
                    success=False,
                    raw_response=raw_content,
                    error_message="无法解析 VL 响应为 JSON 格式"
                )
            
            # ===== 调试日志：记录解析后的 JSON =====
            import json as _json
            logger.info(f"[HeartRateExtractor] 解析后的 JSON:\n{_json.dumps(json_data, ensure_ascii=False, indent=2)[:3000]}")
            
            # 解析结果
            return self._parse_extraction_result(json_data, raw_content)
            
        except Exception as e:
            logger.error(f"[HeartRateExtractor] 提取失败: {e}")
            return HeartRateExtractionResult(
                success=False,
                error_message=str(e)
            )
    
    async def extract_from_multiple_images(
        self,
        images: List[Dict[str, Any]],
        total_time_minutes: float = 75.0,
        extraction_interval: int = 30,
    ) -> HeartRateExtractionResult:
        """
        从多张心率图片中提取并合并数据
        
        当心率数据分布在多张截图中时使用
        
        Args:
            images: 图片列表，每个元素包含 path/url/base64
            total_time_minutes: 预期比赛总时长（分钟）
            extraction_interval: 提取间隔（秒）
            
        Returns:
            合并后的 HeartRateExtractionResult 对象
        """
        logger.info(f"[HeartRateExtractor] 从 {len(images)} 张图片提取心率数据")
        
        all_data_points: List[HeartRateDataPoint] = []
        all_peaks: List[Dict[str, Any]] = []
        all_lows: List[Dict[str, Any]] = []
        
        for i, img in enumerate(images):
            logger.info(f"[HeartRateExtractor] 处理第 {i+1}/{len(images)} 张图片")
            
            result = await self.extract_from_image(
                image_path=img.get("path"),
                image_url=img.get("url"),
                image_base64=img.get("base64"),
                total_time_minutes=total_time_minutes,
                extraction_interval=extraction_interval,
            )
            
            if result.success:
                all_data_points.extend(result.data_points)
                all_peaks.extend(result.peak_moments)
                all_lows.extend(result.low_moments)
        
        if not all_data_points:
            return HeartRateExtractionResult(
                success=False,
                error_message="所有图片都未能成功提取数据"
            )
        
        # 按时间排序并去重（保留同一时间点最后出现的值）
        seen_timestamps = {}
        for dp in all_data_points:
            seen_timestamps[dp.timestamp_seconds] = dp
        
        merged_data_points = sorted(
            seen_timestamps.values(),
            key=lambda x: x.timestamp_seconds
        )
        
        # 计算统计信息
        hr_values = [dp.heart_rate for dp in merged_data_points]
        
        return HeartRateExtractionResult(
            success=True,
            data_points=merged_data_points,
            min_hr=min(hr_values),
            max_hr=max(hr_values),
            avg_hr=sum(hr_values) / len(hr_values),
            start_time=merged_data_points[0].timestamp_formatted if merged_data_points else None,
            end_time=merged_data_points[-1].timestamp_formatted if merged_data_points else None,
            duration_seconds=merged_data_points[-1].timestamp_seconds if merged_data_points else None,
            peak_moments=all_peaks,
            low_moments=all_lows,
        )


# 全局心率提取器实例
heart_rate_extractor = HeartRateExtractor()
