"""
ChartDataBuilder - 图表配置预构建模块
根据 DataProvider 提供的 ReportData 预构建所有图表的 ECharts 配置
"""
from dataclasses import dataclass
from typing import Dict, Any, List, Optional

from .data_provider import (
    ReportData,
    SegmentComparisonData,
    SegmentComparisonItem,
    PercentileRankingData,
    PacingAnalysisData,
    TimeLossAnalysisData,
    CohortAnalysisData,
    MappedHeartRateData,
    DivisionStatsData,
    AthleteResultData,
    PredictionData,
    PredictionSplitBreakdown,
    PacingConsistencyData,
)


# ==================== 常量定义 ====================

# 暗色主题配色
COLORS = {
    "primary": "#3b82f6",      # 蓝色
    "success": "#22c55e",      # 绿色
    "danger": "#ef4444",       # 红色
    "warning": "#fbbf24",      # 黄色
    "cyan": "#06b6d4",         # 青色
    "purple": "#a855f7",       # 紫色
    "pink": "#ec4899",         # 粉色
    "orange": "#f97316",       # 橙色
    "text": "#9ca3af",         # 文字颜色
    "text_light": "#d1d5db",   # 浅色文字
    "background": "transparent",
    "grid_line": "#374151",
}

# 热力图颜色映射
HEATMAP_COLORS = {
    "top_25": "#22c55e",       # 前25% - 绿色
    "top_50": "#86efac",       # 25-50% - 浅绿
    "bottom_50": "#fbbf24",    # 50-75% - 橙色
    "bottom_25": "#ef4444",    # 后25% - 红色
}

# 16段顺序
SEGMENTS_ORDER = [
    ("Run 1", "run"),
    ("SkiErg", "station"),
    ("Run 2", "run"),
    ("Sled Push", "station"),
    ("Run 3", "run"),
    ("Sled Pull", "station"),
    ("Run 4", "run"),
    ("Burpee Broad Jump", "station"),
    ("Run 5", "run"),
    ("Row Erg", "station"),
    ("Run 6", "run"),
    ("Farmers Carry", "station"),
    ("Run 7", "run"),
    ("Sandbag Lunges", "station"),
    ("Run 8", "run"),
    ("Wall Balls", "station"),
]


# ==================== 数据类定义 ====================

@dataclass
class ChartConfig:
    """单个图表配置"""
    chart_id: str
    chart_type: str
    title: str
    config: dict  # ECharts option


# ==================== ChartDataBuilder 类 ====================

