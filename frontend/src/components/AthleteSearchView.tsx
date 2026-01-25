/**
 * AthleteSearchView - 运动员搜索 UI 组件
 * 
 * 提供完整的搜索 UI，包括：
 * - 搜索输入框
 * - 名称建议列表
 * - 加载和错误状态
 * 
 * 可配置是否显示返回按钮和标题。
 */

import React from 'react';
import type { SuggestionItem } from '../types';

export interface AthleteSearchViewProps {
  // 状态
  searchQuery: string;
  isLoading: boolean;
  statusText: string;
  error: string | null;
  suggestions: SuggestionItem[];
  
  // 回调
  onSearchQueryChange: (query: string) => void;
  onSearch: () => void;
  onSelectSuggestion: (name: string) => void;
  onBack?: () => void;
  
  // 配置
  placeholder?: string;
  showHeader?: boolean;
  headerTitle?: string;
}

const AthleteSearchView: React.FC<AthleteSearchViewProps> = ({
  searchQuery,
  isLoading,
  statusText,
  error,
  suggestions,
  onSearchQueryChange,
  onSearch,
  onSelectSuggestion,
  onBack,
  placeholder = '输入运动员姓名...',
  showHeader = true,
  headerTitle = '搜索',
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchQuery.length >= 2 && !isLoading) {
        onSearch();
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-dark animate-in fade-in duration-200">
      {/* Header */}
      {showHeader && (
        <header className="p-4 border-b border-white/5 bg-background-dark sticky top-0 z-50">
          <div className="flex items-center gap-3">
            {onBack && (
              <button 
                onClick={onBack}
                className="text-white/60 hover:text-white"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
            )}
            <div className="flex-1 relative">
              <input 
                autoFocus
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-surface-dark border border-white/20 rounded-lg py-3 pl-10 pr-12 text-white placeholder-white/30 text-sm focus:outline-none focus:border-primary/50"
                placeholder={placeholder}
              />
              <span className="material-symbols-outlined absolute left-3 top-3 text-white/30 text-[20px]">search</span>
              {searchQuery && (
                <div className="absolute right-3 top-2.5 flex items-center gap-1">
                  <button 
                    onClick={() => onSearchQueryChange('')}
                    className="text-white/30 hover:text-white p-0.5"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                  <button 
                    onClick={onSearch}
                    disabled={isLoading || searchQuery.length < 2}
                    className="bg-primary/20 hover:bg-primary/30 text-primary px-2 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    搜索
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto bg-background-dark">
        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center pt-20 text-white/40">
            <div className="size-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-medium text-white/60 mb-2">{statusText}</p>
            <p className="text-xs text-white/30 text-center px-8">首次搜索可能需要 10-15 秒<br/>系统正在加载运动员数据库...</p>
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="text-center pt-10 text-white/40">
            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">error</span>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* 名称建议列表 */}
        {!isLoading && !error && suggestions.length > 0 && (
          <div>
            <p className="text-xs text-white/40 mb-3 px-1">请选择运动员:</p>
            <div className="flex flex-col gap-2">
              {suggestions.map((item, i) => (
                <button
                  key={i}
                  onClick={() => onSelectSuggestion(item.name)}
                  className="w-full p-4 bg-surface-dark border border-white/5 rounded-xl text-left hover:bg-white/5 hover:border-primary/30 transition-all group"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium group-hover:text-primary transition-colors">{item.name}</span>
                    <span className="text-xs text-white/40">({item.match_count}场比赛)</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 空状态 - 无匹配 */}
        {!isLoading && !error && suggestions.length === 0 && searchQuery.length >= 2 && (
          <div className="p-8 text-center text-white/30 mt-10">
            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">search_off</span>
            <p className="text-sm">未找到匹配的运动员</p>
            <p className="text-xs mt-1">请检查拼写或尝试其他关键词</p>
          </div>
        )}

        {/* 初始提示 */}
        {!isLoading && !error && suggestions.length === 0 && searchQuery.length < 2 && (
          <div className="p-8 text-center text-white/30 mt-10">
            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">search</span>
            <p className="text-sm">输入至少2个字符开始搜索</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AthleteSearchView;

