'use client';
import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Settings, Volume2, Key } from 'lucide-react';

export default function ChatConsole({ 
  onSendMessage, 
  messages, 
  isThinking, 
  isListening, 
  toggleListening, 
  voiceOptions, 
  currentVoice, 
  onChangeVoice, 
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
    <div className="chat-console">
      {/* Header */}
      <div className="console-header">
        <div className="status-indicator">
          <span className="dot active"></span>
          <span className="title">Siti-Chan AI</span>
        </div>
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className={`settings-toggle ${showSettings ? 'active' : ''}`}
          title="Pengaturan"
        >
          <Settings size={16} />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="settings-panel">


          <div className="form-group">
            <div className="label-row">
              <label className="flex-label">
                <Key size={12} className="icon-cyan" />
                Custom DeepSeek API Key:
              </label>
              <span className="info-tag">Disimpan di browser</span>
            </div>
            <input 
              type="password" 
              value={customApiKey} 
              onChange={(e) => setCustomApiKey(e.target.value)}
              placeholder="Isi jika tidak diset di .env.local"
              className="text-input"
            />
          </div>

          <div className="form-group flex-row-group">
            <label className="flex-label">
              <Volume2 size={12} className="icon-cyan" />
              Pilih Karakter Suara:
            </label>
            <select 
              value={currentVoice} 
              onChange={(e) => onChangeVoice(e.target.value)}
              className="select-input"
            >
              {voiceOptions.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Message Log */}
      <div className="message-log">
        {messages.map((msg, index) => {
          const textToShow = msg.role === 'assistant' 
            ? (msg.displayedContent !== undefined ? msg.displayedContent : msg.content) 
            : msg.content;
          
          if (msg.role === 'assistant' && textToShow === '') {
            return null;
          }

          return (
            <div key={msg.id || index} className={`message-row ${msg.role === 'user' ? 'user' : 'assistant'}`}>
              <div className={`message-bubble ${msg.role === 'user' ? 'user' : 'assistant'}`}>
                <p>{textToShow}</p>
              </div>
            </div>
          );
        })}
        {isThinking && (
          <div className="message-row assistant">
            <div className="message-bubble assistant thinking-bubble">
              <span className="thinking-dot"></span>
              <span className="thinking-dot delay-1"></span>
              <span className="thinking-dot delay-2"></span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Form Controls */}
      <form onSubmit={handleSubmit} className="input-form">
        <button
          type="button"
          onClick={toggleListening}
          disabled={isThinking}
          className={`mic-button ${isListening ? 'listening' : ''}`}
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
          className="text-field"
        />
        
        <button
          type="submit"
          disabled={!inputText.trim() || isThinking || isListening}
          className="send-button"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
