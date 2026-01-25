
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

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

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [...messages, { role: 'user', text: userMsg }].map(m => ({
          parts: [{ text: m.text }],
          role: m.role
        })),
        config: {
          systemInstruction: "你是一位世界顶级的 HYROX 教练，说话风格专业、有激励性且言简意赅。你熟悉 Sled Push (雪橇推), Burpees (波比跳), Wall Balls (墙球) 等所有 HYROX 项目。请根据用户的训练问题提供科学的建议。",
        }
      });

      const aiText = response.text || "抱歉，我现在有点喘不过气，请稍后再试。";
      setMessages(prev => [...prev, { role: 'model', text: aiText }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: "系统连线异常，请检查网络。" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background-dark">
      <header className="sticky top-0 z-50 flex items-center bg-background-dark/95 backdrop-blur-md p-4 justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="relative size-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
            <span className="material-symbols-outlined text-primary">smart_toy</span>
            <span className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-background-dark rounded-full"></span>
          </div>
          <div>
            <h2 className="text-white text-sm font-bold leading-tight">HYROX AI 教练</h2>
            <p className="text-[10px] text-primary/80 uppercase font-mono tracking-widest">在线</p>
          </div>
        </div>
        <button className="text-gray-400 hover:text-white transition-colors">
          <span className="material-symbols-outlined">settings</span>
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
              m.role === 'user' 
                ? 'bg-primary text-black font-medium rounded-br-none' 
                : 'bg-surface-dark text-gray-200 border border-white/5 rounded-bl-none'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface-dark border border-white/5 rounded-2xl px-4 py-3 rounded-bl-none">
              <div className="flex gap-1">
                <span className="size-1.5 bg-primary/50 rounded-full animate-bounce"></span>
                <span className="size-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="size-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 pb-28 bg-gradient-to-t from-background-dark to-transparent">
        <div className="flex items-center gap-2 bg-surface-dark border border-white/10 rounded-full p-1 pl-4 pr-1 shadow-2xl focus-within:border-primary/50 transition-all">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="询问教练建议..." 
            className="flex-1 bg-transparent border-none focus:ring-0 text-white text-sm placeholder-gray-500"
          />
          <button 
            onClick={sendMessage}
            disabled={loading}
            className="size-10 rounded-full bg-primary flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined font-bold">arrow_upward</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentTab;
