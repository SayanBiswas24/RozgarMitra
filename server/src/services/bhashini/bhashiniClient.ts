import dotenv from 'dotenv';
dotenv.config();

interface PipelineConfigCache {
  asr: Map<string, string>; // lang -> serviceId
  translation: Map<string, string>; // source-target -> serviceId
  tts: Map<string, string>; // lang -> serviceId
  ocr: Map<string, string>;
  fetchedAt: number;
}

let cache: PipelineConfigCache | null = null;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export async function getPipelineConfig() {
  const now = Date.now();
  if (cache && (now - cache.fetchedAt < CACHE_TTL)) {
    return cache;
  }

  const userId = process.env.BHASHINI_USER_ID;
  const apiKey = process.env.BHASHINI_API_KEY;

  const newCache: PipelineConfigCache = {
    asr: new Map(),
    translation: new Map(),
    tts: new Map(),
    ocr: new Map(),
    fetchedAt: now
  };

  if (!userId || !apiKey) {
    console.warn('[Bhashini] Credentials missing, using default service IDs');
    return newCache;
  }

  try {
    const res = await fetch('https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'userID': userId,
        'apiKey': apiKey
      },
      body: JSON.stringify({
        pipelineTasks: [
          { taskType: 'asr' },
          { taskType: 'translation' },
          { taskType: 'tts' }
        ],
        pipelineRequestConfig: {
          pipelineId: '64392f96daac500b55c543cd'
        }
      })
    });

    if (res.ok) {
      const data = await res.json();
      (data.pipelineResponseConfig || []).forEach((c: any) => {
        const task = c.taskType;
        (c.config || []).forEach((cfg: any) => {
          const serviceId = cfg.serviceId;
          const lang = cfg.language?.sourceLanguage;
          const targetLang = cfg.language?.targetLanguage;

          if (task === 'asr' && lang) {
            newCache.asr.set(lang, serviceId);
          } else if (task === 'tts' && lang) {
            newCache.tts.set(lang, serviceId);
          } else if (task === 'translation' && lang && targetLang) {
            newCache.translation.set(`${lang}-${targetLang}`, serviceId);
          } else if (task === 'ocr' && lang) {
            newCache.ocr.set(lang, serviceId);
          }
        });
      });
      cache = newCache;
      console.log(`[Bhashini] Pipeline models discovered: ASR=${newCache.asr.size}, Translation=${newCache.translation.size}, TTS=${newCache.tts.size}`);
    } else {
      console.warn('[Bhashini] getModelsPipeline status:', res.status);
    }
  } catch (err: any) {
    console.error('[Bhashini] Failed to fetch pipeline config:', err.message);
  }

  return cache || newCache;
}

export async function callDhruvaInference(taskType: string, taskConfig: any, inputData: any) {
  const inferenceKey = process.env.BHASHINI_INFERENCE_API_KEY;
  if (!inferenceKey) {
    throw new Error('BHASHINI_INFERENCE_API_KEY is not set');
  }

  const payload = {
    pipelineTasks: [
      {
        taskType,
        config: taskConfig
      }
    ],
    inputData
  };

  const response = await fetch('https://dhruva-api.bhashini.gov.in/services/inference/pipeline', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': inferenceKey
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Bhashini Dhruva ${taskType} Error] Status: ${response.status}:`, errorText);
    throw new Error(`Bhashini API error (${response.status}): ${errorText}`);
  }

  return response.json();
}
