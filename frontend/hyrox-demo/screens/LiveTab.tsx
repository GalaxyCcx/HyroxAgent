
import React, { useState, useEffect, useRef } from 'react';

type LiveView = 'HOME' | 'RESULTS' | 'SUMMARY' | 'ANALYSIS_LITE';

// --- AGE GROUP CONSTANTS ---
const AGE_GROUPS_SINGLE_COMMON = [
  '16-24', '25-29', '30-34', '35-39', '40-44', '45-49', '50-54', '55-59', '60-64', '65-69'
];
const AGE_GROUPS_SINGLE_OPEN_EXTRA = ['70+'];

const AGE_GROUPS_DOUBLES = [
  '16-29', '30-39', '40-49', '50-59', '60-70+'
];

const AGE_GROUPS_RELAY = [
  '16-39', '40+'
];

// --- MOCK DATA FOR RESULTS ---
const LEADERBOARD_DATA = [
  { rank: 1, name: '萨拉 · 詹金斯', ageGroup: '25-29', time: '01:04:12', isMe: false, gender: 'F' },
  { rank: 2, name: '杰西卡 · 李', ageGroup: '25-29', time: '01:06:45', isMe: false, gender: 'F' },
  { rank: 3, name: '莫妮卡 · G', ageGroup: '30-34', time: '01:08:20', isMe: false, gender: 'F' },
  { rank: 12, name: '陈悦', ageGroup: '30-34', time: '01:24:10', isMe: true, gender: 'M' },
  { rank: 13, name: '马库斯 · C', ageGroup: '30-34', time: '01:24:45', isMe: false, gender: 'M' },
  { rank: 14, name: '汤姆 · 里德尔', ageGroup: '40-44', time: '01:25:02', isMe: false, gender: 'M' },
  { rank: 15, name: '亚历克斯 · 金', ageGroup: '20-24', time: '01:26:15', isMe: false, gender: 'M' },
];

