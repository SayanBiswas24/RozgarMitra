import { useState, useEffect, useRef, useCallback } from 'react';
import { getApiStatus, processASR, processAgent, processTTS } from '../services/api';
import { useRecorder } from '../hooks/useRecorder';
import { MicrophoneButton, type VoiceState } from '../components/MicrophoneButton';
import { ChatWindow } from '../components/ChatWindow';
import type { ChatMessageData } from '../components/ChatMessage';
import { LanguageSelector } from '../components/LanguageSelector';
import { ApiStatus } from '../components/ApiStatus';
import { ProcessingStatus, type PipelineStep } from '../components/ProcessingStatus';
import { TranslationPanel } from '../components/TranslationPanel';
import { OCRPanel } from '../components/OCRPanel';
import { VoiceSettings, type SettingsState } from '../components/VoiceSettings';
import {
  Mic,
  Languages,
  FileText,
  Settings as SettingsIcon,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'voice' | 'translation' | 'ocr'>('voice');
  const [apiStatus, setApiStatus] = useState<any>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const [settings, setSettings] = useState<SettingsState>({
    inputLanguage: 'hi',
    outputLanguage: 'hi',
    voiceGender: 'female',
    speechSpeed: 1.0,
    autoPlayResponse: true,
    autoTranslation: false,
    showTransliteration: false
  });

  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [detectedLanguage, setDetectedLanguage] = useState<string>('Hindi');
  const [aldConfidence, setAldConfidence] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Hard lock to prevent any kind of double-processing
  const busyRef = useRef(false);

  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([
    { name: 'ASR (Speech Recognition)', key: 'asr', status: 'idle' },
    { name: 'Language Detection (ALD)', key: 'ald', status: 'idle' },
    { name: 'Translation (NMT)', key: 'translation', status: 'idle' },
    { name: 'AI Agent Layer', key: 'agent', status: 'idle' },
    { name: 'TTS (Voice Synthesis)', key: 'tts', status: 'idle' }
  ]);

  const {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    error: recorderError,
    clearError: clearRecorderError
  } = useRecorder();

  // --- Status Check ---
  const checkStatus = useCallback(async () => {
    setIsCheckingStatus(true);
    try {
      const res = await getApiStatus();
      setApiStatus(res);
    } catch {
      setApiStatus({ status: 'error', bhashini: 'disconnected', asr: 'unavailable', tts: 'unavailable', translation: 'unavailable', ocr: 'unavailable' });
    } finally {
      setIsCheckingStatus(false);
    }
  }, []);

  // Only run once on mount (not twice under StrictMode)
  const didMount = useRef(false);
  useEffect(() => {
    if (didMount.current) return;
    didMount.current = true;
    checkStatus();
  }, [checkStatus]);

  useEffect(() => {
    if (recorderError) {
      setErrorMessage(recorderError);
      setVoiceState('ERROR');
    }
  }, [recorderError]);

  // --- Helpers ---
  const updateStep = (key: PipelineStep['key'], status: PipelineStep['status']) => {
    setPipelineSteps(prev => prev.map(s => s.key === key ? { ...s, status } : s));
  };

  const resetSteps = () => {
    setPipelineSteps(prev => prev.map(s => ({ ...s, status: 'idle' })));
  };

  const playAudio = useCallback((audioBase64: string, messageId?: string) => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (!audioBase64) return;

    try {
      const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
      currentAudioRef.current = audio;
      if (messageId) setActivePlayingId(messageId);
      setVoiceState('SPEAKING');

      audio.onended = () => { setActivePlayingId(null); setVoiceState('IDLE'); currentAudioRef.current = null; };
      audio.onerror = () => { setActivePlayingId(null); setVoiceState('IDLE'); currentAudioRef.current = null; };
      audio.play().catch(() => { setVoiceState('IDLE'); setActivePlayingId(null); });
    } catch {
      setVoiceState('IDLE');
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (currentAudioRef.current) { currentAudioRef.current.pause(); currentAudioRef.current = null; }
    setActivePlayingId(null);
    setVoiceState('IDLE');
  }, []);

  // --- Run the ASR → Agent → TTS pipeline for a given transcript ---
  const runAgentPipeline = useCallback(async (transcript: string, inputLang: string, outputLang: string) => {
    updateStep('agent', 'running');

    const historyForAgent = messages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));
    const agentResult = await processAgent(transcript, inputLang, outputLang, historyForAgent);
    updateStep('agent', 'completed');

    updateStep('tts', 'running');
    let audioContent = agentResult.audioContent || '';
    if (!audioContent) {
      try {
        const ttsRes = await processTTS(agentResult.text, settings.outputLanguage, settings.voiceGender);
        audioContent = ttsRes.audioContent || '';
      } catch { /* TTS is optional */ }
    }
    updateStep('tts', 'completed');

    return { text: agentResult.text, audioContent };
  }, [messages, settings.outputLanguage, settings.voiceGender]);

  // --- Microphone Click Handler ---
  const handleMicrophoneClick = useCallback(async () => {
    clearRecorderError();
    setErrorMessage(null);

    if (voiceState === 'SPEAKING') { stopAudio(); return; }
    if (busyRef.current) return; // hard lock

    if (!isRecording) {
      // --- START recording ---
      resetSteps();
      try {
        await startRecording();
        setVoiceState('LISTENING');
      } catch {
        setErrorMessage('Failed to start microphone recording.');
        setVoiceState('ERROR');
      }
    } else {
      // --- STOP recording and process ---
      busyRef.current = true;
      setVoiceState('PROCESSING');
      updateStep('asr', 'running');

      try {
        const audioBase64 = await stopRecording();
        if (!audioBase64) {
          setVoiceState('IDLE');
          resetSteps();
          busyRef.current = false;
          return;
        }

        // 1. ASR
        const asrResult = await processASR(audioBase64, settings.inputLanguage);
        updateStep('asr', asrResult.success ? 'completed' : 'failed');
        updateStep('ald', 'running');

        if (!asrResult.success || !asrResult.text) {
          updateStep('ald', 'failed');
          setErrorMessage(asrResult.message || 'Speech was not recognized. Please speak clearly and try again.');
          setVoiceState('ERROR');
          busyRef.current = false;
          return;
        }

        const transcript = asrResult.text;
        setDetectedLanguage(asrResult.detectedLanguage || 'Hindi');
        setAldConfidence(asrResult.confidence || 0.94);
        updateStep('ald', 'completed');

        // Add user message
        const userMsgId = `user-${Date.now()}`;
        setMessages(prev => [...prev, {
          id: userMsgId,
          sender: 'user',
          text: transcript,
          language: settings.inputLanguage,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          audioContent: audioBase64,
          isVoice: true
        }]);

        // 2–3. Agent + TTS
        const agentRes = await runAgentPipeline(transcript, settings.inputLanguage, settings.outputLanguage);

        // Add assistant message
        const botMsgId = `bot-${Date.now()}`;
        setMessages(prev => [...prev, {
          id: botMsgId,
          sender: 'assistant',
          text: agentRes.text,
          language: settings.outputLanguage,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          audioContent: agentRes.audioContent
        }]);

        if (settings.autoPlayResponse && agentRes.audioContent) {
          playAudio(agentRes.audioContent, botMsgId);
        } else {
          setVoiceState('IDLE');
        }
      } catch (err: any) {
        console.error('Processing error:', err);
        setErrorMessage(err.message || 'Speech processing failed. Please try again.');
        setVoiceState('ERROR');
      } finally {
        busyRef.current = false;
      }
    }
  }, [isRecording, voiceState, settings, startRecording, stopRecording, clearRecorderError, stopAudio, playAudio, runAgentPipeline]);

  // --- Quick prompt handler ---
  const handleSelectPrompt = useCallback(async (text: string) => {
    if (busyRef.current) return;
    busyRef.current = true;

    clearRecorderError();
    setErrorMessage(null);
    setVoiceState('PROCESSING');
    resetSteps();
    updateStep('asr', 'completed');
    updateStep('ald', 'completed');

    const userMsgId = `user-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: userMsgId,
      sender: 'user',
      text,
      language: settings.inputLanguage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);

    try {
      const agentRes = await runAgentPipeline(text, settings.inputLanguage, settings.outputLanguage);

      const botMsgId = `bot-${Date.now()}`;
      setMessages(prev => [...prev, {
        id: botMsgId,
        sender: 'assistant',
        text: agentRes.text,
        language: settings.outputLanguage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        audioContent: agentRes.audioContent
      }]);

      if (settings.autoPlayResponse && agentRes.audioContent) {
        playAudio(agentRes.audioContent, botMsgId);
      } else {
        setVoiceState('IDLE');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error processing request.');
      setVoiceState('ERROR');
    } finally {
      busyRef.current = false;
    }
  }, [settings, clearRecorderError, playAudio, runAgentPipeline]);

  return (
    <div className="min-h-screen bg-[#F7F9F8] text-[#17201B] flex flex-col" style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30" style={{ boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#178A4A] text-white flex items-center justify-center" style={{ boxShadow: '0 2px 8px rgba(23,138,74,.35)' }}>
              <Mic className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-gray-900 tracking-tight">Bhashini Voice Agent</h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  <ShieldCheck className="w-3 h-3 text-emerald-700" /> Gov-Tech AI
                </span>
              </div>
              <p className="text-xs text-gray-500">Multilingual AI Voice Assistant for Indian Languages</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl">
            {([['voice', Mic, 'Voice Agent'], ['translation', Languages, 'Translation'], ['ocr', FileText, 'Document OCR']] as const).map(([key, Icon, label]) => (
              <button key={key} onClick={() => setActiveTab(key as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${activeTab === key ? 'bg-white text-emerald-800 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 text-xs bg-emerald-50 text-emerald-900 px-3 py-1.5 rounded-lg border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold">{apiStatus?.bhashini === 'connected' ? 'Bhashini Connected' : 'Checking API...'}</span>
            </div>
            <button onClick={() => setShowSettingsModal(true)} className="p-2 text-gray-600 hover:text-emerald-800 hover:bg-gray-100 rounded-lg transition-all" title="Voice Settings">
              <SettingsIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => { setErrorMessage(null); setVoiceState('IDLE'); }} className="text-rose-700 hover:text-rose-900 font-bold ml-2">Dismiss</button>
          </div>
        )}

        {activeTab === 'voice' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
                <div className="border-b pb-2">
                  <h3 className="text-sm font-bold text-gray-900">Language Preferences</h3>
                  <p className="text-xs text-gray-500">Configure speech recognition & audio reply</p>
                </div>
                <LanguageSelector label="Spoken Language (ASR)" value={settings.inputLanguage} onChange={(code) => setSettings(s => ({ ...s, inputLanguage: code }))} />
                <LanguageSelector label="Assistant Voice (TTS)" value={settings.outputLanguage} onChange={(code) => setSettings(s => ({ ...s, outputLanguage: code }))} />
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-xs space-y-1.5">
                  <div className="flex justify-between items-center text-gray-500 font-medium">
                    <span>Audio Language (ALD):</span>
                    <span className="font-bold text-emerald-800">{detectedLanguage}</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-500">
                    <span>Model Confidence:</span>
                    <span className="font-semibold text-gray-700">{aldConfidence > 0 ? `${(aldConfidence * 100).toFixed(0)}%` : '—'}</span>
                  </div>
                </div>
                <button onClick={() => setShowSettingsModal(true)} className="w-full py-2 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-lg border border-emerald-200 transition-all flex items-center justify-center gap-1.5">
                  <SettingsIcon className="w-3.5 h-3.5" /> More Voice Settings
                </button>
              </div>
            </div>

            {/* CENTER */}
            <div className="lg:col-span-6 flex flex-col bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm min-h-[580px] h-[calc(100vh-170px)]">
              <ChatWindow messages={messages} onPlayAudio={playAudio} activePlayingId={activePlayingId} onStopAudio={stopAudio} onSelectPrompt={handleSelectPrompt} />
              <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col items-center">
                <MicrophoneButton state={voiceState} duration={recordingDuration} onClick={handleMicrophoneClick} />
              </div>
            </div>

            {/* RIGHT */}
            <div className="lg:col-span-3 space-y-4">
              <ProcessingStatus steps={pipelineSteps} />
              <ApiStatus status={apiStatus} onRefresh={checkStatus} isLoading={isCheckingStatus} />
            </div>
          </div>
        )}

        {activeTab === 'translation' && <div className="max-w-4xl mx-auto"><TranslationPanel /></div>}
        {activeTab === 'ocr' && <div className="max-w-4xl mx-auto"><OCRPanel /></div>}
      </main>

      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(2px)' }}>
          <div className="w-full max-w-md">
            <VoiceSettings settings={settings} onChange={setSettings} onClose={() => setShowSettingsModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
