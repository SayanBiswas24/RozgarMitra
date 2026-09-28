import { getPipelineConfig, callDhruvaInference } from './bhashiniClient';

export interface TTSResult {
  audioContent: string; // base64
  format: string;
  success: boolean;
}

export const performTTS = async (
  text: string,
  language: string = 'hi',
  gender: string = 'female'
): Promise<TTSResult> => {
  if (!text || text.trim() === '') {
    throw new Error('Text is required for TTS');
  }

  console.log(`[Bhashini TTS] Converting text to speech for "${text.slice(0, 30)}..." in [${language}]`);

  try {
    const pipeline = await getPipelineConfig();
    
    let ttsLanguage = language;
    if (!pipeline.tts.has(language) && ['mai', 'bho', 'sat'].includes(language)) {
      console.log(`[Bhashini TTS] Language ${language} not natively supported by TTS. Falling back to Hindi (hi) engine to read text.`);
      ttsLanguage = 'hi';
    }

    const serviceId = pipeline.tts.get(ttsLanguage) || 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4';

    const result = await callDhruvaInference(
      'tts',
      {
        serviceId,
        language: {
          sourceLanguage: ttsLanguage
        },
        gender: gender || 'female'
      },
      {
        input: [
          {
            source: text
          }
        ]
      }
    );

    const audioBase64 = result?.pipelineResponse?.[0]?.audio?.[0]?.audioContent;
    if (audioBase64) {
      return {
        audioContent: audioBase64,
        format: 'wav',
        success: true
      };
    }

    throw new Error('No audioContent returned by Bhashini TTS');
  } catch (error: any) {
    console.error('[TTS Service Error]', error.message);
    return {
      audioContent: '',
      format: 'wav',
      success: false
    };
  }
};
