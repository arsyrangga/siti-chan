'use client';
import { useState, useEffect, useRef } from 'react';
import AvatarScene from '../components/AvatarScene';
import ChatConsole from '../components/ChatConsole';

export default function Home() {
  const [messages, setMessages] = useState([
    {
      id: 'init',
      role: 'assistant',
      content: 'Hello! I am Siti-Chan. Type your message or tap the mic button to chat with me!~',
      displayedContent: 'Hello! I am Siti-Chan. Type your message or tap the mic button to chat with me!~'
    }
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [jawOpen, setJawOpen] = useState(0);

  // Custom states synced with localStorage
  const [currentVoice, setCurrentVoice] = useState('af_v0irulan');
  const [customApiKey, setCustomApiKey] = useState('');

  const recognitionRef = useRef(null);
  const voiceOptions = ['af_v0irulan', 'af_heart', 'af_bella', 'af_sarah', 'am_adam', 'am_michael'];

  // Load settings from localStorage on client-side mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedVoice = localStorage.getItem('siti_chan_voice');
      const storedKey = localStorage.getItem('siti_chan_apikey');

      if (storedVoice) setCurrentVoice(storedVoice);
      if (storedKey) setCustomApiKey(storedKey);
    }
  }, []);

  // Save settings when changed
  const handleSetVoice = (val) => {
    setCurrentVoice(val);
    localStorage.setItem('siti_chan_voice', val);
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
        rec.lang = 'en-US'; // English voice recognition

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

    const userMsg = { id: `user-${Date.now()}`, role: 'user', content: text, displayedContent: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsThinking(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content })),
          apiKey: customApiKey
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const assistantMsgId = `assistant-${Date.now()}`;
      setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: data.text, displayedContent: '' }]);

      // Trigger speech synthesis
      await speakText(data.text, assistantMsgId);
    } catch (err) {
      console.error(err);
      const errorMsgId = `error-${Date.now()}`;
      setMessages(prev => [...prev, { id: errorMsgId, role: 'assistant', content: `${err.message}`, displayedContent: `${err.message}` }]);
      setIsThinking(false);
    }
  };

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const audioRef = useRef(null);
  const typingIntervalRef = useRef(null);

  const speakText = async (text, msgId) => {
    try {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }

      // Connect to local python backend TTS (remsky/Kokoro-FastAPI)
      const res = await fetch('http://localhost:8880/v1/audio/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: text,
          model: "kokoro",
          voice: currentVoice,
          response_format: "mp3",
          stream: true,
          lang_code: "a",
          speed: 0.8,
        })
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
      audioRef.current = audio;
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
        const mouthOpen = Math.min(1.0, (average / 80) * 1.5);
        setJawOpen(mouthOpen);

        animationFrameRef.current = requestAnimationFrame(updateLipSync);
      };

      audio.onplay = () => {
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        updateLipSync();

        // Stop loading state as audio playback officially begins
        setIsThinking(false);

        // Start typing sync
        let duration = audio.duration;
        if (isNaN(duration) || !isFinite(duration) || duration <= 0) {
          duration = text.length * 0.06; // Fallback estimate
        }
        const charInterval = (duration * 1000) / text.length;
        let currentLen = 0;

        typingIntervalRef.current = setInterval(() => {
          currentLen++;
          setMessages(prev => prev.map(m => {
            if (m.id === msgId) {
              return { ...m, displayedContent: text.slice(0, currentLen) };
            }
            return m;
          }));

          if (currentLen >= text.length) {
            clearInterval(typingIntervalRef.current);
          }
        }, charInterval);
      };

      audio.onended = () => {
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
        }
        setMessages(prev => prev.map(m => {
          if (m.id === msgId) {
            return { ...m, displayedContent: text };
          }
          return m;
        }));
        cancelAnimationFrame(animationFrameRef.current);
        setJawOpen(0);
      };

      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
        }
        setMessages(prev => prev.map(m => {
          if (m.id === msgId) {
            return { ...m, displayedContent: text };
          }
          return m;
        }));
        cancelAnimationFrame(animationFrameRef.current);
        setJawOpen(0);
        setIsThinking(false);
      };

      await audio.play();
    } catch (err) {
      console.error("Failing to playback speech:", err);
      // Fallback text output on failure
      setMessages(prev => prev.map(m => {
        if (m.id === msgId) {
          return { ...m, displayedContent: text };
        }
        return m;
      }));
      setIsThinking(false);
    }
  };

  // Clean up animation frames and intervals on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    };
  }, []);

  return (
    <main className="main-container">
      <div className="workspace-layout">
        {/* 3D Canvas Panel */}
        <div className="avatar-container glass-panel">
          <AvatarScene jawOpen={jawOpen} />
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
            customApiKey={customApiKey}
            setCustomApiKey={handleSetApiKey}
            onSendMessage={handleSendMessage}
          />
        </div>
      </div>
    </main>
  );
}
