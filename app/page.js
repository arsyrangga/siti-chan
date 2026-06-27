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

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  const speakText = async (text) => {
    try {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Connect to local python backend TTS
      const res = await fetch('http://localhost:8000/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: currentVoice, speed: 1.0 })
      });

      if (!res.ok) throw new Error("TTS server error");
      
      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Initialize AudioContext on user interaction/first audio playback
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 64;
      }
      
      const ctx = audioContextRef.current;
      const analyser = analyserRef.current;
      
      // Load and play audio
      const audio = new Audio(audioUrl);
      const source = ctx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      
      // Web Audio processing loop to update jawOpen morph target influence
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLipSync = () => {
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume/amplitude
        const sum = dataArray.reduce((acc, val) => acc + val, 0);
        const average = sum / dataArray.length;
        
        // Map average volume [0, 255] to mouth morph target range [0, 1]
        // Increase responsiveness multiplier (e.g. * 1.5)
        const mouthOpen = Math.min(1.0, (average / 80) * 1.5);
        setJawOpen(mouthOpen);
        
        animationFrameRef.current = requestAnimationFrame(updateLipSync);
      };
      
      audio.onplay = () => {
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        updateLipSync();
      };
      
      audio.onended = () => {
        cancelAnimationFrame(animationFrameRef.current);
        setJawOpen(0);
      };
      
      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        cancelAnimationFrame(animationFrameRef.current);
        setJawOpen(0);
      };

      await audio.play();
    } catch (err) {
      console.error("Failing to playback speech:", err);
    }
  };

  // Clean up animation frames on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <main className="main-container">
      <div className="workspace-layout">
        {/* 3D Canvas Panel */}
        <div className="avatar-container glass-panel">
          <AvatarScene avatarUrl={avatarUrl} jawOpen={jawOpen} />
        </div>
        {/* Control Console */}
        <div className="console-container">
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
