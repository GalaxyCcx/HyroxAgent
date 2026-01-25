
import React, { useState } from 'react';

// --- Types ---
type ViewState = 'PROFILE' | 'SPLIT_CENTER' | 'STATION_DETAIL';
type SplitTab = 'OVERVIEW' | 'RUN' | 'STATION' | 'ROXZONE';
type ProfileTab = 'RACES' | 'TRENDS' | 'REPORTS';

// --- PROFILE MOCK DATA ---
const PROFILE = {
  name: '陈悦 (Mitch Chen)',
  id: 'CN-88392-M',
  stats: {
    completed: 4,
    pb: '01:22:00',
    ageGroup: '35-39',
    rank: '#42'
  }
};

// --- SPLIT DATA MOCK ---
const SPLIT_OVERVIEW = [
  { label: 'R1', name: '跑步 1km', time: '04:12', top: '8%', diff: '-45s', dist: 80, color: 'bg-primary' },
  { label: 'S1', name: '滑雪机 (SkiErg)', time: '04:45', top: '12%', diff: '-20s', dist: 70, color: 'bg-primary' },
  { label: 'R2', name: '跑步 1km', time: '05:10', top: '45%', diff: '+12s', dist: 40, warning: true },
  { label: 'S2', name: '雪橇推 (Push)', time: '03:20', top: '25%', diff: '-05s', dist: 60, color: 'bg-gray-400' },
  { label: 'R3', name: '跑步 1km', time: '04:55', top: '30%', diff: '+02s', dist: 50, color: 'bg-gray-400' },
  { label: 'S3', name: '雪橇拉 (Pull)', time: '04:15', top: '5%', diff: '-55s', dist: 90, color: 'bg-primary' },
  { label: 'R4', name: '跑步 1km', time: '05:02', top: '35%', diff: '+05s', dist: 45, color: 'bg-gray-400' },
  { label: 'S4', name: '波比跳远', time: '03:55', top: '28%', diff: '-02s', dist: 55, color: 'bg-gray-400' },
  { label: 'R5', name: '跑步 1km', time: '05:22', top: '55%', diff: '+25s', dist: 30, warning: true },
  { label: 'S5', name: '划船机', time: '04:30', top: '20%', diff: '-10s', dist: 65, color: 'bg-primary' },
];

const STATION_SPLITS = [
    { name: '滑雪机', sub: '1000m', time: '03:55', top: '前 5%', diff: '-24s', bar: 95 },
    { name: '雪橇推', sub: '50m', time: '02:45', top: '前 12%', diff: '-18s', bar: 85 },
    { name: '雪橇拉', sub: '50m', time: '04:10', top: '前 25%', diff: '-12s', bar: 75 },
    { name: '波比跳', sub: '80m', time: '04:50', top: '前 40%', diff: '+05s', bar: 60, warn: true },
    { name: '划船机', sub: '1000m', time: '04:20', top: '前 10%', diff: '-15s', bar: 90 },
    { name: '农夫行走', sub: '200m', time: '01:55', top: '前 8%', diff: '-10s', bar: 92 },
    { name: '沙袋弓步', sub: '100m', time: '04:30', top: '前 60%', diff: '+25s', bar: 40, warn: true },
    { name: '墙球', sub: '75/100', time: '07:10', top: '前 75%', diff: '+90s', bar: 20, warn: true, isRisk: true },
];

