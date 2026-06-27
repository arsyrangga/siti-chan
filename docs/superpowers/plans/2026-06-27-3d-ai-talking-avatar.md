# 3D AI Talking Avatar Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a responsive web application featuring an interactive 3D anime-style talking avatar powered by DeepSeek LLM (via official API) and Kokoro-82M TTS (via local Python FastAPI microservice) with text/voice inputs and real-time lip-sync.

**Architecture:** A Next.js frontend renders the 3D avatar using React Three Fiber, handles speech recognition (browser Web Speech API), and routes chat requests to Next.js API routes (proxying DeepSeek API). A local Python FastAPI microservice synthesizes assistant text responses into WAV audio using `kokoro-onnx` and streams it back to the client, which drives mouth morph targets via Web Audio volume analysis.

**Tech Stack:** Next.js (App Router, TailwindCSS/CSS), Three.js, React Three Fiber (`@react-three/fiber`, `@react-three/drei`), Python (FastAPI, uvicorn, kokoro-onnx, soundfile, onnxruntime), DeepSeek Chat API.

## Global Constraints
- Framework: Next.js (App Router, React)
- 3D Rendering: Three.js via React Three Fiber
- Local TTS Engine: Kokoro-82M (ONNX version) via Python FastAPI
- AI Chat Model: DeepSeek (official API)
- Speech Input: Browser's native Web Speech API
- Mobile Responsive: Yes (CSS Flexbox/Grid, Dark Mode Glassmorphism)

---

