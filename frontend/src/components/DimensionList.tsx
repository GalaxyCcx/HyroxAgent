/**
 * DimensionList - 三维能力列表组件
 * 显示力量/有氧/转换三个维度的详细信息
 */

import React from 'react';
import REPORT_THEME from '../styles/report-theme';

interface DimensionItem {
  key: string;
  icon: string;
  name: string;
  score: number;
  grade: string;
  description: string;
}

interface DimensionListProps {
  items?: DimensionItem[];
}

const DimensionList: React.FC<DimensionListProps> = ({ items = [] }) => {
  if (!items || items.length === 0) return null;

  // 获取等级样式
  const getGradeStyle = (grade: string) => {
    const gradeConfig = REPORT_THEME.grades[grade as keyof typeof REPORT_THEME.grades];
    if (!gradeConfig) {
      return {
        bg: 'bg-gray-500/20',
        text: 'text-gray-400',
        border: 'border-gray-500/30',
      };
    }
    return {
      bg: `bg-[${gradeConfig.bg}]`,
      text: `text-[${gradeConfig.text}]`,
      border: `border-[${gradeConfig.border}]`,
    };
  };

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const gradeStyle = getGradeStyle(item.grade);
        
        return (
          <div
            key={item.key || index}
            className="bg-[#1A1A1A] rounded-xl p-4 border border-[#333333] hover:border-[#00FF88]/30 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              {/* 左侧：图标 + 名称 */}
              <div className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <span className="text-white font-bold">{item.name}</span>
              </div>
              
              {/* 右侧：分数 + 等级徽章 */}
              <div className="flex items-center gap-3">
                <span className="text-white text-lg font-bold">{item.score}分</span>
                <span 
                  className="px-2 py-0.5 rounded text-xs font-bold"
                  style={{
                    backgroundColor: REPORT_THEME.grades[item.grade as keyof typeof REPORT_THEME.grades]?.bg || 'rgba(156, 163, 175, 0.2)',
                    color: REPORT_THEME.grades[item.grade as keyof typeof REPORT_THEME.grades]?.text || '#9CA3AF',
                    borderWidth: '1px',
                    borderColor: REPORT_THEME.grades[item.grade as keyof typeof REPORT_THEME.grades]?.border || 'rgba(156, 163, 175, 0.3)',
                  }}
                >
                  {item.grade}级
                </span>
              </div>
            </div>
            
            {/* 描述 */}
            <p className="text-[#888888] text-sm pl-8">
              {item.description}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default DimensionList;
