/**
 * HYROX Prep Center - 主应用组件
 * 版本: v4.0
 * 
 * Tab 导航结构:
 * - 首页 (HOME) -> LiveTab - 赛事搜索和排行榜
 * - 比赛 (RACE) -> PlanTab - 备赛计划和分析
 * - 我的 (ME) -> DataTab - 个人资料和历史数据
 */

import React, { useState } from 'react';
import { AppTab } from './types';
import PlanTab from './screens/PlanTab';
import DataTab from './screens/DataTab';
import LiveTab from './screens/LiveTab';

const App: React.FC = () => {
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

export default App;