const LiveTab: React.FC = () => {
  const [currentView, setCurrentView] = useState<LiveView>('HOME');
  const [searchQuery, setSearchQuery] = useState('');
  const [isClaimed, setIsClaimed] = useState(false); // State to track verification
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // --- FILTER STATES ---
  const [resultCategory, setResultCategory] = useState<'SINGLE' | 'DOUBLES' | 'RELAY'>('SINGLE');
  const [resultDivision, setResultDivision] = useState<'OPEN' | 'PRO'>('OPEN');
  const [resultGender, setResultGender] = useState<'M' | 'F' | 'MIX'>('M');
  const [resultAgeGroup, setResultAgeGroup] = useState<string>('ALL');
  
  const [showSearch, setShowSearch] = useState(false);
  const [showAgeDropdown, setShowAgeDropdown] = useState(false);
  const ageDropdownRef = useRef<HTMLDivElement>(null);

  // --- CLICK OUTSIDE HANDLER ---
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ageDropdownRef.current && !ageDropdownRef.current.contains(event.target as Node)) {
        setShowAgeDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // --- LOGIC HELPERS ---
  const getAgeOptions = () => {
      if (resultCategory === 'RELAY') return AGE_GROUPS_RELAY;
      if (resultCategory === 'DOUBLES') return AGE_GROUPS_DOUBLES;
      
      // SINGLE
      if (resultDivision === 'PRO') {
          return AGE_GROUPS_SINGLE_COMMON;
      } else {
          // OPEN includes 70+
          return [...AGE_GROUPS_SINGLE_COMMON, ...AGE_GROUPS_SINGLE_OPEN_EXTRA];
      }
  };

  const handleCategoryChange = (cat: 'SINGLE' | 'DOUBLES' | 'RELAY') => {
      setResultCategory(cat);
      setResultAgeGroup('ALL'); // Reset age when category changes
      if (cat === 'SINGLE') setResultGender('M');
      if (cat !== 'SINGLE' && resultGender === 'M') setResultGender('M'); // Keep logic simple or default
  };

  const handleDivisionChange = (div: 'OPEN' | 'PRO') => {
      setResultDivision(div);
      // If switching to PRO and current selection is 70+, reset to ALL
      if (div === 'PRO' && resultAgeGroup === '70+') {
          setResultAgeGroup('ALL');
      }
  };

  // --- NAVIGATION ---
  const handleSearch = () => {
     setCurrentView('RESULTS');
  };

  const goToSummary = () => {
     setCurrentView('SUMMARY');
  };

  const goToAnalysis = () => {
     setCurrentView('ANALYSIS_LITE');
  };

  const goToClaim = () => {
     setShowClaimModal(true);
  };

  const goBack = () => {
     if (currentView === 'ANALYSIS_LITE') setCurrentView('SUMMARY');
     else if (currentView === 'SUMMARY') setCurrentView('RESULTS');
     else if (currentView === 'RESULTS') setCurrentView('HOME');
  };

  const handleConfirmClaim = () => {
      setIsClaimed(true);
      setShowClaimModal(false);
      setToastMsg("认证成功");
      setTimeout(() => setToastMsg(null), 2000);
  };

  // --- VIEW: HOME (Search) ---
  const renderHome = () => (
    <div className="flex flex-col min-h-screen bg-background-dark relative overflow-hidden animate-in fade-in duration-300">
       <div className="absolute top-0 left-0 right-0 h-[60vh] z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#101013]/30 via-[#101013]/80 to-[#101013] z-10"></div>
          <img 
            src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=800&auto=format&fit=crop" 
            className="w-full h-full object-cover opacity-50 grayscale"
            alt="Gym background" 
          />
       </div>

       <div className="relative z-10 px-5 pt-20 flex flex-col h-full min-h-screen">
          
          <div className="mb-6 mt-12">
             <h1 className="font-bold text-white italic leading-none font-display tracking-tight">
                <span className="text-5xl">读懂比赛</span><br/>
                <span className="text-2xl mt-2 block text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dark">谁偷走了你的 5 分钟？</span>
             </h1>
          </div>

          <div className="bg-[#1E2024]/80 backdrop-blur-md border border-white/10 rounded-2xl p-2 flex items-center gap-3 mb-10 shadow-lg">
             <span className="material-symbols-outlined text-white/30 text-xl ml-3">search</span>
             <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="输入 姓名 / 号码 / 队名" 
                className="flex-1 bg-transparent border-none text-white text-sm placeholder-white/30 focus:ring-0"
             />
             <button 
                onClick={handleSearch}
                className="bg-primary hover:bg-primary-dark text-black font-bold text-sm px-6 py-3 rounded-xl transition-colors"
             >
                去诊断
             </button>
          </div>

          <div className="flex-1">
             <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                   <h2 className="text-lg font-bold text-white">近期赛事</h2>
                   <span className="text-[10px] text-white/40 tracking-widest uppercase">即将到来</span>
                </div>
                <button className="text-xs text-primary font-bold hover:underline">全部</button>
             </div>

             <div className="flex flex-col gap-3 pb-32">
                <div className="bg-[#1E2024] border border-white/5 rounded-2xl p-4 flex items-center gap-4 hover:border-white/10 transition-all cursor-pointer">
                   <div className="bg-[#2A2D33] rounded-xl p-3 flex flex-col items-center justify-center w-16 text-center">
                      <span className="text-[10px] text-primary font-bold uppercase">10月</span>
                      <span className="text-2xl font-bold text-white font-display">26</span>
                   </div>
                   <div className="flex-1">
                      <h3 className="text-white font-bold text-lg">HYROX 北京站</h3>
                      <div className="flex items-center gap-1 text-white/40 text-xs mt-1">
                         <span className="material-symbols-outlined text-xs">location_on</span>
                         国家会议中心
                      </div>
                   </div>
                   <span className="px-2 py-1 rounded border border-primary/30 text-[10px] text-primary font-bold">报名中</span>
                </div>
                <div className="bg-[#1E2024] border border-white/5 rounded-2xl p-4 flex items-center gap-4 hover:border-white/10 transition-all cursor-pointer">
                   <div className="bg-[#2A2D33] rounded-xl p-3 flex flex-col items-center justify-center w-16 text-center">
                      <span className="text-[10px] text-white/40 font-bold uppercase">11月</span>
                      <span className="text-2xl font-bold text-white font-display">15</span>
                   </div>
                   <div className="flex-1">
                      <h3 className="text-white font-bold text-lg">HYROX 深圳站</h3>
                      <div className="flex items-center gap-1 text-white/40 text-xs mt-1">
                         <span className="material-symbols-outlined text-xs">location_on</span>
                         深圳国际会展中心
                      </div>
                   </div>
                   <span className="px-2 py-1 rounded bg-orange-500/10 border border-orange-500/30 text-[10px] text-orange-500 font-bold flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-orange-500"></span> 比赛中
                   </span>
                </div>
             </div>
          </div>
       </div>
    </div>
  );

  // --- VIEW: RESULTS (Leaderboard) ---
  const renderResults = () => (
    <div className="flex flex-col min-h-screen bg-background-dark animate-in slide-in-from-right-8 duration-300">
       <header className="sticky top-0 z-30 bg-background-dark/95 backdrop-blur-md border-b border-white/5 pb-2">
          {/* Top Bar */}
          <div className="px-4 py-4 flex items-center justify-between">
             <button onClick={goBack} className="text-white"><span className="material-symbols-outlined">arrow_back</span></button>
             <h1 className="text-white font-bold text-sm tracking-wide">HYROX 上海站 2026 - 成绩列表</h1>
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
                      placeholder={resultCategory === 'SINGLE' ? "输入 姓名 / 参赛号" : "输入 队名 / 队员 / 参赛号"}
                      className="flex-1 bg-transparent border-none text-white text-xs p-0 focus:ring-0 placeholder-white/30"
                   />
                   <button onClick={() => setShowSearch(false)} className="text-white/30 hover:text-white">
                      <span className="material-symbols-outlined text-lg">close</span>
                   </button>
                </div>
             </div>
          )}
          
          {/* Level 1: Category Tabs */}
          <div className="px-4 mb-3">
             <div className="flex bg-[#1E2024] rounded-lg p-1 border border-white/10">
                {['SINGLE', 'DOUBLES', 'RELAY'].map((cat) => {
                    const label = cat === 'SINGLE' ? '单人赛' : cat === 'DOUBLES' ? '双人赛' : '接力赛';
                    const isActive = resultCategory === cat;
                    return (
                        <button
                            key={cat}
                            onClick={() => handleCategoryChange(cat as any)}
                            className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${
                                isActive 
                                ? 'bg-[#2A2D33] text-white shadow-sm border border-white/5' 
                                : 'text-white/40 hover:text-white/70'
                            }`}
                        >
                            {label}
                        </button>
                    );
                })}
             </div>
          </div>

          {/* Level 2: Division Segmented */}
          {resultCategory !== 'RELAY' && (
             <div className="px-4 mb-3 flex items-center justify-center">
                 <div className="flex gap-2 w-full">
                     {['OPEN', 'PRO'].map((div) => {
                         const label = div === 'OPEN' ? 'Open (公开组)' : 'Pro (精英组)';
                         const isActive = resultDivision === div;
                         return (
                             <button
                                 key={div}
                                 onClick={() => handleDivisionChange(div as any)}
                                 className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${
                                     isActive
                                     ? 'bg-primary/10 border-primary text-primary'
                                     : 'bg-[#1E2024] border-white/5 text-white/40 hover:bg-white/5'
                                 }`}
                             >
                                 {label}
                             </button>
                         );
                     })}
                 </div>
             </div>
          )}

          {/* Level 3: Dynamic Chips (Gender / Age Group) */}
          <div className="px-4 flex gap-2 overflow-x-auto no-scrollbar pb-1 items-center">
             {/* Gender Chips */}
             <div className="flex items-center bg-[#1E2024] rounded-full p-1 border border-white/5 shrink-0">
                 {[
                     { id: 'M', label: '男子' },
                     { id: 'F', label: '女子' },
                     ...(resultCategory !== 'SINGLE' ? [{ id: 'MIX', label: resultCategory === 'RELAY' ? '混合' : '混双' }] : [])
                 ].map((g) => (
                     <button
                        key={g.id}
                        onClick={() => setResultGender(g.id as any)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                            resultGender === g.id
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
                      resultAgeGroup !== 'ALL' 
                      ? 'bg-primary/10 border-primary text-primary' 
                      : 'bg-[#1E2024] border-white/10 text-white/60 hover:bg-white/5'
                  }`}
                >
                    {resultAgeGroup === 'ALL' ? '年龄组: 全部' : `年龄组: ${resultAgeGroup}`}
                    <span className="material-symbols-outlined text-xs">
                        {showAgeDropdown ? 'expand_less' : 'expand_more'}
                    </span>
                </button>

                {/* Dropdown Menu */}
                {showAgeDropdown && (
                    <div className="absolute top-full left-0 mt-2 w-32 max-h-60 overflow-y-auto bg-[#1E2024] border border-white/10 rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100 no-scrollbar">
                        <button
                            onClick={() => {
                                setResultAgeGroup('ALL');
                                setShowAgeDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs font-bold border-b border-white/5 hover:bg-white/5 ${
                                resultAgeGroup === 'ALL' ? 'text-primary' : 'text-white'
                            }`}
                        >
                            全部 (All)
                        </button>
                        {getAgeOptions().map((age) => (
                            <button
                                key={age}
                                onClick={() => {
                                    setResultAgeGroup(age);
                                    setShowAgeDropdown(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-xs font-bold hover:bg-white/5 ${
                                    resultAgeGroup === age ? 'text-primary bg-primary/5' : 'text-white/60'
                                }`}
                            >
                                {age}
                            </button>
                        ))}
                    </div>
                )}
             </div>
          </div>
       </header>

       <main className="flex-1 px-4 py-4 space-y-3 pb-32">
          {LEADERBOARD_DATA.map((item, index) => (
             <div 
                key={index}
                onClick={() => item.isMe ? goToSummary() : null}
                className={`rounded-2xl p-4 flex items-center justify-between border transition-all cursor-pointer ${
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
                          {item.gender === 'F' && <span className="material-symbols-outlined text-pink-400 text-sm">female</span>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/40 mt-0.5">
                          <span className="bg-white/5 px-1.5 py-0.5 rounded border border-white/5">{resultDivision}</span>
                          <span>{item.ageGroup}</span>
                      </div>
                   </div>
                </div>
                <div className="text-right">
                   <div className="text-xl font-bold text-primary font-display tracking-tight mb-1">{item.time}</div>
                   <button className={`text-[10px] font-bold px-3 py-1 rounded-full border ${item.rank === 1 ? 'bg-primary text-black border-primary' : 'bg-transparent text-primary border-primary/30'}`}>
                      查看
                   </button>
                </div>
             </div>
          ))}
       </main>
    </div>
  );

  // --- VIEW: RACE SUMMARY (The requested page) ---
  const renderSummary = () => (
    <div className="flex flex-col min-h-screen bg-background-dark animate-in slide-in-from-right-8 duration-300">
       <header className="px-4 py-4 flex items-center justify-between sticky top-0 bg-background-dark/95 backdrop-blur-md z-30 border-b border-white/5">
          <button onClick={goBack} className="text-white"><span className="material-symbols-outlined">arrow_back</span></button>
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
                      <div className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">HYROX 北京站 2026</div>
                      <div className="flex items-center gap-3">
                          <h1 className="text-3xl font-bold text-white">陈悦</h1>
                          <span className="bg-white/10 text-white/40 text-[10px] font-mono px-2 py-1 rounded">参赛号 #8932</span>
                          {isClaimed && (
                              <span className="material-symbols-outlined text-primary filled text-lg">verified</span>
                          )}
                      </div>
                   </div>
                   <div className="size-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                      <span className="material-symbols-outlined text-white/60">emoji_events</span>
                   </div>
                </div>

                <div className="text-center mb-10 relative z-10">
                   <div className="text-[10px] text-white/30 tracking-[0.3em] font-mono mb-2 uppercase">官方完赛时间</div>
                   <div className="text-6xl font-bold text-primary font-display tracking-tighter drop-shadow-[0_0_20px_rgba(66,255,158,0.3)]">01:24:10</div>
                </div>

                <div className="grid grid-cols-3 gap-3 relative z-10">
                   <div className="bg-[#1E2024]/50 border border-yellow-500/30 rounded-xl p-3 flex flex-col items-center justify-center h-20">
                      <span className="material-symbols-outlined text-yellow-500 text-sm mb-1 filled">verified</span>
                      <span className="text-xs font-bold text-yellow-500">前 10%</span>
                   </div>
                   <div className="bg-[#1E2024]/50 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center h-20">
                      <span className="text-[10px] text-white/40 mb-1">总排名</span>
                      <span className="text-xl font-bold text-white font-display">#42</span>
                   </div>
                   <div className="bg-[#1E2024]/50 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center h-20">
                      <span className="text-[10px] text-white/40 mb-1">年龄组</span>
                      <span className="text-xl font-bold text-white font-display">#12</span>
                   </div>
                </div>
            </div>

            {/* Breakdown Cards */}
            <div className="bg-[#15171A] border border-white/10 rounded-3xl p-4 mb-6 grid grid-cols-3 gap-0 relative overflow-hidden">
                <div className="absolute inset-y-4 left-1/3 w-px bg-white/5"></div>
                <div className="absolute inset-y-4 right-1/3 w-px bg-white/5"></div>
                
                {[
                   { icon: 'directions_run', label: '跑步 (8圈)', sub: '8圈总用时', val: '42:15', color: 'text-pink-500', bg: 'bg-pink-500/20' },
                   { icon: 'fitness_center', label: '站点 (8个)', sub: '8项功能站总用时', val: '41:55', color: 'text-primary', bg: 'bg-primary/20' },
                   { icon: 'bolt', label: '转换区 (8段)', sub: '8次转换区总用时', val: '09:07', color: 'text-blue-400', bg: 'bg-blue-400/20' }
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

            {/* Claim Bar if not claimed */}
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
                        onClick={goToClaim}
                        className="px-4 py-2 rounded-lg bg-primary text-black text-xs font-bold hover:brightness-110"
                    >
                        去认领
                    </button>
                </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
               <button 
                  onClick={goToAnalysis}
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

  // --- VIEW: ANALYSIS LITE ---
  const renderAnalysisLite = () => (
    <div className="flex flex-col min-h-screen bg-background-dark animate-in slide-in-from-right-8 duration-300">
       <header className="px-4 py-4 flex items-center justify-between sticky top-0 bg-background-dark/95 backdrop-blur-md z-30 border-b border-white/5">
          <button onClick={goBack} className="text-white"><span className="material-symbols-outlined">arrow_back</span></button>
          <span className="text-white font-bold">赛后分析 (Lite)</span>
          <span className="material-symbols-outlined text-white/60">help</span>
       </header>

       <div className="bg-[#15171A] border-b border-white/5 px-4 py-2 flex justify-between text-[10px] text-white/40 font-mono">
          <span>北京站 2026</span>
          <span>|</span>
          <span>男子公开组</span>
          <span>|</span>
          <span>陈悦</span>
          <span>|</span>
          <span>01:24:10</span>
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
                <h2 className="text-xl font-bold text-white mt-2">HYROX 男子公开组</h2>
                <div className="text-[10px] text-white/60">2026.10.15</div>
             </div>

             <div className="absolute bottom-4 left-4 right-4 z-20 flex justify-between items-end">
                <div className="text-center bg-black/40 backdrop-blur-md rounded-lg p-2 border border-white/10">
                   <div className="text-2xl font-bold text-white font-display">01:24:10</div>
                   <div className="text-[9px] text-white/40">完赛时间</div>
                </div>
                <div className="text-center bg-black/40 backdrop-blur-md rounded-lg p-2 border border-white/10">
                   <div className="text-xl font-bold text-white font-display">188<span className="text-xs text-white/40 font-normal">/1200</span></div>
                   <div className="text-[9px] text-white/40">总排名</div>
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
                你跑步很稳，关键差距在<span className="text-white font-bold">站点效率</span>；下一次最值得先补：<span className="text-primary font-bold border-b border-primary/30">Wall Balls (墙球)</span> 与 <span className="text-primary font-bold border-b border-primary/30">Roxzone (转换区)</span>。
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
                分享战报
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

  // --- MAIN SWITCHER ---
  return (
    <div className="relative h-full w-full">
        {currentView === 'HOME' && renderHome()}
        {currentView === 'RESULTS' && renderResults()}
        {currentView === 'SUMMARY' && renderSummary()}
        {currentView === 'ANALYSIS_LITE' && renderAnalysisLite()}

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
                           onClick={handleConfirmClaim}
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
    </div>
  );
};

export default LiveTab;
