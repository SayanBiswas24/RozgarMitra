import React, { useState } from 'react';
import { processTranslation, processTTS } from '../services/api';
import { LanguageSelector } from './LanguageSelector';
import { ArrowRightLeft, Volume2, Loader2, Copy, Check } from 'lucide-react';

export const TranslationPanel: React.FC = () => {
  const [inputText, setInputText] = useState('मुझे सड़क की मरम्मत संबंधी शिकायत दर्ज करानी है।');
  const [sourceLang, setSourceLang] = useState('hi');
  const [targetLang, setTargetLang] = useState('en');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setIsTranslating(true);
    setError(null);
    try {
      const res = await processTranslation(inputText, sourceLang, targetLang);
      setTranslatedText(res.translatedText);
    } catch (err: any) {
      console.error(err);
      setError('Translation failed. Please check your network or try another language pair.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleListen = async (text: string, lang: string) => {
    if (!text.trim()) return;
    setIsPlayingAudio(true);
    try {
      const res = await processTTS(text, lang, 'female');
      if (res.audioContent) {
        const audio = new Audio(`data:audio/wav;base64,${res.audioContent}`);
        audio.onended = () => setIsPlayingAudio(false);
        audio.onerror = () => setIsPlayingAudio(false);
        await audio.play();
      } else {
        // Fallback to browser SpeechSynthesis
        const utter = new SpeechSynthesisUtterance(text);
        utter.onend = () => setIsPlayingAudio(false);
        window.speechSynthesis.speak(utter);
      }
    } catch (err) {
      console.error(err);
      setIsPlayingAudio(false);
    }
  };

  const swapLanguages = () => {
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
    setInputText(translatedText || inputText);
    setTranslatedText('');
  };

  const copyToClipboard = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span>Neural Machine Translation (NMT)</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
            Bhashini Powered
          </span>
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Translate text between 12+ official Indian languages with state-of-the-art IndicTrans2 models.
        </p>
      </div>

      {/* Language Selection Header */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto,1fr] gap-3 items-end">
        <LanguageSelector
          label="Source Language"
          value={sourceLang}
          onChange={setSourceLang}
        />

        <button
          onClick={swapLanguages}
          className="p-2.5 rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-600 transition-all flex items-center justify-center self-end mb-0.5"
          title="Swap Languages"
        >
          <ArrowRightLeft className="w-4 h-4" />
        </button>

        <LanguageSelector
          label="Target Language"
          value={targetLang}
          onChange={setTargetLang}
        />
      </div>

      {/* Input and Output text areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Source Text Input */}
        <div className="flex flex-col border border-gray-300 rounded-lg p-3 bg-gray-50/50 focus-within:ring-2 focus-within:ring-emerald-600 focus-within:border-emerald-600">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type or paste text to translate..."
            rows={5}
            className="w-full bg-transparent resize-none border-none text-sm text-gray-900 focus:outline-none"
          />
          <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-auto text-xs text-gray-500">
            <span>{inputText.length} characters</span>
            <button
              onClick={() => handleListen(inputText, sourceLang)}
              disabled={isPlayingAudio || !inputText.trim()}
              className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-medium disabled:opacity-50"
            >
              <Volume2 className="w-3.5 h-3.5" /> Listen
            </button>
          </div>
        </div>

        {/* Target Text Output */}
        <div className="flex flex-col border border-gray-300 rounded-lg p-3 bg-white">
          <div className="w-full h-full min-h-[100px] text-sm text-gray-900 overflow-y-auto">
            {isTranslating ? (
              <div className="flex items-center justify-center h-full text-gray-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                <span>Translating via Bhashini...</span>
              </div>
            ) : translatedText ? (
              <p className="whitespace-pre-wrap font-medium">{translatedText}</p>
            ) : (
              <span className="text-gray-400 italic">Translation will appear here...</span>
            )}
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-auto text-xs text-gray-500">
            <button
              onClick={copyToClipboard}
              disabled={!translatedText}
              className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 font-medium disabled:opacity-50"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>

            <button
              onClick={() => handleListen(translatedText, targetLang)}
              disabled={isPlayingAudio || !translatedText}
              className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-semibold disabled:opacity-50"
            >
              <Volume2 className="w-3.5 h-3.5" /> Listen (TTS)
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
          {error}
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-end">
        <button
          onClick={handleTranslate}
          disabled={isTranslating || !inputText.trim()}
          className="px-6 py-2.5 rounded-lg bg-[#178A4A] text-white hover:bg-[#0F6B38] font-semibold text-sm transition-all shadow-md flex items-center gap-2 disabled:opacity-60 cursor-pointer"
        >
          {isTranslating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isTranslating ? 'Translating...' : 'Translate'}
        </button>
      </div>
    </div>
  );
};
