/**
 * PlanTab - 备赛计划页面
 * 版本: v2.0
 * 
 * 多视图系统：REPORT, SCHEDULE, SUBSCRIPTION, COACH_LIST
 */

import React, { useState } from 'react';
import type { TrainingSession } from '../types';

// --- Mock Data ---
const sessions: TrainingSession[] = [
  {
    id: '1',
    type: 'Key',
    title: '核心推力训练 (Sled Push)',
    description: '8x 50m Sled Push @ 120kg',
    day: 'TUE',
    color: 'text-primary',
    icon: 'fitness_center',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAbzS7H9TiubefrT9EPZRzJw20vEnKsbT2irKwSv4UpNm3aDU_Pi_TDIljChVkfqn1rYNwYBP4UoCxO36hp-44r43D-yVkiueEVc74vO_hL370BUWgQL-wIEblU2FhB-umkSrNKrGfSTDvo5pE_06at5-VnXzONfbiCHcZ9GbbjSbo9kUMEy2ojWA4TnYdVnbDNPYDFwLOlZMsqMq9dEEmJBFlqIZXx2TpyPYoo91EnNhhXUSztFOp2pNi02m3v0P0Plymxd3SPmBUd'
  },
  {
    id: '2',
    type: 'Endurance',
    title: 'Zone 2 耐力跑',
    description: '45min Run @ HR 135-145',
    day: 'THU',
    color: 'text-blue-400',
    icon: 'timer',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCvQxKllt7yemD39WsXAZpj6iE7LrEoO0Qq1R3syVf6IedRH6vjywxE5IACZcSQXmgTHz2a1faPnuqLOWzMW1Raw0wMimmgx_soLkytD0CI5yMW_UR4gqGlLrPtKzkFzkcKDPfQ84M5rjl_VyfXmOupkXspMCPUyGPuz8I0-cPA8bNRjnQ5ZVVcHSE2lhEYpFIp6WhJDonPZTJsNfyOyz0aqsSFPUjy7XE2izOcn_fzXlT9eKW0Pn3r_B5Oji5Clk6JvdwVP1_dS0V4'
  },
];

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
  {
    id: 'c3',
    name: 'Mike 王强',
    gym: 'IronBox 朝阳大悦城',
    rating: '4.8',
    tags: ['波比跳', '耐力'],
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
    isVerified: true
  }
];

type PlanView = 'REPORT' | 'SCHEDULE' | 'SUBSCRIPTION' | 'COACH_LIST';