const DataTab: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('PROFILE');
  const [splitTab, setSplitTab] = useState<SplitTab>('OVERVIEW');
  const [activeProfileTab, setActiveProfileTab] = useState<ProfileTab>('RACES');
  
  // Race verification states
  const [isBeijingClaimed, setIsBeijingClaimed] = useState(true);
  const [isShanghaiClaimed, setIsShanghaiClaimed] = useState(false);
  
  // UI Interaction States
  // For the detail view top menu
  const [showDetailMenu, setShowDetailMenu] = useState(false);
  
  // For the card menus in the list
  const [activeCardMenuId, setActiveCardMenuId] = useState<string | null>(null);

  // Modals
  const [showUnbindModal, setShowUnbindModal] = useState(false);
  const [targetUnbindId, setTargetUnbindId] = useState<string | null>(null);

  const [showClaimModal, setShowClaimModal] = useState(false);
  const [targetClaimId, setTargetClaimId] = useState<string | null>(null);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // --- HELPERS ---
  const showToast = (msg: string) => {
      setToastMsg(msg);
      setTimeout(() => setToastMsg(null), 2500);
  };

  const goBack = () => {
     if (currentView === 'STATION_DETAIL') {
        setSplitTab('STATION');
        setCurrentView('SPLIT_CENTER');
     } else if (currentView === 'SPLIT_CENTER') {
        setCurrentView('PROFILE');
     } else {
        setCurrentView('PROFILE');
     }
  };

  const handleClaimClick = (raceId: string) => {
      setTargetClaimId(raceId);
      setShowClaimModal(true);
  };

  const handleClaimConfirm = () => {
      if (targetClaimId === 'beijing') {
          setIsBeijingClaimed(true);
      } else if (targetClaimId === 'shanghai') {
          setIsShanghaiClaimed(true);
      }
      setTargetClaimId(null);
      setShowClaimModal(false);
      showToast("认证成功");
  };

  const handleUnbindClick = (raceId: string, fromCard: boolean = false) => {
      setTargetUnbindId(raceId);
      setShowUnbindModal(true);
      if (fromCard) {
          setActiveCardMenuId(null);
      } else {
          setShowDetailMenu(false);
      }
  };

  const handleUnbindConfirm = () => {
      if (targetUnbindId === 'beijing') {
          setIsBeijingClaimed(false);
      } else if (targetUnbindId === 'shanghai') {
          setIsShanghaiClaimed(false);
      }
      
      setShowUnbindModal(false);
      setTargetUnbindId(null);
      
      // If we are in detail view, go back to profile
      if (currentView === 'SPLIT_CENTER') {
          setCurrentView('PROFILE');
      }
      
      showToast("已解除绑定");
  };

  // --- SUB-VIEWS FOR PROFILE ---

  // 1. RACES CONTENT
  const renderRacesContent = () => (
      <div className="space-y-4 pb-32 animate-in fade-in duration-300">
          
          {/* Beijing 2026 Card */}
          <div className="bg-[#1E2024] border border-white/10 rounded-2xl p-5 relative overflow-visible transition-all">
             <div className="flex justify-between items-start mb-4">
                <div>
                   <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">2026 北京站</h3>
                      {isBeijingClaimed ? (
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] text-primary font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs filled">verified</span> 已验证
                          </span>
                      ) : (
                          <button 
                              onClick={(e) => { e.stopPropagation(); handleClaimClick('beijing'); }}
                              className="px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-[10px] text-white font-bold flex items-center gap-1 hover:bg-white/20 transition-colors animate-pulse"
                          >
                              去验证 <span className="material-symbols-outlined text-xs">arrow_forward</span>
                          </button>
                      )}
                   </div>
                   <p className="text-[10px] text-white/40 mt-1 font-mono">HYROX BEIJING • Oct 14</p>
                </div>
                
                {isBeijingClaimed ? (
                    <div className="relative">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveCardMenuId(activeCardMenuId === 'beijing' ? null : 'beijing'); }}
                          className="text-white/40 hover:text-white p-1 rounded-full hover:bg-white/5"
                        >
                           <span className="material-symbols-outlined text-lg">more_vert</span>
                        </button>
                        {activeCardMenuId === 'beijing' && (
                            <div className="absolute right-0 top-8 w-32 bg-[#2A2D33] border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-150">
                                <button onClick={(e) => { e.stopPropagation(); handleUnbindClick('beijing', true); }} className="w-full text-left px-3 py-2 text-xs font-bold text-red-500 hover:bg-white/5 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">link_off</span> 解除绑定
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-white/40 font-bold">
                       已完赛
                    </div>
                )}
             </div>

             <div className="flex items-end justify-between mb-6">
                 <div>
                     <div className="text-5xl font-bold text-primary font-display tracking-tight drop-shadow-[0_0_15px_rgba(66,255,158,0.2)]">01:24:10</div>
                     <div className="text-[10px] text-white/30 tracking-widest mt-1 uppercase">总时间</div>
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

             {isBeijingClaimed ? (
                 <button 
                    onClick={() => setCurrentView('SPLIT_CENTER')}
                    className="w-full py-3 rounded-xl border border-primary/30 text-primary font-bold text-sm hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
                 >
                    查看分段 <span className="material-symbols-outlined text-lg">arrow_forward</span>
                 </button>
             ) : (
                 <button 
                    onClick={(e) => { e.stopPropagation(); handleClaimClick('beijing'); }}
                    className="w-full py-3 rounded-xl border border-white/10 text-white/40 font-bold text-sm hover:bg-white/5 hover:text-white transition-colors flex items-center justify-center gap-2"
                 >
                    <span className="material-symbols-outlined text-lg">lock</span> 验证以解锁分段
                 </button>
             )}
          </div>

          {/* Shanghai 2025 Card */}
          <div className="bg-[#1E2024] border border-white/5 rounded-2xl p-5 relative overflow-visible opacity-90 hover:opacity-100 transition-opacity">
             <div className="flex justify-between items-start mb-4">
                <div>
                   <h3 className="text-lg font-bold text-white/80">2025 上海站</h3>
                   <p className="text-[10px] text-white/30 mt-1 font-mono">HYROX SHANGHAI • Nov 22</p>
                </div>
                
                {isShanghaiClaimed ? (
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] text-primary font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs filled">verified</span> 已验证
                      </span>
                       <div className="relative">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setActiveCardMenuId(activeCardMenuId === 'shanghai' ? null : 'shanghai'); }}
                              className="text-white/40 hover:text-white p-1 rounded-full hover:bg-white/5"
                            >
                               <span className="material-symbols-outlined text-lg">more_vert</span>
                            </button>
                            {activeCardMenuId === 'shanghai' && (
                                <div className="absolute right-0 top-8 w-32 bg-[#2A2D33] border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-150">
                                    <button onClick={(e) => { e.stopPropagation(); handleUnbindClick('shanghai', true); }} className="w-full text-left px-3 py-2 text-xs font-bold text-red-500 hover:bg-white/5 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">link_off</span> 解除绑定
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleClaimClick('shanghai'); }}
                      className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-white/60 font-bold hover:bg-white/10 flex items-center gap-1"
                    >
                       去验证 <span className="material-symbols-outlined text-xs">arrow_forward</span>
                    </button>
                )}
             </div>
             <div className="mb-6">
                 <div className="text-4xl font-bold text-white/60 font-display">--:--:--</div>
             </div>
             <div className="text-[10px] text-white/30">您参加了这场比赛吗？认领成绩以解锁分析。</div>
          </div>
      </div>
  );

  // 2. TRENDS CONTENT
  const renderTrendsContent = () => (
      <div className="space-y-6 pb-32 animate-in fade-in duration-300">
          {/* Prediction Card */}
          <div className="bg-[#1E2024] border border-white/10 rounded-2xl p-5 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mt-10 -mr-10"></div>
             <div className="flex items-center gap-2 mb-4">
                 <span className="material-symbols-outlined text-primary text-lg">trending_up</span>
                 <h3 className="text-white font-bold">下一场成绩预测</h3>
                 <span className="px-1.5 py-0.5 rounded text-[9px] bg-white/5 border border-white/10 text-white/40 ml-auto font-mono">SHANGHAI 2025</span>
             </div>
             <div className="flex items-end gap-3 mb-4">
                 <div className="text-4xl font-bold text-primary font-display tracking-tight">01:18:00</div>
                 <div className="text-xs text-white/40 font-bold mb-1.5 flex items-center gap-1">
                     <span className="material-symbols-outlined text-primary text-xs">arrow_downward</span>
                     较上场 -06:10
                 </div>
             </div>
             <p className="text-xs text-white/60 leading-relaxed mb-0">
                 基于你最近 4 周的训练数据推算。你的跑步耐力提升显著 (+5%)。
             </p>
          </div>

          {/* Improvement Breakdown */}
          <div className="bg-[#1E2024] border border-white/10 rounded-2xl p-5">
              <h3 className="text-white font-bold text-sm mb-4">提升从哪来？</h3>
              <div className="space-y-4">
                  <div>
                      <div className="flex justify-between text-xs text-white mb-1.5">
                          <span className="font-bold">跑步 (Running)</span>
                          <span className="text-primary font-bold">+45s</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-primary w-[65%]"></div>
                      </div>
                  </div>
                  <div>
                      <div className="flex justify-between text-xs text-white mb-1.5">
                          <span className="font-bold">站点 (Stations)</span>
                          <span className="text-secondary font-bold">+30s</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-secondary w-[40%]"></div>
                      </div>
                  </div>
                  <div>
                      <div className="flex justify-between text-xs text-white mb-1.5">
                          <span className="font-bold">转换区 (Roxzone)</span>
                          <span className="text-yellow-500 font-bold">+15s</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-500 w-[25%]"></div>
                      </div>
                  </div>
              </div>
          </div>

          {/* History Chart Placeholder */}
          <div className="bg-[#1E2024] border border-white/10 rounded-2xl p-5">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="text-white font-bold text-sm">历史表现趋势</h3>
                  <span className="text-[10px] text-white/30">近 3 场</span>
              </div>
              <div className="h-32 flex items-end justify-between px-2 gap-2 relative">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                      <div className="h-px bg-white/5 w-full"></div>
                      <div className="h-px bg-white/5 w-full"></div>
                      <div className="h-px bg-white/5 w-full"></div>
                  </div>
                  
                  {/* Bars */}
                  {[
                      { date: 'HK 24', time: '1:30', h: '40%' },
                      { date: 'SH 25', time: '1:24', h: '60%' },
                      { date: 'BJ 26', time: '1:18', h: '85%', active: true },
                  ].map((item, i) => (
                      <div key={i} className="flex flex-col items-center gap-2 flex-1 relative z-10 group">
                          <div className={`w-full max-w-[40px] rounded-t-lg transition-all ${item.active ? 'bg-primary shadow-[0_0_15px_rgba(66,255,158,0.3)]' : 'bg-white/10'}`} style={{ height: item.h }}></div>
                          <span className={`text-[10px] font-bold ${item.active ? 'text-primary' : 'text-white/30'}`}>{item.date}</span>
                      </div>
                  ))}
              </div>
          </div>
      </div>
  );

  // 3. REPORTS CONTENT
  const renderReportsContent = () => (
      <div className="space-y-4 pb-32 animate-in fade-in duration-300">
          
          {/* Beijing 2026 - Lite Report */}
          <div className="bg-[#1E2024] border border-white/10 rounded-2xl p-4 flex gap-4 cursor-pointer hover:bg-white/5 transition-colors">
              <div className="size-16 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5">
                  <span className="material-symbols-outlined text-white/40 text-2xl">description</span>
              </div>
              <div className="flex-1">
                  <div className="flex justify-between items-start">
                      <h3 className="font-bold text-white text-sm">北京站 2026 • 完赛战报</h3>
                      <span className="px-1.5 py-0.5 bg-green-500/10 text-green-500 text-[9px] font-bold rounded">Lite 免费</span>
                  </div>
                  <p className="text-xs text-white/40 mt-1 mb-3">包含总成绩、分段数据总览及核心优势分析。</p>
                  <button className="text-xs text-white font-bold border-b border-white/30 pb-0.5 hover:border-white">
                      立即查看
                  </button>
              </div>
          </div>

          {/* Beijing 2026 - Pro Report */}
          <div className="bg-[#1E2024] border border-primary/20 rounded-2xl p-4 flex gap-4 relative overflow-hidden group cursor-pointer">
              <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full blur-2xl -mt-5 -mr-5 group-hover:bg-primary/10 transition-colors"></div>
              <div className="size-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                  <span className="material-symbols-outlined text-primary text-2xl">auto_awesome</span>
              </div>
              <div className="flex-1 relative z-10">
                  <div className="flex justify-between items-start">
                      <h3 className="font-bold text-white text-sm">北京站 2026 • 深度分析</h3>
                      <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-[9px] font-bold rounded border border-primary/20">PRO</span>
                  </div>
                  <p className="text-xs text-white/60 mt-1 mb-3">包含逐站配速诊断、心率区间分析、同龄组对比雷达图。</p>
                  <button className="text-xs text-primary font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">lock_open</span> 解锁报告 (¥9.9)
                  </button>
              </div>
          </div>

          {/* Training Cycle Report */}
          <div className="bg-[#1E2024] border border-white/10 rounded-2xl p-4 flex gap-4 opacity-70">
              <div className="size-16 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5">
                  <span className="material-symbols-outlined text-white/40 text-2xl">calendar_month</span>
              </div>
              <div className="flex-1">
                  <div className="flex justify-between items-start">
                      <h3 className="font-bold text-white text-sm">10月训练周期总结</h3>
                      <span className="px-1.5 py-0.5 bg-white/10 text-white/40 text-[9px] font-bold rounded">Pro 订阅</span>
                  </div>
                  <p className="text-xs text-white/40 mt-1 mb-3">基于您 10 月份的训练日志生成的月度分析。</p>
                  <button className="text-xs text-white/40 font-bold flex items-center gap-1 cursor-not-allowed">
                      <span className="material-symbols-outlined text-sm">lock</span> 需 Pro 订阅
                  </button>
              </div>
          </div>

      </div>
  );

  // --- 1. PROFILE VIEW (ME) ---
  const renderProfile = () => (
    <div className="flex flex-col min-h-screen bg-background-dark animate-in fade-in duration-300" onClick={() => setActiveCardMenuId(null)}>
       <div className="relative z-10 px-5 pt-8 pb-4">
         {/* Profile Header */}
         <div className="flex items-center gap-4 mb-8">
            <div className="relative">
               <div className="size-20 rounded-full p-0.5 bg-gradient-to-tr from-primary to-blue-500 shadow-[0_0_20px_rgba(66,255,158,0.3)]">
                  <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop" className="w-full h-full rounded-full object-cover border-2 border-background-dark" />
               </div>
               <div className="absolute -bottom-1 -right-1 bg-[#1E2024] rounded-full p-1 border border-white/10">
                  <span className="material-symbols-outlined text-primary text-sm filled">verified</span>
               </div>
            </div>
            <div className="flex-1">
               <h2 className="text-xl font-bold text-white leading-tight font-display tracking-wide">{PROFILE.name}</h2>
               <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/10 text-white/60 border border-white/10">
                    ID: {PROFILE.id}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1a4d36] text-primary border border-primary/20">PRO</span>
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
               <span className="text-3xl font-bold text-white font-display">{PROFILE.stats.completed}</span>
            </div>
            <div className="bg-[#1E2024] border border-primary/20 rounded-xl p-4 flex flex-col justify-between h-24 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-1.5">
                   <span className="material-symbols-outlined text-primary/20">timer</span>
               </div>
               <span className="text-[10px] text-primary font-bold">个人最佳 (PB)</span>
               <span className="text-3xl font-bold text-white font-display">{PROFILE.stats.pb}</span>
            </div>
            <div className="bg-[#1E2024] border border-white/5 rounded-xl p-4 flex flex-col justify-between h-24">
               <span className="text-[10px] text-white/40 font-bold">年龄组</span>
               <span className="text-3xl font-bold text-white font-display">{PROFILE.stats.ageGroup}</span>
            </div>
            <div className="bg-[#1E2024] border border-white/5 rounded-xl p-4 flex flex-col justify-between h-24">
               <span className="text-[10px] text-white/40 font-bold">最近一场排名</span>
               <span className="text-3xl font-bold text-white font-display flex items-baseline gap-1">
                   {PROFILE.stats.rank} <span className="text-sm font-normal text-white/30">/ 500</span>
               </span>
            </div>
         </div>

         {/* NEW TABS NAVIGATION */}
         <div className="flex items-center gap-8 mb-6 border-b border-white/5 px-1">
            {['RACES', 'TRENDS', 'REPORTS'].map((tab) => (
                <button 
                    key={tab}
                    onClick={() => setActiveProfileTab(tab as ProfileTab)}
                    className={`pb-2 text-sm font-bold relative transition-colors ${activeProfileTab === tab ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
                >
                   {tab === 'RACES' ? '比赛' : tab === 'TRENDS' ? '趋势' : '报告'}
                   {activeProfileTab === tab && (
                       <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-primary rounded-full shadow-[0_0_10px_#42ff9e]"></span>
                   )}
                </button>
            ))}
         </div>

         {/* CONTENT SWITCHER */}
         {activeProfileTab === 'RACES' && renderRacesContent()}
         {activeProfileTab === 'TRENDS' && renderTrendsContent()}
         {activeProfileTab === 'REPORTS' && renderReportsContent()}

       </div>
    </div>
  );

  // --- 2. SPLIT CENTER VIEW (Detailed Analysis) ---
  const renderSplitCenter = () => (
    <div className="flex flex-col min-h-screen bg-background-dark animate-in slide-in-from-right-8 duration-300 relative">
       <header className="sticky top-0 z-30 bg-background-dark/95 backdrop-blur-md pt-safe-top border-b border-white/5">
          <div className="px-4 py-3 flex items-center justify-between">
             <button onClick={goBack} className="text-white"><span className="material-symbols-outlined">arrow_back</span></button>
             <div className="flex flex-col items-center">
                <span className="text-white font-bold tracking-wide">分段详情</span>
                <span className="text-[10px] text-white/40 tracking-widest uppercase">HYROX 北京站 2026</span>
             </div>
             <div className="relative">
                <button onClick={() => setShowDetailMenu(!showDetailMenu)} className="text-white flex items-center justify-center size-8 rounded-full hover:bg-white/10">
                    <span className="material-symbols-outlined">more_vert</span>
                </button>
                {/* Dropdown Menu */}
                {showDetailMenu && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowDetailMenu(false)}></div>
                        <div className="absolute right-0 top-10 w-36 bg-[#1E2024] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-200">
                            <button 
                                onClick={() => setShowDetailMenu(false)}
                                className="w-full px-4 py-3 text-left text-xs font-bold text-white hover:bg-white/5 flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">share</span> 分享成绩
                            </button>
                            <div className="h-px bg-white/5 mx-2"></div>
                            <button 
                                onClick={() => handleUnbindClick('beijing')}
                                className="w-full px-4 py-3 text-left text-xs font-bold text-red-500 hover:bg-red-500/10 flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">link_off</span> 解除绑定
                            </button>
                        </div>
                    </>
                )}
             </div>
          </div>

          <div className="px-4 pb-4">
             <div className="bg-[#1E2024] border border-white/10 rounded-xl p-3 flex justify-between items-center mb-4">
                <div className="flex flex-col">
                   <span className="text-[10px] text-white/40 font-bold">总排名</span>
                   <span className="text-xl font-bold text-white font-display">#42 <span className="text-sm text-white/30 font-normal">/ 412</span></span>
                </div>
                <div className="h-8 w-px bg-white/10"></div>
                <div className="flex flex-col">
                   <span className="text-[10px] text-white/40 font-bold">表现评级</span>
                   <span className="text-xl font-bold text-primary font-display">前 10%</span>
                </div>
                <div className="h-8 w-px bg-white/10"></div>
                <div className="flex flex-col items-end">
                   <span className="text-[10px] text-white/40 font-bold">总用时</span>
                   <span className="text-xl font-bold text-white font-display">01:12:45</span>
                </div>
             </div>

             <div className="flex border-b border-white/10">
                {['OVERVIEW', 'RUN', 'STATION', 'ROXZONE'].map(t => (
                   <button 
                      key={t}
                      onClick={() => setSplitTab(t as SplitTab)}
                      className={`flex-1 pb-3 text-xs font-bold relative transition-colors ${splitTab === t ? 'text-primary' : 'text-white/40 hover:text-white/70'}`}
                   >
                      {t === 'OVERVIEW' ? '总览' : t === 'RUN' ? '跑步 (8)' : t === 'STATION' ? '站点 (8)' : '转换区'}
                      {splitTab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(66,255,158,0.8)]"></span>}
                   </button>
                ))}
             </div>
          </div>
       </header>

       <main className="flex-1 px-4 py-4 overflow-y-auto no-scrollbar pb-32">
          {/* TAB: OVERVIEW */}
          {splitTab === 'OVERVIEW' && (
             <>
               <div className="grid grid-cols-12 text-[10px] text-white/30 uppercase font-bold tracking-wider mb-2 px-2">
                  <div className="col-span-2">项目</div>
                  <div className="col-span-3 text-center">用时</div>
                  <div className="col-span-2 text-center">排名%</div>
                  <div className="col-span-2 text-center">均值差</div>
                  <div className="col-span-3 text-right">进度</div>
               </div>
               <div className="space-y-1">
                  {SPLIT_OVERVIEW.map((row, i) => (
                     <div key={i} className="grid grid-cols-12 items-center bg-[#1E2024] border border-white/5 rounded-lg p-3 hover:bg-white/5 transition-colors">
                        <div className="col-span-2 flex items-center gap-2">
                           <span className={`text-[10px] font-mono font-bold ${row.label.startsWith('R') ? 'text-yellow-500' : 'text-white/40'}`}>{row.label}</span>
                           <span className="text-xs text-white font-bold truncate">{row.name.replace('Run 1km', 'Run')}</span>
                        </div>
                        <div className={`col-span-3 text-center font-mono font-bold text-sm ${row.warning ? 'text-yellow-500' : 'text-white'}`}>{row.time}</div>
                        <div className={`col-span-2 text-center text-xs font-bold ${parseInt(row.top) < 20 ? 'text-primary' : row.warning ? 'text-yellow-500' : 'text-white/60'}`}>{row.top}</div>
                        <div className={`col-span-2 text-center text-xs ${row.diff.startsWith('-') ? 'text-primary' : 'text-white/40'}`}>{row.diff}</div>
                        <div className="col-span-3 flex items-center justify-end gap-1">
                           <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                              <div className={`h-full ${row.warning ? 'bg-yellow-500' : row.color || 'bg-primary'}`} style={{ width: `${row.dist}%` }}></div>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
             </>
          )}

          {/* TAB: STATION (With Clickable Wall Balls) */}
          {splitTab === 'STATION' && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="bg-[#15171A] border border-orange-500/30 rounded-2xl p-5 mb-6 relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                   <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                         <span className="material-symbols-outlined text-orange-500 filled">warning</span>
                         <span className="text-orange-500 font-bold text-sm">核心优化点</span>
                      </div>
                      <span className="text-[10px] border border-orange-500 text-orange-500 px-1.5 rounded font-mono">风险：高</span>
                   </div>
                   <h2 className="text-2xl font-bold text-white mb-2">墙球 (Wall Balls)</h2>
                   <div className="pl-2 border-l-2 border-white/10 ml-1 mb-3">
                      <p className="text-[10px] text-white/40 uppercase mb-1">问题诊断</p>
                      <p className="text-xs text-white/70">后半程波动风险高 (第二段掉速 &gt; 15%)</p>
                   </div>
                   <button 
                      onClick={() => setCurrentView('STATION_DETAIL')}
                      className="text-xs text-primary font-bold flex items-center gap-1 hover:underline"
                   >
                      查看详细分析 <span className="material-symbols-outlined text-sm">arrow_forward</span>
                   </button>
                </div>

                <div className="space-y-2">
                   {STATION_SPLITS.map((s, i) => (
                      <div 
                         key={i} 
                         onClick={() => s.name === '墙球' && setCurrentView('STATION_DETAIL')}
                         className={`bg-[#1E2024] border ${s.isRisk ? 'border-orange-500/30 bg-orange-500/5' : 'border-white/5'} rounded-xl p-3 hover:bg-white/5 transition-colors cursor-pointer`}
                      >
                         <div className="flex justify-between items-center mb-2">
                            <div>
                               <div className="text-sm font-bold text-white flex items-center gap-2">
                                  {s.name}
                                  {s.isRisk && <span className="material-symbols-outlined text-orange-500 text-xs filled">warning</span>}
                               </div>
                               <div className="text-[10px] text-white/30 font-mono">{s.sub}</div>
                            </div>
                            <div className="text-right">
                               <div className="font-mono font-bold text-white">{s.time}</div>
                               <div className={`text-[10px] font-bold ${s.warn ? 'text-orange-500' : 'text-primary'}`}>{s.top}</div>
                            </div>
                         </div>
                         <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                               <div className={`h-full rounded-full ${s.warn ? 'bg-orange-500' : 'bg-primary'}`} style={{ width: `${s.bar}%` }}></div>
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          )}
          
          {/* Other tabs can be added here or kept simple */}
          {(splitTab === 'RUN' || splitTab === 'ROXZONE') && (
              <div className="flex items-center justify-center h-40 text-white/30 text-xs">
                  {splitTab === 'RUN' ? '跑步' : '转换区'} 详细数据正在加载...
              </div>
          )}
       </main>
    </div>
  );

  // --- 3. STATION DETAIL (Deep Dive) ---
  const renderStationDetail = () => (
    <div className="flex flex-col min-h-screen bg-background-dark animate-in slide-in-from-right-8 duration-300">
       <header className="px-4 py-4 flex items-center justify-between bg-background-dark/95 border-b border-white/5 sticky top-0 z-30">
          <button onClick={goBack} className="text-white"><span className="material-symbols-outlined">arrow_back</span></button>
          <div className="text-center">
             <div className="text-xs font-bold text-white/40 uppercase tracking-widest">站点深挖</div>
             <div className="text-primary font-bold text-sm">墙球 (WALL BALLS)</div>
          </div>
          <span className="material-symbols-outlined text-white/40">info</span>
       </header>

       <main className="flex-1 p-4 pb-32 overflow-y-auto no-scrollbar">
          {/* Hero Stats */}
          <div className="bg-[#15171A] border border-white/10 rounded-2xl p-6 mb-6">
             <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                   <span className="material-symbols-outlined text-white/60 text-sm">timer</span>
                   <span className="text-xs text-white/60">你的时间</span>
                </div>
                <div className="flex gap-2">
                   <span className="bg-[#1E2024] border border-white/10 px-1.5 py-0.5 rounded text-[10px] text-white/60 font-mono">前 42%</span>
                   <span className="bg-yellow-500/10 border border-yellow-500/30 px-1.5 py-0.5 rounded text-[10px] text-yellow-500 font-mono font-bold">+44s 慢于均值</span>
                </div>
             </div>
             <div className="text-6xl font-bold text-primary font-display tracking-tighter mb-4">07:16 <span className="text-sm font-normal text-white/20 ml-1">分:秒</span></div>
             <div className="h-1 bg-white/10 rounded-full overflow-hidden relative">
                 <div className="absolute top-0 left-0 h-full bg-primary w-[42%] shadow-[0_0_10px_#42ff9e]"></div>
             </div>
          </div>

          {/* Diagnosis */}
          <div className="bg-[#15171A] border border-white/10 rounded-xl p-5 mb-8">
             <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary text-sm">build</span>
                <h3 className="text-sm font-bold text-white">技术诊断</h3>
             </div>
             <ul className="space-y-3">
                <li className="flex gap-2 text-xs text-white/70">
                   <span className="text-orange-500">•</span>
                   <span>后半程掉速明显，建议加强 <span className="text-white font-bold border-b border-white/30">乳酸耐受训练</span>。</span>
                </li>
             </ul>
          </div>
       </main>
    </div>
  );

  // --- Main Switcher ---
  return (
    <div className="relative h-full w-full">
        {currentView === 'PROFILE' && renderProfile()}
        {currentView === 'SPLIT_CENTER' && renderSplitCenter()}
        {currentView === 'STATION_DETAIL' && renderStationDetail()}

        {/* --- MODALS --- */}

        {/* Simplified Claim Confirmation Modal */}
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

        {/* Unbind Confirmation Modal (Red Style) */}
        {showUnbindModal && (
           <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
               <div className="bg-[#101013] border border-white/10 rounded-3xl p-6 w-full max-w-xs relative z-10 animate-in zoom-in-95 duration-200 shadow-2xl overflow-hidden">
                   {/* Background Glow */}
                   <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-red-500/10 rounded-full blur-[40px] pointer-events-none"></div>

                   <div className="size-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5 mx-auto relative z-10 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                       <span className="material-symbols-outlined text-red-500 text-3xl filled">warning</span>
                   </div>
                   
                   <h3 className="text-lg font-bold text-white text-center mb-3 relative z-10">确认解除成绩绑定？</h3>
                   
                   <p className="text-xs text-white/60 text-center mb-8 leading-relaxed relative z-10 px-2">
                       解除绑定后，该场比赛的 <span className="text-white font-bold">ROXLAB 深度分析数据</span>、目标推估及训练路线图将同步清空且无法找回。
                   </p>
                   
                   <div className="flex flex-col gap-3 relative z-10">
                       <button 
                           onClick={handleUnbindConfirm}
                           className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-bold text-sm shadow-[0_0_20px_rgba(239,68,68,0.3)] flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all"
                       >
                           <span className="material-symbols-outlined text-lg">delete_forever</span> 坚持解除
                       </button>
                       <button 
                           onClick={() => setShowUnbindModal(false)}
                           className="w-full py-3.5 rounded-xl bg-transparent border border-white/10 text-white font-bold text-sm hover:bg-white/5 active:scale-[0.98] transition-all"
                       >
                           保留成绩
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
    </div>
  );
};

export default DataTab;
