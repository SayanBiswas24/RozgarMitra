import React from 'react';
import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

interface ApiStatusProps {
  status: any;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const ApiStatus: React.FC<ApiStatusProps> = ({ status, onRefresh, isLoading }) => {
  const isBhashiniOk = status?.bhashini === 'connected';
  const isAsrOk = status?.asr === 'available';
  const isTtsOk = status?.tts === 'available';
  const isTranslationOk = status?.translation === 'available';
  const isOcrOk = status?.ocr === 'available';

  const items = [
    { label: 'Bhashini Gateway', active: isBhashiniOk, note: status?.mode === 'live' ? 'Live Credentials' : 'Demo Mode' },
    { label: 'ASR (Speech-to-Text)', active: isAsrOk },
    { label: 'TTS (Voice Synthesis)', active: isTtsOk },
    { label: 'Translation (NMT)', active: isTranslationOk },
    { label: 'OCR (Vision)', active: isOcrOk }
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          System Connectivity
        </h3>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="text-gray-400 hover:text-emerald-700 transition-all p-1"
            title="Refresh Status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        {items.map((item, index) => (
          <div key={index} className="flex items-center justify-between text-xs">
            <div>
              <span className="font-medium text-gray-800">{item.label}</span>
              {item.note && (
                <span className="block text-[10px] text-gray-400">{item.note}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {item.active ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Available
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-red-600 font-semibold text-[11px]">
                  <XCircle className="w-4 h-4 text-red-500" /> Unavailable
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
