# Siti-Chan: 3D Talking AI Companion 🌸

Website interaktif karakter 3D anime yang bisa berbicara menggunakan kecerdasan buatan (DeepSeek LLM) dan suara lokal berkualitas tinggi berbasis PyTorch (**Kokoro-FastAPI**).

---

## 🚀 Fitur Utama
- **Interaksi 3D VRoid**: Avatar 3D responsif (`siti-chan.vrm`) dengan fov kamera dinamis, animasi berkedip, gerak tubuh santai, dan lip-sync (gerakan bibir) yang sinkron dengan audio suara.
- **DeepSeek Intelligence**: Chatbot cerdas yang merespons secara langsung (text streaming) dengan gaya kepribadian ceria anime.
- **Local TTS (Kokoro-FastAPI)**: Sintesis suara teks-ke-suara lokal berbasis PyTorch. Mendukung akselerasi GPU (MPS) pada macOS, suara yang terdengar sangat alami, serta kontrol kecepatan (`speed: 0.8`) dan model suara (`af_v0irulan`).
- **Input Suara (STT)**: Berbicara langsung menggunakan mikrofon Anda dengan fitur deteksi ucapan otomatis.

---

## 🛠️ Prasyarat Sistem
1. **Node.js**: Versi 18 ke atas.
2. **Python**: Versi 3.10 hingga 3.12 (disarankan menggunakan Python 3.12 untuk menghindari bug linker library Python 3.14 bawaan Homebrew macOS).
3. **eSpeak-ng**: Diperlukan untuk phonemization suara di backend Kokoro.
   - **macOS**: `brew install espeak`

---

## 💻 Langkah Instalasi & Menjalankan

### 1. Setup & Jalankan Backend (Kokoro-FastAPI)
Backend menggunakan fork PyTorch Kokoro yang cepat, kompatibel dengan OpenAI API format, dan mendukung akselerasi GPU lokal macOS.

```bash
# 1. Masuk ke direktori backend baru
cd backend/kokoro-fastapi

# 2. Buat virtual environment menggunakan Python 3.12
/Users/steradian/.pyenv/versions/3.12.13/bin/python3.12 -m venv venv

# 3. Aktifkan virtual environment
source venv/bin/activate

# 4. Install dependency backend secara lokal
pip install -e .

# 5. Unduh model weights Kokoro v1.0 (sekitar 340MB)
./venv/bin/python docker/scripts/download_model.py --output api/src/models/v1_0

# 6. Jalankan backend server menggunakan skrip startup
./start_backend.sh
```
*Catatan: Server uvicorn backend akan berjalan di `http://localhost:8880` dengan total 68 voice packs ter-load otomatis.*

---

### 2. Setup & Jalankan Frontend (Next.js)
Dari folder root proyek (`siti-chan`), jalankan perintah berikut:

```bash
# 1. Buat file konfig .env.local untuk API Key DeepSeek
echo "DEEPSEEK_API_KEY=sk-xxxx" > .env.local

# 2. Install dependency Next.js & R3F
npm install

# 3. Bersihkan cache & jalankan Next.js development server
rm -rf .next
npm run dev
```
*Aplikasi frontend akan terbuka secara otomatis di `http://localhost:3000`.*

---

## ⚙️ Detail Konfigurasi Tambahan

### Parameter Suara
Untuk hasil suara maksimal, frontend mengirim payload OpenAI standar ke port `8880` dengan konfigurasi:
- **Voice**: `af_v0irulan`
- **Speed**: `0.8`
- **Lang Code**: `a` (English - US)
- **Response Format**: `mp3`

### Posisi Kamera Canvas 3D
Posisi kamera Canvas diatur di [AvatarScene.js](file:///Users/steradian/terminal/ai/siti-chan/components/AvatarScene.js) agar tampilan terfokus secara pas di kepala dan bahu model VRM:
```javascript
camera={{ position: [0, 2.0, 5], fov: 35 }}
```
