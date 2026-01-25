/**
 * AgentTab - AI 教练页面（静态展示）
 * 版本: v2.0
 * 
 * 注意：此版本为静态展示，AI 功能暂未对接
 */

import React, { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'model';
  text: string;
}

const AgentTab: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: '你好！我是你的 HYROX AI 专属教练。我已经分析了你上周的数据，准备好开始今天的备赛咨询了吗？' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 静态版本：模拟回复
  const sendMessage = () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    // 模拟 AI 回复
    setTimeout(() => {
      const responses = [
        '很好的问题！对于 HYROX 训练，我建议你每周安排 3-4 次功能性训练，搭配 2 次有氧耐力训练。',
        '根据你的情况，Wall Balls 是一个常见的短板项目。建议每周进行 2 次专项训练，从 50 个开始逐步增加。',
        'Sled Push 的关键在于姿势和节奏。保持低重心，用髋部发力，不要全程冲刺。',
        '恢复同样重要！建议训练后进行 10-15 分钟的泡沫轴放松，每周至少安排 1 天完全休息。',
        '备赛期间，营养摄入要充足。比赛前一天以碳水化合物为主，比赛当天早餐清淡易消化。',
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      setMessages(prev => [...prev, { role: 'model', text: randomResponse }]);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-screen bg-background-dark">
      <header className="sticky top-0 z-50 flex items-center bg-background-dark/95 backdrop-blur-md p-4 justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="relative size-12 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/40 shadow-[0_0_15px_rgba(66,255,158,0.2)]">
            <span className="material-symbols-outlined text-primary text-xl">psychology</span>
            <span className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-background-dark rounded-full animate-pulse"></span>
          </div>
          <div>
            <h2 className="text-white font-bold leading-tight">HYROX AI Coach</h2>
            <p className="text-[10px] text-primary/80 uppercase font-mono tracking-widest flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-green-500"></span>
              在线中
            </p>
          </div>
        </div>
        <button className="size-10 rounded-full bg-surface-dark border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-all">
          <span className="material-symbols-outlined text-lg">more_vert</span>
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            {m.role === 'model' && (
              <div className="size-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mr-2 shrink-0 mt-1">
                <span className="material-symbols-outlined text-primary text-sm">psychology</span>
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-lg ${
              m.role === 'user' 
                ? 'bg-primary text-black font-medium rounded-br-sm' 
                : 'bg-[#1E2024] text-gray-200 border border-white/5 rounded-bl-sm'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start animate-in fade-in duration-200">
            <div className="size-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mr-2 shrink-0">
              <span className="material-symbols-outlined text-primary text-sm animate-pulse">psychology</span>
            </div>
            <div className="bg-[#1E2024] border border-white/5 rounded-2xl px-4 py-3 rounded-bl-sm">
              <div className="flex gap-1.5">
                <span className="size-2 bg-primary/60 rounded-full animate-bounce"></span>
                <span className="size-2 bg-primary/60 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                <span className="size-2 bg-primary/60 rounded-full animate-bounce [animation-delay:0.3s]"></span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 pb-28 bg-gradient-to-t from-background-dark via-background-dark/95 to-transparent">
        {/* Quick Action Chips */}
        <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
          {['训练计划', 'Wall Balls技巧', '恢复建议', '比赛配速'].map(chip => (
            <button 
              key={chip}
              onClick={() => setInput(chip)}
              className="px-3 py-1.5 bg-surface-dark border border-white/10 rounded-full text-xs text-white/60 hover:text-white hover:border-primary/30 transition-all whitespace-nowrap"
            >
              {chip}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2 bg-[#1E2024] border border-white/10 rounded-2xl p-1.5 pl-4 pr-1.5 shadow-2xl focus-within:border-primary/40 focus-within:shadow-[0_0_20px_rgba(66,255,158,0.1)] transition-all">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="询问教练建议..." 
            className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-white text-sm placeholder-gray-500"
          />
          <button 
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="size-10 rounded-xl bg-primary flex items-center justify-center text-black hover:brightness-110 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(66,255,158,0.3)]"
          >
            <span className="material-symbols-outlined font-bold">arrow_upward</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentTab;
