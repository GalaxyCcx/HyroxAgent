/**
 * DataTab - 我的/比赛数据中心页面
 * 版本: v4.0
 * 
 * 视图流程：
 * PROFILE (个人资料) -> HUB (比赛履历) -> SUMMARY (比赛总结) -> SPLIT_CENTER (分段中心) -> STATION_DETAIL (站点深挖) -> POSTER (战报海报)
 * 
 * 从 PROFILE 可以：
 * - 查看已绑定的比赛历史（如果有缓存）
 * - 搜索其他运动员数据
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useAthleteSearch } from '../hooks/useAthleteSearch';
import { athleteApi, reportApi } from '../services/api';
import type { 
  AthleteSearchItem, 
  AthleteResultData, 
  SplitAnalyticsData,
  UserProfile,
  ProReportSummary,
  ProReportDetail,
  PendingSplitIntent
} from '../types';
import AthleteSearchView from '../components/AthleteSearchView';

// --- Types ---
type ViewState = 'PROFILE' | 'SEARCH_ACTIVE' | 'HUB' | 'SUMMARY' | 'SPLIT_CENTER' | 'STATION_DETAIL' | 'POSTER' | 'PRO_REPORT';
type SplitTab = 'OVERVIEW' | 'RUN' | 'STATION';

export interface DataTabProps {
  pendingSplitIntent?: PendingSplitIntent | null;
  setPendingSplitIntent?: (intent: PendingSplitIntent | null) => void;
}

// --- Mock Data: 用户个人资料 ---
const MOCK_PROFILE: UserProfile = {
  name: '陈悦 (Mitch Chen)',
  id: 'CN-88392-M',
  avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
  isPro: true,
  stats: {
    completed: 4,
    pb: '01:22:00',
    ageGroup: '35-39',
    rank: '#42'
  }
};

// --- Helper Functions ---
const getDivisionType = (division: string): 'SINGLE' | 'DOUBLES' => {
  const lower = division.toLowerCase();
  if (lower.includes('double')) return 'DOUBLES';
  return 'SINGLE';
};

const getTopPercentBadge = (rank: number, total: number): { text: string; show: boolean; style: string } | null => {
  if (total === 0) return null;
  const percent = (rank / total) * 100;
  if (percent <= 5) return { text: 'TOP 5%', show: true, style: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-500' };
  if (percent <= 10) return { text: 'TOP 10%', show: true, style: 'bg-primary/20 border-primary/30 text-primary' };
  if (percent <= 20) return { text: 'TOP 20%', show: true, style: 'bg-primary/10 border-primary/20 text-primary' };
  if (percent <= 50) return { text: 'TOP 50%', show: true, style: 'bg-white/10 border-white/20 text-white/60' };
  return null;
};

const DataTab: React.FC<DataTabProps> = ({ pendingSplitIntent = null, setPendingSplitIntent }) => {
  // --- View State ---
  const [currentView, setCurrentView] = useState<ViewState>('PROFILE');
  const [splitTab, setSplitTab] = useState<SplitTab>('OVERVIEW');
  const [profileTab, setProfileTab] = useState<'races' | 'training'>('races');
  
  // --- Search State (from hook) ---
  const search = useAthleteSearch();
  
  // --- Data State ---
  const [selectedSearchItem, setSelectedSearchItem] = useState<AthleteSearchItem | null>(null);
  const [resultData, setResultData] = useState<AthleteResultData | null>(null);
  const [analyticsData, setAnalyticsData] = useState<SplitAnalyticsData | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // --- 处理从首页比赛总结跳转过来的分段中心意图 ---
  useEffect(() => {
    if (!pendingSplitIntent || !setPendingSplitIntent) return;
    const intent = pendingSplitIntent;
    let cancelled = false;
    setIsLoadingDetail(true);
    setDetailError(null);
    Promise.all([
      athleteApi.getResult(intent.season, intent.location, intent.athleteName),
      athleteApi.getAnalytics(intent.season, intent.location, intent.athleteName)
    ]).then(([resultResponse, analyticsResponse]) => {
      if (cancelled) return;
      if (resultResponse.code === 0 && resultResponse.data) setResultData(resultResponse.data);
      if (analyticsResponse.code === 0 && analyticsResponse.data) setAnalyticsData(analyticsResponse.data);
      setCurrentView('SPLIT_CENTER');
      setSplitTab(intent.splitTab);
      setPendingSplitIntent(null);
    }).catch((err) => {
      if (!cancelled) {
        console.error('Failed to load split center from intent:', err);
        setDetailError('加载分段数据失败，请重试');
        setPendingSplitIntent(null);
      }
    }).finally(() => {
      if (!cancelled) setIsLoadingDetail(false);
    });
    return () => { cancelled = true; };
  }, [pendingSplitIntent, setPendingSplitIntent]);
  
  // --- 专业报告状态 ---
  const [proReports, setProReports] = useState<ProReportSummary[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ProReportDetail | null>(null);
  const [isLoadingReportDetail, setIsLoadingReportDetail] = useState(false);
  

  // --- 加载报告列表 ---
  const loadReports = useCallback(async () => {
    setIsLoadingReports(true);
    try {
      // 使用运动员姓名查询（本地测试用）
      const result = await reportApi.list({ athleteName: MOCK_PROFILE.name.split(' ')[0] });
      setProReports(result.reports || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setIsLoadingReports(false);
    }
  }, []);

  // 页面加载时获取报告列表
  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // 定期刷新报告状态（每 5 秒，如果有进行中的报告）
  useEffect(() => {
    const hasGenerating = proReports.some(r => r.status === 'generating');
    if (!hasGenerating) return;

    const interval = setInterval(() => {
      loadReports();
    }, 5000);

    return () => clearInterval(interval);
  }, [proReports, loadReports]);

  // --- 查看报告详情 ---
  const handleViewReport = async (reportId: string) => {
    setIsLoadingReportDetail(true);
    try {
      const detail = await reportApi.getDetail(reportId);
      setSelectedReport(detail);
      setCurrentView('PRO_REPORT');
    } catch (err) {
      console.error('Failed to load report detail:', err);
    } finally {
      setIsLoadingReportDetail(false);
    }
  };

  // --- Handlers ---
  const handleStartSearch = () => {
    setCurrentView('SEARCH_ACTIVE');
  };

  const handleSearchBack = () => {
    search.resetAll();
    setCurrentView('PROFILE');
  };

  const handleSelectSuggestion = async (name: string) => {
    await search.performSearch(name);
    // 直接跳转到 HUB，显示全部比赛卡片
    setCurrentView('HUB');
  };

  // 点击比赛卡片，获取详情后进入 SUMMARY
  const handleRaceCardClick = async (item: AthleteSearchItem) => {
    setSelectedSearchItem(item);
    setIsLoadingDetail(true);
    setDetailError(null);
    
    try {
      // 并行请求详情和统计数据
      const [resultResponse, analyticsResponse] = await Promise.all([
        athleteApi.getResult(item.season, item.location, item.name),
        athleteApi.getAnalytics(item.season, item.location, item.name)
      ]);

      if (resultResponse.code === 0 && resultResponse.data) {
        setResultData(resultResponse.data);
      }
      if (analyticsResponse.code === 0 && analyticsResponse.data) {
        setAnalyticsData(analyticsResponse.data);
      }
      
      // 获取详情后进入 SUMMARY
      setCurrentView('SUMMARY');
    } catch (err) {
      console.error('Failed to load race data:', err);
      setDetailError('加载数据失败，请重试');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const goBack = useCallback(() => {
    switch(currentView) {
      case 'SEARCH_ACTIVE':
        handleSearchBack();
        break;
      case 'HUB':
        // 从数据中心返回 Profile
        search.resetAll();
        setCurrentView('PROFILE');
        break;
      case 'SUMMARY':
        // 从比赛详情返回数据中心
        setCurrentView('HUB');
        break;
      case 'SPLIT_CENTER':
        setCurrentView('SUMMARY');
        break;
      case 'STATION_DETAIL':
        setSplitTab('STATION');
        setCurrentView('SPLIT_CENTER');
        break;
      case 'POSTER':
        setCurrentView('SUMMARY');
        break;
      case 'PRO_REPORT':
        setSelectedReport(null);
        setCurrentView('PROFILE');
        break;
      default:
        setCurrentView('PROFILE');
    }
  }, [currentView, search]);

  // --- VIEW: PROFILE (个人资料首页) ---
  const renderProfile = () => (
    <div className="flex flex-col min-h-screen bg-background-dark animate-in fade-in duration-300">
      <div className="relative z-10 px-5 pt-8 pb-4">
        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative">
            <div className="size-20 rounded-full p-0.5 bg-gradient-to-tr from-primary to-blue-500 shadow-[0_0_20px_rgba(66,255,158,0.3)]">
              <img 
                src={MOCK_PROFILE.avatar} 
                className="w-full h-full rounded-full object-cover border-2 border-background-dark" 
                alt="Profile"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-[#1E2024] rounded-full p-1 border border-white/10">
              <span className="material-symbols-outlined text-primary text-sm filled">verified</span>
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white leading-tight font-display tracking-wide">{MOCK_PROFILE.name}</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/10 text-white/60 border border-white/10">
                ID: {MOCK_PROFILE.id}
              </span>
              {MOCK_PROFILE.isPro && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1a4d36] text-primary border border-primary/20">PRO</span>
              )}
            </div>
          </div>
          <button className="size-10 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:bg-white/10">
            <span className="material-symbols-outlined text-xl">settings</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-[#1E2024] border border-white/5 rounded-xl p-4 flex flex-col justify-between h-24">
            <span className="text-[10px] text-white/40 font-bold">已完成比赛</span>
            <span className="text-3xl font-bold text-white font-display">{MOCK_PROFILE.stats.completed}</span>
          </div>
          <div className="bg-[#1E2024] border border-primary/20 rounded-xl p-4 flex flex-col justify-between h-24 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-1.5">
              <span className="material-symbols-outlined text-primary/20">timer</span>
            </div>
            <span className="text-[10px] text-primary font-bold">个人最佳 (PB)</span>
            <span className="text-3xl font-bold text-white font-display">{MOCK_PROFILE.stats.pb}</span>
          </div>
          <div className="bg-[#1E2024] border border-white/5 rounded-xl p-4 flex flex-col justify-between h-24">
            <span className="text-[10px] text-white/40 font-bold">年龄组</span>
            <span className="text-3xl font-bold text-white font-display">{MOCK_PROFILE.stats.ageGroup}</span>
          </div>
          <div className="bg-[#1E2024] border border-white/5 rounded-xl p-4 flex flex-col justify-between h-24">
            <span className="text-[10px] text-white/40 font-bold">最近一场排名</span>
            <span className="text-3xl font-bold text-white font-display flex items-baseline gap-1">
              {MOCK_PROFILE.stats.rank} <span className="text-sm font-normal text-white/30">/ 500</span>
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-8 mb-4 border-b border-white/5">
          <button 
            onClick={() => setProfileTab('races')}
            className={`pb-2 text-sm font-bold relative ${profileTab === 'races' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
          >
            比赛
            {profileTab === 'races' && (
              <span className="absolute -bottom-0.5 left-0 w-8 h-0.5 bg-primary rounded-full shadow-[0_0_10px_#42ff9e]"></span>
            )}
          </button>
          <button 
            onClick={() => setProfileTab('training')}
            className={`pb-2 text-sm font-bold ${profileTab === 'training' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
          >
            训练数据
          </button>
        </div>

        {/* Search Button */}
        <button
          onClick={handleStartSearch}
          className="w-full mb-6 bg-surface-dark/60 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3.5 flex items-center gap-3 text-left transition-all hover:bg-surface-dark/80 hover:border-white/20"
        >
          <span className="material-symbols-outlined text-white/40 text-[20px]">search</span>
          <span className="text-white/40 text-sm font-medium flex-1">搜索其他运动员...</span>
          <span className="material-symbols-outlined text-white/20 text-sm">arrow_forward</span>
        </button>

        {/* 专业分析报告区域 - 始终显示 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">description</span>
              专业分析报告
            </h3>
            {proReports.length > 0 && (
              <span className="text-[10px] text-white/40">{proReports.length} 份报告</span>
            )}
          </div>
          
          {isLoadingReports ? (
            <div className="bg-[#1E2024] border border-white/10 rounded-xl p-6 flex items-center justify-center">
              <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2"></div>
              <span className="text-sm text-white/40">加载中...</span>
            </div>
          ) : proReports.length === 0 ? (
            <div className="bg-[#1E2024] border border-white/10 rounded-xl p-6 text-center">
              <div className="size-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-white/20 text-2xl">article</span>
              </div>
              <p className="text-sm text-white/40 mb-1">暂无专业分析报告</p>
              <p className="text-[10px] text-white/30">在比赛总结页面点击「¥9.9 解锁」生成报告</p>
            </div>
          ) : (
            <div className="space-y-2">
              {proReports.map((report) => (
                <div 
                  key={report.report_id}
                  onClick={() => report.status === 'completed' && handleViewReport(report.report_id)}
                  className={`bg-[#1E2024] border rounded-xl p-4 transition-all ${
                    report.status === 'completed' 
                      ? 'border-primary/20 cursor-pointer hover:border-primary/40' 
                      : 'border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">
                        {report.title || `${report.location} 分析报告`}
                      </h4>
                      <p className="text-[10px] text-white/40 mt-0.5">
                        S{report.season} • {report.athlete_name}
                      </p>
                    </div>
                    {report.status === 'completed' ? (
                      <span className="px-2 py-1 bg-primary/20 border border-primary/30 text-primary text-[10px] font-bold rounded flex items-center gap-1">
                        <span className="material-symbols-outlined text-[10px]">check_circle</span>
                        已完成
                      </span>
                    ) : report.status === 'generating' ? (
                      <span className="px-2 py-1 bg-yellow-500/20 border border-yellow-500/30 text-yellow-500 text-[10px] font-bold rounded flex items-center gap-1">
                        <div className="size-2 border border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                        生成中
                      </span>
                    ) : report.status === 'error' ? (
                      <span className="px-2 py-1 bg-red-500/20 border border-red-500/30 text-red-500 text-[10px] font-bold rounded">
                        失败
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-white/10 border border-white/20 text-white/40 text-[10px] font-bold rounded">
                        等待中
                      </span>
                    )}
                  </div>
                  
                  {report.status === 'generating' && (
                    <div className="mt-2">
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-yellow-500 transition-all duration-300"
                          style={{ width: `${report.progress}%` }}
                        ></div>
                      </div>
                      <p className="text-[10px] text-white/40 mt-1">{report.current_step} ({report.progress}%)</p>
                    </div>
                  )}
                  
                  {report.status === 'completed' && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                      <span className="text-[10px] text-white/30">
                        {new Date(report.completed_at || '').toLocaleDateString()}
                      </span>
                      <span className="text-[10px] text-primary flex items-center gap-1">
                        查看详情 <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Race List */}
        <div className="space-y-4 pb-32">
          {/* Beijing 2026 Card */}
          <div className="bg-[#1E2024] border border-white/10 rounded-2xl p-5 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">2026 北京站</h3>
                  <span className="material-symbols-outlined text-primary text-sm filled">verified</span>
                </div>
                <p className="text-[10px] text-white/40 mt-1 font-mono">HYROX BEIJING • Oct 14</p>
              </div>
              <div className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-white/40 font-bold">
                已完赛
              </div>
            </div>

            <div className="flex items-end justify-between mb-6">
              <div>
                <div className="text-5xl font-bold text-primary font-display tracking-tight drop-shadow-[0_0_15px_rgba(66,255,158,0.2)]">01:24:10</div>
                <div className="text-[10px] text-white/30 tracking-widest mt-1 uppercase">TOTAL TIME</div>
              </div>
              {/* Abstract Map Graphic */}
              <div className="w-16 h-12 bg-white/5 rounded opacity-20"></div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-black/20 rounded-xl p-3 mb-4">
              <div>
                <div className="text-[10px] text-white/40 mb-1">总排名</div>
                <div className="text-sm font-bold text-white font-mono">#42 <span className="text-white/30 text-[10px]">/ 1200</span></div>
              </div>
              <div>
                <div className="text-[10px] text-white/40 mb-1">年龄组 (35-39)</div>
                <div className="text-sm font-bold text-white font-mono">#12 <span className="text-white/30 text-[10px]">/ 85</span></div>
              </div>
            </div>

            <button 
              onClick={handleStartSearch}
              className="w-full py-3 rounded-xl border border-primary/30 text-primary font-bold text-sm hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
            >
              查看分段 <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>
          </div>

          {/* Hong Kong 2025 Card */}
          <div className="bg-[#1E2024] border border-white/5 rounded-2xl p-5 relative opacity-80 hover:opacity-100 transition-opacity">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-white/80">2025 香港站</h3>
                <p className="text-[10px] text-white/30 mt-1 font-mono">HYROX HONG KONG • Nov 22</p>
              </div>
              <div className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-white/30 font-bold">
                已完赛
              </div>
            </div>
            <div className="mb-6">
              <div className="text-4xl font-bold text-white/60 font-display">01:28:45</div>
            </div>
            <button className="w-full py-3 rounded-xl bg-white/5 text-white/40 font-bold text-sm hover:bg-white/10 transition-colors">
              查看历史数据
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // --- VIEW: SEARCH ACTIVE ---
  const renderSearchActive = () => (
    <AthleteSearchView
      searchQuery={search.searchQuery}
      isLoading={search.isLoading}
      statusText={search.statusText}
      error={search.error}
      suggestions={search.suggestions}
      onSearchQueryChange={search.setSearchQuery}
      onSearch={() => search.fetchSuggestions(search.searchQuery)}
      onSelectSuggestion={handleSelectSuggestion}
      onBack={handleSearchBack}
      placeholder="输入运动员姓名..."
    />
  );

  // --- VIEW: HUB (Data Center) - 显示全部比赛卡片 ---
  const renderHub = () => {
    // 从搜索结果获取用户名
    const athleteName = search.selectedName || '运动员';
    const firstChar = athleteName.charAt(0).toUpperCase();

    return (
      <div className="flex flex-col min-h-screen bg-background-dark relative overflow-hidden font-body pb-24">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{ backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`, backgroundSize: '40px 40px', maskImage: 'linear-gradient(to bottom, black 20%, transparent 100%)' }}></div>

        <div className="relative z-10 px-5 pt-8 pb-4">
          <div className="flex justify-between items-center mb-6">
            <button onClick={goBack} className="text-white">
              <span className="material-symbols-outlined text-xl">arrow_back_ios</span>
            </button>
            <h1 className="text-lg font-bold text-white">数据中心</h1>
            <button onClick={() => {
              search.resetAll();
              setCurrentView('SEARCH_ACTIVE');
            }} className="text-white/60 hover:text-white">
              <span className="material-symbols-outlined">search</span>
            </button>
          </div>
          
          <div className="flex items-center gap-4 mb-2">
            <div className="relative">
              <div className="size-20 rounded-full p-0.5 bg-gradient-to-tr from-primary to-blue-500 shadow-[0_0_20px_rgba(66,255,158,0.3)]">
                <div className="w-full h-full rounded-full bg-surface-dark flex items-center justify-center border-2 border-background-dark">
                  <span className="text-2xl font-bold text-white">{firstChar}</span>
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white leading-tight font-display tracking-wide">{athleteName}</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-white/5 text-white/60 border border-white/10 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">link</span>
                  {search.searchResults.length} 场比赛
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 px-5 flex gap-8 mb-4">
          <button className="pb-2 text-sm font-bold text-white relative">
            比赛履历
            <span className="absolute -bottom-1 left-0 w-8 h-1 bg-primary rounded-full shadow-[0_0_10px_#42ff9e]"></span>
          </button>
          <button className="pb-2 text-sm font-bold text-white/40">趋势总结</button>
        </div>

        <div className="relative z-10 flex-1 overflow-y-auto px-5 space-y-4 no-scrollbar">
          {/* Loading State */}
          {isLoadingDetail && (
            <div className="flex flex-col items-center justify-center pt-20 text-white/40">
              <div className="size-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-sm font-medium text-white/60 mb-2">正在加载比赛数据...</p>
              <p className="text-xs text-white/30 text-center px-8">首次加载可能需要 10-15 秒</p>
            </div>
          )}

          {/* Error State */}
          {detailError && !isLoadingDetail && (
            <div className="text-center pt-10 text-white/40">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-50">error</span>
              <p className="text-sm">{detailError}</p>
            </div>
          )}

          {/* Race Cards - 按 season 降序排序 */}
          {!isLoadingDetail && !detailError && [...search.searchResults]
            .sort((a, b) => b.season - a.season)
            .map((result) => {
            const divisionType = getDivisionType(result.division);
            
            return (
              <div 
                key={result.id}
                onClick={() => handleRaceCardClick(result)}
                className="bg-[#101013] border border-white/10 rounded-xl p-5 relative overflow-hidden group hover:border-white/20 transition-all cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-lg font-bold text-white font-display uppercase tracking-wider">{result.event_name}</h3>
                      <span className="text-white/40 font-display text-sm">S{result.season}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${divisionType === 'DOUBLES' ? 'bg-[#2a3441] text-secondary border border-secondary/20' : 'bg-white/10 text-white/60'}`}>
                        {divisionType}
                      </span>
                      <span className="text-[10px] text-white/40">|</span>
                      <span className="text-[10px] text-white/40 tracking-wider">{result.division}</span>
                    </div>
                  </div>
                  {/* 角标 */}
                  <div className="px-2 py-1 bg-[#1a4d36] border border-primary/30 text-primary text-[10px] font-bold rounded flex items-center gap-1 shadow-[0_0_10px_rgba(66,255,158,0.2)]">
                    <span className="material-symbols-outlined text-[10px]">emoji_events</span>
                    FINISHER
                  </div>
                </div>

                <div className="mb-6 relative">
                  <div className="text-5xl font-bold text-white font-display tracking-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                    {result.total_time}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">查看分段排名</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-primary font-bold group-hover:underline">
                    查看详情 <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // --- VIEW: RACE SUMMARY ---
  const renderSummary = () => {
    if (!resultData) return null;
    
    const { athlete, race, results, rankings } = resultData;
    const badge = getTopPercentBadge(rankings.overall_rank, rankings.overall_total);

    return (
      <div className="flex flex-col min-h-screen bg-background-dark animate-in slide-in-from-right-8 duration-300">
        <header className="px-4 py-4 flex items-center justify-between border-b border-white/5">
          <button onClick={goBack} className="text-white"><span className="material-symbols-outlined">arrow_back</span></button>
          <h1 className="text-white font-bold tracking-wide text-sm">RACE SUMMARY</h1>
          <span className="material-symbols-outlined text-white">share</span>
        </header>

        <main className="flex-1 p-4 overflow-y-auto no-scrollbar pb-32">
          {/* Main Summary Card */}
          <div className="bg-[#101013] border border-white/10 rounded-2xl p-6 mb-6 shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-white font-bold text-lg mb-1">{race.event_name}</h2>
                <div className="flex gap-2">
                  <span className="text-[10px] bg-[#1a4d36] text-primary px-1.5 py-0.5 rounded font-bold border border-primary/20">FINISHER</span>
                </div>
              </div>
              <div className="size-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-white">emoji_events</span>
              </div>
            </div>

            <div className="text-center mb-8">
              <div className="text-[10px] text-white/30 tracking-[0.3em] font-mono mb-2 uppercase">Official Time</div>
              <div className="text-6xl font-bold text-primary font-display tracking-tighter drop-shadow-[0_0_20px_rgba(66,255,158,0.3)]">{results.total_time}</div>
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
              {badge && (
                <div className="bg-surface-dark rounded-xl p-2 flex flex-col items-center justify-center h-20 border border-white/5">
                  <span className="material-symbols-outlined text-yellow-500 text-lg mb-1">verified</span>
                  <span className="text-sm font-bold text-yellow-500">{badge.text}</span>
                </div>
              )}
              <div className="bg-surface-dark rounded-xl p-2 flex flex-col items-center justify-center h-20 border border-white/5">
                <span className="text-sm font-bold text-white">#{rankings.overall_rank}</span>
                <span className="text-[10px] text-white/30">总排名</span>
              </div>
              <div className="bg-surface-dark rounded-xl p-2 flex flex-col items-center justify-center h-20 border border-white/5">
                <span className="text-sm font-bold text-white">#{rankings.division_rank}</span>
                <span className="text-[10px] text-white/30">组别排名</span>
              </div>
            </div>
          </div>

          {/* Stats Circles */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-[#1E2024] border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center gap-2">
              <div className="size-10 rounded-full bg-pink-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-pink-500">directions_run</span>
              </div>
              <div className="text-[9px] text-white/40">跑步总时长</div>
              <div className="text-sm font-bold text-white font-display">{results.run_time}</div>
            </div>
            <div className="bg-[#1E2024] border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center gap-2">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">fitness_center</span>
              </div>
              <div className="text-[9px] text-white/40">站点总时长</div>
              <div className="text-sm font-bold text-white font-display">{results.work_time}</div>
            </div>
            <div className="bg-[#1E2024] border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center gap-2">
              <div className="size-10 rounded-full bg-blue-400/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-400">bolt</span>
              </div>
              <div className="text-[9px] text-white/40">Roxzone</div>
              <div className="text-sm font-bold text-white font-display">{results.roxzone_time}</div>
            </div>
          </div>

          <button onClick={() => setCurrentView('SPLIT_CENTER')} className="w-full h-14 bg-gradient-to-r from-primary to-primary-dark rounded-xl text-black font-bold text-lg flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(66,255,158,0.4)] mb-3 active:scale-[0.98] transition-all hover:brightness-110">
            进入分段中心 <span className="material-symbols-outlined">arrow_forward</span>
          </button>

          <button onClick={() => setCurrentView('POSTER')} className="w-full h-12 bg-[#1E2024] border border-white/10 rounded-xl text-white font-medium flex items-center justify-center gap-2 hover:bg-white/5 active:scale-[0.98] transition-all">
            <span className="material-symbols-outlined text-white/60">image</span> 生成战报海报
          </button>

        </main>
      </div>
    );
  };

  // --- VIEW: SPLIT CENTER ---
  const renderSplitCenter = () => {
    if (!resultData || !analyticsData) return null;
    
    const { rankings, results } = resultData;
    const badge = getTopPercentBadge(rankings.overall_rank, rankings.overall_total);
    
    // 分离 Run 和 Station 数据
    const runAnalytics = analyticsData.splits_analytics.filter(s => s.type === 'run');
    const stationAnalytics = analyticsData.splits_analytics.filter(s => s.type === 'workout');
    
    // 交替排列：R1, S1, R2, S2, ... 用于总览
    const interleavedAnalytics: typeof analyticsData.splits_analytics = [];
    const maxLen = Math.max(runAnalytics.length, stationAnalytics.length);
    for (let i = 0; i < maxLen; i++) {
      if (runAnalytics[i]) interleavedAnalytics.push(runAnalytics[i]);
      if (stationAnalytics[i]) interleavedAnalytics.push(stationAnalytics[i]);
    }

    return (
      <div className="flex flex-col min-h-screen bg-background-dark animate-in slide-in-from-right-8 duration-300">
        <header className="sticky top-0 z-30 bg-background-dark/95 backdrop-blur-md pt-safe-top border-b border-white/5">
          <div className="px-4 py-3 flex items-center justify-between">
            <button onClick={goBack} className="text-white"><span className="material-symbols-outlined">arrow_back</span></button>
            <div className="flex flex-col items-center">
              <span className="text-white font-bold tracking-wide">SPLIT CENTER</span>
              <span className="text-[10px] text-white/40 tracking-widest uppercase">{resultData.race.event_name}</span>
            </div>
            <span className="material-symbols-outlined text-white">more_vert</span>
          </div>

          <div className="px-4 pb-4">
            <div className="bg-[#1E2024] border border-white/10 rounded-xl p-3 flex justify-between items-center mb-4">
              <div className="flex flex-col">
                <span className="text-[10px] text-white/40 font-bold">TOTAL RANK</span>
                <span className="text-xl font-bold text-white font-display">#{rankings.overall_rank} <span className="text-sm text-white/30 font-normal">/ {rankings.overall_total}</span></span>
              </div>
              <div className="h-8 w-px bg-white/10"></div>
              <div className="flex flex-col">
                <span className="text-[10px] text-white/40 font-bold">PERF.</span>
                <span className="text-xl font-bold text-primary font-display">{badge?.text || '-'}</span>
              </div>
              <div className="h-8 w-px bg-white/10"></div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-white/40 font-bold">TOTAL TIME</span>
                <span className="text-xl font-bold text-white font-display">{results.total_time}</span>
              </div>
            </div>

            {/* Tab Bar - 隐藏 ROXZONE */}
            <div className="flex border-b border-white/10">
              {(['OVERVIEW', 'RUN', 'STATION'] as SplitTab[]).map(t => (
                <button 
                  key={t}
                  onClick={() => setSplitTab(t)}
                  className={`flex-1 pb-3 text-xs font-bold relative transition-colors ${splitTab === t ? 'text-primary' : 'text-white/40 hover:text-white/70'}`}
                >
                  {t === 'OVERVIEW' ? '总览' : t === 'RUN' ? `Run (${runAnalytics.length})` : `Station (${stationAnalytics.length})`}
                  {splitTab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(66,255,158,0.8)]"></span>}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-4 overflow-y-auto no-scrollbar pb-32">
          {/* TAB: OVERVIEW - 交替显示 R1,S1,R2,S2... */}
          {splitTab === 'OVERVIEW' && (
            <>
              <div className="grid grid-cols-12 text-[10px] text-white/30 uppercase font-bold tracking-wider mb-2 px-2">
                <div className="col-span-2">Item</div>
                <div className="col-span-3 text-center">Time</div>
                <div className="col-span-2 text-center">Top%</div>
                <div className="col-span-2 text-center">Δ Avg</div>
                <div className="col-span-3 text-right">Dist.</div>
              </div>
              <div className="space-y-1">
                {interleavedAnalytics.map((row, i) => {
                  // 计算 R/S 编号：根据类型分别计数
                  const runIndex = interleavedAnalytics.slice(0, i + 1).filter(r => r.type === 'run').length;
                  const stationIndex = interleavedAnalytics.slice(0, i + 1).filter(r => r.type === 'workout').length;
                  const label = row.type === 'run' ? `R${runIndex}` : `S${stationIndex}`;
                  const isWarning = row.top_percent > 45;
                  const barWidth = Math.max(5, 100 - row.top_percent);
                  
                  return (
                    <div key={i} className="grid grid-cols-12 items-center bg-[#1E2024] border border-white/5 rounded-lg p-3 hover:bg-white/5 transition-colors">
                      <div className="col-span-2 flex items-center gap-2">
                        <span className={`text-[10px] font-mono font-bold ${row.type === 'run' ? 'text-yellow-500' : 'text-white/40'}`}>
                          {label}
                        </span>
                        <span className="text-xs text-white font-bold truncate">{row.name.replace('Run ', '')}</span>
                      </div>
                      <div className={`col-span-3 text-center font-mono font-bold text-sm ${isWarning ? 'text-yellow-500' : 'text-white'}`}>{row.time}</div>
                      <div className={`col-span-2 text-center text-xs font-bold ${row.top_percent < 20 ? 'text-primary' : isWarning ? 'text-yellow-500' : 'text-white/60'}`}>{row.top_percent.toFixed(0)}%</div>
                      <div className={`col-span-2 text-center text-xs ${row.diff_seconds < 0 ? 'text-primary' : 'text-white/40'}`}>{row.diff_display}</div>
                      <div className="col-span-3 flex items-center justify-end gap-1">
                        <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className={`h-full ${isWarning ? 'bg-yellow-500' : 'bg-primary'}`} style={{ width: `${barWidth}%` }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* TAB: RUN */}
          {splitTab === 'RUN' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-2">
              {runAnalytics.map((r, i) => {
                const isWarn = r.top_percent > 50;
                const isNeutral = r.top_percent > 30 && r.top_percent <= 50;
                const barWidth = Math.max(5, 100 - r.top_percent);
                
                return (
                  <div key={i} className="bg-[#1E2024] border border-white/5 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 w-16">
                      <span className={`text-xs font-bold ${isWarn ? 'text-yellow-500' : 'text-white'}`}>R{i + 1}</span>
                    </div>
                    <span className={`font-mono font-bold text-sm ${isWarn ? 'text-yellow-500' : 'text-primary'}`}>{r.time}</span>
                    <span className="text-xs text-white/40 font-mono">{r.top_percent.toFixed(0)}%</span>
                    <div className="flex-1 flex justify-end items-center gap-2">
                      <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden flex justify-end">
                        <div className={`h-full rounded-full ${isWarn ? 'bg-yellow-500' : isNeutral ? 'bg-white/40' : 'bg-primary'}`} style={{ width: `${barWidth}%` }}></div>
                      </div>
                      <span className={`text-[10px] w-8 text-right ${r.diff_seconds < 0 ? 'text-primary' : 'text-white/40'}`}>{r.diff_display}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB: STATION */}
          {splitTab === 'STATION' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-2">
              {stationAnalytics.map((s, i) => {
                const isWarn = s.top_percent > 40;
                const isRisk = s.top_percent > 60;
                const barWidth = Math.max(5, 100 - s.top_percent);
                
                return (
                  <div 
                    key={i} 
                    onClick={() => setCurrentView('STATION_DETAIL')}
                    className={`bg-[#1E2024] border ${isRisk ? 'border-orange-500/30 bg-orange-500/5' : 'border-white/5'} rounded-xl p-3 hover:bg-white/5 transition-colors cursor-pointer`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          {s.name}
                          {isRisk && <span className="material-symbols-outlined text-orange-500 text-xs filled">warning</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-white">{s.time}</div>
                        <div className={`text-[10px] font-bold ${isWarn ? 'text-orange-500' : 'text-primary'}`}>TOP {s.top_percent.toFixed(0)}%</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${isWarn ? 'bg-orange-500' : 'bg-primary'}`} style={{ width: `${barWidth}%` }}></div>
                      </div>
                      <span className={`text-[10px] font-mono w-8 text-right ${s.diff_seconds < 0 ? 'text-primary' : 'text-orange-500'}`}>{s.diff_display}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    );
  };

  // --- VIEW: STATION DETAIL (Placeholder) ---
  const renderStationDetail = () => (
    <div className="flex flex-col min-h-screen bg-background-dark animate-in slide-in-from-right-8 duration-300">
      <header className="px-4 py-4 flex items-center justify-between bg-background-dark/95 border-b border-white/5 sticky top-0 z-30">
        <button onClick={goBack} className="text-white"><span className="material-symbols-outlined">arrow_back</span></button>
        <div className="text-center">
          <div className="text-xs font-bold text-white/40 uppercase tracking-widest">站点深挖</div>
          <div className="text-primary font-bold text-sm">STATION DETAIL</div>
        </div>
        <span className="material-symbols-outlined text-white/40">info</span>
      </header>

      <main className="flex-1 p-4 pb-32 overflow-y-auto no-scrollbar flex flex-col items-center justify-center">
        <div className="size-20 rounded-full bg-surface-dark/60 border border-white/10 flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-white/40 text-3xl">construction</span>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">站点深挖功能</h2>
        <p className="text-white/40 text-sm text-center">更详细的站点分析即将上线</p>
      </main>
    </div>
  );

  // --- VIEW: POSTER ---
  const renderPoster = () => {
    if (!resultData) return null;
    
    const { race, results, rankings } = resultData;
    const badge = getTopPercentBadge(rankings.overall_rank, rankings.overall_total);

    return (
      <div className="flex flex-col min-h-screen bg-background-dark animate-in zoom-in-95 duration-300 relative">
        <header className="absolute top-0 left-0 right-0 z-50 px-4 py-4 flex justify-between items-center">
          <button onClick={goBack} className="size-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/10">
            <span className="material-symbols-outlined">close</span>
          </button>
          <div className="text-center">
            <div className="text-xs font-bold text-white">赛后战报</div>
            <div className="text-[9px] text-primary tracking-widest uppercase">POST-RACE REPORT</div>
          </div>
          <button className="size-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/10">
            <span className="material-symbols-outlined">share</span>
          </button>
        </header>

        <main className="flex-1 flex items-center justify-center p-6 bg-[url('https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center relative">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
          
          <div className="relative z-10 w-full max-w-sm bg-gradient-to-b from-[#0a2e1d] to-[#050505] rounded-3xl p-6 border border-white/10 shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-12 bg-primary mt-8"></div>
            <div className="text-center mb-8 mt-4">
              <p className="text-[10px] text-white/30 font-mono tracking-widest">{race.event_name}</p>
            </div>

            <div className="text-center mb-10 relative">
              <div className="inline-block px-3 py-1 bg-white/5 rounded border border-white/10 text-[10px] text-primary font-bold mb-2 tracking-widest">OFFICIAL TIME</div>
              <div className="text-6xl font-bold text-white font-display tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">{results.total_time}</div>
              <div className="flex justify-center gap-2 mt-4">
                <span className="bg-white text-black px-2 py-0.5 rounded text-[10px] font-bold">FINISHER</span>
                {badge && <span className={`border px-2 py-0.5 rounded text-[10px] font-mono ${badge.style}`}>{badge.text}</span>}
              </div>
            </div>

            <div className="flex justify-between items-center pt-6 border-t border-white/5">
              <div className="text-[9px] text-white/20 font-mono tracking-wider">POWERED BY HYROX OS</div>
            </div>
          </div>
        </main>

        <div className="bg-[#101013] p-5 pb-8 border-t border-white/10 space-y-3">
          <button className="w-full h-12 bg-primary text-black font-bold rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(66,255,158,0.4)] hover:brightness-110 active:scale-[0.98] transition-all">
            <span className="material-symbols-outlined">chat</span> 一键分享
          </button>
        </div>
      </div>
    );
  };

  // --- VIEW: PRO REPORT (专业分析报告详情) ---
  const renderProReport = () => {
    if (isLoadingReportDetail || !selectedReport) {
      return (
        <div className="flex flex-col min-h-screen bg-background-dark">
          <header className="px-4 py-4 flex items-center justify-between border-b border-white/5">
            <button onClick={goBack} className="text-white"><span className="material-symbols-outlined">arrow_back</span></button>
            <h1 className="text-white font-bold">专业分析报告</h1>
            <div className="w-8"></div>
          </header>
          <div className="flex-1 flex items-center justify-center">
            <div className="size-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      );
    }

    // 导出 PDF 功能
    const handleExportPDF = async () => {
      // 动态导入 html2pdf
      const html2pdf = await import('html2pdf.js');
      const element = document.getElementById('report-content');
      if (!element) return;
      
      const opt = {
        margin: 10,
        filename: `${selectedReport.title || '分析报告'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      html2pdf.default().set(opt).from(element).save();
    };

    return (
      <div className="flex flex-col min-h-screen bg-background-dark animate-in slide-in-from-right-8 duration-300">
        <header className="px-4 py-4 flex items-center justify-between border-b border-white/5 sticky top-0 bg-background-dark/95 backdrop-blur-md z-30">
          <button onClick={goBack} className="text-white"><span className="material-symbols-outlined">arrow_back</span></button>
          <h1 className="text-white font-bold text-sm">专业分析报告</h1>
          <button onClick={handleExportPDF} className="text-primary">
            <span className="material-symbols-outlined">download</span>
          </button>
        </header>

        <main id="report-content" className="flex-1 p-4 pb-32 overflow-y-auto no-scrollbar">
          {/* 报告头部 */}
          <div className="bg-gradient-to-br from-[#1a2e22] to-[#101013] border border-primary/20 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary">description</span>
              <span className="text-[10px] text-primary font-bold uppercase tracking-widest">Professional Report</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">{selectedReport.title}</h1>
            <div className="flex items-center gap-3 text-[10px] text-white/40">
              <span>S{selectedReport.season}</span>
              <span>•</span>
              <span>{selectedReport.location}</span>
              <span>•</span>
              <span>{selectedReport.athlete_name}</span>
            </div>
          </div>

          {/* 引言 */}
          {selectedReport.introduction && (
            <div className="bg-[#1E2024] border border-white/10 rounded-2xl p-5 mb-4">
              <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">auto_awesome</span>
                引言
              </h2>
              <div className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                {selectedReport.introduction}
              </div>
            </div>
          )}

          {/* 章节内容 */}
          {selectedReport.sections && selectedReport.sections.map((section, index) => (
            <div key={section.section_id} className="bg-[#1E2024] border border-white/10 rounded-2xl p-5 mb-4">
              <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <span className="size-6 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">
                  {index + 1}
                </span>
                {section.title}
              </h2>
              <div className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap prose prose-invert prose-sm max-w-none">
                {section.content}
              </div>
            </div>
          ))}

          {/* 总结 */}
          {selectedReport.conclusion && (
            <div className="bg-[#1E2024] border border-primary/20 rounded-2xl p-5 mb-4">
              <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">tips_and_updates</span>
                总结与建议
              </h2>
              <div className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                {selectedReport.conclusion}
              </div>
            </div>
          )}

          {/* 底部信息 */}
          <div className="text-center text-[10px] text-white/20 mt-8">
            <p>报告生成时间: {selectedReport.completed_at ? new Date(selectedReport.completed_at).toLocaleString() : '-'}</p>
            <p className="mt-1">Powered by HYROX AI Analysis</p>
          </div>
        </main>

        {/* 底部操作栏 */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#101013] border-t border-white/10 p-4 pb-safe-bottom">
          <button 
            onClick={handleExportPDF}
            className="w-full py-3 bg-primary text-black font-bold rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(66,255,158,0.3)]"
          >
            <span className="material-symbols-outlined">picture_as_pdf</span>
            下载 PDF 报告
          </button>
        </div>
      </div>
    );
  };

  // --- 从首页跳转过来时先显示加载 ---
  if (pendingSplitIntent && isLoadingDetail) {
    return (
      <div className="flex flex-col min-h-screen bg-background-dark items-center justify-center gap-4">
        <div className="size-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-white/70 text-sm">加载分段数据...</p>
      </div>
    );
  }

  // --- Main Render Switch ---
  switch (currentView) {
    case 'PROFILE': return renderProfile();
    case 'SEARCH_ACTIVE': return renderSearchActive();
    case 'HUB': return renderHub();
    case 'SUMMARY': return renderSummary();
    case 'SPLIT_CENTER': return renderSplitCenter();
    case 'STATION_DETAIL': return renderStationDetail();
    case 'POSTER': return renderPoster();
    case 'PRO_REPORT': return renderProReport();
    default: return renderProfile();
  }
};

export default DataTab;
