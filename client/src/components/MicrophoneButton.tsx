import React from 'react';
import { Mic, Square, Loader2, Volume2, AlertTriangle } from 'lucide-react';

export type VoiceState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'SPEAKING' | 'ERROR';

interface MicrophoneButtonProps {
  state: VoiceState;
  duration?: number;
  onClick: () => void;
  disabled?: boolean;
}

export const MicrophoneButton: React.FC<MicrophoneButtonProps> = ({
  state,
  duration = 0,
  onClick,
  disabled = false
}) => {
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (state) {
      case 'LISTENING':
        return `Listening... (${formatTime(duration)})`;
      case 'PROCESSING':
        return 'Processing audio with Bhashini...';
      case 'SPEAKING':
        return 'Assistant is speaking...';
      case 'ERROR':
        return 'Something went wrong. Tap to retry.';
      default:
        return 'Tap microphone to speak';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-4">
      <div className="relative flex items-center justify-center">
        {/* Pulse ripple effect when listening */}
        {state === 'LISTENING' && (
          <>
            <span className="absolute w-28 h-28 rounded-full bg-red-400 opacity-75 animate-ping" />
            <span className="absolute w-32 h-32 rounded-full bg-red-200 opacity-50 animate-pulse" />
          </>
        )}

        {state === 'SPEAKING' && (
          <span className="absolute w-28 h-28 rounded-full bg-emerald-300 opacity-60 animate-pulse" />
        )}

        <button
          onClick={onClick}
          disabled={disabled || state === 'PROCESSING'}
          aria-label={getStatusText()}
          className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 focus:outline-none focus:ring-4 ${
            state === 'LISTENING'
              ? 'bg-red-600 text-white hover:bg-red-700 ring-red-300 scale-105'
              : state === 'PROCESSING'
              ? 'bg-amber-600 text-white cursor-wait ring-amber-200'
              : state === 'SPEAKING'
              ? 'bg-emerald-700 text-white ring-emerald-300 scale-105'
              : state === 'ERROR'
              ? 'bg-rose-600 text-white hover:bg-rose-700 ring-rose-200'
              : 'bg-[#178A4A] text-white hover:bg-[#0F6B38] hover:scale-105 ring-emerald-200 active:scale-95'
          }`}
        >
          {state === 'LISTENING' && <Square className="w-9 h-9 fill-current" />}
          {state === 'PROCESSING' && <Loader2 className="w-10 h-10 animate-spin" />}
          {state === 'SPEAKING' && <Volume2 className="w-10 h-10 animate-bounce" />}
          {state === 'ERROR' && <AlertTriangle className="w-10 h-10" />}
          {state === 'IDLE' && <Mic className="w-10 h-10" />}
        </button>
      </div>

      <div className="mt-4 text-center">
        <p className="text-sm font-semibold text-gray-800 tracking-wide">{getStatusText()}</p>
        {state === 'LISTENING' && (
          <p className="text-xs text-red-600 mt-1 font-medium">Click button again when finished speaking</p>
        )}
      </div>
    </div>
  );
};
