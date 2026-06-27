'use client';
import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Settings, Volume2, Key, HelpCircle } from 'lucide-react';

export default function ChatConsole({ 
  onSendMessage, 
  messages, 
  isThinking, 
  isListening, 
  toggleListening, 
  voiceOptions, 
  currentVoice, 
  onChangeVoice, 
  customAvatarUrl, 
  setCustomAvatarUrl,
  customApiKey,
  setCustomApiKey
}) {
  const [inputText, setInputText] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim() || isThinking) return;
    onSendMessage(inputText);
    setInputText('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-2xl glass-panel">
      {/* Header / Settings toggle */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <h1 className="font-semibold tracking-wide text-cyan-400 text-sm">Siti-Chan AI</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className={`p-1.5 rounded-lg border transition-all duration-200 ${
            showSettings 
              ? 'bg-cyan-500/20 text-cyan-450 border-cyan-500/35 shadow-[0_0_10px_rgba(34,211,238,0.25)]' 
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
          title="Pengaturan"
        >
          <Settings size={16} />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="px-4 py-3 bg-slate-950/95 border-b border-slate-800 space-y-3 text-xs transition-all duration-300">
          {/* Custom Avatar URL Field */}
          <div className="flex flex-col gap-1">
            <label className="text-slate-400 font-medium">Ready Player Me GLB URL:</label>
            <input 
              type="text" 
              value={customAvatarUrl} 
              onChange={(e) => setCustomAvatarUrl(e.target.value)}
              placeholder="Paste Ready Player Me GLB URL"
              className="w-full bg-slate-900 border border-slate-850 rounded px-2 py-1.5 text-slate-350 focus:outline-none focus:border-cyan-500 overflow-ellipsis"
            />
          </div>

          {/* Custom DeepSeek API Key Field */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <label className="text-slate-400 font-medium flex items-center gap-1">
                <Key size={12} className="text-cyan-500" />
                Custom DeepSeek API Key:
              </label>
              <span className="text-[10px] text-slate-500 italic">Disimpan di browser</span>
            </div>
            <input 
              type="password" 
              value={customApiKey} 
              onChange={(e) => setCustomApiKey(e.target.value)}
              placeholder="Isi jika tidak diset di .env.local"
              className="w-full bg-slate-900 border border-slate-850 rounded px-2 py-1.5 text-slate-350 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Voice Select */}
          <div className="flex justify-between items-center">
            <label className="text-slate-400 font-medium flex items-center gap-1">
              <Volume2 size={12} className="text-cyan-500" />
              Pilih Karakter Suara:
            </label>
            <select 
              value={currentVoice} 
              onChange={(e) => onChangeVoice(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 focus:outline-none cursor-pointer"
            >
              {voiceOptions.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Message Log */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[250px] bg-slate-950/20">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-md transition-all duration-200 ${
              msg.role === 'user' 
                ? 'bg-cyan-600/90 text-white rounded-br-none neon-glow' 
                : 'bg-slate-850/90 text-slate-100 rounded-bl-none border border-slate-700/30'
            }`}>
              <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {isThinking && (
          <div className="flex justify-start">
            <div className="bg-slate-850/90 border border-slate-700/30 rounded-2xl rounded-bl-none px-4 py-3 text-sm flex gap-1.5 items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-bounce"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.15s]"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.3s]"></span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Form and Controls */}
      <form onSubmit={handleSubmit} className="p-4 bg-slate-950/80 border-t border-slate-800/80 flex gap-3 items-center">
        <button
          type="button"
          onClick={toggleListening}
          disabled={isThinking}
          className={`p-3.5 rounded-full transition-all duration-300 relative border disabled:opacity-50 disabled:cursor-not-allowed ${
            isListening 
              ? 'bg-red-500/20 text-red-500 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse' 
              : 'bg-slate-900 hover:bg-slate-800/70 text-cyan-400 border-slate-800'
          }`}
          title="Klik untuk bicara (Voice Input)"
        >
          {isListening ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={isListening ? "Mendengarkan suara Anda..." : "Ketik pesan di sini..."}
          disabled={isThinking || isListening}
          className="flex-1 bg-slate-900/80 border border-slate-800/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50 disabled:opacity-50 placeholder:text-slate-500 transition-colors"
        />
        
        <button
          type="submit"
          disabled={!inputText.trim() || isThinking || isListening}
          className="p-3.5 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 rounded-xl transition-all duration-200 cursor-pointer disabled:cursor-not-allowed font-semibold"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
