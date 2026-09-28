import React, { useRef, useEffect } from 'react';
import { ChatMessage, type ChatMessageData } from './ChatMessage';
import { MessageSquare, Sparkles } from 'lucide-react';

interface ChatWindowProps {
  messages: ChatMessageData[];
  onPlayAudio: (audioContent: string) => void;
  activePlayingId: string | null;
  onStopAudio: () => void;
  onSelectPrompt?: (text: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  onPlayAudio,
  activePlayingId,
  onStopAudio,
  onSelectPrompt
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const quickPrompts = [
    { text: 'मुझे पानी की समस्या की शिकायत करनी है', label: 'जल आपूर्ति शिकायत (Hindi)' },
    { text: 'सड़क पर गड्ढों की मरम्मत करवानी है', label: 'सड़क मरम्मत (Hindi)' },
    { text: 'I want to inquire about municipal public services', label: 'Public Services (English)' },
    { text: 'बिजली कटौती की शिकायत दर्ज करें', label: 'विद्युत कटौती (Hindi)' }
  ];

  return (
    <div className="flex-1 w-full flex flex-col overflow-hidden bg-[#F7F9F8] rounded-xl border border-gray-200">
      {/* Scrollable messages container */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-inner">
              <MessageSquare className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-800">Start Your Multilingual Voice Conversation</h3>
              <p className="text-xs sm:text-sm text-gray-500 max-w-md mt-1">
                Tap the microphone below to speak in your language, or pick a sample prompt to test live Bhashini ASR, AI, and TTS.
              </p>
            </div>

            {/* Quick Prompts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg mt-4">
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectPrompt && onSelectPrompt(p.text)}
                  className="p-3 bg-white hover:bg-emerald-50 text-left rounded-lg border border-gray-200 hover:border-emerald-300 text-xs transition-all shadow-sm flex items-start gap-2 group"
                >
                  <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-gray-900 block group-hover:text-emerald-800">
                      {p.label}
                    </span>
                    <span className="text-gray-500 line-clamp-1 italic mt-0.5">"{p.text}"</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              onPlayAudio={() => onPlayAudio(msg.audioContent || '')}
              isPlaying={activePlayingId === msg.id}
              onStopAudio={onStopAudio}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
