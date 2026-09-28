import React from 'react';
import { LanguageSelector } from './LanguageSelector';
import { Volume2, Gauge, PlayCircle, Sliders, X } from 'lucide-react';

export interface SettingsState {
  inputLanguage: string;
  outputLanguage: string;
  voiceGender: 'female' | 'male';
  speechSpeed: number;
  autoPlayResponse: boolean;
  autoTranslation: boolean;
  showTransliteration: boolean;
}

interface VoiceSettingsProps {
  settings: SettingsState;
  onChange: (newSettings: SettingsState) => void;
  onClose?: () => void;
}

export const VoiceSettings: React.FC<VoiceSettingsProps> = ({
  settings,
  onChange,
  onClose
}) => {
  const update = (partial: Partial<SettingsState>) => {
    onChange({ ...settings, ...partial });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-5 space-y-5">
      <div className="flex items-center justify-between border-b pb-3">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <Sliders className="w-5 h-5 text-emerald-700" /> Voice & Assistant Settings
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Languages */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <LanguageSelector
            label="Default Input Language (Speech)"
            value={settings.inputLanguage}
            onChange={(code) => update({ inputLanguage: code })}
          />
          <LanguageSelector
            label="Default Output Language (Response)"
            value={settings.outputLanguage}
            onChange={(code) => update({ outputLanguage: code })}
          />
        </div>

        {/* Voice Gender */}
        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-1">
            TTS Voice Model / Gender
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => update({ voiceGender: 'female' })}
              className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-2 ${
                settings.voiceGender === 'female'
                  ? 'bg-emerald-50 border-emerald-600 text-emerald-800 ring-2 ring-emerald-500/20'
                  : 'border-gray-200 hover:bg-gray-50 text-gray-700'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" /> Female (Default)
            </button>
            <button
              onClick={() => update({ voiceGender: 'male' })}
              className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-2 ${
                settings.voiceGender === 'male'
                  ? 'bg-emerald-50 border-emerald-600 text-emerald-800 ring-2 ring-emerald-500/20'
                  : 'border-gray-200 hover:bg-gray-50 text-gray-700'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" /> Male Voice
            </button>
          </div>
        </div>

        {/* Speech Speed */}
        <div>
          <div className="flex justify-between items-center text-xs font-semibold text-gray-700 mb-1">
            <span className="flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-emerald-700" /> Speech Rate
            </span>
            <span>{settings.speechSpeed}x</span>
          </div>
          <input
            type="range"
            min="0.75"
            max="1.5"
            step="0.05"
            value={settings.speechSpeed}
            onChange={(e) => update({ speechSpeed: parseFloat(e.target.value) })}
            className="w-full accent-emerald-600 cursor-pointer"
          />
        </div>

        {/* Toggles */}
        <div className="space-y-3 pt-2 border-t">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-xs font-medium text-gray-800 flex items-center gap-1.5">
              <PlayCircle className="w-4 h-4 text-emerald-600" /> Automatically Play AI Voice Response
            </span>
            <input
              type="checkbox"
              checked={settings.autoPlayResponse}
              onChange={(e) => update({ autoPlayResponse: e.target.checked })}
              className="w-4 h-4 accent-emerald-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-xs font-medium text-gray-800">
              Auto-translate to preferred output language
            </span>
            <input
              type="checkbox"
              checked={settings.autoTranslation}
              onChange={(e) => update({ autoTranslation: e.target.checked })}
              className="w-4 h-4 accent-emerald-600 rounded"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
