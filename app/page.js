'use client';
import { useState, useEffect, useRef } from 'react';
import AvatarScene from '../components/AvatarScene';
import ChatConsole from '../components/ChatConsole';

export default function Home() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Halo! Aku Siti-Chan. Ketik pesanmu atau ketuk tombol mic untuk mengobrol denganku ya!~' }
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [jawOpen, setJawOpen] = useState(0);
  
  // Custom states synced with localStorage
  const [currentVoice, setCurrentVoice] = useState('af_bella');
  const [avatarUrl, setAvatarUrl] = useState('https://models.readyplayer.me/64a2e88a0e8d0e5138241416.glb');
  const [customApiKey, setCustomApiKey] = useState('');
  
  const recognitionRef = useRef(null);
  const voiceOptions = ['af_bella', 'af_sarah', 'am_adam', 'am_michael'];

  // Load settings from localStorage on client-side mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedVoice = localStorage.getItem('siti_chan_voice');
      const storedAvatar = localStorage.getItem('siti_chan_avatar');
      const storedKey = localStorage.getItem('siti_chan_apikey');
      
      if (storedVoice) setCurrentVoice(storedVoice);
      if (storedAvatar) setAvatarUrl(storedAvatar);
      if (storedKey) setCustomApiKey(storedKey);
    }
  }, []);

  // Save settings when changed
  const handleSetVoice = (val) => {
    setCurrentVoice(val);
    localStorage.setItem('siti_chan_voice', val);
  };

  const handleSetAvatarUrl = (val) => {
    setAvatarUrl(val);
    localStorage.setItem('siti_chan_avatar', val);
  };

  const handleSetApiKey = (val) => {
    setCustomApiKey(val);
    localStorage.setItem('siti_chan_apikey', val);
  };

  useEffect(() => {
    // Initialize speech recognition in browser
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = 'id-ID'; // Indonesian voice recognition

        rec.onstart = () => setIsListening(true);
        rec.onend = () => setIsListening(false);
        rec.onerror = (e) => {
          console.error('Speech recognition error:', e);
          setIsListening(false);
        };
        rec.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          if (transcript.trim()) {
            handleSendMessage(transcript);
          }
        };
        recognitionRef.current = rec;
      }
    }
  }, [currentVoice]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech Recognition tidak didukung di browser ini. Gunakan Chrome atau Safari ya!");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      if (recognitionRef.current.state !== 'listening') {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  const handleSendMessage = async (text) => {
    if (isThinking) return;
    
    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setIsThinking(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: newMessages.filter(m => m.role !== 'system'),
          apiKey: customApiKey 
        })
      });
      
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setMessages(prev => [...prev, { role: 'assistant', content: data.text }]);
      
      // Trigger speech synthesis
      speakText(data.text);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: `${err.message}` }]);
    } finally {
      setIsThinking(false);
    }
  };

  const speakText = async (text) => {
    // Stub for speech playback logic, will be fully implemented in Task 5
    console.log(`TTS synthesis requested for: "${text}" with voice "${currentVoice}"`);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 bg-slate-950 text-white">
      <div className="w-full max-w-6xl flex flex-col md:flex-row gap-6 mt-4 items-stretch h-[calc(100vh-60px)]">
        {/* 3D Canvas Panel */}
        <div className="flex-1 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 relative min-h-[300px] glass-panel">
          <AvatarScene avatarUrl={avatarUrl} jawOpen={jawOpen} />
        </div>
        {/* Control Console */}
        <div className="w-full md:w-[450px]">
          <ChatConsole
            messages={messages}
            isThinking={isThinking}
            isListening={isListening}
            toggleListening={toggleListening}
            voiceOptions={voiceOptions}
            currentVoice={currentVoice}
            onChangeVoice={handleSetVoice}
            customAvatarUrl={avatarUrl}
            setCustomAvatarUrl={handleSetAvatarUrl}
            customApiKey={customApiKey}
            setCustomApiKey={handleSetApiKey}
            onSendMessage={handleSendMessage}
          />
        </div>
      </div>
    </main>
  );
}
