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
        # Custom user agent to avoid blockage
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}
        )
        with urllib.request.urlopen(req) as response, open(path, 'wb') as out_file:
            data = response.read()
            out_file.write(data)
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
    lang_code: str = "a"

@app.post("/api/tts")
async def tts(req: TTSRequest):
    try:
        if not req.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        # Map short language codes to standard espeak locales
        lang = req.lang_code.lower()
        if lang == "a":
            lang = "en-us"
        elif lang == "b":
            lang = "en-gb"
        elif lang == "j":
            lang = "ja"
        elif lang == "z":
            lang = "zh"

        # Generate audio using kokoro-onnx with voice, speed, and language code
        samples, sample_rate = kokoro.create(
            req.text, 
            voice=req.voice, 
            speed=req.speed, 
            lang=lang
        )
        
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
