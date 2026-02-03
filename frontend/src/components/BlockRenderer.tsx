/**
 * BlockRenderer - V3 架构的通用块渲染器
 * 
 * 根据 ContentBlock 的 component 字段渲染对应的前端组件
 * 支持通过 data_id 从 data_snapshots 获取数据
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  TrainingWeekView,
  PredictionTiers,
  PredictionDensity,
  DualRadar,
  DistributionHistogram,
  PaceTrendChart,
  HorizontalBar,
  PriorityMatrix,
  RadarChart as BaseRadarChart,
  RadarChart5D,
  ScoreRing,
  DEFAULT_ZONEX_DIMENSIONS,
  DecouplingChart,
  RoxzoneCompareChart,
} from './charts';
import SummaryText from './SummaryText';
import DimensionList from './DimensionList';
import QuoteBox from './QuoteBox';
import LossOverviewTable from './LossOverviewTable';
import SegmentTabs from './SegmentTabs';
import ComparisonTable from './ComparisonTable';
import WarningBox from './WarningBox';
import DeepAnalysisList from './DeepAnalysisList';
import PhaseAnalysisCard from './PhaseAnalysisCard';
import BehaviorAnalysisCard from './BehaviorAnalysisCard';
import SuggestionBox from './SuggestionBox';
import type {
  ContentBlock,
  DataSnapshot,
  RoxscanCardProps,
  RadarChartProps,
  LossTableProps,
  TrainingWeekProps,
  PredictionTiersProps,
  HighlightsListProps,
} from '../types';

interface BlockRendererProps {
  block: ContentBlock;
  dataSnapshots?: Record<string, DataSnapshot>;
}

// ========== 基础组件 ==========

/**
 * RoxscanCard - ROXSCAN 评分卡片
 */
