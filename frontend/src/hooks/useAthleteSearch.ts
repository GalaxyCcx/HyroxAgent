/**
 * useAthleteSearch - 运动员搜索共享 Hook
 * 
 * 封装运动员搜索的完整状态管理和 API 调用逻辑，
 * 供 LiveTab 和 DataTab 复用。
 */

import { useState, useCallback } from 'react';
import type { 
  AthleteSearchItem, 
  AthleteResultData, 
  SuggestionItem 
} from '../types';
import { athleteApi } from '../services/api';

export interface UseAthleteSearchReturn {
  // 搜索状态
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isLoading: boolean;
  statusText: string;
  error: string | null;
  
  // 数据状态
  suggestions: SuggestionItem[];
  searchResults: AthleteSearchItem[];
  selectedAthlete: AthleteResultData | null;
  selectedName: string;
  
  // 操作方法
  fetchSuggestions: (keyword: string) => Promise<void>;
  performSearch: (name: string) => Promise<void>;
  fetchDetails: (item: AthleteSearchItem) => Promise<void>;
  
  // 重置方法
  resetToSearch: () => void;
  resetToSuggestions: () => void;
  resetAll: () => void;
  clearError: () => void;
}

export function useAthleteSearch(): UseAthleteSearchReturn {
  // 搜索状态
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // 数据状态
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [searchResults, setSearchResults] = useState<AthleteSearchItem[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteResultData | null>(null);
  const [selectedName, setSelectedName] = useState<string>('');

  // 第一阶段：获取名称建议
  const fetchSuggestions = useCallback(async (keyword: string) => {
    if (keyword.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    setStatusText('搜索中...');
    setError(null);

    try {
      const response = await athleteApi.suggest(keyword, 5);
      if (response.code === 0 && response.data) {
        setSuggestions(response.data.suggestions || []);
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error('Suggest error:', err);
      setError('网络连接失败，请检查网络');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
      setStatusText('');
    }
  }, []);

  // 第二阶段：执行搜索（获取比赛列表）
  const performSearch = useCallback(async (name: string) => {
    setIsLoading(true);
    setStatusText('正在搜索比赛记录...');
    setError(null);
    setSuggestions([]);
    setSelectedName(name);

    try {
      const response = await athleteApi.search(name, undefined, 20);
      if (response.code === 0 && response.data) {
        setSearchResults(response.data.items || []);
        if (response.data.items.length === 0) {
          setError('该运动员暂无比赛记录');
        }
      } else {
        setSearchResults([]);
        setError('搜索失败，请稍后重试');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('网络连接失败，请检查网络');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
      setStatusText('');
    }
  }, []);

  // 第三阶段：获取成绩详情
  const fetchDetails = useCallback(async (item: AthleteSearchItem) => {
    setIsLoading(true);
    setStatusText('正在获取分段成绩...');
    setError(null);

    try {
      const response = await athleteApi.getResult(item.season, item.location, item.name);
      if (response.code === 0 && response.data) {
        setSelectedAthlete(response.data);
      } else {
        setError('获取详情失败');
      }
    } catch (err) {
      console.error('Get result error:', err);
      setError('网络连接失败，请检查网络');
    } finally {
      setIsLoading(false);
      setStatusText('');
    }
  }, []);

  // 重置到搜索状态（从比赛列表返回）
  const resetToSearch = useCallback(() => {
    setSearchResults([]);
    setSelectedName('');
    setSelectedAthlete(null);
  }, []);

  // 重置到建议状态（从详情返回）
  const resetToSuggestions = useCallback(() => {
    setSelectedAthlete(null);
  }, []);

  // 完全重置
  const resetAll = useCallback(() => {
    setSearchQuery('');
    setSuggestions([]);
    setSearchResults([]);
    setSelectedAthlete(null);
    setSelectedName('');
    setError(null);
    setStatusText('');
  }, []);

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // 搜索状态
    searchQuery,
    setSearchQuery,
    isLoading,
    statusText,
    error,
    
    // 数据状态
    suggestions,
    searchResults,
    selectedAthlete,
    selectedName,
    
    // 操作方法
    fetchSuggestions,
    performSearch,
    fetchDetails,
    
    // 重置方法
    resetToSearch,
    resetToSuggestions,
    resetAll,
    clearError,
  };
}

