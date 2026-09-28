import React from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

export interface PipelineStep {
  name: string;
  key: 'asr' | 'ald' | 'translation' | 'agent' | 'tts';
  status: 'idle' | 'running' | 'completed' | 'failed';
}

interface ProcessingStatusProps {
  steps: PipelineStep[];
}

export const ProcessingStatus: React.FC<ProcessingStatusProps> = ({ steps }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
        Processing Pipeline
      </h3>
      <div className="space-y-2.5">
        {steps.map((step) => (
          <div key={step.key} className="flex items-center justify-between text-xs">
            <span className={`font-medium ${
              step.status === 'completed'
                ? 'text-emerald-900'
                : step.status === 'running'
                ? 'text-emerald-600 font-semibold'
                : 'text-gray-500'
            }`}>
              {step.name}
            </span>

            <div>
              {step.status === 'completed' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
              {step.status === 'running' && (
                <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
              )}
              {step.status === 'idle' && (
                <Circle className="w-3.5 h-3.5 text-gray-300" />
              )}
              {step.status === 'failed' && (
                <span className="text-red-500 text-[10px] font-bold">Failed</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
