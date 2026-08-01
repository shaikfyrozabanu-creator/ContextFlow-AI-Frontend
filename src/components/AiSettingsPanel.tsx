import React, { useState, useEffect } from 'react';
import { 
  Zap, Database, RotateCcw, Settings2
} from 'lucide-react';
import { mockStorage, type ChatSettings } from '../services/mockStorage';
import { toast } from './Toast';

export const AiSettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<ChatSettings>(mockStorage.getSettings());

  useEffect(() => {
    setSettings(mockStorage.getSettings());
  }, []);

  // Instant Settings Update Handler
  const updateSetting = <K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    mockStorage.setSettings(updated);
    toast.success('Settings Updated!', `Updated ${String(key)} instantly.`);
  };

  // Quick Preset Profiles
  const applyPreset = (name: 'precise' | 'creative' | 'throughput' | 'default') => {
    let preset: Partial<ChatSettings> = {};
    if (name === 'precise') {
      preset = {
        temperature: 0.1,
        topP: 0.80,
        topK: 20,
        topKRetrieval: 7,
        similarityThreshold: 0.75,
        model: 'groq-llama3.3',
      };
      toast.success('Precise RAG Preset Applied', 'Low temperature & strict cosine threshold loaded.');
    } else if (name === 'creative') {
      preset = {
        temperature: 0.8,
        topP: 0.95,
        topK: 60,
        topKRetrieval: 5,
        similarityThreshold: 0.60,
        model: 'gemini-1.5-pro',
      };
      toast.success('Creative Agent Preset Applied', 'High temperature & broad sampling loaded.');
    } else if (name === 'throughput') {
      preset = {
        temperature: 0.3,
        maxTokens: 1024,
        chunkSize: 400,
        topKRetrieval: 3,
        similarityThreshold: 0.65,
        model: 'groq-llama3.3',
      };
      toast.success('High Throughput Preset Applied', 'Optimized for minimal latency & fast response times.');
    } else if (name === 'default') {
      preset = {
        systemPrompt: 'You are a helpful, friendly AI assistant for Acme Corp.',
        model: 'groq-llama3.3',
        temperature: 0.4,
        topP: 0.90,
        topK: 40,
        maxTokens: 2048,
        chunkSize: 500,
        chunkOverlap: 100,
        topKRetrieval: 5,
        similarityThreshold: 0.70,
        embeddingModel: 'all-MiniLM-L6-v2',
        memoryEnabled: true,
      };
      toast.info('Settings Reset', 'Restored factory default AI engine configuration.');
    }

    const updated = { ...settings, ...preset };
    setSettings(updated);
    mockStorage.setSettings(updated);
  };

  return (
    <div className="w-full space-y-6 text-left animate-fadeIn">

      {/* ── 1. HEADER & QUICK PRESETS ── */}
      <div className="glass-21st border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Settings2 className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base sm:text-lg font-extrabold text-white font-display tracking-wide">
                AI Engine & RAG Hyperparameters
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold">
                INSTANT SYNC
              </span>
            </div>
            <p className="text-xs text-gray-400 font-sans mt-0.5">
              Tune sampling temperature, top-k retrieval cutoff, chunking bounds, and LLM provider endpoints in real-time.
            </p>
          </div>
        </div>

        {/* Quick Presets Bar */}
        <div className="flex items-center space-x-2 font-mono text-xs flex-wrap gap-y-2">
          <span className="text-gray-400 text-[10px] uppercase font-bold mr-1">Presets:</span>
          <button
            onClick={() => applyPreset('precise')}
            className="px-3 py-1.5 rounded-xl bg-gray-950/90 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 transition-all font-bold cursor-pointer"
          >
            ⚡ Precise RAG
          </button>
          <button
            onClick={() => applyPreset('creative')}
            className="px-3 py-1.5 rounded-xl bg-gray-950/90 border border-purple-500/30 hover:border-purple-400 text-purple-300 transition-all font-bold cursor-pointer"
          >
            🎨 Creative
          </button>
          <button
            onClick={() => applyPreset('throughput')}
            className="px-3 py-1.5 rounded-xl bg-gray-950/90 border border-amber-500/30 hover:border-amber-400 text-amber-300 transition-all font-bold cursor-pointer"
          >
            🚀 High Speed
          </button>
          <button
            onClick={() => applyPreset('default')}
            className="p-1.5 rounded-xl bg-gray-900 border border-white/10 hover:border-white text-gray-400 hover:text-white transition-all cursor-pointer"
            title="Reset to factory defaults"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── 2. TWO-COLUMN PARAMETER DASHBOARD ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── COLUMN A: LLM GENERATION PARAMETERS ── */}
        <div className="glass-21st border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Zap className="w-5 h-5 text-amber-400" />
            <h4 className="text-sm font-extrabold text-white font-display tracking-wide">LLM Generation Parameters</h4>
          </div>

          {/* 1. LLM Provider Endpoint */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-gray-200 flex justify-between">
              <span>LLM Provider Endpoint</span>
              <span className="text-cyan-400">{settings.model}</span>
            </label>
            <select
              value={settings.model}
              onChange={(e) => updateSetting('model', e.target.value)}
              className="w-full bg-gray-950/90 border border-white/10 rounded-2xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono cursor-pointer"
            >
              <option value="groq-llama3.3">Groq (Llama-3.3-70B Versatile)</option>
              <option value="gemini-1.5-pro">Google Gemini 1.5 Pro</option>
              <option value="gpt-4o">OpenAI GPT-4o</option>
            </select>
          </div>

          {/* 2. Temperature Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="font-bold text-gray-200">Temperature (Creativity)</span>
              <span className="text-cyan-400 font-extrabold">{settings.temperature}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={settings.temperature}
              onChange={(e) => updateSetting('temperature', parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-2 bg-gray-900 rounded-lg appearance-none"
            />
            <div className="flex justify-between text-[9px] text-gray-500 font-mono">
              <span>0.0 (Deterministic / Strict)</span>
              <span>1.0 (Creative)</span>
            </div>
          </div>

          {/* 3. Top P (Nucleus Sampling) */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="font-bold text-gray-200">Top P (Nucleus Sampling)</span>
              <span className="text-purple-400 font-extrabold">{settings.topP ?? 0.90}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={settings.topP ?? 0.90}
              onChange={(e) => updateSetting('topP', parseFloat(e.target.value))}
              className="w-full accent-purple-400 cursor-pointer h-2 bg-gray-900 rounded-lg appearance-none"
            />
          </div>

          {/* 4. Top K Sampling */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="font-bold text-gray-200">Top K Sampling</span>
              <span className="text-emerald-400 font-extrabold">{settings.topK ?? 40}</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={settings.topK ?? 40}
              onChange={(e) => updateSetting('topK', parseInt(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer h-2 bg-gray-900 rounded-lg appearance-none"
            />
          </div>

          {/* 5. Max Output Tokens */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="font-bold text-gray-200">Max Tokens (Max Response Length)</span>
              <span className="text-amber-400 font-extrabold">{settings.maxTokens ?? 2048} Tokens</span>
            </div>
            <input
              type="range"
              min="256"
              max="4096"
              step="128"
              value={settings.maxTokens ?? 2048}
              onChange={(e) => updateSetting('maxTokens', parseInt(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer h-2 bg-gray-900 rounded-lg appearance-none"
            />
          </div>

        </div>

        {/* ── COLUMN B: RAG VECTOR & CHUNKING HYPERPARAMETERS ── */}
        <div className="glass-21st border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Database className="w-5 h-5 text-cyan-400" />
            <h4 className="text-sm font-extrabold text-white font-display tracking-wide">RAG Vector & Chunking Settings</h4>
          </div>

          {/* 6. Embedding Model */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-gray-200 flex justify-between">
              <span>Vector Embedding Model</span>
              <span className="text-cyan-400">{settings.embeddingModel ?? 'all-MiniLM-L6-v2'}</span>
            </label>
            <select
              value={settings.embeddingModel ?? 'all-MiniLM-L6-v2'}
              onChange={(e) => updateSetting('embeddingModel', e.target.value)}
              className="w-full bg-gray-950/90 border border-white/10 rounded-2xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono cursor-pointer"
            >
              <option value="all-MiniLM-L6-v2">all-MiniLM-L6-v2 (384-Dim · Fast)</option>
              <option value="text-embedding-3-small">OpenAI text-embedding-3-small (1536-Dim)</option>
              <option value="bge-large-en">BGE-Large-EN-v1.5 (1024-Dim)</option>
            </select>
          </div>

          {/* 7. Top K Retrieval Count */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="font-bold text-gray-200">Top K Vector Retrieval</span>
              <span className="text-cyan-400 font-extrabold">{settings.topKRetrieval ?? 5} Chunks</span>
            </div>
            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={settings.topKRetrieval ?? 5}
              onChange={(e) => updateSetting('topKRetrieval', parseInt(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-2 bg-gray-900 rounded-lg appearance-none"
            />
          </div>

          {/* 8. Similarity Cutoff Threshold */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="font-bold text-gray-200">Similarity Cutoff Threshold</span>
              <span className="text-emerald-400 font-extrabold">{settings.similarityThreshold ?? 0.70} Cosine</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={settings.similarityThreshold ?? 0.70}
              onChange={(e) => updateSetting('similarityThreshold', parseFloat(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer h-2 bg-gray-900 rounded-lg appearance-none"
            />
          </div>

          {/* 9. Chunk Size */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="font-bold text-gray-200">Document Chunk Size</span>
              <span className="text-indigo-400 font-extrabold">{settings.chunkSize ?? 500} Chars</span>
            </div>
            <input
              type="range"
              min="100"
              max="2000"
              step="50"
              value={settings.chunkSize ?? 500}
              onChange={(e) => updateSetting('chunkSize', parseInt(e.target.value))}
              className="w-full accent-indigo-400 cursor-pointer h-2 bg-gray-900 rounded-lg appearance-none"
            />
          </div>

          {/* 10. Chunk Overlap */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="font-bold text-gray-200">Document Chunk Overlap</span>
              <span className="text-rose-400 font-extrabold">{settings.chunkOverlap ?? 100} Chars</span>
            </div>
            <input
              type="range"
              min="0"
              max="500"
              step="25"
              value={settings.chunkOverlap ?? 100}
              onChange={(e) => updateSetting('chunkOverlap', parseInt(e.target.value))}
              className="w-full accent-rose-400 cursor-pointer h-2 bg-gray-900 rounded-lg appearance-none"
            />
          </div>

        </div>

      </div>

    </div>
  );
};
export default AiSettingsPanel;
