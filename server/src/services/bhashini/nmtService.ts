import { getPipelineConfig, callDhruvaInference } from './bhashiniClient';
import { detectTextLanguage } from './tldService';

export interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  success: boolean;
}

export const performTranslation = async (
  text: string,
  sourceLanguage: string = 'hi',
  targetLanguage: string = 'en'
): Promise<TranslationResult> => {
  if (!text || text.trim() === '') {
    return {
      translatedText: '',
      sourceLanguage,
      targetLanguage,
      success: true
    };
  }



  if (sourceLanguage === targetLanguage) {
    return {
      translatedText: text,
      sourceLanguage,
      targetLanguage,
      success: true
    };
  }

  console.log(`[Bhashini NMT] Translating "${text.slice(0, 30)}..." from [${sourceLanguage}] to [${targetLanguage}]`);

  try {
    const pipeline = await getPipelineConfig();
    const serviceId = pipeline.translation.get(`${sourceLanguage}-${targetLanguage}`) || 'ai4bharat/indictrans-v2-all-gpu--t4';

    const result = await callDhruvaInference(
      'translation',
      {
        serviceId,
        language: {
          sourceLanguage,
          targetLanguage
        }
      },
      {
        input: [
          {
            source: text
          }
        ]
      }
    );

    const targetOutput = result?.pipelineResponse?.[0]?.output?.[0]?.target;
    if (targetOutput) {
      return {
        translatedText: targetOutput,
        sourceLanguage,
        targetLanguage,
        success: true
      };
    }

    throw new Error('No translated text returned from Bhashini NMT');
  } catch (error: any) {
    console.error('[NMT Service Error]', error.message);
    return {
      translatedText: text, // Graceful fallback
      sourceLanguage,
      targetLanguage,
      success: false
    };
  }
};
