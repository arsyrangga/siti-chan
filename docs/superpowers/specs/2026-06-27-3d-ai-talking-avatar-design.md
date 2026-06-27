# Design Specification: 3D AI Talking Avatar Website

This document specifies the architecture, design, and implementation plan for a web application featuring an interactive 3D anime-style talking character powered by DeepSeek AI (LLM) and Kokoro-82M TTS (local Text-to-Speech), with support for both text and voice inputs.

## 1. Goal & Requirements
- **Interactive 3D Avatar**: A cute anime-style 3D avatar rendered in the browser.
- **AI Chat Integration**: Powered by the official DeepSeek API.
- **Local Text-to-Speech (TTS)**: Voice generation powered by Kokoro-82M TTS model running locally.
- **Voice & Text Inputs**: Text chatting or direct speech input (Web Speech API).
- **Lip-Sync**: Real-time mouth movements driven by playing audio amplitude (Web Audio API).
- **Responsive Design**: Fully mobile-responsive interface with premium dark-mode visuals (glassmorphism/neon highlights).

---

## 2. Technical Architecture

The system uses a decoupled hybrid architecture:

```
                  +----------------------------------------------+
                  |                  BROWSER                     |
                  |                                              |
                  |  +--------------------+                      |
                  |  | Web Speech API     | (Speech-to-Text)     |
                  |  +---------+----------+                      |
                  |            |                                 |
                  |            v                                 |
                  |  +--------------------+                      |
                  |  | Chat Interface (UI)|                      |
                  |  +----+----------^----+                      |
                  |       |          |                           |
                  |       |          +-----+ (Audio Playback     |
                  |       |                |  & Lip Sync)        |
                  |       v                |                     |
                  |  +----+----------+     |                     |
                  |  | R3F 3D Canvas |     |                     |
                  |  +---------------+     |                     |
                  +-------|----------------|---------------------+
                          |                |
      (HTTP POST /api/chat)                | (HTTP POST /api/tts)
                          v                |
                  +-------v----------------+---------------------+
                  |           NEXT.JS BACKEND (Node.js)          |
                  |                                              |
                  |  +--------------------+                      |
                  |  | Chat API Route     |                      |
                  |  +---------+----------+                      |
                  |            |                                 |
                  +------------|---------------------------------+
                               | (HTTP POST)
                               v
                  +------------v-----------+     +---------------+
                  | DeepSeek Chat API      |     |  PYTHON TTS   |
                  | (Official API)         |     | MICROSERVICE  |
                  +------------------------+     | (FastAPI)     |
                                                 |               |
                                                 | /api/tts      |
                                                 | (kokoro-onnx) |
                                                 +---------------+
```

### Components:
1. **Frontend (Next.js)**: Runs on `http://localhost:3000`. Renders the UI, initiates Web Speech API for voice recording, interacts with Next.js `/api/chat` route, and feeds resulting TTS audio into a Web Audio API analyzer to drive the 3D character's morph targets.
2. **Next.js API Route**: Securely handles the DeepSeek API key stored in `.env.local` and formats conversations before sending them to the DeepSeek API endpoint.
3. **TTS Microservice (Python FastAPI)**: Runs on `http://localhost:8000`. Exposes `/api/tts` which receives the text response, runs the local Kokoro ONNX model, and streams back the synthesized WAV audio.

---

## 3. Detailed Component Specs

### A. Next.js Frontend
- **3D Render Scene**: Uses `@react-three/fiber` and `@react-three/drei`.
- **Character Model**: A cute anime character loaded from a GLB file. The model must have facial blendshapes (morph targets) such as `jawOpen`, `mouthOpen`, or vowel blendshapes (`mouth_a`, `mouth_i`, `mouth_u`, `mouth_e`, `mouth_o`).
- **Animations**:
  - *Idle Loop*: Standard human breathing (slight chest/shoulder rise, head bob) and random eye-blinking.
  - *Thinking*: Eyes look up-right or head tilts slightly during API calls.
  - *Speaking*: Mouth morph target weights dynamically modified via an audio `AnalyserNode` connected to the playing audio source.
- **Audio Analyser Logic**:
  ```javascript
  const audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  
  // In the render loop (useFrame):
  analyser.getByteFrequencyData(dataArray);
  const averageVolume = dataArray.reduce((a, b) => a + b) / dataArray.length;
  const mouthOpening = Math.min(1, averageVolume / 128); // Map to [0, 1]
  
  // Apply to mesh morph target:
  mesh.morphTargetInfluences[jawOpenIndex] = mouthOpening;
  ```

### B. Python FastAPI TTS Backend
- **Library**: `kokoro-onnx` utilizing `onnxruntime` (CPU or GPU).
- **Auto-Download Setup**: On startup, checks for `kokoro-v0_19.onnx` and `voices.json`. If missing, downloads them from Hugging Face:
  - Model: `https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/kokoro-v0_19.onnx`
  - Voices: `https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/voices.json`
- **TTS Endpoint**: `/api/tts`
  - Receives json: `{ "text": "...", "voice": "af_bella", "speed": 1.0 }`
  - Synthesizes audio using `kokoro-onnx` as raw floats, uses `soundfile` to convert floats to WAV format bytes, and returns a StreamingResponse with `audio/wav`.

---

## 4. UI/UX Design System
- **Theme**: Dark Mode with neon cyan/magenta/violet borders, glowing buttons, and frosted-glass panels (`backdrop-filter: blur(12px)`).
- **Layout**:
  - Desktop: Left 60% = 3D viewport canvas; Right 40% = Scrollable Chat Console with collapsible settings.
  - Mobile: Top 50% = 3D viewport canvas; Bottom 50% = Chat Console.
- **Interactions**:
  - Floating Voice Input button: glows pulsing red when recording, showing standard SVG audio waves.
  - Custom Settings Panel: lets users adjust the volume, select voice (male/female), toggle mouse tracking, and input their DeepSeek API key directly if they want to override the default backend key.

---

## 5. Verification Plan
- **TTS Server Test**: Curl `/api/tts` with test text, checking if it generates a playable WAV.
- **DeepSeek Integration Test**: Test Next.js chat endpoint `/api/chat` using local API keys and check response structure.
- **3D Rendering & Animations**: Open browser, ensure avatar loads successfully, verify idle motion, check mouse tracking, and test speaking mouth animation during speech playback.
- **Mobile Responsiveness**: Test layout sizes in Chrome Device Mode simulating iPhone/Android screens.

---

## 6. Implementation Milestones
1. **Milestone 1**: Set up the Python FastAPI TTS backend with ONNX dependencies and the auto-download model script.
2. **Milestone 2**: Initialize the Next.js React project with React Three Fiber, loading a default cute anime 3D character with basic animations (idle, blink).
3. **Milestone 3**: Implement Next.js backend API routes to proxy DeepSeek chat queries.
4. **Milestone 4**: Connect the frontend speech recognition (STT) and text input to the DeepSeek API.
5. **Milestone 5**: Implement Web Audio API playback analyzer for real-time lip-sync driving the 3D morph targets.
6. **Milestone 6**: Apply premium CSS design (glassmorphism/mobile responsiveness/animations) and finalize verification.
