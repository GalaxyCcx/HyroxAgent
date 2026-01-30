#!/usr/bin/env python3
"""
图表生成测试脚本

用法：
    python scripts/test_chart.py --type radar --title "能力雷达图"
    python scripts/test_chart.py --type bar --data '{"categories":["A","B","C"],"values":[10,20,30]}'
"""

import argparse
import asyncio
import json
import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))

from backend.app.services.report.chart_agent import ChartAgent
from backend.app.llm.client import LLMClient


# 预设的测试数据
SAMPLE_DATA = {
    "radar": {
        "chart_type": "radar",
        "title": "综合能力雷达图",
        "dimensions": ["跑步速度", "力量耐力", "功能站技巧", "配速控制", "恢复能力"],
        "data": [
            {"name": "运动员", "values": [85, 78, 82, 90, 75]},
            {"name": "组别平均", "values": [75, 75, 75, 75, 75]}
        ]
    },
    "bar": {
        "chart_type": "bar",
        "title": "各功能站用时对比",
        "categories": ["SkiErg", "Sled Push", "Sled Pull", "Burpee", "Rowing", "Carry", "Lunges", "Wall Balls"],
        "data": [
            {"name": "运动员", "values": [225, 90, 105, 210, 240, 75, 150, 180]},
            {"name": "组别平均", "values": [230, 95, 110, 220, 250, 80, 160, 190]}
        ]
    },
    "line": {
        "chart_type": "line",
        "title": "跑步段配速趋势",
        "categories": ["Run1", "Run2", "Run3", "Run4", "Run5", "Run6", "Run7", "Run8"],
        "data": [
            {"name": "配速(秒/公里)", "values": [270, 275, 280, 285, 290, 295, 300, 310]}
        ]
    },
    "pie": {
        "chart_type": "pie",
        "title": "时间分配占比",
        "data": [
            {"name": "跑步段", "value": 2225},
            {"name": "功能站", "value": 1275}
        ]
    }
}


async def test_chart(chart_type: str, title: str = None, custom_data: dict = None):
    """测试图表生成"""
    print(f"\n{'='*60}")
    print(f"测试图表类型: {chart_type}")
    print(f"{'='*60}")
    
    # 准备图表需求
    if custom_data:
        requirements = custom_data
    elif chart_type in SAMPLE_DATA:
        requirements = SAMPLE_DATA[chart_type]
    else:
        print(f"❌ 未知图表类型: {chart_type}")
        print(f"   支持的类型: {list(SAMPLE_DATA.keys())}")
        return None
    
    if title:
        requirements["title"] = title
    
    print(f"\n输入需求:")
    print(json.dumps(requirements, ensure_ascii=False, indent=2))
    
    # 初始化 ChartAgent
    llm_client = LLMClient(agent_type="chart")
    chart_agent = ChartAgent(llm_client)
    
    print(f"\n生成中...")
    
    try:
        result = await chart_agent.generate(requirements)
        
        print(f"\n✅ 图表生成成功!")
        print(f"\n{'='*60}")
        print("生成结果:")
        print(f"{'='*60}")
        
        print(f"\nID: {result.get('id', 'N/A')}")
        print(f"类型: {result.get('type', 'N/A')}")
        print(f"标题: {result.get('title', 'N/A')}")
        
        # ECharts option
        option = result.get("option", {})
        print(f"\nECharts Option 结构:")
        print(f"  顶层 keys: {list(option.keys())}")
        
        # 验证 option
        validation_errors = validate_echarts_option(option, chart_type)
        if validation_errors:
            print(f"\n⚠️ 验证警告:")
            for error in validation_errors:
                print(f"   - {error}")
        else:
            print(f"\n✅ Option 验证通过")
        
        # 保存结果
        output_file = f"test_chart_{chart_type}_output.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"\n💾 完整结果已保存到: {output_file}")
        
        # 生成 HTML 预览
        html_file = generate_preview_html(result, chart_type)
        print(f"🌐 HTML 预览已保存到: {html_file}")
        
        return result
        
    except Exception as e:
        print(f"\n❌ 图表生成失败: {e}")
        import traceback
        traceback.print_exc()
        return None


def validate_echarts_option(option: dict, chart_type: str) -> list:
    """验证 ECharts option"""
    errors = []
    
    # 通用验证
    if chart_type in ["bar", "line"]:
        if "xAxis" not in option:
            errors.append("缺少 xAxis 配置")
        if "yAxis" not in option:
            errors.append("缺少 yAxis 配置")
        if "series" not in option:
            errors.append("缺少 series 配置")
    
    elif chart_type == "radar":
        if "radar" not in option:
            errors.append("缺少 radar 配置")
        if "series" not in option:
            errors.append("缺少 series 配置")
    
    elif chart_type == "pie":
        if "series" not in option:
            errors.append("缺少 series 配置")
    
    # series 验证
    series = option.get("series", [])
    if not series:
        errors.append("series 为空")
    
    return errors


def generate_preview_html(chart_config: dict, chart_type: str) -> str:
    """生成 HTML 预览文件"""
    option_json = json.dumps(chart_config.get("option", {}), ensure_ascii=False)
    
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>图表预览 - {chart_config.get('title', chart_type)}</title>
    <script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>
    <style>
        body {{
            background-color: #0d1117;
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
        }}
        #chart {{
            width: 800px;
            height: 500px;
            margin: 0 auto;
            background: rgba(13, 17, 23, 0.95);
            border-radius: 8px;
        }}
        h1 {{
            color: #00d4ff;
            text-align: center;
        }}
    </style>
</head>
<body>
    <h1>{chart_config.get('title', '图表预览')}</h1>
    <div id="chart"></div>
    <script>
        var chart = echarts.init(document.getElementById('chart'), 'dark');
        var option = {option_json};
        chart.setOption(option);
        window.addEventListener('resize', function() {{
            chart.resize();
        }});
    </script>
</body>
</html>
"""
    
    filename = f"test_chart_{chart_type}_preview.html"
    with open(filename, "w", encoding="utf-8") as f:
        f.write(html_content)
    
    return filename


def main():
    parser = argparse.ArgumentParser(description="测试图表生成")
    parser.add_argument("--type", "-t", required=True,
                       choices=["radar", "bar", "line", "pie"],
                       help="图表类型")
    parser.add_argument("--title", help="图表标题")
    parser.add_argument("--data", "-d", help="自定义数据 (JSON 格式)")
    
    args = parser.parse_args()
    
    custom_data = json.loads(args.data) if args.data else None
    
    asyncio.run(test_chart(args.type, args.title, custom_data))


if __name__ == "__main__":
    main()
