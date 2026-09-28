import { getPipelineConfig, callDhruvaInference } from './bhashiniClient';
import { detectTextLanguage } from './tldService';

export interface OCRResult {
  text: string;
  detectedLanguage: string;
  languageCode: string;
  success: boolean;
}

export const performOCR = async (imageBase64: string, languageHint: string = 'hi'): Promise<OCRResult> => {
  if (!imageBase64 || imageBase64.trim() === '') {
    throw new Error('Image data is required for OCR');
  }

  const cleanImage = imageBase64.replace(/^data:image\/[a-zA-Z0-9]+;base64,/, '');
  console.log(`[Bhashini OCR] Processing image length=${cleanImage.length}, languageHint=${languageHint}`);

  try {
    const pipeline = await getPipelineConfig();
    const serviceId = pipeline.ocr.get(languageHint) || 'bhashini/bodhan/indic-doc/ocr';

    const result = await callDhruvaInference(
      'ocr',
      {
        serviceId,
        language: {
          sourceLanguage: languageHint
        }
      },
      {
        image: [
          {
            imageContent: cleanImage
          }
        ]
      }
    );

    console.log('[Bhashini OCR] Raw Result keys:', Object.keys(result || {}));

    let extractedText = '';
    if (result?.pipelineResponse && Array.isArray(result.pipelineResponse)) {
      const output = result.pipelineResponse[0]?.output;
      if (output && Array.isArray(output) && output.length > 0) {
        // Collect all sources from the array to prevent flattening to just the first line
        const sources = output.map((o: any) => {
          if (typeof o.source === 'string') return o.source;
          if (typeof o.source === 'object' && o.source !== null) return JSON.stringify(o.source);
          return '';
        }).filter(Boolean);
        extractedText = sources.join('\n');
      }
    }

    if (extractedText) {
      const detected = detectTextLanguage(extractedText);
      return {
        text: extractedText,
        detectedLanguage: detected.language,
        languageCode: detected.code,
        success: true
      };
    }
  } catch (error: any) {
    console.warn('[Bhashini OCR] Direct API failed:', error.message);
  }

  // Use Tesseract as a robust fallback
  try {
    console.log(`[OCR] Using Tesseract fallback for language: ${languageHint}`);
    const { createWorker } = require('tesseract.js');
    
    const langMap: Record<string, string> = {
      hi: 'hin',
      en: 'eng',
      mr: 'mar',
      bn: 'ben',
      ta: 'tam',
      te: 'tel',
      gu: 'guj',
      kn: 'kan',
      ml: 'mal',
      pa: 'pan'
    };
    const tesseractLang = langMap[languageHint] || 'eng';
    
    const worker = await createWorker(tesseractLang);
    const ret = await worker.recognize(`data:image/jpeg;base64,${cleanImage}`);
    await worker.terminate();

    const words = ret.data.words || [];
    let reconstructedText = ret.data.text ? ret.data.text.trim() : '';

    if (words.length > 0) {
      words.sort((a: any, b: any) => a.bbox.y0 - b.bbox.y0);
      
      const lines: any[][] = [];
      let currentLine: any[] = [];
      let currentY = -1;
      let threshold = 10;
      
      for (const word of words) {
        if (currentLine.length === 0) {
          currentLine.push(word);
          currentY = word.bbox.y0;
          threshold = Math.max(5, (word.bbox.y1 - word.bbox.y0) * 0.5);
        } else {
          if (Math.abs(word.bbox.y0 - currentY) <= threshold) {
            currentLine.push(word);
          } else {
            lines.push(currentLine);
            currentLine = [word];
            currentY = word.bbox.y0;
            threshold = Math.max(5, (word.bbox.y1 - word.bbox.y0) * 0.5);
          }
        }
      }
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
      
      const orderedLines = lines.map(line => {
        line.sort((a, b) => a.bbox.x0 - b.bbox.x0);
        return line.map(w => w.text).join(' ');
      });
      
      reconstructedText = orderedLines.join('\n');
    }

    if (reconstructedText) {
      const detected = detectTextLanguage(reconstructedText);
      return {
        text: reconstructedText,
        detectedLanguage: detected.language,
        languageCode: detected.code,
        success: true
      };
    }
  } catch (tesseractError: any) {
    console.error('[OCR] Tesseract fallback failed:', tesseractError.message);
  }

  return {
    text: '',
    detectedLanguage: languageHint,
    languageCode: languageHint,
    success: false
  };
};
