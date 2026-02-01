/**
 * ScoreRing - ROXSCAN 环形评分组件
 * 使用 ECharts gauge 图实现环形进度效果
 */

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import REPORT_THEME from '../../styles/report-theme';

interface ScoreRingProps {
  score: number;
  level: string;
  level_name: string;
  level_description?: string;
}

const ScoreRing: React.FC<ScoreRingProps> = ({ score, level, level_name, level_description }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // 初始化图表
    chartInstance.current = echarts.init(chartRef.current, undefined, {
      renderer: 'canvas',
    });

    const option: echarts.EChartsOption = {
      series: [
        {
          type: 'gauge',
          startAngle: 90,
          endAngle: -270,
          pointer: { show: false },
          progress: {
            show: true,
            overlap: false,
            roundCap: true,
            clip: false,
            itemStyle: {
              color: REPORT_THEME.accent,
            },
          },
          axisLine: {
            lineStyle: {
              width: 12,
              color: [[1, 'rgba(255, 255, 255, 0.1)']],
            },
          },
          splitLine: { show: false },
          axisTick: { show: false },
          axisLabel: { show: false },
          data: [
            {
              value: score,
              detail: {
                offsetCenter: ['0%', '0%'],
              },
            },
          ],
          detail: {
            width: 50,
            height: 14,
            fontSize: 48,
            fontWeight: 'bold',
            color: REPORT_THEME.accent,
            formatter: '{value}',
          },
        },
      ],
    };

    chartInstance.current.setOption(option);

    // 响应式处理
    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, [score]);

  // 获取等级颜色
  const getLevelColor = () => {
    const colors: Record<string, string> = {
      S: REPORT_THEME.grades.S.text,
      A: REPORT_THEME.grades.A.text,
      B: REPORT_THEME.grades.B.text,
      C: REPORT_THEME.grades.C.text,
      D: REPORT_THEME.grades.D.text,
    };
    return colors[level] || REPORT_THEME.text.secondary;
  };

  return (
    <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#333333]">
      {/* 标题 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🎯</span>
        <span className="text-white font-bold">ROXSCAN 综合评分</span>
      </div>

      {/* 主体内容：环形图 + 等级信息 */}
      <div className="flex items-center gap-6">
        {/* 环形图 */}
        <div className="relative">
          <div ref={chartRef} style={{ width: 140, height: 140 }} />
          {/* /100 文字 */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-[#888888] text-sm">
            /100
          </div>
        </div>

        {/* 等级信息 */}
        <div className="flex-1">
          <div 
            className="text-3xl font-bold mb-1"
            style={{ color: getLevelColor() }}
          >
            {level}级 · {level_name}
          </div>
          {level_description && (
            <div className="text-[#888888] text-sm">
              {level_description}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScoreRing;
