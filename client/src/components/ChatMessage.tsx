import React, { useState } from 'react';
import { Volume2, Play, Square, Bot, User, Languages } from 'lucide-react';
import { processTransliterate } from '../services/api';

export interface ChatMessageData {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  language: string;
  timestamp: string;
  audioContent?: string; // base64
  isVoice?: boolean;
}

interface ChatMessageProps {
  message: ChatMessageData;
  onPlayAudio: (audioContent: string) => void;
  isPlaying?: boolean;
  onStopAudio?: () => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onPlayAudio,
  isPlaying = false,
  onStopAudio
}) => {
  const isUser = message.sender === 'user';
  const [transliterated, setTransliterated] = useState<string | null>(null);
  const [showTransliteration, setShowTransliteration] = useState(false);
  const [isLoadingTrans, setIsLoadingTrans] = useState(false);

  const toggleTransliteration = async () => {
    if (!showTransliteration && !transliterated) {
      setIsLoadingTrans(true);
      try {
        const res = await processTransliterate(message.text, message.language);
        setTransliterated(res.transliteratedText);
      } catch (err) {
        console.error('Transliteration failed:', err);
      } finally {
        setIsLoadingTrans(false);
      }
    }
    setShowTransliteration(!showTransliteration);
  };

  return (
    <div className={`flex w-full gap-3 ${isUser ? 'justify-end' : 'justify-start'} my-2`}>
      {!isUser && (
        <div className="w-9 h-9 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 flex-shrink-0 shadow-sm">
          <Bot className="w-5 h-5" />
        </div>
      )}

      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-sm transition-all ${
          isUser
            ? 'bg-[#178A4A] text-white rounded-tr-none'
            : 'bg-white border border-gray-200 text-gray-900 rounded-tl-none'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 text-xs mb-1.5 opacity-80">
          <span className="font-semibold flex items-center gap-1">
            {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            {isUser ? 'You' : 'Bhashini Assistant'}
          </span>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
              isUser ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}>
              {message.language}
            </span>
            <span>{message.timestamp}</span>
          </div>
        </div>

        {/* Content */}
        <div className="text-sm sm:text-base leading-relaxed break-words font-medium">
          {showTransliteration && transliterated ? transliterated : message.text}
        </div>

        {/* Actions bar */}
        <div className="mt-3 pt-2 border-t flex flex-wrap items-center justify-between gap-2 text-xs border-current/15">
          <div className="flex items-center gap-2">
            {message.audioContent && (
              <button
                onClick={() => {
                  if (isPlaying && onStopAudio) {
                    onStopAudio();
                  } else {
                    onPlayAudio(message.audioContent!);
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  isUser
                    ? 'bg-white text-emerald-900 hover:bg-emerald-50'
                    : isPlaying
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-emerald-700 text-white hover:bg-emerald-800'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" /> Stop Audio
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" /> Play Audio
                  </>
                )}
              </button>
            )}

            {message.isVoice && (
              <span className={`text-[11px] flex items-center gap-1 ${isUser ? 'text-white/80' : 'text-gray-500'}`}>
                <Volume2 className="w-3.5 h-3.5" /> Voice Input
              </span>
            )}
          </div>

          <button
            onClick={toggleTransliteration}
            disabled={isLoadingTrans}
            className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded transition-all ${
              isUser
                ? 'text-white/90 hover:bg-white/10'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Languages className="w-3 h-3" />
            {showTransliteration ? 'Show Script' : 'Transliterate'}
          </button>
        </div>
      </div>

      {isUser && (
        <div className="w-9 h-9 rounded-full bg-[#0F6B38] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
          <User className="w-5 h-5" />
        </div>
      )}
    </div>
  );
};
