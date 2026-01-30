"""
数据填充脚本 - 从历史数据计算并填充 prediction_stats 和 global_distribution 表
版本: v1.0

使用方法:
    python -m scripts.populate_prediction_stats

功能:
    1. 从 results 表读取历史数据
    2. 计算各时间区间的预测统计
    3. 计算全球分布数据
    4. 写入 prediction_stats 和 global_distribution 表
"""
import sys
import os
import json
import math
from collections import defaultdict
from typing import Dict, List, Any, Tuple

# 添加项目根目录到 path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.db.database import SYNC_DATABASE_URL
from app.db.models import Result, PredictionStats, GlobalDistribution, Base


def get_time_bin(total_minutes: float) -> str:
    """将成绩转为时间区间 (5分钟间隔)"""
    bin_start = int(total_minutes // 5) * 5
    bin_end = bin_start + 5
    return f"{bin_start}-{bin_end}"


def calculate_percentile(values: List[float], percentile: int) -> float:
    """计算百分位值"""
    if not values:
        return 0
    
    sorted_values = sorted(values)
    n = len(sorted_values)
    idx = int(n * percentile / 100)
    idx = max(0, min(idx, n - 1))
    return sorted_values[idx]


def generate_distribution_curve(mean: float, std: float, n_points: int = 50) -> List[List[float]]:
    """生成正态分布曲线数据"""
    curve = []
    
    if std <= 0:
        std = 600  # 默认 10 分钟标准差
    
    start = mean - 3 * std
    end = mean + 3 * std
    step = max(1, (end - start) / n_points)
    
    x = start
    while x <= end:
        z = (x - mean) / std
        density = (1 / (std * math.sqrt(2 * math.pi))) * math.exp(-0.5 * z * z)
        curve.append([x / 60, density * 60])  # 转为分钟
        x += step
    
    return curve


def populate_prediction_stats(session, results: List[Result]):
    """填充 prediction_stats 表"""
    print("开始计算预测统计数据...")
    
    # 按 (gender, division, time_bin) 分组
    grouped_data: Dict[Tuple[str, str, str], List[Result]] = defaultdict(list)
    
    for r in results:
        if r.total_time is None or not r.gender or not r.division:
            continue
        
        time_bin = get_time_bin(r.total_time)
        key = (r.gender, r.division, time_bin)
        grouped_data[key].append(r)
    
    stats_count = 0
    
    for (gender, division, time_bin), group_results in grouped_data.items():
        if len(group_results) < 10:  # 样本量太小跳过
            continue
        
        total_times_seconds = [r.total_time * 60 for r in group_results]
        
        # 计算百分位
        p5 = calculate_percentile(total_times_seconds, 5)
        p25 = calculate_percentile(total_times_seconds, 25)
        p50 = calculate_percentile(total_times_seconds, 50)
        p75 = calculate_percentile(total_times_seconds, 75)
        p95 = calculate_percentile(total_times_seconds, 95)
        
        # 计算方差
        mean = sum(total_times_seconds) / len(total_times_seconds)
        variance = sum((t - mean) ** 2 for t in total_times_seconds) / len(total_times_seconds)
        std_dev = math.sqrt(variance)
        
        # 模拟进步率 (实际需要 adjacent_race_pairs 数据)
        improvement_rate = 0.68  # 默认 68%
        avg_improvement = 150   # 默认 2.5 分钟
        
        # 生成分布曲线
        distribution_curve = generate_distribution_curve(mean, std_dev)
        
        # 计算分段拆解
        split_breakdown = calculate_split_breakdown(group_results)
        
        # 创建或更新记录
        existing = session.query(PredictionStats).filter(
            PredictionStats.time_bin == time_bin,
            PredictionStats.gender == gender,
            PredictionStats.division == division
        ).first()
        
        if existing:
            existing.sample_size = len(group_results)
            existing.improvement_rate = improvement_rate
            existing.avg_improvement = int(avg_improvement)
            existing.percentile_5 = int(p5)
            existing.percentile_25 = int(p25)
            existing.percentile_50 = int(p50)
            existing.percentile_75 = int(p75)
            existing.percentile_95 = int(p95)
            existing.variance = int(variance)
            existing.split_breakdown = json.dumps(split_breakdown)
            existing.distribution_curve = json.dumps(distribution_curve)
        else:
            stats = PredictionStats(
                time_bin=time_bin,
                gender=gender,
                division=division,
                sample_size=len(group_results),
                improvement_rate=improvement_rate,
                avg_improvement=int(avg_improvement),
                percentile_5=int(p5),
                percentile_25=int(p25),
                percentile_50=int(p50),
                percentile_75=int(p75),
                percentile_95=int(p95),
                variance=int(variance),
                split_breakdown=json.dumps(split_breakdown),
                distribution_curve=json.dumps(distribution_curve),
            )
            session.add(stats)
        
        stats_count += 1
    
    session.commit()
    print(f"已填充 {stats_count} 条预测统计记录")
    return stats_count


def calculate_split_breakdown(results: List[Result]) -> List[Dict[str, Any]]:
    """计算分段拆解数据"""
    segments = [
        ("SkiErg", "skierg_time"),
        ("Sled Push", "sled_push_time"),
        ("Sled Pull", "sled_pull_time"),
        ("Burpee Broad Jump", "burpee_broad_jump_time"),
        ("Row Erg", "row_erg_time"),
        ("Farmers Carry", "farmers_carry_time"),
        ("Sandbag Lunges", "sandbag_lunges_time"),
        ("Wall Balls", "wall_balls_time"),
        ("Run 1", "run1_time"),
        ("Run 2", "run2_time"),
        ("Run 3", "run3_time"),
        ("Run 4", "run4_time"),
        ("Run 5", "run5_time"),
        ("Run 6", "run6_time"),
        ("Run 7", "run7_time"),
        ("Run 8", "run8_time"),
    ]
    
    breakdown = []
    
    for seg_name, seg_field in segments:
        times = []
        for r in results:
            t = getattr(r, seg_field)
            if t is not None and t > 0:
                times.append(t * 60)  # 转为秒
        
        if len(times) < 5:
            breakdown.append({
                "segment": seg_name,
                "field": seg_field,
                "excellent": None,
                "great": None,
                "expected": None,
                "subpar": None,
                "poor": None,
            })
            continue
        
        breakdown.append({
            "segment": seg_name,
            "field": seg_field,
            "excellent": int(calculate_percentile(times, 5)),
            "great": int(calculate_percentile(times, 25)),
            "expected": int(calculate_percentile(times, 50)),
            "subpar": int(calculate_percentile(times, 75)),
            "poor": int(calculate_percentile(times, 95)),
        })
    
    return breakdown


def populate_global_distribution(session, results: List[Result]):
    """填充 global_distribution 表"""
    print("开始计算全球分布数据...")
    
    # 定义分段类型
    segment_types = [
        ("total", "total_time"),
        ("running", "run_time"),
        ("workout", "work_time"),
        ("skierg", "skierg_time"),
        ("sled_push", "sled_push_time"),
        ("sled_pull", "sled_pull_time"),
        ("burpee_broad_jump", "burpee_broad_jump_time"),
        ("row_erg", "row_erg_time"),
        ("farmers_carry", "farmers_carry_time"),
        ("sandbag_lunges", "sandbag_lunges_time"),
        ("wall_balls", "wall_balls_time"),
    ]
    
    # 按 (gender, division) 分组
    grouped_data: Dict[Tuple[str, str], List[Result]] = defaultdict(list)
    
    for r in results:
        if not r.gender or not r.division:
            continue
        key = (r.gender, r.division)
        grouped_data[key].append(r)
    
    dist_count = 0
    
    for (gender, division), group_results in grouped_data.items():
        for seg_type, seg_field in segment_types:
            # 提取该分段的所有值
            values = []
            for r in group_results:
                v = getattr(r, seg_field)
                if v is not None and v > 0:
                    values.append(v)
            
            if len(values) < 10:
                continue
            
            values.sort()
            n = len(values)
            
            # 计算直方图
            min_val = min(values)
            max_val = max(values)
            num_bins = min(30, max(10, n // 100))
            bin_width = (max_val - min_val) / num_bins
            
            bins = []
            counts = []
            
            for i in range(num_bins):
                bin_start = min_val + i * bin_width
                bin_end = bin_start + bin_width
                count = sum(1 for v in values if bin_start <= v < bin_end)
                bins.append(round(bin_start, 2))
                counts.append(count)
            
            # 计算百分位
            percentiles = {
                "5": values[int(n * 0.05)],
                "10": values[int(n * 0.10)],
                "25": values[int(n * 0.25)],
                "50": values[int(n * 0.50)],
                "75": values[int(n * 0.75)],
                "90": values[int(n * 0.90)],
                "95": values[min(n - 1, int(n * 0.95))],
            }
            
            # 创建或更新记录
            existing = session.query(GlobalDistribution).filter(
                GlobalDistribution.segment_type == seg_type,
                GlobalDistribution.gender == gender,
                GlobalDistribution.division == division
            ).first()
            
            if existing:
                existing.total_athletes = n
                existing.histogram_bins = json.dumps(bins)
                existing.histogram_counts = json.dumps(counts)
                existing.percentile_5 = percentiles["5"]
                existing.percentile_10 = percentiles["10"]
                existing.percentile_25 = percentiles["25"]
                existing.percentile_50 = percentiles["50"]
                existing.percentile_75 = percentiles["75"]
                existing.percentile_90 = percentiles["90"]
                existing.percentile_95 = percentiles["95"]
            else:
                dist = GlobalDistribution(
                    segment_type=seg_type,
                    gender=gender,
                    division=division,
                    total_athletes=n,
                    histogram_bins=json.dumps(bins),
                    histogram_counts=json.dumps(counts),
                    percentile_5=percentiles["5"],
                    percentile_10=percentiles["10"],
                    percentile_25=percentiles["25"],
                    percentile_50=percentiles["50"],
                    percentile_75=percentiles["75"],
                    percentile_90=percentiles["90"],
                    percentile_95=percentiles["95"],
                )
                session.add(dist)
            
            dist_count += 1
    
    session.commit()
    print(f"已填充 {dist_count} 条全球分布记录")
    return dist_count


def main():
    """主函数"""
    print("=" * 60)
    print("预测统计数据填充脚本")
    print("=" * 60)
    
    # 创建数据库连接
    engine = create_engine(SYNC_DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # 创建表（如果不存在）
        Base.metadata.create_all(engine)
        print("数据库表已就绪")
        
        # 查询所有历史数据
        print("\n正在读取历史数据...")
        results = session.query(Result).filter(
            Result.total_time.isnot(None),
            Result.gender.isnot(None),
            Result.division.isnot(None)
        ).all()
        
        print(f"共读取 {len(results)} 条成绩记录")
        
        if len(results) == 0:
            print("警告: 没有历史数据可用于计算")
            return
        
        # 填充 prediction_stats
        print("\n" + "-" * 40)
        stats_count = populate_prediction_stats(session, results)
        
        # 填充 global_distribution
        print("\n" + "-" * 40)
        dist_count = populate_global_distribution(session, results)
        
        print("\n" + "=" * 60)
        print("数据填充完成!")
        print(f"  - 预测统计记录: {stats_count}")
        print(f"  - 全球分布记录: {dist_count}")
        print("=" * 60)
        
    except Exception as e:
        print(f"错误: {e}")
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
