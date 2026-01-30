/**
 * HYROX Prep Center - 主应用组件
 * 版本: v4.1
 * 
 * Tab 导航结构:
 * - 首页 (HOME) -> LiveTab - 赛事搜索和排行榜
 * - 比赛 (RACE) -> PlanTab - 备赛计划和分析
 * - 我的 (ME) -> DataTab - 个人资料和历史数据
 * - /report/:reportId -> ReportPage - 独立报告页面
 */

import React, { useState, Component, ErrorInfo, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { AppTab } from './types';
import PlanTab from './screens/PlanTab';
import DataTab from './screens/DataTab';
import LiveTab from './screens/LiveTab';
import ReportView from './screens/ReportView';

// 报告页错误边界 - 捕获渲染错误，避免黑屏
class ReportErrorBoundary extends Component<{ reportId: string; onBack: () => void; children: ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ReportView]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0d12] flex flex-col p-4">
          <header className="py-4 flex items-center justify-between border-b border-white/10">
            <button onClick={this.props.onBack} className="text-white">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <span className="text-white font-bold">分析报告</span>
            <div className="w-8" />
          </header>
          <div className="flex-1 flex flex-col items-center justify-center text-white/80">
            <span className="material-symbols-outlined text-4xl text-amber-400 mb-4">error</span>
            <p className="text-sm mb-2">报告渲染出错</p>
            <p className="text-xs text-white/50 max-w-xs text-center mb-4">{this.state.error?.message}</p>
            <button onClick={this.props.onBack} className="px-4 py-2 bg-[#42ff9e] text-black font-medium rounded-lg">返回首页</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// 报告页面包装组件 - 从 URL 获取 reportId
const ReportPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  
  if (!reportId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0d12]">
        <div className="text-red-400">无效的报告 ID</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen w-full max-w-md mx-auto bg-background-dark shadow-2xl border-x border-white/5 font-body">
      <ReportErrorBoundary reportId={reportId} onBack={() => navigate('/')}>
        <ReportView reportId={reportId} onBack={() => navigate('/')} />
      </ReportErrorBoundary>
    </div>
  );
};

// 主页面组件（带底部导航）
const MainPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.HOME);

  const renderContent = () => {
    switch (activeTab) {
      case AppTab.HOME:
        return <LiveTab />;
      case AppTab.RACE:
        return <PlanTab />;
      case AppTab.ME:
        return <DataTab />;
      default:
        return <LiveTab />;
    }
  };

  return (
    <div className="relative min-h-screen w-full max-w-md mx-auto flex flex-col bg-background-dark pb-24 shadow-2xl border-x border-white/5 font-body">
      {renderContent()}

      {/* Fixed Bottom Navigation - 3 Tabs */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#101013]/95 backdrop-blur-xl border-t border-white/5 px-8 pb-6 pt-3 z-50">
        <div className="flex justify-between items-center">
          
          {/* 1. 首页 (Home) */}
          <button 
            onClick={() => setActiveTab(AppTab.HOME)}
            className={`flex flex-col items-center gap-1.5 transition-colors relative flex-1 ${activeTab === AppTab.HOME ? 'text-primary' : 'text-gray-500 hover:text-white'}`}
          >
            {activeTab === AppTab.HOME && (
              <span className="absolute -top-3 w-8 h-1 bg-primary rounded-full shadow-[0_0_10px_#42ff9e]"></span>
            )}
            <span className={`material-symbols-outlined text-2xl ${activeTab === AppTab.HOME ? 'filled' : ''}`}>home</span>
            <span className="text-[10px] font-bold">首页</span>
          </button>
          
          {/* 2. 比赛 (Race/Plan) */}
          <button 
            onClick={() => setActiveTab(AppTab.RACE)}
            className={`flex flex-col items-center gap-1.5 transition-colors relative flex-1 ${activeTab === AppTab.RACE ? 'text-primary' : 'text-gray-500 hover:text-white'}`}
          >
            {activeTab === AppTab.RACE && (
              <span className="absolute -top-3 w-8 h-1 bg-primary rounded-full shadow-[0_0_10px_#42ff9e]"></span>
            )}
            <span className={`material-symbols-outlined text-2xl ${activeTab === AppTab.RACE ? 'filled' : ''}`}>emoji_events</span>
            <span className="text-[10px] font-bold">比赛</span>
          </button>

          {/* 3. 我的 (Me/Data) */}
          <button 
            onClick={() => setActiveTab(AppTab.ME)}
            className={`flex flex-col items-center gap-1.5 transition-colors relative flex-1 ${activeTab === AppTab.ME ? 'text-primary' : 'text-gray-500 hover:text-white'}`}
          >
            {activeTab === AppTab.ME && (
              <span className="absolute -top-3 w-8 h-1 bg-primary rounded-full shadow-[0_0_10px_#42ff9e]"></span>
            )}
            <span className={`material-symbols-outlined text-2xl ${activeTab === AppTab.ME ? 'filled' : ''}`}>person</span>
            <span className="text-[10px] font-bold">我的</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

// 主应用组件 - 路由配置
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/report/:reportId" element={<ReportPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
