# Siti-Chan: 3D Talking AI Companion

Website interaktif karakter 3D anime yang bisa berbicara menggunakan kecerdasan buatan (DeepSeek LLM) dan suara lokal (Kokoro TTS).

## Prasyarat
1. Node.js (versi 18+)
2. Python (versi 3.10 hingga 3.12 direkomendasikan)
3. Pyenv (opsional, jika Anda ingin menyamakan versi Python)

## Langkah Instalasi & Menjalankan

### 1. Jalankan Backend (Kokoro TTS)
```bash
# Masuk ke folder backend
cd backend

# Buat virtual environment
python3 -m venv venv
source venv/bin/activate

# Install library pendukung
pip install -r requirements.txt

# Jalankan server FastAPI
python main.py
```
*Catatan: Pada saat pertama kali dijalankan, server akan mengunduh model ONNX Kokoro-v1.0 (sekitar 310MB) dan voices-v1.0.bin (sekitar 22MB) secara otomatis ke dalam folder `backend/`. Tunggu hingga proses unduhan selesai dan muncul pesan bahwa server FastAPI berjalan di `http://localhost:8000`.*

### 2. Jalankan Frontend (Next.js)
Dari folder root proyek (`siti-chan`), buka terminal baru lalu jalankan perintah berikut:

```bash
# Buat file .env.local untuk menyimpan API Key DeepSeek Anda
echo "DEEPSEEK_API_KEY=isi_dengan_api_key_anda" > .env.local

# Install dependency frontend
npm install

# Jalankan Next.js dev server
npm run dev
```

Buka `http://localhost:3000` di Google Chrome atau Safari.

## Cara Menggunakan
1. **Chat melalui Teks**: Ketik di kolom input teks bagian bawah kanan, lalu klik tombol kirim atau tekan Enter.
2. **Chat melalui Suara (Voice Input)**: Klik tombol Mikrofon bulat di bawah kanan (akan berkedip merah), katakan pesan Anda, dan sistem akan mengirimkannya secara otomatis setelah Anda selesai berbicara.
3. **Pengaturan Karakter**: Klik tombol Gerigi di pojok kanan atas panel chat untuk membuka opsi pengaturan:
   - **Ganti Model 3D**: Anda dapat menempelkan URL avatar GLB Ready Player Me Anda sendiri.
   - **Ganti Suara**: Tersedia opsi suara wanita (`af_bella`, `af_sarah`) dan pria (`am_adam`, `am_michael`).
   - **Custom API Key**: Jika Anda tidak menyetel `DEEPSEEK_API_KEY` di file `.env.local`, Anda bisa memasukkannya langsung secara aman melalui UI panel pengaturan ini (disimpan di browser Anda).
