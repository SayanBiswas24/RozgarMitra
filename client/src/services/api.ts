import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 60000 // 60s — ASR+Agent+TTS pipeline can take a while
});

// --- ASR ---
export interface ASRResponse {
  success: boolean;
  text: string;
  language: string;
  detectedLanguage?: string;
  confidence?: number;
  message?: string;
}

export const processASR = async (audioBase64: string, language: string = 'hi'): Promise<ASRResponse> => {
  const response = await api.post('/asr', { audio: audioBase64, language });
  return response.data;
};

// --- Agent ---
export interface AgentResponse {
  success: boolean;
  text: string;
  language: string;
  audioContent?: string;
}

export const processAgent = async (
  text: string,
  language: string = 'hi',
  outputLanguage: string = 'hi',
  conversationHistory: any[] = []
): Promise<AgentResponse> => {
  const response = await api.post('/agent', { text, language, outputLanguage, conversationHistory });
  return response.data;
};

// --- TTS ---
export interface TTSResponse {
  success: boolean;
  audioContent: string;
  format: string;
}

export const processTTS = async (text: string, language: string = 'hi', gender: string = 'female'): Promise<TTSResponse> => {
  const response = await api.post('/tts', { text, language, gender });
  return response.data;
};

// --- Translation ---
export const processTranslation = async (
  text: string,
  sourceLanguage: string = 'hi',
  targetLanguage: string = 'en'
) => {
  const response = await api.post('/translate', { text, sourceLanguage, targetLanguage });
  return response.data;
};

// --- OCR ---
export const processOCR = async (
  imageBase64: string,
  language: string = 'hi',
  targetLanguage?: string
) => {
  const response = await api.post('/ocr', { image: imageBase64, language, targetLanguage });
  return response.data;
};

// --- Transliteration ---
export const processTransliterate = async (text: string, sourceLanguage: string = 'hi') => {
  const response = await api.post('/transliterate', { text, sourceLanguage });
  return response.data;
};

// --- Status ---
export const getApiStatus = async () => {
  const response = await api.get('/status');
  return response.data;
};

export default api;