### Task 1: Set Up Python FastAPI TTS Backend

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/main.py`
- Create: `backend/test_main.py`

**Interfaces:**
- Produces: `/api/tts` endpoint taking JSON `{ "text": str, "voice": str }` and returning audio/wav stream.

- [ ] **Step 1: Write the backend requirements**
  Create `backend/requirements.txt` listing dependencies.
  ```text
  fastapi==0.111.0
  uvicorn==0.30.1
  kokoro-onnx==0.5.0
  soundfile==0.12.1
  httpx==0.27.0
  pytest==8.2.2
  ```

- [ ] **Step 2: Write the failing backend test**
  Create `backend/test_main.py` to test the `/api/tts` endpoint and model download.
  ```python
  import os
  from fastapi.testclient import TestClient
  import pytest

  # We will import the app from main
  from main import app

  def test_tts_endpoint():
      # Verify endpoint returns audio/wav stream by running within the client's lifespan context manager
      with TestClient(app) as client:
          response = client.post("/api/tts", json={"text": "Hello world", "voice": "af_bella"})
          assert response.status_code == 200
          assert response.headers["content-type"] == "audio/wav"
          assert len(response.content) > 0
  ```

- [ ] **Step 3: Run the test to verify it fails**
  Run: `pytest backend/test_main.py`
  Expected: FAIL with ModuleNotFoundError or import error (since `backend/main.py` does not exist).

- [ ] **Step 4: Write implementation for FastAPI and Kokoro download**
  Create `backend/main.py` to auto-download model files and expose `/api/tts`.
  ```python
  import os
  import urllib.request
  from fastapi import FastAPI, HTTPException
  from fastapi.middleware.cors import CORSMiddleware
  from fastapi.responses import StreamingResponse
  import io
  import soundfile as sf
  from kokoro_onnx import Kokoro
  from pydantic import BaseModel

  app = FastAPI()

  app.add_middleware(
      CORSMiddleware,
      allow_origins=["*"],
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )

  MODEL_URL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx"
  VOICES_URL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin"
  MODEL_PATH = "kokoro-v1.0.onnx"
  VOICES_PATH = "voices-v1.0.bin"

  def download_file(url, path):
      if not os.path.exists(path):
          print(f"Downloading {path} from {url}...")
          urllib.request.urlretrieve(url, path)
          print(f"Finished downloading {path}.")

  # Ensure model files are present on startup
  @app.on_event("startup")
  def startup_event():
      download_file(MODEL_URL, MODEL_PATH)
      download_file(VOICES_URL, VOICES_PATH)
      global kokoro
      kokoro = Kokoro(MODEL_PATH, VOICES_PATH)

  class TTSRequest(BaseModel):
      text: str
      voice: str = "af_bella"
      speed: float = 1.0

  @app.post("/api/tts")
  async def tts(req: TTSRequest):
      try:
          if not req.text.strip():
              raise HTTPException(status_code=400, detail="Text cannot be empty")
          
          # Generate audio using kokoro-onnx
          samples, sample_rate = kokoro.create(req.text, voice=req.voice, speed=req.speed)
          
          # Write to WAV buffer in memory
          wav_buffer = io.BytesIO()
          sf.write(wav_buffer, samples, sample_rate, format='WAV', subtype='PCM_16')
          wav_buffer.seek(0)
          
          return StreamingResponse(wav_buffer, media_type="audio/wav")
      except Exception as e:
          raise HTTPException(status_code=500, detail=str(e))

  if __name__ == "__main__":
      import uvicorn
      uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
  ```

- [ ] **Step 5: Run tests and verify they pass**
  Run: `python3 -m venv backend/venv && source backend/venv/bin/activate && pip install -r backend/requirements.txt && pytest backend/test_main.py`
  Expected: PASS (This may take a moment on the first run as it downloads the 330MB ONNX model and 22MB voices files).

- [ ] **Step 6: Commit**
  ```bash
  git add backend/requirements.txt backend/main.py backend/test_main.py
  git commit -m "feat(backend): implement local Kokoro-ONNX FastAPI backend with auto-download"
  ```

---

### Task 2: Initialize Next.js App with React Three Fiber

**Files:**
- Create: `package.json`
- Create: `next.config.js`
- Create: `app/layout.js`
- Create: `app/page.js`
- Create: `components/AvatarScene.js`

**Interfaces:**
- Produces: 3D canvas viewport loaded in React rendering a default 3D model with an idle animation loop.

- [ ] **Step 1: Create Next.js structure and install dependencies**
  Write `package.json` at root:
  ```json
  {
    "name": "siti-chan-3d-avatar",
    "version": "0.1.0",
    "private": true,
    "scripts": {
      "dev": "next dev",
      "build": "next build",
      "start": "next start",
      "lint": "next lint"
    },
    "dependencies": {
      "@react-three/drei": "^9.106.0",
      "@react-three/fiber": "^8.16.8",
      "lucide-react": "^0.395.0",
      "next": "14.2.3",
      "react": "^18.3.1",
      "react-dom": "^18.3.1",
      "three": "^0.165.0"
    }
  }
  ```

- [ ] **Step 2: Configure next.config.js**
  Create `next.config.js`:
  ```javascript
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    reactStrictMode: true,
    transpilePackages: ['three']
  }
  module.exports = nextConfig
  ```

- [ ] **Step 3: Create AvatarScene component**
  Write a stub for `components/AvatarScene.js` that renders a stylized 3D mannequin using R3F shapes as a fallback, and attempts to load a GLB avatar if supplied.
  ```javascript
  'use client';
  import { Canvas, useFrame } from '@react-three/fiber';
  import { OrbitControls, useGLTF } from '@react-three/drei';
  import { useRef, useState, useEffect } from 'react';
  import * as THREE from 'three';

  // Cute robot or anime mannequin mesh fallback
  function DummyAvatar({ jawOpen }) {
    const headRef = useRef();
    const jawRef = useRef();

    useFrame((state) => {
      // Idle animation (gentle float/breath)
      const t = state.clock.getElapsedTime();
      headRef.current.position.y = Math.sin(t * 1.5) * 0.05 + 1.5;
      // Animate jaw open based on jawOpen prop
      if (jawRef.current) {
        jawRef.current.scale.y = 1 + jawOpen * 1.5;
      }
    });

    return (
      <group ref={headRef} position={[0, 1.5, 0]}>
        {/* Head */}
        <mesh>
          <sphereGeometry args={[0.3, 32, 32]} />
          <meshStandardMaterial color="#ffc0cb" roughness={0.3} />
        </mesh>
        {/* Eyes */}
        <mesh position={[-0.1, 0.1, 0.25]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
        <mesh position={[0.1, 0.1, 0.25]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
        {/* Mouth/Jaw */}
        <mesh ref={jawRef} position={[0, -0.1, 0.25]}>
          <boxGeometry args={[0.1, 0.04, 0.05]} />
          <meshStandardMaterial color="#ff007f" />
        </mesh>
        {/* Body */}
        <mesh position={[0, -0.8, 0]}>
          <cylinderGeometry args={[0.2, 0.4, 0.8, 32]} />
          <meshStandardMaterial color="#4b0082" />
        </mesh>
      </group>
    );
  }

  // Loaded Avatar (supports standard blendshapes from Ready Player Me or standard GLBs)
  function RealAvatar({ url, jawOpen }) {
    const { scene } = useGLTF(url);
    const avatarRef = useRef();

    useFrame((state) => {
      const t = state.clock.getElapsedTime();
      
      // Idle breathing and head bobs
      scene.traverse((child) => {
        if (child.isMesh && child.morphTargetInfluences) {
          // Find standard morph targets
          const jawOpenIdx = child.morphTargetDictionary['jawOpen'] || child.morphTargetDictionary['mouthOpen'] || child.morphTargetDictionary['vowel_a'];
          if (jawOpenIdx !== undefined) {
            child.morphTargetInfluences[jawOpenIdx] = jawOpen;
          }
          
          // Random eye blinking
          const blinkIdx = child.morphTargetDictionary['eyeBlinkLeft'] || child.morphTargetDictionary['eyesClosed'];
          if (blinkIdx !== undefined) {
            const blinkValue = Math.sin(t * 3) > 0.98 ? 1 : 0;
            child.morphTargetInfluences[blinkIdx] = blinkValue;
            const blinkRightIdx = child.morphTargetDictionary['eyeBlinkRight'];
            if (blinkRightIdx !== undefined) child.morphTargetInfluences[blinkRightIdx] = blinkValue;
          }
        }
      });
    });

    return <primitive object={scene} ref={avatarRef} scale={1.8} position={[0, -1, 0]} />;
  }

  export default function AvatarScene({ avatarUrl, jawOpen }) {
    const [hasError, setHasError] = useState(false);

    return (
      <div className="w-full h-full min-h-[400px] relative">
        <Canvas camera={{ position: [0, 1.5, 2.5], fov: 45 }}>
          <ambientLight intensity={1.5} />
          <directionalLight position={[2, 4, 3]} intensity={1.5} />
          <pointLight position={[-2, 1, 1]} intensity={0.5} />
          
          {avatarUrl && !hasError ? (
            <group onError={() => setHasError(true)}>
              <RealAvatar url={avatarUrl} jawOpen={jawOpen} />
            </group>
          ) : (
            <DummyAvatar jawOpen={jawOpen} />
          )}
          
          <OrbitControls enableZoom={true} minDistance={1} maxDistance={5} target={[0, 1.4, 0]} />
        </Canvas>
      </div>
    );
  }
  ```

- [ ] **Step 4: Create layout and root page stubs**
  Create `app/layout.js`:
  ```javascript
  import './globals.css';
  export const metadata = {
    title: 'Siti-Chan: 3D Talking AI Companion',
    description: 'Interactive 3D avatar powered by DeepSeek and local Kokoro TTS.',
  };
  export default function RootLayout({ children }) {
    return (
      <html lang="id">
        <body>{children}</body>
      </html>
    );
  }
  ```

  Create `app/page.js` rendering the scene:
  ```javascript
  'use client';
  import { useState } from 'react';
  import AvatarScene from '../components/AvatarScene';

  export default function Home() {
    const [jawOpen, setJawOpen] = useState(0);
    // ReadyPlayerMe stylized cute avatar URL (fallback dummy avatar handles failures gracefully)
    const [avatarUrl, setAvatarUrl] = useState('https://models.readyplayer.me/64a2e88a0e8d0e5138241416.glb');

    return (
      <main className="flex min-h-screen flex-col items-center justify-between p-4 bg-slate-950 text-white">
        <div className="w-full max-w-4xl h-[500px] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800">
          <AvatarScene avatarUrl={avatarUrl} jawOpen={jawOpen} />
        </div>
      </main>
    );
  }
  ```

- [ ] **Step 5: Run development server and verify rendering**
  Run: `npm install && npm run build`
  Expected: Build succeeds without React compilation errors.

- [ ] **Step 6: Commit**
  ```bash
  git add package.json next.config.js app/layout.js app/page.js components/AvatarScene.js
  git commit -m "feat(frontend): initialize Next.js app with React Three Fiber 3D scene"
  ```

---

### Task 3: DeepSeek Chat API Proxy in Next.js

**Files:**
- Create: `app/api/chat/route.js`
- Create: `.env.local`

**Interfaces:**
- Consumes: HTTP POST request containing `{ messages: Array }`
- Produces: JSON response `{ text: str }` containing DeepSeek chat response.

- [ ] **Step 1: Set up environment variables file**
  Create `.env.local`:
  ```env
  DEEPSEEK_API_KEY=your_deepseek_api_key_here
  ```

- [ ] **Step 2: Implement route handler for DeepSeek API**
  Write `app/api/chat/route.js` calling official DeepSeek endpoint:
  ```javascript
  import { NextResponse } from 'next/server';

  export async function POST(req) {
    try {
      const { messages } = await req.json();
      const apiKey = process.env.DEEPSEEK_API_KEY;

      if (!apiKey || apiKey === 'your_deepseek_api_key_here') {
        return NextResponse.json({ error: 'DeepSeek API Key is missing or invalid. Please check your env file.' }, { status: 400 });
      }

      // Add specialized system prompt to make AI act like a cute anime companion
      const formattedMessages = [
        {
          role: 'system',
          content: 'Kamu adalah Siti-Chan, seorang asisten virtual AI berwujud gadis anime imut berumur 18 tahun. Sifatmu ceria, ramah, senang menolong, dan menggunakan ekspresi imut bahasa Indonesia (seperti memakai akhiran ~ atau kata "kak", "ya!"). Jawablah dengan singkat dan padat (maksimal 2-3 kalimat saja) agar nyaman didengar dalam format percakapan suara.'
        },
        ...messages
      ];

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: formattedMessages,
          temperature: 0.7,
          max_tokens: 150
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        return NextResponse.json({ error: `DeepSeek API returned error: ${errorData}` }, { status: response.status });
      }

      const data = await response.json();
      const textResponse = data.choices[0].message.content;

      return NextResponse.json({ text: textResponse });
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
  ```

- [ ] **Step 3: Verify endpoint returns mock/error if unauthorized**
  Run: `npm run dev` in background and send request using curl:
  `curl -X POST -H "Content-Type: application/json" -d '{"messages": [{"role": "user", "content": "Halo"}]}' http://localhost:3000/api/chat`
  Expected: Returns HTTP 400 with API Key error (if not set yet).

- [ ] **Step 4: Commit**
  ```bash
  git add app/api/chat/route.js
  git commit -m "feat(api): add Next.js DeepSeek Chat API proxy route with anime system prompt"
  ```

---

### Task 4: Voice Input (STT) and Chat Logic

**Files:**
- Create: `components/ChatConsole.js`
- Modify: `app/page.js`

**Interfaces:**
- Consumes: Browser Web Speech API (`webkitSpeechRecognition`) for voice capture.
- Produces: Chat console capturing voice input, showing chat messages, and handling AI responses.

- [ ] **Step 1: Create ChatConsole component**
  Write `components/ChatConsole.js`:
  ```javascript
  'use client';
  import { useState, useEffect, useRef } from 'react';
  import { Mic, MicOff, Send, Settings, Volume2 } from 'lucide-react';

  export default function ChatConsole({ onSendMessage, messages, isThinking, isListening, toggleListening, voiceOptions, currentVoice, onChangeVoice, customAvatarUrl, setCustomAvatarUrl }) {
    const [inputText, setInputText] = useState('');
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
      <div className="flex flex-col h-full bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Settings bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h1 className="font-semibold tracking-wide text-cyan-400 text-sm">Siti-Chan AI</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Voice Select */}
            <select 
              value={currentVoice} 
              onChange={(e) => onChangeVoice(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none"
            >
              {voiceOptions.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Avatar URL Field */}
        <div className="px-4 py-2 bg-slate-950/30 border-b border-slate-850 flex gap-2 items-center text-xs">
          <label className="text-slate-400 whitespace-nowrap">RPM Avatar URL:</label>
          <input 
            type="text" 
            value={customAvatarUrl} 
            onChange={(e) => setCustomAvatarUrl(e.target.value)}
            placeholder="Paste Ready Player Me GLB URL"
            className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-slate-300 focus:outline-none focus:border-cyan-500 overflow-ellipsis"
          />
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[250px]">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-md ${
                msg.role === 'user' 
                  ? 'bg-cyan-600/90 text-white rounded-br-none' 
                  : 'bg-slate-800/90 text-slate-100 rounded-bl-none border border-slate-700/50'
              }`}>
                <p className="leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
          {isThinking && (
            <div className="flex justify-start">
              <div className="bg-slate-800/90 border border-slate-700/50 rounded-2xl rounded-bl-none px-4 py-3 text-sm flex gap-1.5 items-center">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Form and Controls */}
        <form onSubmit={handleSubmit} className="p-4 bg-slate-950/80 border-t border-slate-800 flex gap-3 items-center">
          <button
            type="button"
            onClick={toggleListening}
            className={`p-3.5 rounded-full transition-all duration-300 relative ${
              isListening 
                ? 'bg-red-500/20 text-red-500 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse' 
                : 'bg-slate-850 hover:bg-slate-800 text-cyan-400 border border-slate-700'
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
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50 placeholder:text-slate-500 transition-colors"
          />
          
          <button
            type="submit"
            disabled={!inputText.trim() || isThinking || isListening}
            className="p-3.5 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 rounded-xl transition-all duration-200"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    );
  }
  ```

- [ ] **Step 2: Integrate chat state and voice input logic in main page**
  Modify `app/page.js` to manage conversation and include `webkitSpeechRecognition` hooks.
  ```javascript
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
    const [currentVoice, setCurrentVoice] = useState('af_bella');
    const [avatarUrl, setAvatarUrl] = useState('https://models.readyplayer.me/64a2e88a0e8d0e5138241416.glb');
    
    const recognitionRef = useRef(null);
    const voiceOptions = ['af_bella', 'af_sarah', 'am_adam', 'am_michael'];

    useEffect(() => {
      // Initialize speech recognition in browser
      if (typeof window !== 'undefined') {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
          const rec = new SpeechRecognition();
          rec.continuous = false;
          rec.interimResults = false;
          rec.lang = 'id-ID'; // Set input to Indonesian

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
        recognitionRef.current.start();
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
          body: JSON.stringify({ messages: newMessages.filter(m => m.role !== 'system') })
        });
        
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        setMessages(prev => [...prev, { role: 'assistant', content: data.text }]);
        
        // Trigger speech synthesis (will implement in Task 5)
        speakText(data.text);
      } catch (err) {
        console.error(err);
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
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
          <div className="flex-1 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 relative min-h-[300px]">
            <AvatarScene avatarUrl={avatarUrl} jawOpen={jawOpen} />
          </div>
          <div className="w-full md:w-[450px]">
            <ChatConsole
              messages={messages}
              isThinking={isThinking}
              isListening={isListening}
              toggleListening={toggleListening}
              voiceOptions={voiceOptions}
              currentVoice={currentVoice}
              onChangeVoice={setCurrentVoice}
              customAvatarUrl={avatarUrl}
              setCustomAvatarUrl={setAvatarUrl}
              onSendMessage={handleSendMessage}
            />
          </div>
        </div>
      </main>
    );
  }
  ```

- [ ] **Step 3: Verify UI layout and inputs**
  Run: `npm run build`
  Expected: Build succeeds without React compilation errors.

- [ ] **Step 4: Commit**
  ```bash
  git add components/ChatConsole.js app/page.js
  git commit -m "feat(frontend): create chat console component and wire speech recognition and user input flow"
  ```

---

### Task 5: Lip-Sync and Audio Playback

**Files:**
- Modify: `app/page.js`

**Interfaces:**
- Consumes: Audio WAV bytes from local FastAPI `/api/tts`
- Produces: Audio playback driven mouth movement blendshapes (`setJawOpen` updater).

- [ ] **Step 1: Implement web audio analyser and playback loop in app/page.js**
  Replace the stub `speakText` function in `app/page.js` with the real Web Audio API playback analyzer loop.
  ```javascript
  // Add this inside Home() in app/page.js:
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  const speakText = async (text) => {
    try {
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
  ```

- [ ] **Step 2: Verify compiling**
  Run: `npm run build`
  Expected: Successful production compile.

- [ ] **Step 3: Commit**
  ```bash
  git add app/page.js
  git commit -m "feat(lip-sync): implement audio analyser using Web Audio API to drive 3D mouth movements"
  ```

---

### Task 6: Premium Styling and Mobile Responsiveness

**Files:**
- Create: `app/globals.css`

**Interfaces:**
- Produces: Dark futuristic glow/glassmorphism design.

- [ ] **Step 1: Set up stylesheet globals.css**
  Create `app/globals.css` with a responsive design and styling classes.
  ```css
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');

  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  body {
    background-color: #020617;
    color: #f8fafc;
    font-family: 'Outfit', sans-serif;
    margin: 0;
    padding: 0;
  }

  /* Custom Glassmorphism Panels */
  .glass-panel {
    background: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  /* Glow styles */
  .neon-glow {
    box-shadow: 0 0 15px rgba(34, 211, 238, 0.3);
  }

  .neon-glow-red {
    box-shadow: 0 0 15px rgba(239, 68, 68, 0.45);
  }

  /* Thin scrollbar for chat history */
  ::-webkit-scrollbar {
    width: 6px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.2);
  }
  ```

- [ ] **Step 2: Add simple README.md**
  Create `README.md` at root with setup instructions.
  ```markdown
  # Siti-Chan: 3D Talking AI Companion

  Website interaktif karakter 3D anime yang bisa berbicara menggunakan kecerdasan buatan (DeepSeek LLM) dan suara lokal (Kokoro TTS).

  ## Prasyarat
  1. Node.js (versi 18+)
  2. Python (versi 3.10+)

  ## Langkah Instalasi & Menjalankan

  ### 1. Jalankan Backend (Kokoro TTS)
  ```bash
  # Pindah ke folder backend
  cd backend
  # Buat virtual environment
  python3 -m venv venv
  source venv/bin/activate
  # Install library pendukung
  pip install -r requirements.txt
  # Jalankan server FastAPI
  python main.py
  ```
  *Catatan: Pada saat pertama kali dijalankan, server akan mendownload model Kokoro-ONNX (sekitar 350MB). Tunggu hingga proses download selesai dan server berjalan di `http://localhost:8000`.*

  ### 2. Jalankan Frontend (Next.js)
  ```bash
  # Dari folder root proyek, buat file .env.local
  echo "DEEPSEEK_API_KEY=isi_dengan_api_key_anda" > .env.local

  # Install dependency frontend
  npm install
  # Jalankan Next.js dev server
  npm run dev
  ```
  Buka `http://localhost:3000` pada browser Chrome/Safari untuk mengobrol dengan Siti-Chan secara visual dan suara.
  ```

- [ ] **Step 3: Run final project build**
  Run: `npm run build`
  Expected: Successful compilation.

- [ ] **Step 4: Commit**
  ```bash
  git add app/globals.css README.md
  git commit -m "style(design): apply glassmorphism design and complete instructions in README.md"
  ```

---

## Verification Plan

### Automated Verification
- Verify backend works via: `pytest backend/test_main.py`
- Verify Next.js compilation works via: `npm run build`

### Manual Verification
1. Launch `python backend/main.py`.
2. Confirm both `kokoro-v0_19.onnx` and `voices.json` files download automatically and output:
   `Finished downloading kokoro-v0_19.onnx.`
3. Launch `npm run dev` and open `http://localhost:3000` in Google Chrome.
4. Input a text prompt like "Halo apa kabar?" and verify the avatar opens its mouth in sync with the spoken sound.
5. Tap the microphone icon, allow mic access, say a prompt, and verify speech recognition transcribes and triggers AI generation.
6. Verify layout is optimized for mobile by resizing screen width to <450px in developer console.
