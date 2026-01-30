"""
测试心率提取器 - 验证 VL 模型能否正确解析心率图片
"""
import asyncio
import sys
import os
import json

# 添加项目根目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.report.heart_rate_extractor import heart_rate_extractor


async def test_extraction():
    """测试心率提取"""
    # 使用用户提供的测试图片
    test_image_path = r"e:\HyroxAgent\3141110d-3fd1-47df-909a-c8e035f6dd7d.jpg"
    
    if not os.path.exists(test_image_path):
        print(f"错误: 找不到测试图片 {test_image_path}")
        return
    
    print(f"开始测试心率提取...")
    print(f"图片路径: {test_image_path}")
    print("-" * 60)
    
    # 提取心率数据
    result = await heart_rate_extractor.extract_from_image(
        image_path=test_image_path,
        total_time_minutes=90.0,  # 预期约 90 分钟
        extraction_interval=30,   # 每 30 秒一个点
    )
    
    print(f"\n提取结果:")
    print(f"  成功: {result.success}")
    print(f"  数据点数量: {len(result.data_points)}")
    
    if result.success:
        print(f"\n统计信息:")
        print(f"  最低心率: {result.min_hr} bpm")
        print(f"  最高心率: {result.max_hr} bpm")
        print(f"  平均心率: {result.avg_hr:.1f} bpm")
        
        print(f"\n时间范围:")
        print(f"  开始: {result.start_time}")
        print(f"  结束: {result.end_time}")
        print(f"  持续: {result.duration_seconds} 秒 ({result.duration_seconds / 60:.1f} 分钟)")
        
        print(f"\n数据点预览 (前 20 个):")
        for i, dp in enumerate(result.data_points[:20]):
            print(f"  {dp.timestamp_formatted}: {dp.heart_rate} bpm")
        
        if len(result.data_points) > 20:
            print(f"  ... (共 {len(result.data_points)} 个数据点)")
        
        # 检查数据是否有变化（非周期性）
        if len(result.data_points) >= 10:
            hr_values = [dp.heart_rate for dp in result.data_points[:10]]
            differences = [hr_values[i+1] - hr_values[i] for i in range(len(hr_values)-1)]
            
            # 检查是否是简单的线性递增
            is_linear = all(d == differences[0] for d in differences)
            if is_linear:
                print(f"\n[警告] 前 10 个数据点呈线性变化，可能是模型编造的数据！")
            else:
                print(f"\n[OK] 数据点有自然变化，看起来是真实读取的")
        
        # 保存完整结果到文件
        output_file = r"e:\HyroxAgent\backend\scripts\hr_extraction_result.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(result.to_dict(), f, ensure_ascii=False, indent=2)
        print(f"\n完整结果已保存到: {output_file}")
        
    else:
        print(f"\n提取失败: {result.error_message}")
        if result.raw_response:
            print(f"\n原始响应 (前 500 字符):")
            print(result.raw_response[:500])


if __name__ == "__main__":
    asyncio.run(test_extraction())
