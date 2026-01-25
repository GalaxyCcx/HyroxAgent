
import React, { useState } from 'react';
import { TrainingSession } from '../types';

// --- MOCK DATA ---

const COACHES = [
  {
    id: 'c1',
    name: 'Alex 张伟',
    gym: 'SuperFit 工体旗舰店',
    rating: '4.9',
    tags: ['雪橇推', '划船'],
    avatar: 'https://images.unsplash.com/photo-1583336137348-c1fd42f6ef80?q=80&w=200&auto=format&fit=crop',
    isVerified: true
  },
  {
    id: 'c2',
    name: 'Sarah 李娜',
    gym: 'CrossIron 三里屯店',
    rating: '5.0',
    tags: ['墙球', '力量型'],
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&auto=format&fit=crop',
    isVerified: false
  },
];

// Views enumeration to manage the flow
type PlanView = 'REPORT' | 'SUBSCRIPTION' | 'COACH_LIST' | 'DASHBOARD' | 'WEEKLY_PLAN' | 'SESSION_DETAIL';

const PlanTab: React.FC = () => {
  const [currentView, setCurrentView] = useState<PlanView>('REPORT');
  // In a real app, this state would persist or come from a user context
  const [isPro, setIsPro] = useState(false); 
  const [isRegenerating, setIsRegenerating] = useState(false);

  // --- NAVIGATION HANDLERS ---
  const goBack = () => {
      switch (currentView) {
          case 'SUBSCRIPTION': setCurrentView('REPORT'); break;
          case 'COACH_LIST': setCurrentView('SUBSCRIPTION'); break;
          case 'DASHBOARD': setCurrentView('REPORT'); break; // Optional: allow going back to report even if pro
          case 'WEEKLY_PLAN': setCurrentView('DASHBOARD'); break;
          case 'SESSION_DETAIL': setCurrentView('WEEKLY_PLAN'); break;
          default: setCurrentView('REPORT');
      }
  };

  const handleSubscribe = () => {
    // Simulate payment loading
    const btn = document.getElementById('pay-btn');
    if(btn) btn.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span>';
    
    setTimeout(() => {
      setIsPro(true);
      setCurrentView('DASHBOARD'); // Go to Pro Dashboard after sub
    }, 1500);
  };

  const handleAIReplan = () => {
    setIsRegenerating(true);
    setTimeout(() => setIsRegenerating(false), 2000);
  };

  // =========================================================================
  // VIEW 1: ANALYSIS REPORT (Pre-subscription / Entry)
  // =========================================================================
  const renderAnalysisReport = () => (
    <div className="flex flex-col min-h-screen font-body animate-in fade-in duration-300 pb-24 bg-[#050505] relative overflow-hidden">
      {/* Background Grid Pattern */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
        style={{
            backgroundImage: `linear-gradient(to right, #42ff9e 1px, transparent 1px), linear-gradient(to bottom, #42ff9e 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            maskImage: 'linear-gradient(to bottom, black 30%, transparent 100%)'
        }}
      ></div>

      <header className="relative z-10 px-5 pt-safe-top py-5 flex items-center justify-between bg-gradient-to-b from-[#050505] to-transparent">
        <button className="text-white hover:text-white/70 transition-colors opacity-0 pointer-events-none">
           <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
        </button>
        <div className="flex flex-col items-center">
            <h1 className="text-base font-bold text-white tracking-widest font-display">训练 & 备赛中心</h1>
            <span className="text-[9px] text-primary tracking-[0.2em] font-medium mt-0.5 shadow-primary drop-shadow-[0_0_8px_rgba(66,255,158,0.5)]">PRO REPORT</span>
        </div>
        <button 
           className="group flex items-center gap-1.5 px-3 py-1.5 bg-[#1E2024]/50 backdrop-blur-md border border-primary/20 rounded-full hover:bg-primary/10 transition-all active:scale-95 shadow-[0_0_15px_rgba(66,255,158,0.05)]"
           onClick={handleAIReplan}
        >
           <span className="text-[10px] font-bold text-primary group-hover:text-white transition-colors">AI ADJUST</span>
        </button>
      </header>

      <main className="relative z-10 flex-1 px-5 overflow-y-auto no-scrollbar space-y-5">
         
         {/* Prediction Card */}
         <div className="bg-[#101013] border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-2xl group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[50px] pointer-events-none"></div>
            <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-4">
               <div className="flex items-center gap-2.5">
                   <div className="relative">
                     <div className="size-2 rounded-full bg-primary animate-pulse"></div>
                     <div className="absolute inset-0 size-2 rounded-full bg-primary blur-sm animate-pulse"></div>
                   </div>
                   <span className="text-xs font-mono text-white/60 uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded">HYROX BEIJING 2026</span>
               </div>
               <span className="text-[9px] text-white/30 font-mono tracking-widest">DATA ACCURACY: HIGH</span>
            </div>
            
            <div className="flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-white/40 text-sm">flag</span>
                        <span className="text-xs text-white/60">北京站推估完赛</span>
                    </div>
                    <div className="text-5xl font-bold text-primary font-display tracking-tighter drop-shadow-[0_0_25px_rgba(66,255,158,0.3)] leading-none mb-1">
                        01:21:10
                    </div>
                    <div className="text-2xl font-bold text-white/30 font-display tracking-tighter">
                        - 01:23:00
                    </div>
                    <div className="text-xs text-white/50 mt-4 font-medium flex items-center gap-1.5">
                        同水平分位 <span className="w-1 h-1 rounded-full bg-white/30"></span> <span className="text-white font-bold font-display">35-45%</span>
                    </div>
                </div>
                
                <div className="flex items-end gap-1 h-20 pb-1">
                    <div className="w-1.5 bg-white/5 rounded-t-sm h-[20%]"></div>
                    <div className="w-1.5 bg-white/5 rounded-t-sm h-[40%]"></div>
                    <div className="w-1.5 bg-white/10 rounded-t-sm h-[60%]"></div>
                    <div className="w-3 bg-gradient-to-t from-primary/20 to-primary rounded-t-sm h-[85%] relative shadow-[0_0_15px_rgba(66,255,158,0.4)] group-hover:h-[90%] transition-all duration-500">
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-[9px] text-black font-bold whitespace-nowrap bg-primary px-1.5 py-0.5 rounded shadow-lg transform scale-90">YOU</div>
                        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-primary/50 to-transparent"></div>
                    </div>
                    <div className="w-1.5 bg-white/10 rounded-t-sm h-[50%]"></div>
                    <div className="w-1.5 bg-white/5 rounded-t-sm h-[30%]"></div>
                </div>
            </div>
         </div>

         {/* Strategy Section */}
         <div className="space-y-0">
             <div className="flex border-b border-white/10 px-2">
                 {['冲刺', '进阶', '稳妥', '保守', '风险'].map((tab, i) => (
                     <button key={i} className={`flex-1 pb-3 text-xs font-bold relative transition-colors ${tab === '进阶' ? 'text-primary' : 'text-white/30 hover:text-white/50'}`}>
                         {tab}
                         {tab === '进阶' && (
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary shadow-[0_0_10px_rgba(66,255,158,1)]"></span>
                         )}
                     </button>
                 ))}
             </div>
             <div className="bg-[#101013] border border-t-0 border-white/10 rounded-b-xl p-5 relative overflow-hidden">
                 <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary to-transparent"></div>
                 <div className="text-[9px] text-white/30 uppercase tracking-[0.2em] mb-4 font-bold flex items-center gap-2">
                    <span className="size-1.5 bg-white/30 rounded-full"></span>
                    Strategy Analysis
                 </div>
                 <div className="space-y-3 relative z-10">
                     <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
                         <span className="text-xs text-white/60">你更可能</span>
                         <span className="text-xs text-primary font-bold bg-primary/10 px-2 py-0.5 rounded border border-primary/20 shadow-[0_0_10px_rgba(66,255,158,0.1)]">进阶档</span>
                     </div>
                     <div className="flex items-center justify-between p-2 rounded-lg bg-yellow-500/[0.05] border border-yellow-500/10">
                         <span className="text-xs text-white/60">风险提示</span>
                         <span className="text-xs text-yellow-500 font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[10px]">warning</span>
                            后半掉速风险 (中)
                         </span>
                     </div>
                 </div>
             </div>
         </div>

         {/* Improvement Chart */}
         <div className="bg-[#101013] border border-white/10 rounded-xl p-5 relative overflow-hidden shadow-lg">
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <div className="h-4 w-1 bg-primary rounded-full shadow-[0_0_10px_rgba(66,255,158,0.5)]"></div>
                    <h3 className="text-white font-bold text-sm">提升从哪来 (贡献拆解)</h3>
                </div>
             </div>
             <div className="flex items-center justify-between gap-6">
                 <div className="relative size-36 shrink-0">
                     <svg viewBox="0 0 36 36" className="w-full h-full rotate-[-90deg]">
                         <path className="text-white/5" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                         <path className="text-primary drop-shadow-[0_0_8px_rgba(66,255,158,0.4)]" strokeDasharray="45, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                         <path className="text-secondary drop-shadow-[0_0_8px_rgba(51,153,204,0.4)]" strokeDasharray="20, 100" strokeDashoffset="-48" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                     </svg>
                     <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                         <span className="text-[9px] text-white/30 uppercase font-bold tracking-widest mb-1">TOTAL SAVE</span>
                         <span className="text-3xl font-bold text-white font-display mb-0.5">+110<span className="text-sm">s</span></span>
                         <span className="text-[9px] text-white/30">to 260s</span>
                     </div>
                 </div>
                 <div className="flex-1 space-y-4">
                     <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="size-2 bg-primary rounded-full"></div><span className="text-xs text-white">站点优化</span></div><span className="text-xs font-bold text-primary">+45%</span></div>
                     <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="size-2 bg-secondary rounded-full"></div><span className="text-xs text-white">Roxzone</span></div><span className="text-xs font-bold text-secondary">+20%</span></div>
                 </div>
             </div>
         </div>

         {/* CTA */}
         {isPro ? (
           <button 
             onClick={() => setCurrentView('DASHBOARD')}
             className="w-full py-4 bg-primary text-black font-bold text-lg rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(66,255,158,0.4)] mb-8"
           >
             进入备赛中心
             <span className="material-symbols-outlined">arrow_forward</span>
           </button>
         ) : (
           <button 
             onClick={() => setCurrentView('SUBSCRIPTION')}
             className="w-full py-4 bg-primary text-black font-bold text-lg rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(66,255,158,0.4)] mb-8"
           >
             订阅 Pro | 解锁分段目标与计划
             <span className="material-symbols-outlined">arrow_forward</span>
           </button>
         )}
         
         <div className="h-8"></div>
      </main>
    </div>
  );

  // =========================================================================
  // VIEW 2: SUBSCRIPTION
  // =========================================================================
  const renderSubscription = () => (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background-dark max-w-md mx-auto animate-in slide-in-from-bottom-8 duration-300">
       <header className="sticky top-0 z-30 flex items-center px-4 py-4 bg-background-dark border-b border-white/5 shrink-0">
         <button onClick={goBack} className="text-white hover:text-white/70">
            <span className="material-symbols-outlined">arrow_back</span>
         </button>
         <h1 className="text-white font-bold text-xl ml-4">订阅 Pro</h1>
       </header>

       <main className="flex-1 p-5 overflow-y-auto no-scrollbar pb-32">
          {/* Main Price Card */}
          <div className="relative bg-gradient-to-b from-[#1E2024] to-[#101013] border border-white/10 rounded-2xl p-8 mb-8 overflow-hidden shadow-2xl">
             <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
             <div className="absolute top-0 right-0 bg-primary text-black text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-lg">
                最推荐
             </div>
             
             <div className="flex flex-col items-center text-center relative z-10">
                <span className="text-white/60 text-sm tracking-widest uppercase mb-2">Pro 订阅</span>
                <div className="flex items-baseline gap-1 mb-8">
                   <span className="text-6xl font-bold text-white font-display">¥199</span>
                   <span className="text-white/40">/月</span>
                </div>
                
                {/* 2x2 Feature Grid */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-6 w-full text-left">
                   {[
                      { icon: 'timer', label: '下次比赛推估' },
                      { icon: 'calendar_month', label: '每日训练到天' },
                      { icon: 'smart_toy', label: 'AI 每周调课' },
                      { icon: 'ecg_heart', label: '疲劳伤病管理' }
                   ].map((f, i) => (
                      <div key={i} className="flex items-center gap-3">
                         <span className="material-symbols-outlined text-primary text-sm">{f.icon}</span>
                         <span className="text-xs text-white/80">{f.label}</span>
                      </div>
                   ))}
                </div>
             </div>
          </div>

          <div className="mb-6 flex items-center gap-2">
             <div className="h-4 w-1 bg-primary rounded-full"></div>
             <h3 className="text-white font-bold">你更想哪种方式？</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <div className="bg-[#1E2024] border border-primary/30 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:bg-primary/5 transition-colors" onClick={handleSubscribe}>
                <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full blur-2xl -mr-5 -mt-5"></div>
                <div>
                   <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined text-primary">psychology</span>
                   </div>
                   <h4 className="font-bold text-white mb-1">AI 备赛 Pro</h4>
                   <p className="text-[10px] text-white/50 leading-tight mb-4">把“提升 2-4 分钟”拆到每天训练</p>
                </div>
                <button className="w-full py-2.5 rounded-lg bg-primary/10 text-primary border border-primary/30 text-xs font-bold pointer-events-none">
                   去支付 ¥199/月
                </button>
             </div>

             <div className="bg-[#1E2024] border border-white/5 rounded-2xl p-4 flex flex-col justify-between cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setCurrentView('COACH_LIST')}>
                <div>
                   <div className="size-10 rounded-full bg-white/5 flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined text-white">groups</span>
                   </div>
                   <h4 className="font-bold text-white mb-1">本城市优质教练</h4>
                   <p className="text-[10px] text-white/50 leading-tight mb-4">真人纠偏动作与站点</p>
                </div>
                <button className="w-full py-2.5 rounded-lg bg-transparent border border-white/20 text-white text-xs font-bold pointer-events-none">
                   查看教练
                </button>
             </div>
          </div>
       </main>

       <div className="absolute bottom-0 left-0 right-0 w-full p-5 bg-[#101013] border-t border-white/5 z-40">
          <button 
             id="pay-btn"
             onClick={handleSubscribe}
             className="w-full h-14 bg-primary text-black font-bold text-lg rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(66,255,158,0.4)] hover:brightness-110 active:scale-[0.98] transition-all"
          >
             去支付 ¥199/月
             <span className="material-symbols-outlined">arrow_forward</span>
          </button>
       </div>
    </div>
  );

  // =========================================================================
  // VIEW 3: PRO DASHBOARD (Screenshot 3 - "Pro Unlocked")
  // =========================================================================
  const renderDashboard = () => (
    <div className="flex flex-col min-h-screen bg-background-dark animate-in fade-in duration-300 pb-24 font-body">
       <header className="px-5 pt-safe-top py-5 flex items-center justify-between">
          <button onClick={goBack} className="text-white hover:text-white/70 transition-colors">
             <span className="material-symbols-outlined text-xl">arrow_back_ios_new</span>
          </button>
          <div className="flex flex-col items-center">
             <h1 className="text-base font-bold text-white tracking-widest font-display">训练 & 备赛中心</h1>
             <span className="text-[9px] text-primary tracking-[0.2em] font-medium mt-0.5 flex items-center gap-1 shadow-primary drop-shadow-[0_0_5px_rgba(66,255,158,0.5)]">
                <span className="material-symbols-outlined text-[10px]">lock_open</span>
                PRO UNLOCKED
             </span>
          </div>
          <button onClick={handleAIReplan} className="px-3 py-1.5 bg-primary rounded text-[10px] font-bold text-black hover:brightness-110 transition-all shadow-[0_0_10px_rgba(66,255,158,0.2)]">
             AI ADJUST
          </button>
       </header>

       <main className="px-5 space-y-6 flex-1 overflow-y-auto no-scrollbar">
          {/* Main Status Card */}
          <div className="bg-[#15171A] border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-lg">
             <div className="flex justify-between items-start mb-4">
                 <div className="flex items-center gap-2 px-2 py-1 bg-white/5 rounded border border-white/5">
                     <span className="size-1.5 rounded-full bg-primary animate-pulse"></span>
                     <span className="text-[10px] text-white/60 font-mono">HYROX BEIJING 2026</span>
                 </div>
                 <span className="text-[10px] text-white/40 font-mono">DAYS TO RACE: <span className="text-white font-bold">42</span></span>
             </div>
             
             <div className="flex justify-between items-center mb-6">
                 <div>
                     <div className="flex items-center gap-1 text-[10px] text-white/60 font-bold uppercase mb-1">
                         <span className="material-symbols-outlined text-xs">flag</span>
                         AI 推荐完赛目标
                     </div>
                     <div className="text-5xl font-bold text-primary font-display tracking-tighter drop-shadow-[0_0_15px_rgba(66,255,158,0.3)]">
                         01:22:10
                     </div>
                     <div className="flex gap-2 mt-3">
                         <span className="px-2 py-0.5 bg-white/5 rounded text-[10px] text-white/40 font-mono border border-white/5">PB: 01:28:45</span>
                         <span className="px-2 py-0.5 bg-primary/10 rounded text-[10px] text-primary font-mono border border-primary/20">Target: -6m 35s</span>
                     </div>
                 </div>
                 {/* Circular Progress */}
                 <div className="relative size-20">
                     <svg viewBox="0 0 36 36" className="w-full h-full rotate-[-90deg]">
                         <path className="text-white/5" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                         <path className="text-primary drop-shadow-[0_0_5px_rgba(66,255,158,0.5)]" strokeDasharray="72, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                     </svg>
                     <div className="absolute inset-0 flex flex-col items-center justify-center">
                         <span className="text-lg font-bold text-white font-display">72%</span>
                     </div>
                 </div>
             </div>
          </div>

          {/* Roadmap */}
          <div>
              <div className="flex justify-between items-center mb-4">
                  <h3 className="text-white font-bold">你的训练路线图</h3>
                  <span className="text-[10px] text-white/40 font-mono">Week 4 of 12</span>
              </div>
              <div className="bg-[#15171A] border border-white/10 rounded-2xl p-5">
                  <div className="relative flex justify-between items-center mb-6 px-2">
                      <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/10 -z-0"></div>
                      {['Base', 'Build', 'Peak', 'Taper'].map((p, i) => (
                          <div key={p} className="relative z-10 flex flex-col items-center gap-2">
                              <div className={`size-4 rounded-full border-2 ${p === 'Build' ? 'bg-primary border-primary shadow-[0_0_10px_rgba(66,255,158,0.8)]' : 'bg-[#15171A] border-white/20'}`}>
                                  {p === 'Build' && <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-50"></div>}
                              </div>
                              <span className={`text-[10px] font-bold ${p === 'Build' ? 'text-primary' : 'text-white/40'}`}>{p}</span>
                          </div>
                      ))}
                  </div>
                  <div className="flex gap-3">
                      <div className="mt-1">
                          <span className="material-symbols-outlined text-primary text-lg">fitness_center</span>
                      </div>
                      <div>
                          <h4 className="text-sm font-bold text-white mb-1">Build Phase - 强度积累</h4>
                          <p className="text-[10px] text-white/50 leading-relaxed">本周重点提升乳酸阈值，增加专项力量耐力。Sled Push 重量增加 5%。</p>
                      </div>
                  </div>
              </div>
          </div>

          {/* Split Targets */}
          <div>
              <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                      <h3 className="text-white font-bold">分段目标表</h3>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-primary border border-primary/20">已解锁</span>
                  </div>
                  <button className="text-[10px] text-primary flex items-center gap-1 font-bold">
                      导出 PDF <span className="material-symbols-outlined text-[10px]">download</span>
                  </button>
              </div>

              <div className="bg-[#15171A] border border-white/10 rounded-2xl overflow-hidden">
                  <div className="flex border-b border-white/10">
                      {['8 站点', '8 圈跑', '8 Roxzone'].map((t, i) => (
                          <div key={t} className={`flex-1 py-3 text-center text-xs font-bold ${i === 0 ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-white/40'}`}>
                              {t}
                          </div>
                      ))}
                  </div>
                  <div className="grid grid-cols-12 px-4 py-2 text-[9px] text-white/30 uppercase font-mono tracking-wider border-b border-white/5">
                      <div className="col-span-5">PROJECT / REASON</div>
                      <div className="col-span-4 text-center">CUR / TARGET</div>
                      <div className="col-span-3 text-right">SAVE</div>
                  </div>
                  <div className="divide-y divide-white/5">
                      <div className="grid grid-cols-12 px-4 py-3 items-center">
                          <div className="col-span-5">
                              <div className="text-sm font-bold text-white">Sled Push</div>
                              <div className="text-[9px] text-yellow-500 mt-0.5 flex items-center gap-1">● 起步爆发不足</div>
                          </div>
                          <div className="col-span-4 text-center font-mono">
                              <div className="text-xs text-white/40 line-through">03:15</div>
                              <div className="text-xs text-primary font-bold">02:45</div>
                          </div>
                          <div className="col-span-3 text-right text-xs font-bold text-primary flex items-center justify-end">
                              +30s <span className="material-symbols-outlined text-xs">chevron_right</span>
                          </div>
                      </div>
                      <div className="grid grid-cols-12 px-4 py-3 items-center">
                          <div className="col-span-5">
                              <div className="text-sm font-bold text-white">Wall Balls</div>
                              <div className="text-[9px] text-white/50 mt-0.5 flex items-center gap-1">● 后半程掉速</div>
                          </div>
                          <div className="col-span-4 text-center font-mono">
                              <div className="text-xs text-white/40 line-through">04:20</div>
                              <div className="text-xs text-primary font-bold">03:50</div>
                          </div>
                          <div className="col-span-3 text-right text-xs font-bold text-primary flex items-center justify-end">
                              +30s <span className="material-symbols-outlined text-xs">chevron_right</span>
                          </div>
                      </div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-t from-primary/10 to-transparent">
                      <button 
                        onClick={() => setCurrentView('WEEKLY_PLAN')}
                        className="w-full py-4 bg-primary text-black font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(66,255,158,0.4)] hover:brightness-110 active:scale-[0.98] transition-all"
                      >
                          <span className="material-symbols-outlined">calendar_month</span>
                          查看本周训练计划
                      </button>
                      <button className="w-full mt-3 py-3 border border-white/10 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 hover:bg-white/5">
                          <span className="material-symbols-outlined text-primary text-sm">share</span>
                          分享我的备赛进步卡
                      </button>
                  </div>
              </div>
          </div>
       </main>
    </div>
  );

  // =========================================================================
  // VIEW 4: WEEKLY PLAN (Screenshot 4)
  // =========================================================================
  const renderWeeklyPlan = () => (
    <div className="flex flex-col min-h-screen bg-background-dark animate-in slide-in-from-right-8 duration-300 font-body pb-24">
       <header className="px-5 pt-safe-top py-5 flex items-center justify-between">
          <button onClick={goBack} className="text-white hover:text-white/70">
             <span className="material-symbols-outlined text-xl">arrow_back_ios_new</span>
          </button>
          <div className="text-center">
             <h1 className="text-base font-bold text-white">本周训练计划</h1>
             <div className="flex items-center justify-center gap-1.5 mt-0.5">
                 <span className="size-1.5 rounded-full bg-primary"></span>
                 <span className="text-[10px] text-white/60 font-mono">第 4 周 / 共 12 周</span>
             </div>
          </div>
          <button className="flex items-center gap-1 px-3 py-1.5 bg-[#1E2024] border border-white/10 rounded text-[10px] text-primary font-bold hover:bg-white/5">
             <span className="material-symbols-outlined text-sm">auto_awesome</span> AI 调整
          </button>
       </header>

       <main className="px-5 space-y-6 flex-1 overflow-y-auto no-scrollbar">
           {/* Weekly Goal */}
           <div className="bg-[#15171A] border border-white/10 rounded-2xl p-5">
               <div className="flex justify-between items-start mb-4">
                   <div className="flex items-center gap-2">
                       <span className="material-symbols-outlined text-primary text-lg">target</span>
                       <h3 className="text-sm font-bold text-white">本周目标</h3>
                   </div>
                   <div className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] text-primary font-bold">
                       预计收益: +40-120s
                   </div>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                   <div>
                       <div className="text-[10px] text-white/40 mb-2">训练重点</div>
                       <div className="flex gap-2">
                           <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-white">站点效率</span>
                           <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-white">转场节奏</span>
                       </div>
                   </div>
                   <div>
                       <div className="text-[10px] text-white/40 mb-2">攻克短板</div>
                       <div className="flex gap-2">
                           <span className="px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-[10px] text-red-400">Wall Balls</span>
                           <span className="px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-[10px] text-red-400">Roxzone</span>
                       </div>
                   </div>
               </div>
           </div>

           {/* Calendar Strip */}
           <div>
               <div className="flex justify-between items-center mb-2 px-1">
                   <h3 className="text-sm font-bold text-white">本周日程</h3>
                   <span className="text-[10px] text-white/40">滑动查看</span>
               </div>
               <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                   {[
                       { d: '周一', date: '23', status: 'done' },
                       { d: '周二', date: '24', status: 'active', main: '65', unit: 'MIN', tag: '关键课' },
                       { d: '周三', date: '25', status: 'future', icon: 'directions_run', label: '耐力' },
                       { d: '周四', date: '26', status: 'future', icon: 'fitness_center', label: '力量' },
                       { d: '周五', date: '27', status: 'rest', icon: 'bed', label: '休息' },
                   ].map((day, i) => (
                       <div key={i} className={`flex-shrink-0 w-20 h-24 rounded-2xl flex flex-col items-center justify-center gap-1 border transition-all relative overflow-hidden ${
                           day.status === 'active' 
                           ? 'bg-primary border-primary shadow-[0_0_15px_rgba(66,255,158,0.3)]' 
                           : day.status === 'done'
                           ? 'bg-[#15171A] border-white/5 opacity-50'
                           : 'bg-[#15171A] border-white/10'
                       }`}>
                           <span className={`text-[10px] ${day.status === 'active' ? 'text-black/60 font-bold' : 'text-white/40'}`}>{day.d}</span>
                           
                           {day.status === 'done' && (
                               <div className="size-8 rounded-full bg-primary flex items-center justify-center">
                                   <span className="material-symbols-outlined text-black font-bold">check</span>
                               </div>
                           )}

                           {day.status === 'active' && (
                               <>
                                   <div className="text-2xl font-bold text-black font-display leading-none">{day.main}</div>
                                   <div className="text-[9px] text-black font-bold">{day.unit}</div>
                                   <div className="absolute bottom-2 px-2 py-0.5 bg-black/10 rounded text-[9px] font-bold text-black">{day.tag}</div>
                                   <div className="absolute top-2 right-2 size-2 rounded-full bg-black/20"></div>
                               </>
                           )}

                           {(day.status === 'future' || day.status === 'rest') && (
                               <>
                                   <span className={`material-symbols-outlined text-xl ${day.status === 'rest' ? 'text-white/20' : 'text-blue-400'}`}>{day.icon}</span>
                                   <span className="text-[10px] text-white/40">{day.label}</span>
                               </>
                           )}

                           {day.status === 'done' && <span className="text-[9px] text-white/40 mt-1">已完成</span>}
                       </div>
                   ))}
               </div>
           </div>

           {/* Session List */}
           <div>
               <div className="flex items-center gap-2 mb-3">
                   <h3 className="text-sm font-bold text-white">本周关键课</h3>
                   <span className="size-2 rounded-full bg-primary animate-pulse"></span>
               </div>
               
               <div className="space-y-3">
                   {/* Key Session Card */}
                   <div 
                     onClick={() => setCurrentView('SESSION_DETAIL')}
                     className="bg-[#15171A] border-l-4 border-l-primary border-y border-r border-white/10 rounded-r-2xl p-4 relative group cursor-pointer hover:bg-white/5 transition-colors"
                   >
                       <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-[#1a4d36] text-[9px] font-bold text-primary border border-primary/20">
                           +25s 收益
                       </div>
                       <h4 className="text-sm font-bold text-white mb-1">站点专项 (混合模态)</h4>
                       <p className="text-xs text-white/60 font-mono mb-3">Sled Push + Wall Balls Intervals</p>
                       <div className="flex items-center gap-4 text-[10px] text-white/40">
                           <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">timer</span> 65 min</span>
                           <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm text-yellow-500">bolt</span> RPE 8-9</span>
                           <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-primary"></span> 今日 (周二)</span>
                       </div>
                   </div>

                   {/* Secondary Session */}
                   <div className="bg-[#15171A] border-l-4 border-l-blue-500 border-y border-r border-white/10 rounded-r-2xl p-4 relative opacity-60">
                       <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-white/5 text-[9px] font-bold text-white/40 border border-white/10">
                           +20s 收益
                       </div>
                       <h4 className="text-sm font-bold text-white mb-1">阈值跑 (乳酸耐受)</h4>
                       <p className="text-xs text-white/60 font-mono mb-3">8 x 1km @ Threshold Pace</p>
                       <div className="flex items-center gap-4 text-[10px] text-white/40">
                           <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">timer</span> 55 min</span>
                           <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm text-yellow-500">bolt</span> RPE 7-8</span>
                           <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-white/20"></span> 周四</span>
                       </div>
                   </div>
               </div>
           </div>

           {/* Fatigue Monitor */}
           <div className="bg-[#15171A] border border-white/10 rounded-2xl p-4 flex gap-4 items-center">
               <div className="size-10 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0 border border-yellow-500/20">
                   <span className="material-symbols-outlined text-yellow-500">ecg_heart</span>
               </div>
               <div>
                   <h4 className="text-xs font-bold text-yellow-500 mb-0.5">疲劳指示: 中 (Medium)</h4>
                   <p className="text-[10px] text-white/50 leading-tight">身体负荷适中，建议保持当前计划强度，<span className="text-white font-bold">切勿私自加量</span>。</p>
               </div>
           </div>

           {/* Floating Action Button */}
           <div className="fixed bottom-24 left-5 right-5 z-20">
               <button 
                  onClick={() => setCurrentView('SESSION_DETAIL')}
                  className="w-full py-4 bg-gradient-to-r from-primary to-[#2cb86f] rounded-2xl text-black font-bold text-sm shadow-[0_0_20px_rgba(66,255,158,0.4)] flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all"
               >
                   <span className="material-symbols-outlined filled">play_arrow</span>
                   进入今天训练 (周二 | 关键课)
               </button>
               <button className="w-full mt-3 py-3 bg-[#15171A] border border-white/10 rounded-xl text-xs font-bold text-white/60 flex items-center justify-center gap-2 hover:bg-white/5 backdrop-blur-md">
                   <span className="material-symbols-outlined text-sm">grid_view</span>
                   查看本月训练节奏
               </button>
           </div>
       </main>
    </div>
  );

  // =========================================================================
  // VIEW 5: SESSION DETAIL (Screenshot 5)
  // =========================================================================
  const renderSessionDetail = () => (
    <div className="flex flex-col min-h-screen bg-background-dark animate-in slide-in-from-right-8 duration-300 font-body pb-12">
        <header className="px-5 pt-safe-top py-5 flex items-center justify-between bg-background-dark sticky top-0 z-30 border-b border-white/5">
          <button onClick={goBack} className="text-white hover:text-white/70">
             <span className="material-symbols-outlined text-xl">arrow_back_ios_new</span>
          </button>
          <div className="text-center">
             <h1 className="text-base font-bold text-white">今日训练 (关键课)</h1>
             <div className="text-[10px] text-primary font-mono font-bold tracking-wide uppercase">OCT 24 • WEEK 4</div>
          </div>
          <button className="px-3 py-1 bg-[#1E2024] border border-primary/30 rounded text-[10px] text-primary font-bold">
             KEY SESSION
          </button>
       </header>

       <main className="px-5 py-5 space-y-6 flex-1 overflow-y-auto no-scrollbar">
           {/* Focus Card */}
           <div className="bg-[#15171A] border-l-2 border-l-primary border-y border-r border-white/10 rounded-r-2xl p-5 relative">
               <div className="flex gap-4">
                   <div className="size-10 rounded-full bg-[#1a4d36] border border-primary/20 flex items-center justify-center shrink-0">
                       <span className="material-symbols-outlined text-primary">target</span>
                   </div>
                   <div>
                       <h3 className="text-sm font-bold text-white mb-1">目标: Wall Balls 波动控制</h3>
                       <p className="text-[10px] text-white/50 leading-relaxed mb-3">历史数据显示后半程每组掉速明显。今日重点在于保持节奏。</p>
                       <div className="bg-[#1E2024] border border-white/5 rounded px-3 py-2 flex justify-between items-center">
                           <span className="text-[10px] text-white/40">预计收益</span>
                           <span className="text-xs font-bold text-primary">+10-25s</span>
                       </div>
                   </div>
               </div>
           </div>

           {/* Workout Structure */}
           <div>
               <div className="flex justify-between items-end mb-3">
                   <h3 className="text-sm font-bold text-white">训练结构</h3>
                   <span className="text-[10px] text-white/40 font-mono">1h 15m Total</span>
               </div>

               <div className="space-y-2">
                   {[
                       { id: 1, title: '热身 Warm-up', desc: '10 min • Zone 1', tag: 'AI 调整', done: true },
                       { id: 2, title: '主训练 A: 推重物', desc: 'Sled Push • 8 x 15m', tag: '标准', done: false },
                       { id: 3, title: '主训练 B: 墙球', desc: 'Wall Balls • 6 x 20 reps', warning: true, done: false },
                       { id: 4, title: '辅助: 核心稳定', desc: 'Plank / Deadbug', tag: '可选', done: false },
                       { id: 5, title: '冷却 Cooldown', desc: '5-10 min', done: false },
                   ].map((block, i) => (
                       <div key={i} className={`bg-[#15171A] border border-white/5 rounded-xl p-4 flex items-center justify-between ${block.done ? 'opacity-50' : ''}`}>
                           <div className="flex items-center gap-4">
                               <div className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold ${block.done ? 'bg-primary/20 text-primary' : block.id === 3 ? 'bg-primary text-black' : 'bg-white/10 text-white/40'}`}>
                                   {block.id}
                               </div>
                               <div>
                                   <div className="text-sm font-bold text-white flex items-center gap-2">
                                       {block.title}
                                   </div>
                                   <div className="text-[10px] text-white/40 font-mono mt-0.5">{block.desc}</div>
                               </div>
                           </div>
                           
                           <div className="flex items-center gap-3">
                               {block.tag && <span className={`text-[9px] font-bold ${block.tag === 'AI 调整' ? 'text-primary' : 'text-white/30'}`}>{block.tag}</span>}
                               {block.warning && <span className="text-[9px] font-bold text-yellow-500 flex items-center gap-0.5"><span className="material-symbols-outlined text-[10px] filled">warning</span> 注意</span>}
                               
                               <button className="size-8 rounded-full bg-[#1E2024] border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30">
                                   <span className="material-symbols-outlined text-sm">timer</span>
                               </button>
                               <button className={`size-8 rounded-full border flex items-center justify-center ${block.done ? 'bg-primary/10 border-primary text-primary' : 'bg-[#1E2024] border-white/10 text-white/20'}`}>
                                   <span className="material-symbols-outlined text-sm">check</span>
                               </button>
                           </div>
                       </div>
                   ))}
               </div>
           </div>

           {/* Manual Log / Import */}
           <div className="grid grid-cols-2 gap-3">
               <button className="py-4 bg-[#15171A] border border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-white/5">
                   <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-sm">watch</span>
                   </div>
                   <span className="text-[10px] font-bold text-white/70">导入运动数据 (手表)</span>
               </button>
               <button className="py-4 bg-[#15171A] border border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-white/5">
                   <div className="size-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-blue-500 text-sm">edit_note</span>
                   </div>
                   <span className="text-[10px] font-bold text-white/70">手动记录</span>
               </button>
           </div>

           {/* Feedback */}
           <div>
               <h3 className="text-sm font-bold text-white mb-3">训练反馈</h3>
               <div className="bg-[#15171A] border border-white/10 rounded-2xl p-5">
                   <div className="text-[10px] text-white/40 mb-3">自觉疲劳度 (RPE)</div>
                   <div className="h-10 bg-[#1E2024] rounded-lg relative flex items-center px-1 mb-2">
                       <div className="absolute left-0 right-0 top-1/2 h-1 bg-white/5 -z-0"></div>
                       <div className="w-1/3 text-center text-[10px] text-white/40 z-10">低</div>
                       <div className="w-1/3 text-center text-[10px] text-black font-bold z-10 bg-primary h-full flex items-center justify-center rounded shadow-[0_0_10px_rgba(66,255,158,0.5)]">中</div>
                       <div className="w-1/3 text-center text-[10px] text-white/40 z-10">高</div>
                   </div>
               </div>
           </div>

           {/* Finish Button */}
           <button 
              className="w-full py-4 bg-primary text-black font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(66,255,158,0.4)] hover:brightness-110 active:scale-[0.98] transition-all"
           >
               完成训练并生成总结
               <span className="material-symbols-outlined">arrow_forward</span>
           </button>

           <button className="w-full py-3 border border-white/10 rounded-xl text-xs text-white/40 flex items-center justify-center gap-2 hover:text-white">
               <span className="material-symbols-outlined text-sm">sentiment_dissatisfied</span>
               我不舒服，需调整计划
           </button>
       </main>
    </div>
  );

  // Routing Logic
  switch (currentView) {
    case 'REPORT': return renderAnalysisReport();
    case 'SUBSCRIPTION': return renderSubscription();
    case 'COACH_LIST': return renderSubscription(); // Simplified for flow
    case 'DASHBOARD': return renderDashboard();
    case 'WEEKLY_PLAN': return renderWeeklyPlan();
    case 'SESSION_DETAIL': return renderSessionDetail();
    default: return renderAnalysisReport();
  }
};

export default PlanTab;