const PlanTab: React.FC = () => {
  const [currentView, setCurrentView] = useState<PlanView>('REPORT');
  const [isPro, setIsPro] = useState(false); 
  const [phase, setPhase] = useState('Build');
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Navigation Handlers
  const goBackToReport = () => setCurrentView('REPORT');
  const goToSubscription = () => setCurrentView('SUBSCRIPTION');
  const goToCoachList = () => setCurrentView('COACH_LIST');
  
  const handleSubscribe = () => {
    // Simulate payment loading
    const btn = document.getElementById('pay-btn');
    if(btn) btn.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span>';
    
    setTimeout(() => {
      setIsPro(true);
      setCurrentView('SCHEDULE');
    }, 1500);
  };

  const handleAIReplan = () => {
    setIsRegenerating(true);
    setTimeout(() => setIsRegenerating(false), 2000);
  };

  // --- View 1: ROXLAB ANALYSIS REPORT (New Homepage) ---
  const renderAnalysisReport = () => (
    <div className="flex flex-col min-h-screen font-body animate-in fade-in duration-300 pb-24 bg-[#050505] relative overflow-hidden">
      {/* Background Grid Pattern */}
      <div 
        className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
        style={{
            backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)'
        }}
      ></div>

      <header className="relative z-10 px-5 pt-safe-top py-4 flex items-center justify-between">
        <button className="text-white hover:text-white/70">
           <span className="material-symbols-outlined text-xl">arrow_back_ios</span>
        </button>
        <div className="flex flex-col items-center">
            <h1 className="text-sm font-bold text-white tracking-widest font-display">ROXLAB ANALYSIS</h1>
            <span className="text-[10px] text-primary tracking-widest">PRO REPORT</span>
        </div>
        <button 
           className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E2024] border border-primary/30 rounded-lg hover:bg-white/5 transition-colors shadow-[0_0_10px_rgba(66,255,158,0.1)]"
           onClick={handleAIReplan}
        >
           <span className="material-symbols-outlined text-primary text-sm">auto_awesome</span>
           <span className="text-[10px] font-bold text-white">AI ADJUST</span>
        </button>
      </header>

      <main className="relative z-10 flex-1 px-5 overflow-y-auto no-scrollbar space-y-4">
         
         {/* Top Card: Prediction */}
         <div className="bg-[#101013]/80 backdrop-blur-md border border-white/10 rounded-xl p-5 relative overflow-hidden">
            <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-4">
               <div className="flex items-center gap-2">
                   <div className="size-2 rounded-full bg-primary animate-pulse"></div>
                   <span className="text-xs font-mono text-white/60 uppercase tracking-wider">HYROX BEIJING 2026</span>
               </div>
               <span className="text-[10px] text-white/40 font-mono">DATA ACCURACY: HIGH</span>
            </div>
            
            <div className="flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-white/40 text-sm">flag</span>
                        <span className="text-xs text-white/60">北京站推估完赛</span>
                    </div>
                    <div className="text-4xl font-bold text-primary font-display tracking-tighter drop-shadow-[0_0_15px_rgba(66,255,158,0.4)]">
                        01:21:10
                    </div>
                    <div className="text-2xl font-bold text-primary/60 font-display tracking-tighter">
                        - 01:23:00
                    </div>
                    <div className="text-xs text-white/60 mt-3 font-medium">
                        同水平分位：<span className="text-white font-bold">35-45%</span>
                    </div>
                </div>
                
                {/* Visual Bar Chart */}
                <div className="flex items-end gap-1.5 h-16 pb-1">
                    <div className="w-2 bg-white/10 rounded-sm h-[40%]"></div>
                    <div className="w-2 bg-white/10 rounded-sm h-[60%]"></div>
                    <div className="w-3 bg-gradient-to-t from-primary/50 to-primary rounded-sm h-[80%] relative shadow-[0_0_10px_rgba(66,255,158,0.5)]">
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] text-primary whitespace-nowrap bg-black/80 px-1 rounded border border-primary/20">你的位置</div>
                    </div>
                    <div className="w-2 bg-white/10 rounded-sm h-[50%]"></div>
                    <div className="w-2 bg-white/10 rounded-sm h-[30%]"></div>
                </div>
            </div>
         </div>

         {/* Insight Card */}
         <div className="bg-[#101013]/80 backdrop-blur-md border border-white/10 rounded-xl p-4 flex gap-4 items-center">
             <div className="size-10 rounded-full bg-green-900/20 flex items-center justify-center shrink-0 border border-green-500/20">
                 <span className="material-symbols-outlined text-green-500">trending_up</span>
             </div>
             <p className="text-xs text-white/70 leading-relaxed">
                 在与你同水平的 <span className="text-white font-bold">2,975</span> 人里，<span className="text-primary font-bold">70%</span> 下一场会进步<br/>
                 <span className="text-[10px] text-white/40">平均进步：2-3 分钟</span>
             </p>
         </div>

         {/* Strategy Tabs */}
         <div className="flex border-b border-white/10">
             {['冲刺', '进阶', '稳妥', '保守', '风险'].map((tab, i) => (
                 <button key={i} className={`flex-1 pb-3 text-xs font-bold relative ${tab === '进阶' ? 'text-primary' : 'text-white/30'}`}>
                     {tab}
                     {tab === '进阶' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(66,255,158,0.8)]"></span>}
                 </button>
             ))}
         </div>

         {/* Strategy Analysis Detail */}
         <div className="bg-[#101013]/80 backdrop-blur-md border-l-2 border-primary border-y border-r border-white/10 rounded-r-xl p-5">
             <div className="text-[10px] text-white/40 uppercase tracking-widest mb-3 font-bold">STRATEGY ANALYSIS</div>
             <div className="space-y-2">
                 <div className="flex">
                     <span className="text-xs text-white/60 w-20">你更可能：</span>
                     <span className="text-xs text-primary font-bold bg-primary/10 px-1.5 rounded">进阶档</span>
                 </div>
                 <div className="flex">
                     <span className="text-xs text-white/60 w-20">训练侧重：</span>
                     <span className="text-xs text-white font-medium">站点效率 + 转换节奏</span>
                 </div>
                 <div className="flex">
                     <span className="text-xs text-white/60 w-20">风险提示：</span>
                     <span className="text-xs text-yellow-500 font-medium">后半掉速风险(中)</span>
                 </div>
             </div>
         </div>

         {/* Improvement Chart */}
         <div className="bg-[#101013]/80 backdrop-blur-md border-l-2 border-primary border-y border-r border-white/10 rounded-r-xl p-5">
             <div className="flex items-center gap-2 mb-6">
                 <div className="h-4 w-1 bg-primary rounded-full"></div>
                 <h3 className="text-white font-bold text-sm">提升从哪来 (贡献拆解)</h3>
             </div>
             
             <div className="flex items-center justify-between">
                 {/* CSS Donut Chart */}
                 <div className="relative size-32">
                     <svg viewBox="0 0 36 36" className="w-full h-full rotate-[-90deg]">
                         {/* Background Ring */}
                         <path className="text-white/5" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.8" />
                         
                         {/* Segments: Total 100. Station 45, Rox 20, Run 35 */}
                         {/* Segment 1: Station (Green) 45% */}
                         <path className="text-primary drop-shadow-[0_0_5px_rgba(66,255,158,0.5)]" strokeDasharray="45, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.8" />
                         
                         {/* Segment 2: Roxzone (Blue) 20% - Start at 45 */}
                         <path className="text-secondary" strokeDasharray="20, 100" strokeDashoffset="-45" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.8" />

                         {/* Segment 3: Run (Pink) 35% - Start at 65 */}
                         <path className="text-pink-500" strokeDasharray="35, 100" strokeDashoffset="-65" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.8" />
                     </svg>
                     <div className="absolute inset-0 flex flex-col items-center justify-center">
                         <span className="text-[8px] text-white/40 uppercase">Total Save</span>
                         <span className="text-xl font-bold text-white font-display">+110s</span>
                         <span className="text-[8px] text-white/30">to 260s</span>
                     </div>
                 </div>

                 {/* Legend */}
                 <div className="space-y-3 flex-1 pl-8">
                     <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                             <span className="size-2 rounded-full bg-primary shadow-[0_0_5px_rgba(66,255,158,0.8)]"></span>
                             <span className="text-xs text-white">站点优化</span>
                         </div>
                         <span className="text-xs font-bold text-primary font-mono">+45%</span>
                     </div>
                     <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                             <span className="size-2 rounded-full bg-secondary"></span>
                             <span className="text-xs text-white">Roxzone</span>
                         </div>
                         <span className="text-xs font-bold text-secondary font-mono">+20%</span>
                     </div>
                     <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                             <span className="size-2 rounded-full bg-pink-500"></span>
                             <span className="text-xs text-white">跑步能力</span>
                         </div>
                         <span className="text-xs font-bold text-pink-500 font-mono">+35%</span>
                     </div>
                 </div>
             </div>
         </div>

         {/* Locked Details List */}
         <div className="rounded-xl border border-white/10 overflow-hidden bg-[#101013]/50">
             <div className="grid grid-cols-12 bg-white/5 px-4 py-2 text-[10px] text-white/40 font-mono uppercase tracking-wider">
                 <div className="col-span-1">#</div>
                 <div className="col-span-5">Station</div>
                 <div className="col-span-3 text-center">Saving</div>
                 <div className="col-span-3 text-right">Reason</div>
             </div>
             
             <div className="divide-y divide-white/5">
                 <div className="grid grid-cols-12 px-4 py-3 items-center">
                     <div className="col-span-1 text-white/20 font-mono text-xs">01</div>
                     <div className="col-span-5 text-white font-bold text-sm">Wall Balls</div>
                     <div className="col-span-3 text-center">
                         <span className="text-primary font-bold font-mono text-sm border-b-2 border-primary pb-0.5">+30-90s</span>
                     </div>
                     <div className="col-span-3 text-right flex items-center justify-end gap-1 text-white/40 text-xs">
                         力量耐力不足 <span className="material-symbols-outlined text-xs">lock</span>
                     </div>
                 </div>
                 <div className="grid grid-cols-12 px-4 py-3 items-center opacity-50">
                     <div className="col-span-1 text-white/20 font-mono text-xs">02</div>
                     <div className="col-span-5 text-white font-bold text-sm">Sled Push</div>
                     <div className="col-span-3 text-center">
                         <span className="text-white/60 font-bold font-mono text-sm">+20s</span>
                     </div>
                     <div className="col-span-3 text-right flex items-center justify-end gap-1 text-white/40 text-xs">
                         技术优化 <span className="material-symbols-outlined text-xs">lock</span>
                     </div>
                 </div>
             </div>
             
             <button 
                onClick={goToSubscription}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-xs text-primary font-bold flex items-center justify-center gap-1 transition-colors"
             >
                 订阅 Pro 解锁全部 8 个站点分析
                 <span className="material-symbols-outlined text-sm">arrow_forward</span>
             </button>
         </div>

      </main>
    </div>
  );

  // --- View 2: Subscription Page (Comparative) ---
  const renderSubscription = () => (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background-dark max-w-md mx-auto animate-in slide-in-from-bottom-8 duration-300">
       <header className="sticky top-0 z-30 flex items-center px-4 py-4 bg-background-dark border-b border-white/5 shrink-0">
         <button onClick={goBackToReport} className="text-white hover:text-white/70">
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

          {/* Comparison Choice */}
          <div className="mb-6 flex items-center gap-2">
             <div className="h-4 w-1 bg-primary rounded-full"></div>
             <h3 className="text-white font-bold">你更想哪种方式？</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
             {/* Option A: AI Pro */}
             <div className="bg-[#1E2024] border border-primary/30 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:bg-primary/5 transition-colors" onClick={handleSubscribe}>
                <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full blur-2xl -mr-5 -mt-5"></div>
                <div>
                   <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined text-primary">psychology</span>
                   </div>
                   <h4 className="font-bold text-white mb-1">AI 备赛 Pro</h4>
                   <p className="text-[10px] text-white/50 leading-tight mb-4">把"提升 2-4 分钟"拆到每天训练</p>
                </div>
                <button 
                   className="w-full py-2.5 rounded-lg bg-primary/10 text-primary border border-primary/30 text-xs font-bold hover:bg-primary/20 pointer-events-none"
                >
                   去支付 ¥199/月
                </button>
             </div>

             {/* Option B: Local Coach */}
             <div className="bg-[#1E2024] border border-white/5 rounded-2xl p-4 flex flex-col justify-between cursor-pointer hover:bg-white/5 transition-colors" onClick={goToCoachList}>
                <div className="flex justify-between items-start mb-3">
                   <div className="size-10 rounded-full bg-white/5 flex items-center justify-center">
                      <span className="material-symbols-outlined text-white">accessibility_new</span>
                   </div>
                   <span className="material-symbols-outlined text-white/10 text-4xl -mt-2 -mr-2">groups</span>
                </div>
                <div>
                   <h4 className="font-bold text-white mb-1">本城市优质教练</h4>
                   <p className="text-[10px] text-white/50 leading-tight mb-4">真人纠偏动作与站点</p>
                </div>
                <button 
                   className="w-full py-2.5 rounded-lg bg-transparent border border-white/20 text-white text-xs font-bold pointer-events-none"
                >
                   查看教练 (3-5名)
                </button>
             </div>
          </div>
       </main>

       {/* Bottom Floating Pay Button */}
       <div className="absolute bottom-0 left-0 right-0 w-full p-5 bg-[#101013] border-t border-white/5 z-40">
          <button 
             id="pay-btn"
             onClick={handleSubscribe}
             className="w-full h-14 bg-primary text-black font-bold text-lg rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(66,255,158,0.4)] hover:brightness-110 active:scale-[0.98] transition-all"
          >
             去支付 ¥199/月
             <span className="material-symbols-outlined">arrow_forward</span>
          </button>
          <div className="flex justify-center items-center gap-1 mt-3 text-[10px] text-white/20">
             <span className="material-symbols-outlined text-[10px]">lock</span>
             安全支付 · 随时取消
          </div>
       </div>
    </div>
  );

  // --- View 3: Coach List Page ---
  const renderCoachList = () => (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background-dark max-w-md mx-auto animate-in slide-in-from-right-8 duration-300">
       <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-4 bg-background-dark border-b border-white/5 shrink-0">
         <div className="flex items-center gap-2">
            <button onClick={goBackToReport} className="text-white hover:text-white/70">
               <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="text-white font-bold text-lg ml-2">本城市优质教练</h1>
         </div>
         
         <div className="flex items-center gap-1 px-3 py-1.5 bg-[#1E2024] rounded-full border border-white/10 text-xs text-white">
            <span className="material-symbols-outlined text-primary text-sm filled">location_on</span>
            北京
            <span className="material-symbols-outlined text-[10px] text-white/40">arrow_drop_down</span>
         </div>
       </header>

       <div className="px-4 py-2 bg-surface-dark border-b border-white/5">
          <div className="text-[10px] text-white/40 text-right">已找到 12 位认证教练</div>
       </div>

       <main className="flex-1 p-4 overflow-y-auto no-scrollbar pb-32 space-y-4">
          {/* Upsell Banner */}
          <div className="bg-gradient-to-r from-[#1E2024] to-[#15171A] border border-primary/20 rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden">
             <div className="flex gap-2">
                <span className="text-xl">💡</span>
                <p className="text-xs text-white/80 leading-relaxed">
                   <span className="text-primary font-bold">提示</span> 也可先订阅 Pro，获得目标成绩与每日计划，再让教练监督执行。
                </p>
             </div>
             <button onClick={goToSubscription} className="self-start px-4 py-1.5 rounded-lg border border-primary text-primary text-xs font-bold hover:bg-primary/10 transition-colors">
                订阅 Pro ¥199/月
             </button>
             <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-primary/5 rounded-full blur-xl"></div>
          </div>

          {/* Coach Cards */}
          {COACHES.map(coach => (
             <div key={coach.id} className="bg-[#1E2024] border border-white/10 rounded-2xl p-4">
                <div className="flex justify-between items-start mb-4">
                   <div className="flex gap-3">
                      <div className="relative">
                         <img src={coach.avatar} alt={coach.name} className="size-12 rounded-full object-cover border-2 border-white/5" />
                         {coach.isVerified && (
                            <span className="absolute -bottom-1 -right-1 bg-primary text-black rounded-full p-0.5 border border-[#1E2024]">
                               <span className="material-symbols-outlined text-[10px] font-bold block">check</span>
                            </span>
                         )}
                      </div>
                      <div>
                         <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-white">{coach.name}</h3>
                            <div className="flex items-center text-yellow-500 text-xs font-bold gap-0.5">
                               <span className="material-symbols-outlined text-sm filled">star</span>
                               {coach.rating}
                            </div>
                         </div>
                         <div className="flex items-center gap-1 text-xs text-white/40 mt-0.5">
                            <span className="material-symbols-outlined text-sm">apartment</span>
                            {coach.gym}
                         </div>
                      </div>
                   </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                   <div className="text-[10px] text-white/30">擅长站点 |</div>
                   {coach.tags.map(tag => (
                      <div key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-white/5 rounded text-[10px] text-white/60">
                         {tag === '划船' && <span className="material-symbols-outlined text-[10px]">rowing</span>}
                         {tag === '雪橇推' && <span className="material-symbols-outlined text-[10px]">sledding</span>}
                         {tag === '墙球' && <span className="material-symbols-outlined text-[10px]">sports_handball</span>}
                         {tag}
                      </div>
                   ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <button className="py-2.5 rounded-xl bg-white/5 text-white text-xs font-bold hover:bg-white/10 transition-colors">
                      查看详情
                   </button>
                   <button className="py-2.5 rounded-xl bg-primary text-black text-xs font-bold hover:brightness-110 transition-colors shadow-[0_0_10px_rgba(66,255,158,0.2)]">
                      预约体验
                   </button>
                </div>
             </div>
          ))}
       </main>
    </div>
  );

  // --- View 4: Schedule (Unlocked) ---
  const renderSchedule = () => (
    <div className="flex flex-col animate-in slide-in-from-right-8 duration-300 min-h-screen">
      <header className="sticky top-0 z-30 bg-background-dark/95 backdrop-blur-md border-b border-white/5 pt-safe-top">
        <div className="flex flex-col px-5 pt-6 pb-4 gap-4">
          <div className="flex items-center justify-between">
            <button onClick={goBackToReport} className="text-white hover:text-primary transition-colors p-1 -ml-1 rounded-full hover:bg-white/5">
              <span className="material-symbols-outlined text-xl">arrow_back_ios_new</span>
            </button>
            <div className="flex items-center gap-2 bg-surface-dark px-3 py-1 rounded-full border border-white/10">
              <span className="material-symbols-outlined text-primary text-sm">calendar_today</span>
              <span className="text-xs font-bold text-gray-300 tracking-wide uppercase">HYROX 2026</span>
            </div>
            <div className="w-8"></div>
          </div>
          <div className="flex justify-between items-end">
            <h1 className="text-2xl font-bold text-white leading-tight">备赛计划<br/><span className="text-gray-400 text-lg">第 13 周：核心突破</span></h1>
            <button 
              onClick={handleAIReplan}
              className={`flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/30 rounded-lg text-primary transition-all active:scale-95 ${isRegenerating ? 'animate-pulse' : ''}`}
            >
              <span className="material-symbols-outlined text-sm">{isRegenerating ? 'sync' : 'auto_awesome'}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">{isRegenerating ? '调整中...' : 'AI 调整'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col gap-8 px-5 py-6 pb-32">
        <section className="flex flex-col gap-5">
          <div className="w-full overflow-x-auto no-scrollbar">
            <div className="flex gap-2 min-w-max">
              {['Base', 'Build', 'Peak', 'Taper'].map(p => (
                <button
                  key={p}
                  onClick={() => setPhase(p)}
                  className={`px-5 py-2 rounded-full border transition-all text-sm font-bold tracking-wide ${
                    phase === p 
                    ? 'border-primary text-primary bg-primary/10 shadow-[0_0_15px_rgba(66,255,158,0.2)]' 
                    : 'border-white/10 text-gray-400 bg-surface-dark'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {sessions.map((session, idx) => (
              <div 
                key={session.id} 
                style={{ animationDelay: `${idx * 100}ms` }}
                className="animate-in slide-in-from-bottom-4 fade-in duration-500 group relative bg-surface-dark rounded-xl p-0 overflow-hidden border border-white/5 hover:border-primary/30 transition-all cursor-pointer"
              >
                <div className="flex h-32">
                  <div className="flex-1 p-4 flex flex-col justify-between z-10">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`material-symbols-outlined ${session.color} text-[18px]`}>{session.icon}</span>
                        <span className={`text-xs font-bold ${session.color} uppercase tracking-wider`}>{session.type} Session</span>
                      </div>
                      <h3 className="text-lg font-bold text-white leading-tight">{session.title}</h3>
                      <p className="text-gray-400 text-sm mt-1">{session.description}</p>
                    </div>
                  </div>
                  <div className="w-32 h-full relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-surface-dark to-transparent z-10"></div>
                    <img src={session.imageUrl} className="w-full h-full object-cover opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-80 transition-all" alt={session.title} />
                  </div>
                </div>
                <div className="bg-black/20 px-4 py-2 flex justify-between items-center border-t border-white/5">
                  <button className="text-xs font-medium text-secondary hover:text-white flex items-center gap-1 transition-colors">
                    <span className="material-symbols-outlined text-[16px]">shuffle</span>
                    查看替代方案
                  </button>
                  <span className="text-xs text-gray-500">{session.day}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-2">
            <button className="flex items-center justify-center gap-2 py-3 rounded-lg bg-surface-dark-highlight border border-white/10 hover:bg-white/10 transition-colors text-white font-medium text-sm">
              <span className="material-symbols-outlined text-[20px]">ios_share</span>
              导出 PDF
            </button>
            <button className="flex items-center justify-center gap-2 py-3 rounded-lg bg-surface-dark-highlight border border-white/10 hover:bg-white/10 transition-colors text-white font-medium text-sm">
              <span className="material-symbols-outlined text-[20px]">person_add</span>
              分享给教练
            </button>
          </div>
        </section>

        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-2"></div>

        <section className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">trending_up</span>
              进步与留存
            </h2>
            <span className="text-xs text-gray-500">最近 4 周数据</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 bg-surface-dark rounded-xl p-5 border border-white/5 relative overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">训练强度对比</p>
                  <p className="text-2xl font-bold text-white mt-1">本周表现强劲</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary"></span>本周</div>
                  <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-secondary"></span>均值</div>
                </div>
              </div>
              <div className="flex items-end justify-between h-32 gap-3 pb-2 border-b border-white/5">
                {[
                  { label: 'Volume', now: 85, avg: 60 },
                  { label: 'Zone 4', now: 70, avg: 50 },
                  { label: 'Load', now: 90, avg: 75 },
                  { label: 'Recov', now: 60, avg: 80, dashed: true },
                ].map((stat, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                    <div className="w-full flex justify-center items-end gap-1 h-full">
                      <div className="w-3 bg-secondary/30 rounded-t-sm group-hover:bg-secondary/50 transition-colors relative" style={{ height: `${stat.avg}%` }}></div>
                      <div className={`w-3 ${stat.dashed ? 'border border-dashed border-gray-600' : 'bg-primary shadow-[0_0_10px_rgba(66,255,158,0.2)]'} rounded-t-sm relative transition-all duration-1000`} style={{ height: `${isRegenerating ? 0 : stat.now}%` }}>
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-white font-bold">{stat.now}</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );

  // Routing Logic
  switch (currentView) {
    case 'REPORT': return renderAnalysisReport();
    case 'SUBSCRIPTION': return renderSubscription();
    case 'COACH_LIST': return renderCoachList();
    case 'SCHEDULE': return renderSchedule();
    default: return renderAnalysisReport();
  }
};

export default PlanTab;