const RoxscanCard: React.FC<RoxscanCardProps> = ({ score, level, level_name }) => {
  // 等级对应的颜色
  const levelColors: Record<string, string> = {
    S: 'from-amber-500 to-yellow-400',
    A: 'from-purple-500 to-indigo-400',
    B: 'from-blue-500 to-cyan-400',
    C: 'from-green-500 to-emerald-400',
    D: 'from-gray-500 to-gray-400',
  };
  
  const gradientClass = levelColors[level] || levelColors.D;
  
  return (
    <div className={`bg-gradient-to-r ${gradientClass} rounded-xl p-6 text-white shadow-lg`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm opacity-80 mb-1">ROXSCAN 綜合評分</div>
          <div className="text-5xl font-bold">{score}</div>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold">{level}</div>
          <div className="text-sm opacity-80">{level_name}</div>
        </div>
      </div>
    </div>
  );
};

/**
 * Paragraph - 文本段落
 */
const Paragraph: React.FC<{ content: string }> = ({ content }) => (
  <div className="prose prose-invert max-w-none">
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
  </div>
);

/**
 * ValueProposition - 价值主张
 */
const ValueProposition: React.FC<{ content: string }> = ({ content }) => (
  <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
    <div className="text-lg font-medium">💡 價值主張</div>
    <div className="text-xl mt-2">「{content}」</div>
  </div>
);

/**
 * HighlightsList - 重点发现列表
 */
const HighlightsList: React.FC<HighlightsListProps> = ({ items }) => {
  const list = items ?? [];
  const typeIcons: Record<string, string> = {
    strength: '💪',
    weakness: '📊',
    insight: '💡',
  };
  
  const typeColors: Record<string, string> = {
    strength: 'border-l-green-500 bg-green-500/10',
    weakness: 'border-l-orange-500 bg-orange-500/10',
    insight: 'border-l-blue-500 bg-blue-500/10',
  };
  
  return (
    <div className="space-y-3">
      {list.map((item, index) => (
        <div
          key={index}
          className={`border-l-4 ${typeColors[item.type] || 'border-l-gray-500'} p-4 rounded-r-lg`}
        >
          <span className="mr-2">{typeIcons[item.type] || '•'}</span>
          {item.content}
        </div>
      ))}
    </div>
  );
};

/**
 * LossTable - 时间损耗表格
 */
const LossTable: React.FC<LossTableProps> = ({ total_loss_seconds, theoretical_best, items: rawItems }) => {
  const items = rawItems ?? [];
  const difficultyColors: Record<string, string> = {
    '极易': 'text-green-400',
    '技术': 'text-yellow-400',
    '节奏': 'text-yellow-400',
    '体能': 'text-red-400',
  };
  
  const difficultyStars: Record<string, string> = {
    '极易': '⭐',
    '技术': '⭐⭐',
    '节奏': '⭐⭐',
    '体能': '⭐⭐⭐',
  };
  
  const formatTime = (seconds: number): string => {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return secs > 0 ? `${mins}分${secs}秒` : `${mins}分鐘`;
    }
    return `${Math.floor(seconds)}秒`;
  };
  
  return (
    <div className="bg-white/5 rounded-xl overflow-hidden">
      <div className="bg-white/10 p-4 flex justify-between items-center">
        <div>
          <span className="text-gray-400">總損耗時間</span>
          <span className="text-xl font-bold text-red-400 ml-2">{formatTime(total_loss_seconds)}</span>
        </div>
        <div>
          <span className="text-gray-400">理論最佳成績</span>
          <span className="text-xl font-bold text-green-400 ml-2">{theoretical_best}</span>
        </div>
      </div>
      <table className="w-full">
        <thead className="bg-white/5">
          <tr>
            <th className="p-3 text-left text-gray-400">損耗來源</th>
            <th className="p-3 text-left text-gray-400">損耗時間</th>
            <th className="p-3 text-left text-gray-400">深度歸因分析</th>
            <th className="p-3 text-left text-gray-400">挽回難度</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index} className="border-t border-white/10">
              <td className="p-3 font-medium">{item.source}</td>
              <td className="p-3 text-red-400">{formatTime(item.loss_seconds)}</td>
              <td className="p-3 text-sm text-gray-300">{item.root_cause_analysis}</td>
              <td className={`p-3 ${difficultyColors[item.difficulty] || ''}`}>
                {difficultyStars[item.difficulty] || item.difficulty} ({item.difficulty})
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * GenericList - 通用列表
 */
const GenericList: React.FC<{ items?: unknown[]; name?: string }> = ({ items = [], name }) => (
  <div className="bg-white/5 rounded-xl p-4">
    {name && <div className="text-lg font-medium mb-3">{name}</div>}
    <ul className="space-y-2">
      {(items ?? []).map((item, index) => (
        <li key={index} className="flex items-start">
          <span className="mr-2">•</span>
          <span>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
        </li>
      ))}
    </ul>
  </div>
);

/**
 * GenericCard - 通用卡片
 */
const GenericCard: React.FC<Record<string, unknown>> = (props) => {
  const { _name, ...rest } = props;
  return (
    <div className="bg-white/5 rounded-xl p-4">
      {_name != null && <div className="text-lg font-medium mb-3">{String(_name)}</div>}
      <pre className="text-sm text-gray-300 overflow-auto">
        {JSON.stringify(rest, null, 2)}
      </pre>
    </div>
  );
};

/**
 * RadarChart 适配器 - 将后端格式转换为前端期望的格式
 */
const RadarChart: React.FC<{ data_id?: string; dimensions?: Record<string, number> }> = ({ dimensions }) => {
  // 转换后端格式 {strength: 31, aerobic_base: 31, transition: 100} 
  // 为前端格式 dimensions[] + dataSets[]
  if (!dimensions || typeof dimensions !== 'object') {
    return <GenericCard _name="RadarChart" dimensions={dimensions} />;
  }
  
  const dimensionLabels: Record<string, string> = {
    strength: '力量',
    aerobic_base: '有氧底座',
    transition: '轉換效率',
  };
  
  const radarDimensions = Object.keys(dimensions).map(key => ({
    name: dimensionLabels[key] || key,
    max: 100,
  }));
  
  const values = Object.values(dimensions);
  
  const dataSets = [{
    name: '運動員',
    values: values,
    color: '#42ff9e',
  }];
  
  return (
    <BaseRadarChart
      dimensions={radarDimensions}
      dataSets={dataSets}
      title="ZONEØ 能力評估"
      shape="polygon"
    />
  );
};

// ========== 组件映射表 ==========

const COMPONENT_MAP: Record<string, React.ComponentType<any>> = {
  // V4 新增核心摘要组件
  ScoreRing,                    // 环形评分组件
  SummaryText,                  // 总评文本（绿色左边框）
  DimensionList,                // 三维能力列表
  RadarChart5D,                 // 5维能力雷达图
  
  // 第1章 消失的五分钟
  QuoteBox,                     // 绿色左边框引用（价值主张）
  LossOverviewTable,            // 损耗总览表
  LossTable,                    // 旧损耗表（兼容）
  SegmentTabs,                  // Running/Workout/Roxzone Tab
  ComparisonTable,              // 分段对比表
  WarningBox,                   // 红色警告框
  DeepAnalysisList,             // 深度归因列表
  
  // 第2章 深度复盘
  DecouplingChart,              // 心率-配速解耦图
  PhaseAnalysisCard,            // 阶段分析卡片（stage-box）
  RoxzoneCompareChart,          // 转换区总耗时对比
  BehaviorAnalysisCard,         // 行为分析卡片
  SuggestionBox,                // 建议框（绿色 + 💡）
  
  // 卡片组件
  RoxscanCard,
  GenericCard,
  TargetCard: GenericCard,  // 使用 GenericCard 作为后备
  DegradedAnalysisCard: GenericCard,  // 使用 GenericCard 作为后备
  
  // 文本组件
  Paragraph,
  ValueProposition,
  
  // 列表组件
  HighlightsList,
  GenericList,
  StrengthsList: HighlightsList,
  ImprovementsList: GenericList,
  ActionItems: GenericList,
  WeaknessAnalysisList: GenericList,
  KeyWorkoutsList: GenericList,
  NutritionTipsList: GenericList,
  PhaseAnalysisList: GenericList,  // 添加缺失的组件
  
  // 表格组件
  SplitBreakdownTable: GenericCard,
  
  // 图表组件
  RadarChart,
  DualRadar,
  HorizontalBar,
  DistributionHistogram,
  PaceTrendChart,
  PredictionTiers,
  PredictionDensity,
  PriorityMatrix,
  TrainingWeekView,
  HRPaceDualAxis: GenericCard,  // 添加缺失的组件
};

// ========== 主渲染器 ==========

const BlockRenderer: React.FC<BlockRendererProps> = ({ block, dataSnapshots }) => {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/31eb2793-6057-4140-8c92-6cb1a296c760',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BlockRenderer.tsx:render',message:'Block render',data:{blockExists:!!block,componentName:block?.component,propsKeys:block?.props?Object.keys(block.props):null,hasDataId:!!block?.props?.data_id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  const Component = COMPONENT_MAP[block.component];
  
  if (!Component) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
        <div className="text-yellow-400 text-sm">未知组件: {block.component}</div>
        <pre className="text-xs mt-2 text-gray-400">
          {JSON.stringify(block.props, null, 2)}
        </pre>
      </div>
    );
  }
  
  // 如果 props 中有 data_id，尝试从 dataSnapshots 获取额外数据
  let mergedProps = { ...block.props };
  
  if (block.props?.data_id && dataSnapshots) {
    const dataId = block.props.data_id as string;
    const snapshot = dataSnapshots[dataId];
    if (snapshot) {
      // 将 snapshot.content 合并到 props 中
      mergedProps = { ...mergedProps, ...snapshot.content };
    }
  }
  
  // 图4：核心摘要中雷达图不显示下方「综合得分/强项弱项/维度标签」块，统一传 compact
  if (block.component === 'RadarChart5D') {
    mergedProps = { ...mergedProps, compact: true };
  }
  
  // 使用 ErrorBoundary 风格的 try-catch 渲染
  try {
    return <Component {...mergedProps} />;
  } catch (error) {
    console.error(`[BlockRenderer] Error rendering ${block.component}:`, error);
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
        <div className="text-red-400 text-sm">渲染错误: {block.component}</div>
        <pre className="text-xs mt-2 text-gray-400">
          {String(error)}
        </pre>
      </div>
    );
  }
};

export default BlockRenderer;

// 导出单独的组件以便直接使用
export {
  RoxscanCard,
  Paragraph,
  ValueProposition,
  HighlightsList,
  LossTable,
  GenericList,
  GenericCard,
};