class ChartDataBuilder:
    """
    预构建所有图表配置
    
    根据 ReportData 中的预计算数据，生成可直接使用的 ECharts 配置。
    不需要调用 LLM，确保图表生成的稳定性和一致性。
    """
    
    def build_all_charts(self, data: ReportData) -> Dict[str, ChartConfig]:
        """
        构建所有图表配置
        
        Args:
            data: ReportData 包含所有预计算数据
            
        Returns:
            Dict[str, ChartConfig]: chart_id -> ChartConfig 映射
        """
        charts: Dict[str, ChartConfig] = {}
        
        # 1. Performance Heatmap (16段表现热力图)
        if data.segment_comparison:
            charts["heatmap"] = self._build_heatmap(data.segment_comparison)
        
        # 2. Splits Breakdown (分段时间柱状图)
        if data.segment_comparison and data.division_stats:
            charts["splits_bar"] = self._build_splits_bar(
                data.segment_comparison,
                data.division_stats,
            )
        
        # 3. Percentile Ranking (百分位横向柱状图)
        if data.percentile_ranking:
            charts["percentile"] = self._build_percentile_chart(data.percentile_ranking)
        
        # 4. ZONEØ Radar (能力雷达图)
        if data.segment_comparison and data.pacing_analysis:
            charts["radar"] = self._build_radar_chart(
                data.segment_comparison,
                data.pacing_analysis,
                data.athlete_result,
            )
        
        # 5. Time Loss Waterfall (时间损耗瀑布图)
        if data.time_loss_analysis:
            charts["time_loss_waterfall"] = self._build_waterfall_chart(data.time_loss_analysis)
        
        # 6. HR-Pace Dual Axis (心率配速双轴图) - 需要心率数据
        if data.heart_rate_data and data.pacing_analysis:
            charts["hr_pace"] = self._build_hr_pace_chart(
                data.heart_rate_data,
                data.pacing_analysis,
            )
        
        # 7. Heart Rate Zones (心率区间饼图)
        if data.heart_rate_data and data.heart_rate_data.zones:
            charts["hr_zones"] = self._build_hr_zones_chart(data.heart_rate_data)
        
        # 8. Cohort Histogram (队列分布直方图)
        if data.cohort_analysis and data.division_stats:
            charts["cohort"] = self._build_cohort_histogram(
                data.cohort_analysis,
                data.division_stats,
                data.athlete_result,
            )
        
        # ==================== V2.1 新增图表 ====================
        
        # 9. Prediction Tiers (五档预测) - 前端渲染，后端提供数据
        if data.prediction_data:
            charts["prediction_tiers"] = self._build_prediction_tiers(
                data.prediction_data,
                data.athlete_result,
            )
        
        # 10. Prediction Density (预测分布曲线)
        if data.prediction_data:
            charts["prediction_density"] = self._build_prediction_density(
                data.prediction_data,
            )
        
        # 11. Pace Trend Line (配速走势图 - 第3章无心率时的降级图表)
        if data.pacing_analysis and not data.heart_rate_data:
            charts["pace_trend"] = self._build_pace_trend_chart(
                data.pacing_analysis,
            )
        
        # 12. Pacing Consistency Card (配速一致性卡片)
        if data.pacing_consistency:
            charts["pacing_consistency"] = self._build_pacing_consistency(
                data.pacing_consistency,
            )
        
        # 13. Dual Radar (双雷达图 - 第5章对标分析)
        if data.segment_comparison:
            charts["dual_radar"] = self._build_dual_radar(
                data.segment_comparison,
                data.athlete_result,
            )
        
        # 14. Distribution Histogram (全球分布直方图 - 第1章)
        if data.division_stats:
            charts["distribution_histogram"] = self._build_distribution_histogram(
                data.division_stats,
                data.athlete_result,
            )
        
        # 15. Split Breakdown Table (分段拆解表 - 第4章)
        if data.prediction_data and data.segment_comparison:
            charts["split_breakdown_table"] = self._build_split_breakdown_table(
                data.prediction_data,
                data.segment_comparison,
            )
        
        # 16. Horizontal Bar (功能站损耗排行 - 第2章)
        if data.time_loss_analysis:
            charts["horizontal_bar"] = self._build_horizontal_bar(
                data.time_loss_analysis,
            )
        
        # 17. Cohort Comparison (同水平对比 - 第5章)
        if data.cohort_analysis:
            charts["cohort_comparison"] = self._build_cohort_comparison(
                data.cohort_analysis,
                data.athlete_result,
            )
        
        # 18. Priority Matrix (训练优先级矩阵 - 第6章)
        if data.time_loss_analysis:
            charts["priority_matrix"] = self._build_priority_matrix(
                data.time_loss_analysis,
                data.segment_comparison,
            )
        
        # 注意：training_week_view 由 SectionAgent 生成 weekly_plan 后在前端渲染
        # 这里不预构建，而是在章节生成后由前端根据 structured_output.weekly_plan 渲染
        
        
        return charts
    
    # ==================== 1. Heatmap ====================
    
    def _build_heatmap(self, segment_data: SegmentComparisonData) -> ChartConfig:
        """
        构建 Performance Heatmap (16段表现热力图)
        
        颜色映射：
        - Top 25%: 绿色
        - 25-50%: 浅绿
        - 50-75%: 橙色
        - Bottom 25%: 红色
        """
        # 按比赛顺序排列数据
        ordered_segments = self._order_segments(segment_data.segments)
        
        # 如果没有数据，返回空配置
        if not ordered_segments:
            return ChartConfig(
                chart_id="heatmap",
                chart_type="heatmap",
                title="Performance Heatmap",
                config={"title": {"text": "暂无数据"}}
            )
        
        # 构建柱状图数据（更直观地显示百分位表现）
        # 使用柱状图替代热力图，更容易阅读
        x_labels = []
        percentile_data = []
        colors = []
        
        for seg in ordered_segments:
            x_labels.append(self._get_short_name(seg.segment_name))
            percentile_data.append(round(seg.percentile, 1))
            colors.append(self._get_percentile_color(seg.percentile))
        
        config = {
            "title": {
                "text": "Performance Heatmap",
                "subtext": f"16段表现百分位（越低越好）",
                "left": "center",
                "textStyle": {"color": COLORS["text_light"], "fontSize": 14},
                "subtextStyle": {"color": COLORS["text"], "fontSize": 11}
            },
            "tooltip": {
                "trigger": "axis",
                "axisPointer": {"type": "shadow"},
                "backgroundColor": "rgba(30, 30, 30, 0.9)",
                "borderColor": COLORS["grid_line"],
                "textStyle": {"color": COLORS["text_light"]},
                "formatter": self._get_heatmap_tooltip_js()
            },
            "grid": {
                "top": 70,
                "bottom": 80,
                "left": 50,
                "right": 20
            },
            "xAxis": {
                "type": "category",
                "data": x_labels,
                "axisLabel": {
                    "color": COLORS["text"],
                    "fontSize": 9,
                    "rotate": 45,
                    "interval": 0
                },
                "axisLine": {"lineStyle": {"color": COLORS["grid_line"]}},
                "splitLine": {"show": False}
            },
            "yAxis": {
                "type": "value",
                "name": "百分位%",
                "min": 0,
                "max": 100,
                "nameTextStyle": {"color": COLORS["text"]},
                "axisLabel": {"color": COLORS["text"]},
                "axisLine": {"lineStyle": {"color": COLORS["grid_line"]}},
                "splitLine": {"lineStyle": {"color": COLORS["grid_line"], "opacity": 0.3}}
            },
            "visualMap": {
                "show": True,
                "orient": "horizontal",
                "left": "center",
                "bottom": 5,
                "dimension": 1,  # 映射 Y 值（百分位）
                "pieces": [
                    {"min": 0, "max": 25, "color": HEATMAP_COLORS["top_25"], "label": "Top 25%"},
                    {"min": 25, "max": 50, "color": HEATMAP_COLORS["top_50"], "label": "25-50%"},
                    {"min": 50, "max": 75, "color": HEATMAP_COLORS["bottom_50"], "label": "50-75%"},
                    {"min": 75, "max": 100, "color": HEATMAP_COLORS["bottom_25"], "label": "Bottom 25%"},
                ],
                "textStyle": {"color": COLORS["text"], "fontSize": 9}
            },
            "series": [{
                "type": "bar",
                "data": [
                    {"value": percentile_data[i], "itemStyle": {"color": colors[i]}}
                    for i in range(len(percentile_data))
                ],
                "label": {
                    "show": True,
                    "position": "top",
                    "formatter": "{c}%",
                    "color": COLORS["text_light"],
                    "fontSize": 9
                },
                "barWidth": "60%",
                "itemStyle": {
                    "borderRadius": [4, 4, 0, 0]
                }
            }]
        }
        
        return ChartConfig(
            chart_id="heatmap",
            chart_type="bar",  # 改为柱状图
            title="Performance Heatmap",
            config=config
        )
    
    # ==================== 2. Splits Bar ====================
    
    def _build_splits_bar(
        self,
        segment_data: SegmentComparisonData,
        division_stats: DivisionStatsData,
    ) -> ChartConfig:
        """
        构建 Splits Breakdown (分段时间柱状图)
        
        运动员 vs 组别平均对比，16段数据
        """
        ordered_segments = self._order_segments(segment_data.segments)
        
        categories = []
        athlete_times = []
        avg_times = []
        
        for seg in ordered_segments:
            categories.append(self._get_short_name(seg.segment_name))
            # 转换为秒显示更直观
            athlete_times.append(round(seg.athlete_time * 60, 1) if seg.athlete_time else 0)
            avg_times.append(round(seg.avg_time * 60, 1) if seg.avg_time else 0)
        
        config = {
            "title": {
                "text": "Splits Breakdown",
                "subtext": "运动员 vs 组别平均 (秒)",
                "left": "center",
                "textStyle": {"color": COLORS["text_light"], "fontSize": 14},
                "subtextStyle": {"color": COLORS["text"], "fontSize": 11}
            },
            "tooltip": {
                "trigger": "axis",
                "axisPointer": {"type": "shadow"},
                "backgroundColor": "rgba(30, 30, 30, 0.9)",
                "borderColor": COLORS["grid_line"],
                "textStyle": {"color": COLORS["text_light"]}
            },
            "legend": {
                "data": ["运动员", "组别平均"],
                "bottom": 5,
                "textStyle": {"color": COLORS["text"]}
            },
            "grid": {
                "top": 70,
                "bottom": 60,
                "left": 50,
                "right": 20
            },
            "xAxis": {
                "type": "category",
                "data": categories,
                "axisLabel": {
                    "color": COLORS["text"],
                    "fontSize": 10,
                    "rotate": 45
                },
                "axisLine": {"lineStyle": {"color": COLORS["grid_line"]}}
            },
            "yAxis": {
                "type": "value",
                "name": "时间(秒)",
                "nameTextStyle": {"color": COLORS["text"]},
                "axisLabel": {"color": COLORS["text"]},
                "axisLine": {"lineStyle": {"color": COLORS["grid_line"]}},
                "splitLine": {"lineStyle": {"color": COLORS["grid_line"], "opacity": 0.3}}
            },
            "series": [
                {
                    "name": "运动员",
                    "type": "bar",
                    "data": athlete_times,
                    "itemStyle": {
                        "color": COLORS["primary"],
                        "borderRadius": [4, 4, 0, 0]
                    }
                },
                {
                    "name": "组别平均",
                    "type": "bar",
                    "data": avg_times,
                    "itemStyle": {
                        "color": COLORS["text"],
                        "opacity": 0.5,
                        "borderRadius": [4, 4, 0, 0]
                    }
                }
            ]
        }
        
        return ChartConfig(
            chart_id="splits_bar",
            chart_type="bar",
            title="Splits Breakdown",
            config=config
        )
    
    # ==================== 3. Percentile Chart ====================
    
    def _build_percentile_chart(self, ranking: PercentileRankingData) -> ChartConfig:
        """
        构建 Percentile Ranking (百分位横向柱状图)
        """
        categories = ["总体排名", "性别组排名", "组别排名"]
        
        # 百分位数据（转换为"前X%"显示）
        percentiles = [
            ranking.overall_percentile,
            ranking.gender_percentile,
            ranking.division_percentile,
        ]
        
        # 排名信息用于 tooltip
        rank_info = [
            f"{ranking.overall_rank}/{ranking.overall_total}",
            f"{ranking.gender_rank}/{ranking.gender_total}",
            f"{ranking.division_rank}/{ranking.division_total}",
        ]
        
        # 根据百分位设置颜色
        colors = [self._get_percentile_color(p) for p in percentiles]
        
        config = {
            "title": {
                "text": "Percentile Ranking",
                "subtext": "排名百分位 (越低越好)",
                "left": "center",
                "textStyle": {"color": COLORS["text_light"], "fontSize": 14},
                "subtextStyle": {"color": COLORS["text"], "fontSize": 11}
            },
            "tooltip": {
                "trigger": "axis",
                "axisPointer": {"type": "shadow"},
                "backgroundColor": "rgba(30, 30, 30, 0.9)",
                "borderColor": COLORS["grid_line"],
                "textStyle": {"color": COLORS["text_light"]},
                "formatter": self._get_percentile_tooltip_js(rank_info)
            },
            "grid": {
                "top": 70,
                "bottom": 20,
                "left": 100,
                "right": 60
            },
            "xAxis": {
                "type": "value",
                "min": 0,
                "max": 100,
                "axisLabel": {
                    "color": COLORS["text"],
                    "formatter": "{value}%"
                },
                "axisLine": {"lineStyle": {"color": COLORS["grid_line"]}},
                "splitLine": {"lineStyle": {"color": COLORS["grid_line"], "opacity": 0.3}}
            },
            "yAxis": {
                "type": "category",
                "data": categories,
                "axisLabel": {"color": COLORS["text"]},
                "axisLine": {"lineStyle": {"color": COLORS["grid_line"]}}
            },
            "series": [{
                "type": "bar",
                "data": [
                    {"value": percentiles[i], "itemStyle": {"color": colors[i]}}
                    for i in range(len(percentiles))
                ],
                "label": {
                    "show": True,
                    "position": "right",
                    "formatter": "{c}%",
                    "color": COLORS["text_light"]
                },
                "barWidth": 20,
                "itemStyle": {
                    "borderRadius": [0, 4, 4, 0]
                }
            }]
        }
        
        return ChartConfig(
            chart_id="percentile",
            chart_type="bar",
            title="Percentile Ranking",
            config=config
        )
    
    # ==================== 4. Radar Chart ====================
    
    def _build_radar_chart(
        self,
        segment_data: SegmentComparisonData,
        pacing_data: PacingAnalysisData,
        athlete_result: Optional[AthleteResultData],
    ) -> ChartConfig:
        """
        构建 ZONEØ 能力雷达图
        
        三个维度：
        1. 力量 - 基于功能站表现计算
        2. 有氧底座 - 基于跑步段表现计算
        3. 转换效率 - 基于 Roxzone 时间和配速衰减计算
        
        输出格式为前端 RadarChart 组件期望的格式：
        - dimensions: 维度定义
        - dataSets: 数据集
        """
        # 计算三维能力值 (0-100)
        strength_score = self._calculate_strength_score(segment_data.station_segments)
        endurance_score = self._calculate_endurance_score(segment_data.running_segments)
        efficiency_score = self._calculate_efficiency_score(pacing_data, athlete_result)
        
        # 计算综合评分和等级
        overall_score = int((strength_score + endurance_score + efficiency_score) / 3)
        
        # 生成前端 RadarChart 组件期望的配置格式
        config = {
            "dimensions": [
                {"name": "力量", "max": 100, "description": "功能站表现"},
                {"name": "有氧底座", "max": 100, "description": "跑步耐力"},
                {"name": "转换效率", "max": 100, "description": "Roxzone时间"},
            ],
            "dataSets": [
                {
                    "name": "运动员",
                    "values": [strength_score, endurance_score, efficiency_score]
                }
            ],
            "title": "ZONEØ 三维能力评估",
            "subtitle": f"综合评分: {overall_score}分",
            "showLegend": True,
        }
        
        return ChartConfig(
            chart_id="radar",
            chart_type="radar",
            title="ZONEØ 三维能力雷达图",
            config=config
        )
    
    # ==================== 5. Waterfall Chart ====================
    
    def _build_waterfall_chart(self, time_loss: TimeLossAnalysisData) -> ChartConfig:
        """
        构建 Time Loss Waterfall (时间损耗瀑布图)
        
        返回格式：适配前端 TimeLossWaterfall 组件
        props: { data: TimeLossItem[], title?: string, targetSaveSeconds?: number }
        
        难度映射：
        - 转换区(transition) → easy（容易改进）
        - 配速(pacing) → medium（中等难度）
        - 功能站(station) → hard（需要训练）
        """
        
        data = []
        easy_total = 0.0  # 计算容易改进的总秒数
        
        # 添加转换区损耗
        if time_loss.transition_loss and time_loss.transition_loss.loss_seconds > 0:
            loss_sec = round(time_loss.transition_loss.loss_seconds, 1)
            data.append({
                "source": "Roxzone转换",
                "lossSeconds": loss_sec,
                "difficulty": "easy",
                "suggestion": "优化站点间跑动路线，减少迷茫时间"
            })
            easy_total += loss_sec
        
        # 添加配速崩盘损耗
        if time_loss.pacing_loss and time_loss.pacing_loss.loss_seconds > 0:
            data.append({
                "source": "Run 8配速崩盘",
                "lossSeconds": round(time_loss.pacing_loss.loss_seconds, 1),
                "difficulty": "medium",
                "suggestion": "加强后段有氧耐力，避免提前掏空"
            })
        
        # 添加功能站损耗（取前4大）
        station_suggestions = {
            "SkiErg": "提高功率输出稳定性",
            "Sled Push": "加强腿部爆发力训练",
            "Sled Pull": "强化背部及握力",
            "Burpee Broad Jumps": "提升爆发力与节奏控制",
            "Rowing": "优化划船技术效率",
            "Farmers Carry": "强化核心与握力耐力",
            "Sandbag Lunges": "提升下肢稳定与耐力",
            "Wall Balls": "保持稳定的投掷节奏",
        }
        
        for loss in time_loss.station_losses[:4]:
            if loss.loss_seconds > 0:
                # 提取站点名（去掉"技术损耗"）
                name = loss.description.replace(" 技术损耗", "").strip()
                suggestion = station_suggestions.get(name, "针对性强化训练")
                
                data.append({
                    "source": name,
                    "lossSeconds": round(loss.loss_seconds, 1),
                    "difficulty": "hard",
                    "suggestion": suggestion
                })
        
        
        # 构建 config，适配 TimeLossWaterfall 组件的 props
        config = {
            "data": data,
            "title": "时间损耗分析",
            "targetSaveSeconds": round(easy_total, 1) if easy_total > 0 else None
        }
        
        return ChartConfig(
            chart_id="waterfall",
            chart_type="time_loss_waterfall",
            title="时间损耗瀑布图",
            config=config
        )
    
    # ==================== 6. HR-Pace Dual Axis ====================
    
    def _build_hr_pace_chart(
        self,
        hr_data: MappedHeartRateData,
        pacing_data: PacingAnalysisData,
    ) -> ChartConfig:
        """
        构建 HR-Pace Dual Axis (心率配速双轴图)
        
        需要心率数据才生成
        V2.2: 优先使用 VL 模型解析的真实心率数据点
        """
        categories = [f"Lap {lap.lap}" for lap in pacing_data.lap_times]
        pace_data = [round(lap.run_time * 60, 1) for lap in pacing_data.lap_times]  # 转为秒
        
        # 心率数据：优先使用 VL 模型解析的真实数据点
        hr_data_list = []
        
        if hr_data.data_points and len(hr_data.data_points) > 0:
            # ===== 使用真实心率数据 =====
            # 计算每个 Lap 的时间范围，然后取该范围内的平均心率
            total_time_seconds = sum(lap.lap_time * 60 for lap in pacing_data.lap_times if lap.lap_time)
            
            # 按时间累积计算每个 lap 的开始和结束时间
            cumulative_time = 0
            lap_boundaries = []
            for lap in pacing_data.lap_times:
                lap_start = cumulative_time
                # 每个 lap 包含 run + station，但心率图只取 run 部分的中间时间
                run_time_sec = (lap.run_time or 0) * 60
                lap_mid = cumulative_time + run_time_sec / 2  # 取跑步中间点
                cumulative_time += (lap.lap_time or 0) * 60
                lap_boundaries.append({
                    "start": lap_start,
                    "mid": lap_mid,
                    "end": cumulative_time,
                })
            
            # 将 data_points 按时间排序
            sorted_points = sorted(hr_data.data_points, key=lambda x: x.timestamp_seconds)
            
            for boundary in lap_boundaries:
                # 找出在该 lap 时间范围内的心率数据点
                lap_hr_values = [
                    dp.heart_rate for dp in sorted_points
                    if boundary["start"] <= dp.timestamp_seconds <= boundary["end"]
                ]
                
                if lap_hr_values:
                    # 使用该范围内的平均心率
                    avg_lap_hr = sum(lap_hr_values) / len(lap_hr_values)
                    hr_data_list.append(round(avg_lap_hr, 0))
                else:
                    # 如果该范围没有数据点，取最近的数据点
                    closest_point = min(
                        sorted_points,
                        key=lambda x: abs(x.timestamp_seconds - boundary["mid"]),
                        default=None
                    )
                    if closest_point:
                        hr_data_list.append(closest_point.heart_rate)
                    else:
                        hr_data_list.append(hr_data.avg_heart_rate or 0)
        
        elif hr_data.avg_heart_rate:
            # ===== 降级：使用平均心率模拟 =====
            avg_hr = hr_data.avg_heart_rate
            # 模拟各圈心率（逐渐上升）
            hr_data_list = [
                round(avg_hr * (0.85 + 0.02 * i), 0)
                for i in range(len(categories))
            ]
        else:
            hr_data_list = [0] * len(categories)
        
        config = {
            "title": {
                "text": "HR-Pace Analysis",
                "subtext": "心率与配速变化",
                "left": "center",
                "textStyle": {"color": COLORS["text_light"], "fontSize": 14},
                "subtextStyle": {"color": COLORS["text"], "fontSize": 11}
            },
            "tooltip": {
                "trigger": "axis",
                "backgroundColor": "rgba(30, 30, 30, 0.9)",
                "borderColor": COLORS["grid_line"],
                "textStyle": {"color": COLORS["text_light"]}
            },
            "legend": {
                "data": ["跑步配速", "心率"],
                "bottom": 5,
                "textStyle": {"color": COLORS["text"]}
            },
            "grid": {
                "top": 70,
                "bottom": 60,
                "left": 60,
                "right": 60
            },
            "xAxis": {
                "type": "category",
                "data": categories,
                "axisLabel": {"color": COLORS["text"]},
                "axisLine": {"lineStyle": {"color": COLORS["grid_line"]}}
            },
            "yAxis": [
                {
                    "type": "value",
                    "name": "配速(秒)",
                    "position": "left",
                    "nameTextStyle": {"color": COLORS["primary"]},
                    "axisLabel": {"color": COLORS["primary"]},
                    "axisLine": {"lineStyle": {"color": COLORS["primary"]}},
                    "splitLine": {"lineStyle": {"color": COLORS["grid_line"], "opacity": 0.3}}
                },
                {
                    "type": "value",
                    "name": "心率(bpm)",
                    "position": "right",
                    "nameTextStyle": {"color": COLORS["danger"]},
                    "axisLabel": {"color": COLORS["danger"]},
                    "axisLine": {"lineStyle": {"color": COLORS["danger"]}},
                    "splitLine": {"show": False}
                }
            ],
            "series": [
                {
                    "name": "跑步配速",
                    "type": "line",
                    "yAxisIndex": 0,
                    "data": pace_data,
                    "smooth": True,
                    "symbol": "circle",
                    "symbolSize": 8,
                    "lineStyle": {"color": COLORS["primary"], "width": 2},
                    "itemStyle": {"color": COLORS["primary"]},
                    "areaStyle": {
                        "color": {
                            "type": "linear",
                            "x": 0, "y": 0, "x2": 0, "y2": 1,
                            "colorStops": [
                                {"offset": 0, "color": "rgba(59, 130, 246, 0.3)"},
                                {"offset": 1, "color": "rgba(59, 130, 246, 0)"}
                            ]
                        }
                    }
                },
                {
                    "name": "心率",
                    "type": "line",
                    "yAxisIndex": 1,
                    "data": hr_data_list,
                    "smooth": True,
                    "symbol": "circle",
                    "symbolSize": 8,
                    "lineStyle": {"color": COLORS["danger"], "width": 2},
                    "itemStyle": {"color": COLORS["danger"]}
                }
            ]
        }
        
        return ChartConfig(
            chart_id="hr_pace",
            chart_type="line",
            title="HR-Pace Analysis",
            config=config
        )
    
    # ==================== 7. HR Zones ====================
    
    def _build_hr_zones_chart(self, hr_data: MappedHeartRateData) -> ChartConfig:
        """
        构建 Heart Rate Zones (心率区间饼图)
        """
        # 心率区间数据
        zones = hr_data.zones or {}
        
        pie_data = []
        zone_colors = [
            "#3b82f6",  # Zone 1 - 蓝色
            "#22c55e",  # Zone 2 - 绿色
            "#fbbf24",  # Zone 3 - 黄色
            "#f97316",  # Zone 4 - 橙色
            "#ef4444",  # Zone 5 - 红色
        ]
        
        zone_names = ["Zone 1 (恢复)", "Zone 2 (有氧)", "Zone 3 (节奏)", "Zone 4 (阈值)", "Zone 5 (无氧)"]
        
        for i, name in enumerate(zone_names):
            key = f"zone{i+1}"
            value = zones.get(key, zones.get(name, 0))
            if value > 0:
                pie_data.append({
                    "value": round(value, 1),
                    "name": name,
                    "itemStyle": {"color": zone_colors[i]}
                })
        
        # 如果没有数据，使用默认值
        if not pie_data:
            pie_data = [
                {"value": 10, "name": "Zone 1", "itemStyle": {"color": zone_colors[0]}},
                {"value": 25, "name": "Zone 2", "itemStyle": {"color": zone_colors[1]}},
                {"value": 35, "name": "Zone 3", "itemStyle": {"color": zone_colors[2]}},
                {"value": 20, "name": "Zone 4", "itemStyle": {"color": zone_colors[3]}},
                {"value": 10, "name": "Zone 5", "itemStyle": {"color": zone_colors[4]}},
            ]
        
        config = {
            "title": {
                "text": "Heart Rate Zones",
                "subtext": "心率区间分布",
                "left": "center",
                "textStyle": {"color": COLORS["text_light"], "fontSize": 14},
                "subtextStyle": {"color": COLORS["text"], "fontSize": 11}
            },
            "tooltip": {
                "trigger": "item",
                "formatter": "{b}: {c} min ({d}%)",
                "backgroundColor": "rgba(30, 30, 30, 0.9)",
                "borderColor": COLORS["grid_line"],
                "textStyle": {"color": COLORS["text_light"]}
            },
            "legend": {
                "orient": "vertical",
                "right": 10,
                "top": "center",
                "textStyle": {"color": COLORS["text"]}
            },
            "series": [{
                "type": "pie",
                "radius": ["35%", "65%"],
                "center": ["40%", "55%"],
                "data": pie_data,
                "label": {
                    "show": True,
                    "formatter": "{d}%",
                    "color": COLORS["text_light"],
                    "fontSize": 11
                },
                "labelLine": {
                    "lineStyle": {"color": COLORS["grid_line"]}
                },
                "emphasis": {
                    "itemStyle": {
                        "shadowBlur": 10,
                        "shadowOffsetX": 0,
                        "shadowColor": "rgba(0, 0, 0, 0.5)"
                    }
                }
            }]
        }
        
        return ChartConfig(
            chart_id="hr_zones",
            chart_type="pie",
            title="Heart Rate Zones",
            config=config
        )
    
    # ==================== 8. Cohort Histogram ====================
    
    def _build_cohort_histogram(
        self,
        cohort: CohortAnalysisData,
        division_stats: DivisionStatsData,
        athlete_result: Optional[AthleteResultData],
    ) -> ChartConfig:
        """
        构建 Cohort Histogram (队列分布直方图)
        
        显示组别的成绩分布和运动员位置
        """
        # 生成直方图分布数据
        # 基于组别统计生成模拟分布
        if division_stats.total_time and athlete_result and athlete_result.total_time:
            min_time = division_stats.total_time.min or 50
            max_time = division_stats.total_time.max or 120
            avg_time = division_stats.total_time.avg or 80
            athlete_time = athlete_result.total_time
            
            # 生成分布区间
            bins = 10
            bin_width = (max_time - min_time) / bins
            
            categories = []
            values = []
            athlete_bin = -1
            
            for i in range(bins):
                bin_start = min_time + i * bin_width
                bin_end = bin_start + bin_width
                categories.append(f"{int(bin_start)}-{int(bin_end)}")
                
                # 使用正态分布模拟（中间多，两边少）
                center = (min_time + max_time) / 2
                distance = abs((bin_start + bin_end) / 2 - center)
                count = int(division_stats.participant_count * 0.3 * (1 - distance / (max_time - min_time)))
                count = max(1, count)
                values.append(count)
                
                # 找到运动员所在的区间
                if bin_start <= athlete_time < bin_end:
                    athlete_bin = i
        else:
            # 默认数据
            categories = ["50-60", "60-70", "70-80", "80-90", "90-100"]
            values = [5, 15, 25, 10, 3]
            athlete_bin = 2
        
        # 标记运动员所在区间
        bar_data = []
        for i, v in enumerate(values):
            if i == athlete_bin:
                bar_data.append({
                    "value": v,
                    "itemStyle": {"color": COLORS["primary"]}
                })
            else:
                bar_data.append({
                    "value": v,
                    "itemStyle": {"color": COLORS["text"], "opacity": 0.5}
                })
        
        config = {
            "title": {
                "text": "Cohort Distribution",
                "subtext": f"组别成绩分布 (N={division_stats.participant_count})",
                "left": "center",
                "textStyle": {"color": COLORS["text_light"], "fontSize": 14},
                "subtextStyle": {"color": COLORS["text"], "fontSize": 11}
            },
            "tooltip": {
                "trigger": "axis",
                "axisPointer": {"type": "shadow"},
                "backgroundColor": "rgba(30, 30, 30, 0.9)",
                "borderColor": COLORS["grid_line"],
                "textStyle": {"color": COLORS["text_light"]}
            },
            "grid": {
                "top": 70,
                "bottom": 60,
                "left": 50,
                "right": 20
            },
            "xAxis": {
                "type": "category",
                "data": categories,
                "name": "总时间(分钟)",
                "nameLocation": "center",
                "nameGap": 35,
                "nameTextStyle": {"color": COLORS["text"]},
                "axisLabel": {
                    "color": COLORS["text"],
                    "fontSize": 10,
                    "rotate": 30
                },
                "axisLine": {"lineStyle": {"color": COLORS["grid_line"]}}
            },
            "yAxis": {
                "type": "value",
                "name": "人数",
                "nameTextStyle": {"color": COLORS["text"]},
                "axisLabel": {"color": COLORS["text"]},
                "axisLine": {"lineStyle": {"color": COLORS["grid_line"]}},
                "splitLine": {"lineStyle": {"color": COLORS["grid_line"], "opacity": 0.3}}
            },
            "series": [{
                "type": "bar",
                "data": bar_data,
                "barWidth": "60%",
                "itemStyle": {
                    "borderRadius": [4, 4, 0, 0]
                },
                "markLine": {
                    "silent": True,
                    "symbol": "none",
                    "label": {
                        "show": True,
                        "position": "end",
                        "formatter": "你的位置",
                        "color": COLORS["primary"]
                    },
                    "lineStyle": {
                        "color": COLORS["primary"],
                        "type": "dashed",
                        "width": 2
                    },
                    "data": [{"xAxis": athlete_bin}] if athlete_bin >= 0 else []
                }
            }]
        }
        
        return ChartConfig(
            chart_id="cohort",
            chart_type="bar",
            title="Cohort Distribution",
            config=config
        )
    
    # ==================== 辅助方法 ====================
    
    def _order_segments(self, segments: List[SegmentComparisonItem]) -> List[SegmentComparisonItem]:
        """按比赛顺序排列分段"""
        segment_dict = {s.segment_name: s for s in segments}
        ordered = []
        
        for name, _ in SEGMENTS_ORDER:
            if name in segment_dict:
                ordered.append(segment_dict[name])
        
        return ordered
    
    def _get_short_name(self, name: str) -> str:
        """获取分段短名称"""
        short_names = {
            "Run 1": "R1",
            "Run 2": "R2",
            "Run 3": "R3",
            "Run 4": "R4",
            "Run 5": "R5",
            "Run 6": "R6",
            "Run 7": "R7",
            "Run 8": "R8",
            "SkiErg": "Ski",
            "Sled Push": "Push",
            "Sled Pull": "Pull",
            "Burpee Broad Jump": "BBJ",
            "Row Erg": "Row",
            "Farmers Carry": "Farm",
            "Sandbag Lunges": "Lunge",
            "Wall Balls": "WB",
        }
        return short_names.get(name, name[:4])
    
    def _get_performance_level(self, percentile: float) -> int:
        """根据百分位返回表现等级 (0-3)"""
        if percentile <= 25:
            return 0  # Top 25%
        elif percentile <= 50:
            return 1  # 25-50%
        elif percentile <= 75:
            return 2  # 50-75%
        else:
            return 3  # Bottom 25%
    
    def _get_percentile_color(self, percentile: float) -> str:
        """根据百分位返回颜色"""
        if percentile <= 25:
            return COLORS["success"]
        elif percentile <= 50:
            return COLORS["primary"]
        elif percentile <= 75:
            return COLORS["warning"]
        else:
            return COLORS["danger"]
    
    def _calculate_strength_score(self, station_segments: List[SegmentComparisonItem]) -> float:
        """
        计算力量得分
        基于功能站表现，百分位越低（排名越靠前）得分越高
        """
        if not station_segments:
            return 50
        
        percentiles = [s.percentile for s in station_segments if s.percentile > 0]
        if not percentiles:
            return 50
        
        avg_percentile = sum(percentiles) / len(percentiles)
        # 转换：百分位越低，得分越高
        return round(100 - avg_percentile, 1)
    
    def _calculate_endurance_score(self, running_segments: List[SegmentComparisonItem]) -> float:
        """
        计算有氧底座得分
        基于跑步段表现
        """
        if not running_segments:
            return 50
        
        percentiles = [s.percentile for s in running_segments if s.percentile > 0]
        if not percentiles:
            return 50
        
        avg_percentile = sum(percentiles) / len(percentiles)
        return round(100 - avg_percentile, 1)
    
    def _calculate_efficiency_score(
        self,
        pacing_data: PacingAnalysisData,
        athlete_result: Optional[AthleteResultData],
    ) -> float:
        """
        计算转换效率得分
        基于配速衰减和 Roxzone 时间
        """
        score = 50  # 基础分
        
        # 配速衰减影响（衰减越小越好）
        if pacing_data.pace_decay_percent is not None:
            decay = abs(pacing_data.pace_decay_percent)
            if decay < 5:
                score += 25  # 非常均匀
            elif decay < 10:
                score += 15
            elif decay < 15:
                score += 5
            else:
                score -= 10  # 衰减严重
        
        # Roxzone 时间影响（越短越好，这里简化处理）
        if athlete_result and athlete_result.roxzone_time:
            roxzone = athlete_result.roxzone_time
            if roxzone < 3:  # 小于3分钟
                score += 20
            elif roxzone < 5:
                score += 10
            elif roxzone > 8:
                score -= 10
        
        return min(100, max(0, round(score, 1)))
    
    # ==================== Tooltip JS 模板 ====================
    
    def _get_heatmap_tooltip_js(self) -> str:
        """热力图/柱状图 tooltip 格式化"""
        return """function(params) {
            var percentile = params.value;
            var level = '';
            if (percentile <= 25) level = 'Top 25% 🟢';
            else if (percentile <= 50) level = '25-50% 🟡';
            else if (percentile <= 75) level = '50-75% 🟠';
            else level = 'Bottom 25% 🔴';
            return params.name + '<br/>百分位: ' + percentile + '%<br/>等级: ' + level;
        }"""
    
    def _get_percentile_tooltip_js(self, rank_info: List[str]) -> str:
        """百分位图 tooltip 格式化"""
        return f"""function(params) {{
            var ranks = {rank_info};
            var idx = params[0].dataIndex;
            return params[0].name + '<br/>百分位: ' + params[0].value + '%<br/>排名: ' + ranks[idx];
        }}"""
    
    def _get_waterfall_tooltip_js(self) -> str:
        """瀑布图 tooltip 格式化"""
        return """function(params) {
            for (var i = 0; i < params.length; i++) {
                if (params[i].seriesName === '损耗') {
                    return params[i].name + '<br/>损耗: ' + params[i].value + ' 秒';
                }
            }
            return '';
        }"""
    
    # ==================== V2.1 新增图表构建方法 ====================
    
    def _build_prediction_tiers(
        self,
        prediction_data: PredictionData,
        athlete_result: Optional[AthleteResultData],
    ) -> ChartConfig:
        """
        构建五档预测数据 (前端渲染)
        
        前端使用 PredictionTiers 组件，后端提供结构化数据
        """
        current_time_formatted = ""
        if athlete_result and athlete_result.total_time:
            total_seconds = int(athlete_result.total_time * 60)
            hours = total_seconds // 3600
            mins = (total_seconds % 3600) // 60
            secs = total_seconds % 60
            current_time_formatted = f"{hours}:{mins:02d}:{secs:02d}"
        
        # 转换五档数据
        tiers = {}
        for tier_key, tier_data in prediction_data.tiers.items():
            tiers[tier_key] = {
                "label": tier_key.capitalize(),
                "percentile": tier_data.get("percentile", 0),
                "time_seconds": tier_data.get("time_seconds", 0),
                "delta": tier_data.get("delta", 0),
            }
        
        return ChartConfig(
            chart_id="prediction_tiers",
            chart_type="prediction_tiers",
            title="下场比赛预测区间",
            config={
                "subtitle": "基于同水平运动员历史表现的统计预测",
                "tiers": tiers,
                "currentTime": current_time_formatted,
                "currentTimeSeconds": prediction_data.current_time_seconds,
                "statistics": {
                    "sample_size": prediction_data.sample_size,
                    "improvement_rate": prediction_data.improvement_rate,
                    "avg_improvement": prediction_data.avg_improvement,
                    "variance": prediction_data.variance,
                    "time_bin": prediction_data.time_bin,
                },
            },
        )
    
    def _build_prediction_density(
        self,
        prediction_data: PredictionData,
    ) -> ChartConfig:
        """
        构建预测概率密度曲线
        
        ECharts 柱状图模拟分布曲线
        """
        curve_data = prediction_data.distribution_curve or []
        
        # 如果没有曲线数据，生成默认分布
        if not curve_data and prediction_data.current_time_seconds > 0:
            import math
            mean = prediction_data.current_time_seconds / 60  # 转为分钟
            std = (prediction_data.variance or 600) / 60
            
            for x_min in range(int(mean - 3 * std), int(mean + 3 * std), 1):
                z = (x_min - mean) / std if std > 0 else 0
                density = math.exp(-0.5 * z * z) * 2
                curve_data.append([x_min, density])
        
        # 期望值（分钟）
        expected_minutes = 0
        if prediction_data.tiers and "expected" in prediction_data.tiers:
            expected_minutes = prediction_data.tiers["expected"].get("time_seconds", 0) / 60
        
        # 计算范围
        low_minutes = (prediction_data.tiers.get("excellent", {}).get("time_seconds", 0) or 0) / 60
        high_minutes = (prediction_data.tiers.get("poor", {}).get("time_seconds", 0) or 0) / 60
        
        return ChartConfig(
            chart_id="prediction_density",
            chart_type="prediction_density",
            title="Performance Distribution",
            config={
                "subtitle": f"Based on {prediction_data.sample_size:,} adjacent race pairs",
                "curveData": curve_data,
                "expected": expected_minutes,
                "variance": prediction_data.variance or 600,
                "range": {
                    "low": low_minutes,
                    "high": high_minutes,
                },
                "sampleSize": prediction_data.sample_size,
                "improvementRate": prediction_data.improvement_rate,
            },
        )
    
    def _build_pace_trend_chart(
        self,
        pacing_data: PacingAnalysisData,
    ) -> ChartConfig:
        """
        构建配速走势图 (第3章无心率数据时的降级图表)
        
        显示 8 段跑步的配速趋势
        """
        lap_times = pacing_data.lap_times or []
        
        # 提取跑步时间数据
        run_data = []
        for lap in lap_times:
            # LapTimeData 是 dataclass，使用属性访问
            lap_idx = lap.lap if hasattr(lap, 'lap') else lap.get("lap", 0) if isinstance(lap, dict) else 0
            run_time = lap.run_time if hasattr(lap, 'run_time') else lap.get("run_time", 0) if isinstance(lap, dict) else 0
            if run_time > 0:
                pace_per_km = run_time  # 假设每圈1km
                run_data.append({
                    "lap": f"Run {lap_idx}",
                    "time_minutes": run_time,
                    "pace_seconds": round(run_time * 60, 1),
                })
        
        # 计算趋势线（线性回归）
        if len(run_data) >= 2:
            x_vals = list(range(len(run_data)))
            y_vals = [d["time_minutes"] for d in run_data]
            
            n = len(x_vals)
            sum_x = sum(x_vals)
            sum_y = sum(y_vals)
            sum_xy = sum(x * y for x, y in zip(x_vals, y_vals))
            sum_xx = sum(x * x for x in x_vals)
            
            slope = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x) if (n * sum_xx - sum_x * sum_x) != 0 else 0
            intercept = (sum_y - slope * sum_x) / n
            
            trend_line = [{"lap": d["lap"], "trend": round(intercept + slope * i, 2)} for i, d in enumerate(run_data)]
        else:
            trend_line = []
        
        # 找出配速衰减点
        decay_points = []
        for i in range(1, len(run_data)):
            if run_data[i]["time_minutes"] > run_data[i-1]["time_minutes"] * 1.05:
                decay_points.append(i)
        
        return ChartConfig(
            chart_id="pace_trend",
            chart_type="pace_trend",
            title="配速走势分析",
            config={
                "subtitle": "8段跑步配速趋势与衰减识别",
                "echart_option": {
                    "xAxis": {
                        "type": "category",
                        "data": [d["lap"] for d in run_data],
                        "axisLabel": {"rotate": 0},
                    },
                    "yAxis": {
                        "type": "value",
                        "name": "配速 (分钟/圈)",
                        "inverse": False,
                    },
                    "series": [
                        {
                            "name": "实际配速",
                            "type": "line",
                            "data": [d["time_minutes"] for d in run_data],
                            "smooth": True,
                            "symbol": "circle",
                            "symbolSize": 8,
                            "itemStyle": {"color": COLORS["cyan"]},
                            "areaStyle": {
                                "color": {
                                    "type": "linear",
                                    "x": 0, "y": 0, "x2": 0, "y2": 1,
                                    "colorStops": [
                                        {"offset": 0, "color": "rgba(0, 212, 255, 0.3)"},
                                        {"offset": 1, "color": "rgba(0, 212, 255, 0.02)"},
                                    ],
                                },
                            },
                            "markPoint": {
                                "data": [
                                    {"type": "min", "name": "最快", "itemStyle": {"color": COLORS["success"]}},
                                    {"type": "max", "name": "最慢", "itemStyle": {"color": COLORS["danger"]}},
                                ],
                                "label": {"fontSize": 10},
                            },
                            "markLine": {
                                "data": [{"type": "average", "name": "平均"}],
                                "lineStyle": {"type": "dashed", "color": COLORS["warning"]},
                            },
                        },
                        {
                            "name": "趋势线",
                            "type": "line",
                            "data": [t["trend"] for t in trend_line] if trend_line else [],
                            "smooth": False,
                            "lineStyle": {"type": "dashed", "color": COLORS["purple"], "width": 2},
                            "symbol": "none",
                        },
                    ],
                    "tooltip": {
                        "trigger": "axis",
                        "formatter": "{b}<br/>配速: {c} 分钟/圈",
                    },
                },
                "run_data": run_data,
                "trend_line": trend_line,
                "decay_points": decay_points,
                "strategy_type": pacing_data.strategy_type,
                "pace_decay_percent": pacing_data.pace_decay_percent,
            },
        )
    
    def _build_pacing_consistency(
        self,
        pacing_consistency: PacingConsistencyData,
    ) -> ChartConfig:
        """
        构建配速一致性卡片数据
        
        前端使用 PacingConsistencyCard 组件
        """
        return ChartConfig(
            chart_id="pacing_consistency",
            chart_type="pacing_consistency",
            title="配速一致性分析",
            config={
                "subtitle": "Lap-to-Lap Swing & Spread Analysis",
                "lapSwing": pacing_consistency.lap_swing,
                "maxLapSwing": pacing_consistency.max_lap_swing,
                "avgPace": pacing_consistency.avg_pace_middle,
                "spread": pacing_consistency.spread,
                "cohortAvgSpread": pacing_consistency.cohort_avg_spread,
                "vsCohort": pacing_consistency.vs_cohort,
                "rating": pacing_consistency.consistency_rating,
                "lapDeviations": pacing_consistency.lap_deviations,
                "fastestLap": pacing_consistency.fastest_lap,
                "slowestLap": pacing_consistency.slowest_lap,
            },
        )
    
    def _build_dual_radar(
        self,
        segment_comparison: SegmentComparisonData,
        athlete_result: Optional[AthleteResultData],
    ) -> ChartConfig:
        """
        构建双雷达图 (第5章对标分析)
        
        分为两个雷达：
        1. Workout Stations 雷达 (8个功能站)
        2. Running + Roxzone 雷达 (8段跑步 + 转换区)
        """
        segments = segment_comparison.segments or []
        
        # 分离功能站和跑步数据
        workout_data = []
        running_data = []
        
        for seg in segments:
            name = seg.segment_name or ""
            # 百分位转换为能力值 (百分位越低越好，转换为 100 - percentile)
            ability_value = 100 - (seg.percentile or 50)
            
            if "Run" in name or "run" in name.lower():
                running_data.append({
                    "name": name,
                    "value": ability_value,
                    "max": 100,
                })
            else:
                workout_data.append({
                    "name": name,
                    "value": ability_value,
                    "max": 100,
                })
        
        # 添加 Roxzone 到 running 数据
        if athlete_result and athlete_result.roxzone_time:
            # 计算所有分段的平均百分位作为 Roxzone 的估算值
            all_percentiles = [seg.percentile for seg in segments if seg.percentile is not None]
            avg_percentile = sum(all_percentiles) / len(all_percentiles) if all_percentiles else 50
            roxzone_ability = 100 - avg_percentile
            running_data.append({
                "name": "Roxzone",
                "value": roxzone_ability,
                "max": 100,
            })
        
        return ChartConfig(
            chart_id="dual_radar",
            chart_type="dual_radar",
            title="双维度能力对比",
            config={
                "workoutData": workout_data,
                "runningData": running_data,
                "athleteName": athlete_result.name if athlete_result else "运动员",
                "comparisonName": "组别平均",
            },
        )
    
    def _build_distribution_histogram(
        self,
        division_stats: DivisionStatsData,
        athlete_result: Optional[AthleteResultData],
    ) -> ChartConfig:
        """
        构建全球分布直方图 (第1章成绩总览)
        
        展示组别成绩分布 + 用户位置高亮
        """
        # 生成分布区间 (以5分钟为间隔)
        min_time = 45  # 最快约45分钟
        max_time = 120  # 最慢约120分钟
        bin_size = 5
        
        bins = []
        counts = []
        
        # 简化处理：根据组别统计生成模拟分布
        avg_time = division_stats.total_time.avg if division_stats.total_time else 75
        total_count = division_stats.participant_count or 100
        
        for start in range(min_time, max_time, bin_size):
            end = start + bin_size
            bins.append(f"{start}-{end}")
            
            # 正态分布模拟
            center = avg_time
            sigma = 15  # 标准差约15分钟
            # 简化的高斯分布计算
            import math
            bin_center = start + bin_size / 2
            gaussian = math.exp(-((bin_center - center) ** 2) / (2 * sigma ** 2))
            count = int(total_count * gaussian * 0.3)  # 缩放因子
            counts.append(max(1, count))
        
        user_time = athlete_result.total_time if athlete_result else avg_time
        user_percentile = 50  # 默认百分位
        if athlete_result and division_stats and division_stats.total_time:
            # 简单估算用户百分位（基于用户时间与平均时间的比较）
            if avg_time and user_time:
                # 低于平均时间，百分位更好（更小）
                if user_time < avg_time:
                    user_percentile = max(5, int(50 * user_time / avg_time))
                else:
                    user_percentile = min(95, int(50 + 50 * (user_time - avg_time) / avg_time))
        
        return ChartConfig(
            chart_id="distribution_histogram",
            chart_type="distribution_histogram",
            title="成绩分布",
            config={
                "bins": bins,
                "counts": counts,
                "userValue": user_time,
                "userPercentile": user_percentile,
                "title": "组别成绩分布",
            },
        )
    
    def _build_split_breakdown_table(
        self,
        prediction_data: PredictionData,
        segment_comparison: SegmentComparisonData,
    ) -> ChartConfig:
        """
        构建分段拆解目标表 (第4章预测)
        
        展示各分段的当前成绩、目标成绩和提升幅度
        """
        segments = segment_comparison.segments or []
        splits = []
        
        total_current = 0
        total_target = 0
        
        for seg in segments:
            name = seg.segment_name or ""
            current = seg.athlete_time or 0
            
            # 目标 = 当前 × (1 - 预期提升比例)
            improvement_rate = prediction_data.improvement_rate or 0.02
            target = current * (1 - improvement_rate)
            improvement = current - target
            
            # 优先级基于百分位
            percentile = seg.percentile or 50
            if percentile > 70:
                priority = "high"
            elif percentile > 40:
                priority = "medium"
            else:
                priority = "low"
            
            total_current += current
            total_target += target
            
            splits.append({
                "segment": name,
                "current": round(current * 60, 1),  # 转换为秒
                "target": round(target * 60, 1),
                "improvement": round(improvement * 60, 1),
                "priority": priority,
            })
        
        return ChartConfig(
            chart_id="split_breakdown_table",
            chart_type="split_breakdown_table",
            title="分段拆解目标",
            config={
                "splits": splits,
                "totalCurrent": round(total_current * 60),
                "totalTarget": round(total_target * 60),
            },
        )
    
    # ==================== 16. Horizontal Bar (功能站损耗排行) ====================
    
    def _build_horizontal_bar(
        self,
        time_loss_analysis: TimeLossAnalysisData,
    ) -> ChartConfig:
        """
        构建功能站损耗排行横向柱状图 (第2章时间损失)
        
        按损耗大小排列功能站，显示每个站点的时间损耗
        """
        items = []
        
        # 添加功能站损耗
        for loss in time_loss_analysis.station_losses:
            items.append({
                "name": loss.description.replace(" 技术损耗", ""),
                "value": round(loss.loss_seconds, 1),
                "category": "station",
                "reference": round(loss.reference_value * 60, 1) if loss.reference_value else 0,
                "actual": round(loss.athlete_value * 60, 1) if loss.athlete_value else 0,
            })
        
        # 添加转换区损耗
        if time_loss_analysis.transition_loss:
            items.append({
                "name": "Roxzone",
                "value": round(time_loss_analysis.transition_loss.loss_seconds, 1),
                "category": "transition",
                "reference": round(time_loss_analysis.transition_loss.reference_value * 60, 1) if time_loss_analysis.transition_loss.reference_value else 0,
                "actual": round(time_loss_analysis.transition_loss.athlete_value * 60, 1) if time_loss_analysis.transition_loss.athlete_value else 0,
            })
        
        # 添加配速崩盘损耗
        if time_loss_analysis.pacing_loss:
            items.append({
                "name": "配速崩盘",
                "value": round(time_loss_analysis.pacing_loss.loss_seconds, 1),
                "category": "pacing",
                "reference": round(time_loss_analysis.pacing_loss.reference_value * 60, 1) if time_loss_analysis.pacing_loss.reference_value else 0,
                "actual": round(time_loss_analysis.pacing_loss.athlete_value * 60, 1) if time_loss_analysis.pacing_loss.athlete_value else 0,
            })
        
        # 按损耗大小排序
        items.sort(key=lambda x: x["value"], reverse=True)
        
        return ChartConfig(
            chart_id="horizontal_bar",
            chart_type="horizontal_bar",
            title="时间损耗排行",
            config={
                "items": items,
                "totalLoss": round(time_loss_analysis.total_loss_seconds, 1),
            },
        )
    
    # ==================== 17. Cohort Comparison (同水平对比) ====================
    
    def _build_cohort_comparison(
        self,
        cohort_analysis: CohortAnalysisData,
        athlete_result: Optional[AthleteResultData],
    ) -> ChartConfig:
        """
        构建同水平运动员对比卡片 (第5章对标分析)
        
        显示排名相近的选手对比
        """
        # 前面的选手
        peers_ahead = []
        for peer in cohort_analysis.peers_ahead:
            gap = (peer.total_time - (athlete_result.total_time or 0)) * 60 if athlete_result and athlete_result.total_time else 0
            peers_ahead.append({
                "name": peer.name,
                "rank": peer.rank,
                "totalTime": round(peer.total_time * 60),  # 秒
                "gap": round(gap, 1),
            })
        
        # 后面的选手
        peers_behind = []
        for peer in cohort_analysis.peers_behind:
            gap = (peer.total_time - (athlete_result.total_time or 0)) * 60 if athlete_result and athlete_result.total_time else 0
            peers_behind.append({
                "name": peer.name,
                "rank": peer.rank,
                "totalTime": round(peer.total_time * 60),  # 秒
                "gap": round(gap, 1),
            })
        
        return ChartConfig(
            chart_id="cohort_comparison",
            chart_type="cohort_comparison",
            title="同水平选手对比",
            config={
                "athleteName": athlete_result.name if athlete_result else "",
                "athleteRank": cohort_analysis.target_rank,
                "athleteTime": round(athlete_result.total_time * 60) if athlete_result and athlete_result.total_time else 0,
                "peerRange": cohort_analysis.peer_range,
                "peersAhead": peers_ahead,
                "peersBehind": peers_behind,
                "timeToNextLevel": round(cohort_analysis.time_to_next_level, 1) if cohort_analysis.time_to_next_level else None,
            },
        )
    
    # ==================== 18. Training Week View (周训练日历) ====================
    
    def _build_training_week_view(
        self,
        weekly_plan: List[Dict[str, Any]],
    ) -> ChartConfig:
        """
        构建周训练日历视图 (第6章训练建议)
        
        显示7天的训练计划安排
        """
        # 确保有7天的数据
        days = []
        day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        day_names_zh = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
        
        for i, day_name in enumerate(day_names):
            # 查找对应的计划
            plan = None
            for p in weekly_plan:
                if p.get("day") == day_name or p.get("dayName") == day_names_zh[i]:
                    plan = p
                    break
            
            if plan:
                days.append({
                    "day": day_name,
                    "dayName": day_names_zh[i],
                    "type": plan.get("type", "Rest"),
                    "content": plan.get("content", ""),
                    "duration": plan.get("duration_minutes", 0),
                    "intensity": plan.get("intensity", "low"),
                })
            else:
                days.append({
                    "day": day_name,
                    "dayName": day_names_zh[i],
                    "type": "Rest",
                    "content": "休息",
                    "duration": 0,
                    "intensity": "low",
                })
        
        return ChartConfig(
            chart_id="training_week_view",
            chart_type="training_week_view",
            title="周训练日历",
            config={
                "days": days,
                "weekNumber": 1,
                "phase": "基础期",
            },
        )
    
    # ==================== 19. Priority Matrix (训练优先级矩阵) ====================
    
    def _build_priority_matrix(
        self,
        time_loss_analysis: TimeLossAnalysisData,
        segment_comparison: Optional[SegmentComparisonData],
    ) -> ChartConfig:
        """
        构建训练优先级矩阵 (第6章训练建议)
        
        2x2 象限图：X轴=影响程度，Y轴=改进难度
        """
        items = []
        
        # 从时间损耗分析中提取优先级
        for loss in time_loss_analysis.station_losses:
            # 影响程度 = 损耗秒数归一化 (0-100)
            impact = min(100, (loss.loss_seconds / 60) * 20)  # 3分钟损耗 = 100
            
            # 改进难度估算：功能站一般是技术/力量，难度中等
            difficulty = 50  # 默认中等难度
            
            # 根据功能站类型调整难度
            name = loss.description.replace(" 技术损耗", "")
            if "Sled" in name or "Farmers" in name or "Sandbag" in name:
                difficulty = 70  # 力量类较难
            elif "SkiErg" in name or "Row" in name:
                difficulty = 40  # 有氧类较易
            elif "Wall Balls" in name or "Burpee" in name:
                difficulty = 60  # 混合类中等偏难
            
            items.append({
                "name": name,
                "impact": round(impact, 1),
                "difficulty": difficulty,
                "lossSeconds": round(loss.loss_seconds, 1),
                "quadrant": self._get_quadrant(impact, difficulty),
            })
        
        # 添加配速/耐力改进项
        if time_loss_analysis.pacing_loss and time_loss_analysis.pacing_loss.loss_seconds > 30:
            impact = min(100, (time_loss_analysis.pacing_loss.loss_seconds / 60) * 20)
            items.append({
                "name": "配速管理",
                "impact": round(impact, 1),
                "difficulty": 60,  # 需要长期训练
                "lossSeconds": round(time_loss_analysis.pacing_loss.loss_seconds, 1),
                "quadrant": self._get_quadrant(impact, 60),
            })
        
        if time_loss_analysis.transition_loss and time_loss_analysis.transition_loss.loss_seconds > 20:
            impact = min(100, (time_loss_analysis.transition_loss.loss_seconds / 60) * 20)
            items.append({
                "name": "转换效率",
                "impact": round(impact, 1),
                "difficulty": 30,  # 相对容易改进
                "lossSeconds": round(time_loss_analysis.transition_loss.loss_seconds, 1),
                "quadrant": self._get_quadrant(impact, 30),
            })
        
        return ChartConfig(
            chart_id="priority_matrix",
            chart_type="priority_matrix",
            title="训练优先级矩阵",
            config={
                "items": items,
                "xLabel": "影响程度",
                "yLabel": "改进难度",
                "quadrants": {
                    "topRight": "长期投资",
                    "topLeft": "低优先级",
                    "bottomRight": "快速见效",
                    "bottomLeft": "可忽略",
                },
            },
        )
    
    def _get_quadrant(self, impact: float, difficulty: float) -> str:
        """根据影响程度和难度确定象限"""
        if impact >= 50:
            return "topRight" if difficulty >= 50 else "bottomRight"
        else:
            return "topLeft" if difficulty >= 50 else "bottomLeft"


# ==================== 全局实例 ====================

_chart_builder: Optional[ChartDataBuilder] = None


def get_chart_builder() -> ChartDataBuilder:
    """获取全局 ChartDataBuilder 实例"""
    global _chart_builder
    if _chart_builder is None:
        _chart_builder = ChartDataBuilder()
    return _chart_builder
