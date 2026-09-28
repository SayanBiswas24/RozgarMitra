# Bhashini Multilingual AI Voice Agent

A full-stack, production-grade Multilingual AI Voice Assistant web application powered by Government of India **Bhashini** APIs (ASR, NMT, TTS, ALD, TLD, Transliteration, OCR).

Built with **React 19**, **TypeScript**, **Tailwind CSS**, **Vite**, **Node.js**, and **Express**.

---

## 🏛️ Architecture & Security

```
[ Browser Client ]
  ├─ Real Microphone (MediaRecorder / Web Audio)
  ├─ Interactive Voice Agent Dashboard
  ├─ NMT Translation Panel & TTS Listen
  ├─ OCR Document Text Extraction Panel
  └─ Audio Playback (HTML5 Audio + Bhashini Base64 WAV)
          │
          │  /api/* (Protected Proxy)
          ▼
[ Node.js + Express Backend ]
  ├─ Config Cache & Pipeline Discovery (meity-auth.ulcacontrib.org)
  ├─ Inference Engine (dhruva-api.bhashini.gov.in)
  ├─ Modular Controllers & Services (ASR, TTS, NMT, OCR, ALD, TLD)
  ├─ AI Agent Orchestration Layer
  └─ Environment Variables (.env) — Keys NEVER exposed to frontend!
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** v18+ or v20+ or v24+
- Valid Bhashini credentials:
  - `BHASHINI_USER_ID`
  - `BHASHINI_API_KEY`
  - `BHASHINI_INFERENCE_API_KEY`

### 2. Backend Setup
```bash
cd server
npm install
```
Configure your `.env` file in `server/`:
```env
BHASHINI_USER_ID=your_user_id
BHASHINI_API_KEY=your_api_key
BHASHINI_INFERENCE_API_KEY=your_inference_api_key
PORT=5000
```
Run the backend server:
```bash
npx tsx watch src/server.ts
```
The server will start on `http://localhost:5000`.

### 3. Frontend Setup
```bash
cd client
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Testing the Features

### 1. Live Voice Agent (Talk Feature)
1. Ensure microphone permission is granted in your browser.
2. Select your spoken language (e.g., **Hindi**, **English**, **Marathi**, etc.).
3. Click the large central **Microphone Button** (turns red and shows "Listening...").
4. Speak into your microphone (e.g., *"मुझे पानी की समस्या की शिकायत करनी है"*).
5. Click the button again to stop recording.
6. The pipeline will execute:
   - **ASR**: Transcribes your spoken audio into text via Bhashini.
   - **ALD**: Detects language with confidence percentage.
   - **AI Agent**: Generates contextual response in your language.
   - **TTS**: Synthesizes speech with Bhashini's high quality voice model.
   - **Auto Playback**: Plays the assistant's voice reply automatically in your browser!

### 2. Neural Machine Translation (NMT)
1. Switch to the **Translation** tab at the top.
2. Select Source and Target languages (e.g., Hindi ➔ English).
3. Type any sentence or query and click **Translate**.
4. Click **Listen (TTS)** to hear the exact pronunciation synthesized by Bhashini TTS.

### 3. Optical Character Recognition (OCR)
1. Switch to the **Document OCR** tab.
2. Upload any image containing Indian or English text (signboards, notices, letters).
3. Click **Extract Text with OCR**.
4. View the extracted text and detected language, then translate it to any target language.

---

## 📦 API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/status` | Real-time connectivity & credential health check |
| `POST` | `/api/asr` | Automatic Speech Recognition (base64 audio ➔ text) |
| `POST` | `/api/ald` | Audio Language Detection |
| `POST` | `/api/translate` | Neural Machine Translation between 12+ Indian languages |
| `POST` | `/api/tts` | Text-to-Speech (text ➔ base64 WAV audio) |
| `POST` | `/api/tld` | Text Language Detection |
| `POST` | `/api/transliterate` | Devanagari / Indic to Latin transliteration |
| `POST` | `/api/ocr` | Optical Character Recognition for document images |
| `POST` | `/api/agent` | Multilingual AI Agent processing with automatic TTS |
