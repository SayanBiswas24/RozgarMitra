import React, { useState, useRef } from 'react';
import { processOCR, processTranslation } from '../services/api';
import { Upload, FileText, Loader2, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { LanguageSelector } from './LanguageSelector';

export const OCRPanel: React.FC = () => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState('');
  const [sourceLang, setSourceLang] = useState('hi');
  const [targetLang, setTargetLang] = useState('en');
  const [translatedText, setTranslatedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload a valid image file (JPEG, PNG, WebP).');
        return;
      }
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setImageBase64(result);
        setExtractedText('');
        setTranslatedText('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExtractText = async () => {
    if (!imageBase64) return;
    setIsProcessing(true);
    setError(null);
    try {
      const res = await processOCR(imageBase64, sourceLang);
      setExtractedText(res.text);
      setDetectedLanguage(res.detectedLanguage || sourceLang);
    } catch (err: any) {
      console.error(err);
      setError('OCR extraction failed. Please try another image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTranslateOCR = async () => {
    if (!extractedText.trim()) return;
    setIsTranslating(true);
    try {
      const res = await processTranslation(extractedText, 'hi', targetLang);
      setTranslatedText(res.translatedText);
    } catch (err: any) {
      console.error(err);
      setError('Translation failed.');
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span>Optical Character Recognition (OCR)</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
            Bhashini Vision
          </span>
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Upload documents or signs to extract multilingual text, detect Indian scripts, and translate into other languages.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Upload and Image Preview */}
        <div className="space-y-4">
          <LanguageSelector
            label="Document Language"
            value={sourceLang}
            onChange={setSourceLang}
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          {!imagePreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 hover:border-emerald-600 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-gray-50 hover:bg-emerald-50/40 transition-all min-h-[240px]"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-gray-800">Click to upload document or image</p>
              <p className="text-xs text-gray-500 mt-1">Supports PNG, JPG, JPEG up to 10MB</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden border border-gray-200 max-h-[260px] flex items-center justify-center bg-gray-900">
                <img
                  src={imagePreview}
                  alt="Document Preview"
                  className="max-h-[260px] w-auto object-contain"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                >
                  Choose Different Image
                </button>
                <button
                  onClick={handleExtractText}
                  disabled={isProcessing}
                  className="flex-1 text-xs font-semibold bg-[#178A4A] text-white px-4 py-1.5 rounded-lg hover:bg-[#0F6B38] transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                  {isProcessing ? 'Extracting Text...' : 'Extract Text with OCR'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Extracted Text and Translation */}
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/60 min-h-[200px] flex flex-col">
            <div className="flex items-center justify-between border-b pb-2 mb-2 text-xs font-semibold text-gray-700">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-700" /> Extracted Text:
              </span>
              {detectedLanguage && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px]">
                  Language: {detectedLanguage}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto text-sm text-gray-900">
              {isProcessing ? (
                <div className="flex items-center justify-center h-32 text-gray-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                  <span>Processing document OCR...</span>
                </div>
              ) : extractedText ? (
                <p className="whitespace-pre-line font-medium leading-relaxed">{extractedText}</p>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-xs italic">
                  <ImageIcon className="w-8 h-8 mb-1 opacity-40" />
                  Upload an image and click "Extract Text"
                </div>
              )}
            </div>
          </div>

          {/* Optional Translation for Extracted Text */}
          {extractedText && (
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <LanguageSelector
                    label="Translate Extracted Text To:"
                    value={targetLang}
                    onChange={setTargetLang}
                  />
                </div>
                <button
                  onClick={handleTranslateOCR}
                  disabled={isTranslating}
                  className="self-end px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-800 transition-all flex items-center gap-1 shadow-sm disabled:opacity-50"
                >
                  {isTranslating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  Translate
                </button>
              </div>

              {translatedText && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs text-gray-900 leading-relaxed font-medium">
                  <span className="font-bold text-emerald-900 block mb-1">Translated Output:</span>
                  {translatedText}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
          {error}
        </div>
      )}
    </div>
  );
};
