import { getPipelineConfig, callDhruvaInference } from './bhashiniClient';
import { detectTextLanguage } from './tldService';

export interface ASRResult {
  text: string;
  language: string;
  success: boolean;
}

export const performASR = async (audioBase64: string, language: string = 'hi'): Promise<ASRResult> => {

  if (!audioBase64 || audioBase64.trim() === '') {
    return { text: '', language, success: false };
  }

  // Strip data-URL prefix if frontend accidentally left it
  const cleanAudio = audioBase64.replace(/^data:audio\/[a-zA-Z0-9.+-]+;base64,/, '');

  console.log(`[Bhashini ASR] Processing audio, length=${cleanAudio.length}, language=${language}`);

  try {
    const pipeline = await getPipelineConfig();
    const serviceId = pipeline.asr.get(language) || 'ai4bharat/conformer-multilingual-indo_aryan-gpu--t4';

    const result = await callDhruvaInference(
      'asr',
      {
        serviceId,
        language: { sourceLanguage: language },
        audioFormat: 'wav',
        samplingRate: 16000
      },
      {
        audio: [{ audioContent: cleanAudio }]
      }
    );

    const output = result?.pipelineResponse?.[0]?.output?.[0]?.source;
    if (output && output.trim()) {
      return { text: output.trim(), language, success: true };
    }

    // Bhashini returned empty — likely silence or very short audio
    return { text: '', language, success: false };
  } catch (error: any) {
    console.error('[ASR Service Error]', error.message);
    // Do NOT return fake text — let the caller know it genuinely failed
    return { text: '', language, success: false };
  }
};
