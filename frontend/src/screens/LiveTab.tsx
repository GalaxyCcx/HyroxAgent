/**
 * LiveTab - 首页/搜索功能页面
 * 版本: v4.0
 * 
 * 视图流程：
 * HOME (近期赛事) -> SEARCH (搜索运动员) -> RESULTS (成绩列表/排行榜) -> SUMMARY (比赛总结) -> ANALYSIS_LITE (快速分析)
 * 
 * 功能：
 * - 近期赛事展示（静态）
 * - 两阶段搜索：名称建议 + 精确搜索（对接后端 API）
 * - 成绩详情展示
 * - 赛后快速分析（静态）
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { 
  AthleteSearchItem, 
  AthleteResultData, 
  SuggestionItem,
  SplitItem,
  LeaderboardEntry,
  RaceEvent,
  RaceLeaderboardData
} from '../types';
import { athleteApi, racesApi } from '../services/api';

// --- 视图状态类型 ---
type LiveView = 'HOME' | 'SEARCH' | 'RESULTS' | 'SUMMARY' | 'ANALYSIS_LITE';

// --- 筛选类型 ---
type RaceTypeFilter = 'single' | 'doubles';  // 一级标签：单人赛/双人赛
type DivisionFilter = 'all' | 'open' | 'pro';  // 二级标签：组别筛选
type GenderFilter = 'all' | 'male' | 'female' | 'mixed';

// --- 年龄组常量 ---
const AGE_GROUPS_SINGLE_COMMON = [
  '16-24', '25-29', '30-34', '35-39', '40-44', 
  '45-49', '50-54', '55-59', '60-64', '65-69'
];
const AGE_GROUPS_SINGLE_OPEN_EXTRA = ['70+'];
const AGE_GROUPS_DOUBLES = [
  '16-29', '30-39', '40-49', '50-59', '60-70+'
];

const LiveTab: React.FC = () => {
  // --- 视图状态 ---
  const [currentView, setCurrentView] = useState<LiveView>('HOME');
  
  // --- 搜索状态 ---
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // --- 数据状态 ---
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [searchResults, setSearchResults] = useState<AthleteSearchItem[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteResultData | null>(null);
  const [selectedName, setSelectedName] = useState<string>('');
  const [selectedSearchItem, setSelectedSearchItem] = useState<AthleteSearchItem | null>(null);
  
  // --- 近期赛事状态 ---
  const [recentRaces, setRecentRaces] = useState<RaceEvent[]>([]);
  const [racesLoading, setRacesLoading] = useState(true);
  
  // --- 排行榜状态 ---
  const [selectedRace, setSelectedRace] = useState<{ season: number; location: string } | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<RaceLeaderboardData | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [raceTypeFilter, setRaceTypeFilter] = useState<RaceTypeFilter>('single');  // 一级标签
  const [divisionFilter, setDivisionFilter] = useState<DivisionFilter>('open');  // 二级标签，默认 open
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('male');  // 默认男子
  const [ageGroupFilter, setAgeGroupFilter] = useState<string>('ALL');  // 年龄组筛选
  
  // --- 搜索栏和年龄组下拉状态 ---
  const [showSearch, setShowSearch] = useState(false);
  const [showAgeDropdown, setShowAgeDropdown] = useState(false);
  const ageDropdownRef = useRef<HTMLDivElement>(null);
  
  // --- 认领功能状态 ---
  const [isClaimed, setIsClaimed] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // --- 年龄组下拉点击外部关闭 ---
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ageDropdownRef.current && !ageDropdownRef.current.contains(event.target as Node)) {
        setShowAgeDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- 获取年龄组选项 ---
  const getAgeOptions = useCallback(() => {
    if (raceTypeFilter === 'doubles') return AGE_GROUPS_DOUBLES;
    
    // SINGLE
    if (divisionFilter === 'pro') {
      return AGE_GROUPS_SINGLE_COMMON;
    } else {
      // OPEN includes 70+
      return [...AGE_GROUPS_SINGLE_COMMON, ...AGE_GROUPS_SINGLE_OPEN_EXTRA];
    }
  }, [raceTypeFilter, divisionFilter]);

  // --- 加载近期赛事 ---
  useEffect(() => {
    const loadRecentRaces = async () => {
      try {
        setRacesLoading(true);
        const response = await racesApi.getRecent(5);
        if (response.code === 0 && response.data) {
          setRecentRaces(response.data.races);
        }
      } catch (err) {
        console.error('Failed to load recent races:', err);
      } finally {
        setRacesLoading(false);
      }
    };
    loadRecentRaces();
  }, []);

  // --- 加载排行榜 ---
  const loadLeaderboard = useCallback(async (
    season: number, 
    location: string,
    division?: string,
    gender?: string,
    raceType?: RaceTypeFilter,
    ageGroup?: string
  ) => {
    setLeaderboardLoading(true);
    setError(null);
    try {
      const filters: { division?: string; gender?: string; age_group?: string; limit?: number } = { limit: 100 };
      
      // 根据一级标签和二级标签决定 API 筛选参数
      if (raceType === 'doubles') {
        if (division && division !== 'all') {
          filters.division = division === 'pro' ? 'pro_doubles' : 'doubles';
        }
      } else {
        if (division && division !== 'all') {
          filters.division = division;
        }
      }
      
      if (gender && gender !== 'all') filters.gender = gender;
      if (ageGroup && ageGroup !== 'ALL') filters.age_group = ageGroup;
      
      const response = await racesApi.getLeaderboard(season, location, filters);
      
      if (response.code === 0 && response.data) {
        let filteredLeaderboard = response.data.leaderboard;
        
        // 前端过滤：根据一级标签过滤数据
        if (raceType === 'single') {
          filteredLeaderboard = filteredLeaderboard.filter(
            (entry) => !entry.division.toLowerCase().includes('doubles')
          );
        } else if (raceType === 'doubles') {
          filteredLeaderboard = filteredLeaderboard.filter(
            (entry) => entry.division.toLowerCase().includes('doubles')
          );
        }
        
        // 重新计算排名
        filteredLeaderboard = filteredLeaderboard.map((entry, index) => ({
          ...entry,
          rank: index + 1
        }));
        
        setLeaderboardData({
          ...response.data,
          leaderboard: filteredLeaderboard,
          total: filteredLeaderboard.length
        });
      } else {
        setError(response.message || '加载排行榜失败');
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      setError('网络错误，请重试');
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  // --- 点击赛事卡片 ---
  const handleRaceClick = (race: RaceEvent) => {
    if (race.season && race.location) {
      setSelectedRace({ season: race.season, location: race.location });
      setRaceTypeFilter('single');  // 默认显示单人赛
      setDivisionFilter('open');    // 默认 Open 组
      setGenderFilter('male');      // 默认男子
      setAgeGroupFilter('ALL');     // 默认全部年龄
      // 初始加载
      loadLeaderboard(race.season, race.location, 'open', 'male', 'single', 'ALL');
      setCurrentView('RESULTS');
    }
  };

  // --- 筛选变化时重新加载 ---
  useEffect(() => {
    if (selectedRace && currentView === 'RESULTS' && !searchResults.length) {
      const division = divisionFilter === 'all' ? undefined : divisionFilter;
      const gender = genderFilter === 'all' ? undefined : genderFilter;
      const ageGroup = ageGroupFilter === 'ALL' ? undefined : ageGroupFilter;
      loadLeaderboard(selectedRace.season, selectedRace.location, division, gender, raceTypeFilter, ageGroup);
    }
  }, [raceTypeFilter, divisionFilter, genderFilter, ageGroupFilter, selectedRace, currentView, searchResults.length, loadLeaderboard]);

  // --- 导航函数 ---
  const goToSearch = () => {
    setCurrentView('SEARCH');
  };

  const goBack = () => {
    switch (currentView) {
      case 'ANALYSIS_LITE':
        setCurrentView('SUMMARY');
        break;
      case 'SUMMARY':
        setCurrentView('RESULTS');
        break;
      case 'RESULTS':
        if (searchResults.length > 0) {
          // 如果有搜索结果，返回搜索页
          setSearchResults([]);
          setSelectedName('');
          setCurrentView('SEARCH');
        } else if (selectedRace) {
          // 如果是从赛事排行榜返回，回到首页
          setSelectedRace(null);
          setLeaderboardData(null);
          setCurrentView('HOME');
        } else {
          setCurrentView('HOME');
        }
        break;
      case 'SEARCH':
        setSearchQuery('');
        setSuggestions([]);
        setError(null);
        setCurrentView('HOME');
        break;
      default:
        setCurrentView('HOME');
    }
  };

  // --- 认领功能 ---
  const handleClaimClick = () => {
    setShowClaimModal(true);
  };

  const handleClaimConfirm = () => {
    setIsClaimed(true);
    setShowClaimModal(false);
    setToastMsg('认证成功');
    setTimeout(() => setToastMsg(null), 2000);
  };

  // --- 搜索功能 ---
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

  const handleManualSearch = useCallback(() => {
    if (searchQuery.length >= 2) {
      fetchSuggestions(searchQuery);
    }
  }, [searchQuery, fetchSuggestions]);

  const performSearch = async (name: string) => {
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
        } else {
          setCurrentView('RESULTS');
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
  };

  const fetchDetails = async (item: AthleteSearchItem) => {
    setIsLoading(true);
    setStatusText('正在获取分段成绩...');
    setError(null);
    setSelectedSearchItem(item);

    try {
      const response = await athleteApi.getResult(item.season, item.location, item.name);
      if (response.code === 0 && response.data) {
        setSelectedAthlete(response.data);
        setCurrentView('SUMMARY');
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
  };

  // --- VIEW: HOME (首页 - 近期赛事) ---
  const renderHome = () => (
    <div className="flex flex-col min-h-screen bg-background-dark relative overflow-hidden animate-in fade-in duration-300">
      {/* 背景图 */}
      <div className="absolute top-0 left-0 right-0 h-[60vh] z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#101013]/30 via-[#101013]/80 to-[#101013] z-10"></div>
        <img 
          src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=800&auto=format&fit=crop" 
          className="w-full h-full object-cover opacity-50 grayscale"
          alt="Gym background" 
        />
      </div>

      <div className="relative z-10 px-5 pt-20 flex flex-col h-full min-h-screen">
        {/* 主标题 */}
        <div className="mb-6 mt-12">
          <h1 className="font-bold text-white italic leading-none font-display tracking-tight">
            <span className="text-5xl">读懂比赛</span><br/>
            <span className="text-2xl mt-2 block text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dark">谁偷走了你的 5 分钟？</span>
          </h1>
        </div>

        {/* 搜索栏 */}
        <div className="bg-[#1E2024]/80 backdrop-blur-md border border-white/10 rounded-2xl p-2 flex items-center gap-3 mb-10 shadow-lg">
          <span className="material-symbols-outlined text-white/30 text-xl ml-3">search</span>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={goToSearch}
            placeholder="输入 姓名 / 号码 / 队名" 
            className="flex-1 bg-transparent border-none text-white text-sm placeholder-white/30 focus:ring-0 focus:outline-none"
          />
          <button 
            onClick={goToSearch}
            className="bg-primary hover:bg-primary-dark text-black font-bold text-sm px-6 py-3 rounded-xl transition-colors"
          >
            去诊断
          </button>
        </div>

        {/* 近期赛事 */}
        <div className="flex-1">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white">近期赛事</h2>
          </div>

          <div className="flex flex-col gap-3 pb-32">
            {racesLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : recentRaces.length === 0 ? (
              <div className="text-center py-10 text-white/40 text-sm">
                暂无赛事数据
              </div>
            ) : (
              recentRaces.map((event) => (
                <div 
                  key={event.id}
                  onClick={() => handleRaceClick(event)}
                  className="bg-[#1E2024] border border-white/5 rounded-2xl p-4 flex items-center gap-4 hover:border-primary/30 hover:bg-[#1E2024]/80 transition-all cursor-pointer active:scale-[0.98]"
                >
                  {/* 左侧：年份 + 赛季 (仿 Demo 版日期样式) */}
                  <div className="bg-[#2A2D33] rounded-xl p-3 flex flex-col items-center justify-center w-16 text-center">
                    <span className="text-[10px] text-primary font-bold uppercase">
                      {event.year || '----'}
                    </span>
                    <span className="text-2xl font-bold text-white font-display">
                      S{event.season}
                    </span>
                  </div>
                  
                  {/* 中间：赛事信息 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-lg">{event.name}</h3>
                    <div className="flex items-center gap-1 text-white/40 text-xs mt-1">
                      <span className="material-symbols-outlined text-xs">location_on</span>
                      <span className="truncate">{event.venue}</span>
                      {event.participants && (
                        <>
                          <span className="mx-1">•</span>
                          <span>{event.participants} 人参赛</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* 右侧：已完赛状态 + 箭头 */}
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded border border-primary/30 text-[10px] text-primary font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[10px]">check_circle</span>
                      已完赛
                    </span>
                    <span className="material-symbols-outlined text-white/30 text-sm">chevron_right</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // --- VIEW: SEARCH (搜索页) ---
  const renderSearch = () => (
    <div className="flex flex-col min-h-screen bg-background-dark animate-in fade-in duration-200">
      <header className="p-4 border-b border-white/5 bg-background-dark sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="text-white/60 hover:text-white">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex-1 relative">
            <input 
              autoFocus
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSuggestions([]);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (searchQuery.length >= 2 && !isLoading) {
                    handleManualSearch();
                  }
                }
              }}
              className="w-full bg-surface-dark border border-white/20 rounded-lg py-3 pl-10 pr-12 text-white placeholder-white/30 text-sm focus:outline-none focus:border-primary/50"
              placeholder="输入运动员姓名..." 
            />
            <span className="material-symbols-outlined absolute left-3 top-3 text-white/30 text-[20px]">search</span>
            {searchQuery && (
              <div className="absolute right-3 top-2.5 flex items-center gap-1">
                <button 
                  onClick={() => setSearchQuery('')}
                  className="text-white/30 hover:text-white p-0.5"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
                <button 
                  onClick={handleManualSearch}
                  className="bg-primary/20 hover:bg-primary/30 text-primary px-2 py-1 rounded-md text-xs font-medium transition-colors"
                >
                  搜索
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

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
                  onClick={() => performSearch(item.name)}
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

        {/* 空状态 */}
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

  // --- VIEW: RESULTS (成绩列表/排行榜) ---
  const renderResults = () => {
    // 判断是显示搜索结果还是排行榜
    const hasSearchResults = searchResults.length > 0;
    const showLeaderboard = !hasSearchResults && selectedRace;
    
    // 点击排行榜选手
    const handleLeaderboardItemClick = async (entry: LeaderboardEntry) => {
      if (selectedRace) {
        // 构建 AthleteSearchItem 用于获取详情
        const searchItem: AthleteSearchItem = {
          id: `${selectedRace.season}_${selectedRace.location}_${entry.name}`,
          name: entry.name,
          nationality: entry.nationality,
          event_id: '',
          event_name: leaderboardData?.race.event_name || '',
          location: selectedRace.location,
          season: selectedRace.season,
          total_time: entry.total_time,
          total_time_minutes: entry.total_time_minutes,
          gender: entry.gender,
          division: entry.division,
          age_group: entry.age_group,
        };
        await fetchDetails(searchItem);
      }
    };

    return (
      <div className="flex flex-col min-h-screen bg-background-dark animate-in slide-in-from-right-8 duration-300">
        <header className="sticky top-0 z-30 bg-background-dark/95 backdrop-blur-md border-b border-white/5 pb-2">
          {/* Top Bar */}
          <div className="px-4 py-4 flex items-center justify-between">
            <button onClick={goBack} className="text-white">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="text-white font-bold text-sm tracking-wide">
              {hasSearchResults 
                ? selectedName 
                : leaderboardData?.race.event_name 
                  ? `${leaderboardData.race.event_name} - 成绩列表`
                  : '成绩列表'
              }
            </h1>
            <button 
              onClick={() => setShowSearch(!showSearch)}
              className={`transition-colors ${showSearch ? 'text-primary' : 'text-white/60'}`}
            >
              <span className="material-symbols-outlined">search</span>
            </button>
          </div>

          {/* Collapsible Search Bar */}
          {showSearch && (
            <div className="px-4 mb-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2 bg-[#1E2024] border border-white/10 rounded-xl px-3 py-2">
                <span className="material-symbols-outlined text-white/30 text-lg">search</span>
                <input 
                  autoFocus
                  type="text" 
                  placeholder={raceTypeFilter === 'single' ? "输入 姓名 / 参赛号" : "输入 队名 / 队员 / 参赛号"}
                  className="flex-1 bg-transparent border-none text-white text-xs p-0 focus:ring-0 focus:outline-none placeholder-white/30"
                />
                <button onClick={() => setShowSearch(false)} className="text-white/30 hover:text-white">
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            </div>
          )}
          
          {showLeaderboard && (
            <>
              {/* Level 1: Category Tabs (单人赛/双人赛) */}
              <div className="px-4 mb-3">
                <div className="flex bg-[#1E2024] rounded-lg p-1 border border-white/10">
                  <button 
                    onClick={() => {
                      setRaceTypeFilter('single');
                      setDivisionFilter('open');
                      setGenderFilter('male');
                      setAgeGroupFilter('ALL');
                    }}
                    className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${
                      raceTypeFilter === 'single' 
                        ? 'bg-[#2A2D33] text-white shadow-sm border border-white/5' 
                        : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    单人赛
                  </button>
                  <button 
                    onClick={() => {
                      setRaceTypeFilter('doubles');
                      setDivisionFilter('open');
                      setGenderFilter('male');
                      setAgeGroupFilter('ALL');
                    }}
                    className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${
                      raceTypeFilter === 'doubles' 
                        ? 'bg-[#2A2D33] text-white shadow-sm border border-white/5' 
                        : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    双人赛
                  </button>
                </div>
              </div>

              {/* Level 2: Division Segmented Buttons */}
              <div className="px-4 mb-3 flex items-center justify-center">
                <div className="flex gap-2 w-full">
                  <button 
                    onClick={() => {
                      setDivisionFilter('open');
                      // If switching to OPEN and current age is not in options, reset
                      if (raceTypeFilter === 'single' && ageGroupFilter === '70+') {
                        // 70+ is only in OPEN, keep it
                      }
                    }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${
                      divisionFilter === 'open' 
                        ? 'bg-primary/10 border-primary text-primary' 
                        : 'bg-[#1E2024] border-white/5 text-white/40 hover:bg-white/5'
                    }`}
                  >
                    {raceTypeFilter === 'doubles' ? 'Doubles (双人组)' : 'Open (公开组)'}
                  </button>
                  <button 
                    onClick={() => {
                      setDivisionFilter('pro');
                      // If switching to PRO and current age is 70+, reset to ALL
                      if (raceTypeFilter === 'single' && ageGroupFilter === '70+') {
                        setAgeGroupFilter('ALL');
                      }
                    }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${
                      divisionFilter === 'pro' 
                        ? 'bg-primary/10 border-primary text-primary' 
                        : 'bg-[#1E2024] border-white/5 text-white/40 hover:bg-white/5'
                    }`}
                  >
                    {raceTypeFilter === 'doubles' ? 'Pro Doubles (精英组)' : 'Pro (精英组)'}
                  </button>
                </div>
              </div>

              {/* Level 3: Gender Chips + Age Group Dropdown */}
              <div className="px-4 flex gap-2 pb-1 items-center">
                {/* Gender Chips */}
                <div className="flex items-center bg-[#1E2024] rounded-full p-1 border border-white/5 shrink-0">
                  {[
                    { id: 'male', label: '男子' },
                    { id: 'female', label: '女子' },
                    ...(raceTypeFilter === 'doubles' ? [{ id: 'mixed', label: '混双' }] : [])
                  ].map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setGenderFilter(g.id as GenderFilter)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                        genderFilter === g.id
                          ? 'bg-white text-black shadow-sm'
                          : 'text-white/40 hover:text-white'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>

                {/* Age Group Selector with Dropdown */}
                <div className="relative shrink-0" ref={ageDropdownRef}>
                  <button 
                    onClick={() => setShowAgeDropdown(!showAgeDropdown)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-[10px] font-bold whitespace-nowrap transition-colors ${
                      ageGroupFilter !== 'ALL' 
                        ? 'bg-primary/10 border-primary text-primary' 
                        : 'bg-[#1E2024] border-white/10 text-white/60 hover:bg-white/5'
                    }`}
                  >
                    {ageGroupFilter === 'ALL' ? '年龄组: 全部' : `年龄组: ${ageGroupFilter}`}
                    <span className="material-symbols-outlined text-xs">
                      {showAgeDropdown ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>

                  {/* Dropdown Menu */}
                  {showAgeDropdown && (
                    <div className="absolute top-full left-0 mt-2 w-32 max-h-60 overflow-y-auto bg-[#1E2024] border border-white/10 rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100 no-scrollbar">
                      <button
                        onClick={() => {
                          setAgeGroupFilter('ALL');
                          setShowAgeDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-bold border-b border-white/5 hover:bg-white/5 ${
                          ageGroupFilter === 'ALL' ? 'text-primary' : 'text-white'
                        }`}
                      >
                        全部 (All)
                      </button>
                      {getAgeOptions().map((age) => (
                        <button
                          key={age}
                          onClick={() => {
                            setAgeGroupFilter(age);
                            setShowAgeDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-bold hover:bg-white/5 ${
                            ageGroupFilter === age ? 'text-primary bg-primary/5' : 'text-white/60'
                          }`}
                        >
                          {age}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </header>

        <main className="flex-1 px-4 py-4 space-y-3 pb-32">
          {(isLoading || leaderboardLoading) ? (
            <div className="flex flex-col items-center justify-center pt-20 text-white/40">
              <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-xs">{statusText || '加载排行榜...'}</p>
            </div>
          ) : error ? (
            <div className="text-center pt-10 text-white/40">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-50">error</span>
              <p className="text-sm">{error}</p>
            </div>
          ) : hasSearchResults ? (
            // 显示搜索结果
            <>
              <p className="text-xs text-white/40 mb-3 px-1">{searchResults.length} 场比赛记录</p>
              {searchResults.map((result) => (
                <div 
                  key={result.id}
                  onClick={() => fetchDetails(result)}
                  className="rounded-2xl p-4 flex items-center justify-between border bg-[#1E2024] border-white/5 hover:border-white/20 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold font-display italic text-white/40">
                      S{result.season}
                    </div>
                    <div>
                      <div className="text-white font-bold text-lg">{result.event_name}</div>
                      <div className="text-xs text-white/40">{result.division}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-primary font-display tracking-tight mb-1">{result.total_time}</div>
                    <button className="text-[10px] font-bold px-3 py-1 rounded-full border bg-transparent text-primary border-primary/30">
                      查看
                    </button>
                  </div>
                </div>
              ))}
            </>
          ) : showLeaderboard && leaderboardData ? (
            // 显示排行榜（真实数据）
            <>
              <p className="text-xs text-white/40 mb-3 px-1">
                共 {leaderboardData.total} 位选手
                {leaderboardData.has_more && ' (显示前50名)'}
              </p>
              {leaderboardData.leaderboard.map((item) => (
                <div 
                  key={`${item.rank}-${item.name}`}
                  onClick={() => handleLeaderboardItemClick(item)}
                  className={`rounded-2xl p-4 flex items-center justify-between border transition-all cursor-pointer active:scale-[0.98] ${
                    item.rank === 1 
                    ? 'bg-gradient-to-r from-[#1a2e22] to-[#101013] border-primary/30 relative overflow-hidden' 
                    : 'bg-[#1E2024] border-white/5 hover:border-white/20'
                  }`}
                >
                  {item.rank === 1 && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>}
                  <div className="flex items-center gap-4">
                    <div className={`text-2xl font-bold font-display italic w-8 text-center ${
                      item.rank <= 3 ? 'text-yellow-500' : 'text-white/40'
                    }`}>
                      {item.rank}
                    </div>
                    <div>
                      <div className="text-white font-bold text-lg flex items-center gap-2">
                        {item.name}
                        {item.gender === 'female' && (
                          <span className="material-symbols-outlined text-pink-400 text-sm">female</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/40 mt-0.5">
                        <span className="bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                          {divisionFilter === 'pro' 
                            ? (raceTypeFilter === 'doubles' ? 'PRO DOUBLES' : 'PRO') 
                            : (raceTypeFilter === 'doubles' ? 'DOUBLES' : 'OPEN')
                          }
                        </span>
                        {item.age_group && <span>{item.age_group}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-primary font-display tracking-tight mb-1">{item.total_time}</div>
                    <button className={`text-[10px] font-bold px-3 py-1 rounded-full border ${
                      item.rank === 1 
                        ? 'bg-primary text-black border-primary' 
                        : 'bg-transparent text-primary border-primary/30'
                    }`}>
                      查看
                    </button>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="text-center pt-10 text-white/40">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-50">leaderboard</span>
              <p className="text-sm">暂无排行榜数据</p>
            </div>
          )}
        </main>
      </div>
    );
  };

  // --- VIEW: SUMMARY (比赛总结) ---
  const renderSummary = () => {
    // 如果有真实数据，使用真实数据；否则使用 Mock
    const hasRealData = selectedAthlete !== null;
    
    const displayData = hasRealData ? {
      eventName: selectedAthlete.race.event_name,
      name: selectedAthlete.athlete.name,
      totalTime: selectedAthlete.results.total_time,
      divisionRank: selectedAthlete.rankings.division_rank,
      divisionTotal: selectedAthlete.rankings.division_total,
      ageGroupRank: selectedAthlete.rankings.age_group_rank ?? null,
      ageGroupTotal: selectedAthlete.rankings.age_group_total ?? null,
      runTime: selectedAthlete.results.run_time,
      workTime: selectedAthlete.results.work_time,
      roxzoneTime: selectedAthlete.results.roxzone_time,
    } : {
      eventName: 'HYROX 北京站 2026',
      name: '陈悦',
      totalTime: '01:24:10',
      divisionRank: 1,
      divisionTotal: 200,
      ageGroupRank: 1,
      ageGroupTotal: 45,
      runTime: '42:15',
      workTime: '41:55',
      roxzoneTime: '09:07',
    };

    // 计算百分位
    const getTopPercent = (rank: number, total: number) => 
      total > 0 ? Math.ceil((rank / total) * 100) : 0;
    const getBeatPercent = (rank: number, total: number) =>
      total > 0 ? Math.round((1 - rank / total) * 100) : 0;
    
    const topPercent = getTopPercent(displayData.divisionRank, displayData.divisionTotal);
    const divisionBeatPercent = getBeatPercent(displayData.divisionRank, displayData.divisionTotal);
    const ageGroupBeatPercent = displayData.ageGroupRank && displayData.ageGroupTotal
      ? getBeatPercent(displayData.ageGroupRank, displayData.ageGroupTotal)
      : null;

    return (
      <div className="flex flex-col min-h-screen bg-background-dark animate-in slide-in-from-right-8 duration-300">
        <header className="px-4 py-4 flex items-center justify-between sticky top-0 bg-background-dark/95 backdrop-blur-md z-30 border-b border-white/5">
          <button onClick={goBack} className="text-white">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <span className="text-white font-bold">比赛总结</span>
          <span className="material-symbols-outlined text-white">share</span>
        </header>

        <main className="flex-1 p-5 pb-32 overflow-y-auto no-scrollbar relative">
          {/* Background Grid Pattern */}
          <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{ backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`, backgroundSize: '40px 40px', maskImage: 'linear-gradient(to bottom, black 20%, transparent 100%)' }}></div>
          
          <div className="relative z-10">
            {/* Main Summary Card */}
            <div className="bg-[#15171A] border border-white/10 rounded-3xl p-6 mb-4 shadow-2xl relative overflow-hidden">
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                  <div className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">{displayData.eventName}</div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-white">{displayData.name}</h1>
                  </div>
                </div>
                <div className="size-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                  <span className="material-symbols-outlined text-white/60">emoji_events</span>
                </div>
              </div>

              <div className="text-center mb-10 relative z-10">
                <div className="text-[10px] text-white/30 tracking-[0.3em] font-mono mb-2 uppercase">OFFICIAL TIME</div>
                <div className="text-6xl font-bold text-primary font-display tracking-tighter drop-shadow-[0_0_20px_rgba(66,255,158,0.3)]">{displayData.totalTime}</div>
              </div>

              <div className="grid grid-cols-3 gap-3 relative z-10">
                {/* 动态徽章 - 前 X% */}
                <div className="bg-[#1E2024]/50 border border-yellow-500/30 rounded-xl p-3 flex flex-col items-center justify-center h-20">
                  <span className="material-symbols-outlined text-yellow-500 text-sm mb-1 filled">verified</span>
                  <span className="text-xs font-bold text-yellow-500">前 {topPercent}%</span>
                </div>
                {/* 组别排名 */}
                <div className="bg-[#1E2024]/50 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center h-20">
                  <span className="text-[10px] text-white/40 mb-0.5">组别排名</span>
                  <span className="text-lg font-bold text-white font-display">#{displayData.divisionRank}<span className="text-xs text-white/30 font-normal">/{displayData.divisionTotal}</span></span>
                  <span className="text-[9px] text-primary/80 mt-0.5">击败 {divisionBeatPercent}%</span>
                </div>
                {/* 年龄组排名 */}
                <div className="bg-[#1E2024]/50 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center h-20">
                  <span className="text-[10px] text-white/40 mb-0.5">年龄组</span>
                  {displayData.ageGroupRank !== null ? (
                    <>
                      <span className="text-lg font-bold text-white font-display">#{displayData.ageGroupRank}<span className="text-xs text-white/30 font-normal">/{displayData.ageGroupTotal}</span></span>
                      <span className="text-[9px] text-primary/80 mt-0.5">击败 {ageGroupBeatPercent}%</span>
                    </>
                  ) : (
                    <span className="text-sm text-white/30">--</span>
                  )}
                </div>
              </div>
            </div>

            {/* Breakdown Cards */}
            <div className="bg-[#15171A] border border-white/10 rounded-3xl p-4 mb-6 grid grid-cols-3 gap-0 relative overflow-hidden">
              <div className="absolute inset-y-4 left-1/3 w-px bg-white/5"></div>
              <div className="absolute inset-y-4 right-1/3 w-px bg-white/5"></div>
              
              {[
                { icon: 'directions_run', label: '跑步 (8圈)', sub: '8圈总用时', val: displayData.runTime, color: 'text-pink-500', bg: 'bg-pink-500/20' },
                { icon: 'fitness_center', label: '站点 (8个)', sub: '8项功能站总用时', val: displayData.workTime, color: 'text-primary', bg: 'bg-primary/20' },
                { icon: 'bolt', label: '转换区 (8段)', sub: '8次转换区总用时', val: displayData.roxzoneTime, color: 'text-blue-400', bg: 'bg-blue-400/20' }
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center text-center p-2 relative">
                  <div className={`size-8 rounded-full ${item.bg} flex items-center justify-center mb-3`}>
                    <span className={`material-symbols-outlined ${item.color} text-sm`}>{item.icon}</span>
                  </div>
                  <div className="text-xs font-bold text-white mb-1">{item.label}</div>
                  <div className="text-[8px] text-white/30 mb-2 scale-90">{item.sub}</div>
                  <div className="text-lg font-bold text-white font-display mb-3">{item.val}</div>
                  <button className="text-[10px] text-primary flex items-center gap-0.5 opacity-80 hover:opacity-100 transition-opacity">
                    点击查看 <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Claim Bar - 仅未认领时显示 */}
            {!isClaimed && (
              <div className="bg-[#15171A] border border-primary/20 rounded-2xl p-4 mb-6 flex items-center justify-between shadow-[0_0_15px_rgba(66,255,158,0.1)]">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">person_check</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">这是您的成绩？</div>
                    <div className="text-[10px] text-white/50">认领后可永久保存并分析</div>
                  </div>
                </div>
                <button 
                  onClick={handleClaimClick}
                  className="px-4 py-2 rounded-lg bg-primary text-black text-xs font-bold hover:brightness-110"
                >
                  去认领
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <button 
                onClick={() => setCurrentView('ANALYSIS_LITE')}
                className="w-full h-20 bg-gradient-to-r from-primary to-primary-dark rounded-2xl flex items-center justify-center gap-4 shadow-[0_0_20px_rgba(66,255,158,0.4)] hover:brightness-110 active:scale-[0.98] transition-all group"
              >
                <span className="material-symbols-outlined text-black text-2xl group-hover:rotate-12 transition-transform">auto_awesome</span>
                <div className="text-left">
                  <div className="text-black font-bold text-base">查看快速分析 Lite</div>
                  <div className="text-black/60 text-xs font-medium mt-0.5">1分钟读懂比赛表现</div>
                </div>
              </button>

              <button className="w-full h-16 bg-transparent border border-white/10 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/5 active:scale-[0.98] transition-all">
                <span className="material-symbols-outlined text-white text-lg">image</span>
                <span className="text-white font-bold text-sm">生成战报海报</span>
              </button>
            </div>
            
            <div className="text-center mt-8 flex items-center justify-center gap-2 text-[10px] text-white/20">
              <span className="material-symbols-outlined text-[10px]">watch</span>
              上传手表数据解锁精确配速分析
            </div>
          </div>
        </main>
      </div>
    );
  };

  // --- VIEW: ANALYSIS LITE (赛后快速分析) ---
  const renderAnalysisLite = () => {
    const displayData = selectedAthlete ? {
      eventName: selectedAthlete.race.event_name,
      name: selectedAthlete.athlete.name,
      totalTime: selectedAthlete.results.total_time,
      division: selectedAthlete.athlete.division,
      divisionRank: selectedAthlete.rankings.division_rank,
      divisionTotal: selectedAthlete.rankings.division_total,
    } : {
      eventName: 'HYROX 北京站 2026',
      name: '陈悦',
      totalTime: '01:24:10',
      division: 'Men Open',
      divisionRank: 1,
      divisionTotal: 200,
    };

    return (
      <div className="flex flex-col min-h-screen bg-background-dark animate-in slide-in-from-right-8 duration-300">
        <header className="px-4 py-4 flex items-center justify-between sticky top-0 bg-background-dark/95 backdrop-blur-md z-30 border-b border-white/5">
          <button onClick={goBack} className="text-white">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <span className="text-white font-bold">赛后分析 (Lite)</span>
          <span className="material-symbols-outlined text-white/60">help</span>
        </header>

        <div className="bg-[#15171A] border-b border-white/5 px-4 py-2 flex justify-between text-[10px] text-white/40 font-mono">
          <span>{displayData.eventName}</span>
          <span>|</span>
          <span>{displayData.division}</span>
          <span>|</span>
          <span>{displayData.name}</span>
          <span>|</span>
          <span>{displayData.totalTime}</span>
        </div>

        <main className="flex-1 px-4 py-5 space-y-5 pb-32 overflow-y-auto no-scrollbar">
          {/* Hero Card with Image */}
          <div className="relative rounded-2xl overflow-hidden h-48 border border-white/10 group">
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10"></div>
            <img src="https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover grayscale opacity-60 group-hover:scale-105 transition-transform duration-700" />
            
            <div className="absolute top-4 left-4 z-20">
              <span className="px-2 py-1 bg-primary text-black text-[10px] font-bold rounded flex items-center gap-1 w-fit">
                <span className="material-symbols-outlined text-[10px]">location_on</span> BEIJING
              </span>
              <h2 className="text-xl font-bold text-white mt-2">HYROX {displayData.division}</h2>
              <div className="text-[10px] text-white/60">2026.10.15</div>
            </div>

            <div className="absolute bottom-4 left-4 right-4 z-20 flex justify-between items-end">
              <div className="text-center bg-black/40 backdrop-blur-md rounded-lg p-2 border border-white/10">
                <div className="text-2xl font-bold text-white font-display">{displayData.totalTime}</div>
                <div className="text-[9px] text-white/40">完赛时间</div>
              </div>
              <div className="text-center bg-black/40 backdrop-blur-md rounded-lg p-2 border border-white/10">
                <div className="text-xl font-bold text-white font-display">{displayData.divisionRank}<span className="text-xs text-white/40 font-normal">/{displayData.divisionTotal}</span></div>
                <div className="text-[9px] text-white/40">组别排名</div>
              </div>
              <div className="text-center bg-black/40 backdrop-blur-md rounded-lg p-2 border border-white/10">
                <div className="text-xl font-bold text-primary font-display">OPEN</div>
                <div className="text-[9px] text-white/40">组别</div>
              </div>
            </div>
          </div>

          {/* Conclusion Card */}
          <div className="bg-[#1E2024] border border-primary/20 rounded-2xl p-5 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-primary text-lg">psychology</span>
              <h3 className="text-sm font-bold text-white">一句话结论</h3>
            </div>
            <p className="text-sm text-white/80 leading-relaxed relative z-10">
              你跑步很稳，关键差距在<span className="text-white font-bold">站点效率</span>；下一次最值得先补：<span className="text-primary font-bold border-b border-primary/30">Wall Balls</span> 与 <span className="text-primary font-bold border-b border-primary/30">Roxzone</span>。
            </p>
            <div className="absolute top-0 right-0 size-24 bg-primary/5 rounded-full blur-2xl -mt-8 -mr-8"></div>
          </div>

          {/* Strength/Weakness Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#1E2024] border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-primary text-sm filled">check_circle</span>
                <h3 className="text-xs font-bold text-white">优势</h3>
              </div>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-xs text-white/60">
                  <span className="size-1 bg-primary rounded-full"></span>
                  跑步节奏稳定
                </li>
                <li className="flex items-center gap-2 text-xs text-white/60">
                  <span className="size-1 bg-primary rounded-full"></span>
                  Sled Push 爆发力
                </li>
              </ul>
            </div>
            <div className="bg-[#1E2024] border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-yellow-500 text-sm filled">warning</span>
                <h3 className="text-xs font-bold text-white">短板</h3>
              </div>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-xs text-white/60">
                  <span className="size-1 bg-yellow-500 rounded-full"></span>
                  Wall Balls 后段波动
                </li>
                <li className="flex items-center gap-2 text-xs text-white/60">
                  <span className="size-1 bg-yellow-500 rounded-full"></span>
                  Burpees 节奏混乱
                </li>
              </ul>
            </div>
          </div>

          <div className="text-[10px] text-white/30 text-center pt-2">
            想看逐段对比与省时拆解？
          </div>

          {/* Upsell Button */}
          <button className="w-full py-4 bg-gradient-to-r from-primary to-primary-dark rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(66,255,158,0.3)] hover:brightness-110 active:scale-[0.98] transition-all">
            <span className="material-symbols-outlined text-black">lock</span>
            <span className="text-black font-bold">¥9.9 解锁详细分段报告 (PDF)</span>
          </button>

          {/* Secondary Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button className="py-3 bg-[#1E2024] border border-white/10 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 hover:bg-white/5">
              <span className="material-symbols-outlined text-sm">ios_share</span>
              分享这份战报
            </button>
            <button onClick={() => setCurrentView('SUMMARY')} className="py-3 bg-[#1E2024] border border-white/10 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 hover:bg-white/5">
              回到比赛总结
            </button>
          </div>
          
          {/* Teaser Content (Locked) */}
          <div className="bg-[#1E2024] border border-white/5 rounded-2xl p-4 opacity-50 relative overflow-hidden">
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-[#2A2D33] text-primary text-xs font-bold size-6 rounded flex items-center justify-center">3</span>
              <h3 className="font-bold text-white text-sm">心率分配控制</h3>
            </div>
            <p className="text-xs text-white/50">跑步段落严格控制在阈值区间，为力量站点储备体能...</p>
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center z-10">
              <span className="material-symbols-outlined text-white/40">lock</span>
            </div>
          </div>
        </main>
      </div>
    );
  };

  // --- 主渲染切换 ---
  const renderCurrentView = () => {
    switch (currentView) {
      case 'HOME':
        return renderHome();
      case 'SEARCH':
        return renderSearch();
      case 'RESULTS':
        return renderResults();
      case 'SUMMARY':
        return renderSummary();
      case 'ANALYSIS_LITE':
        return renderAnalysisLite();
      default:
        return renderHome();
    }
  };

  return (
    <>
      {renderCurrentView()}

      {/* Claim Confirmation Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#101013] border border-white/10 rounded-3xl p-6 w-full max-w-xs relative z-10 animate-in zoom-in-95 duration-200 shadow-2xl overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-primary/10 rounded-full blur-[40px] pointer-events-none"></div>

            <div className="size-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-5 mx-auto relative z-10 shadow-[0_0_20px_rgba(66,255,158,0.2)]">
              <span className="material-symbols-outlined text-primary text-3xl filled">lock_person</span>
            </div>
            
            <h3 className="text-lg font-bold text-white text-center mb-3 relative z-10">确认保存到我的？</h3>
            
            <p className="text-xs text-white/60 text-center mb-8 leading-relaxed relative z-10 px-2">
              保存后该成绩将同步至你的运动员档案，并解锁 <span className="text-white font-bold">详细数据分析</span>。
            </p>
            
            <div className="flex gap-3 relative z-10">
              <button 
                onClick={() => setShowClaimModal(false)}
                className="flex-1 py-3.5 rounded-xl bg-transparent border border-white/10 text-white font-bold text-sm hover:bg-white/5 active:scale-[0.98] transition-all"
              >
                取消
              </button>
              <button 
                onClick={handleClaimConfirm}
                className="flex-1 py-3.5 rounded-xl bg-primary text-black font-bold text-sm shadow-[0_0_20px_rgba(66,255,158,0.3)] flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-[#1E2024]/90 backdrop-blur-md border border-white/10 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3">
            <span className="material-symbols-outlined text-primary filled">check_circle</span>
            <span className="font-bold text-sm">{toastMsg}</span>
          </div>
        </div>
      )}
    </>
  );
};

export default LiveTab;
