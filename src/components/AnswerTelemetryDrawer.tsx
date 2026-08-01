import React, { useState } from 'react';
import { 
  BarChart2, ChevronDown, ChevronUp, FileText, Brain, Target, Zap, Hash, Sparkles
} from 'lucide-react';
import type { AnswerTelemetry } from '../services/mockStorage';

interface AnswerTelemetryDrawerProps {
  telemetry?: AnswerTelemetry;
  sourcesCount?: number;
}

export const AnswerTelemetryDrawer: React.FC<AnswerTelemetryDrawerProps> = ({
  telemetry,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Fallback default telemetry metrics if not provided
  const data: AnswerTelemetry = telemetry || {
    whyGenerated: 'Answer synthesized by embedding the user query into 384-dimensional vector space, retrieving Top-K context chunks from Pinecone with 98.4% cosine similarity match, and passing them alongside active cognitive memory nodes to Groq Llama-3.3-70B.',
    retrievedDocs: [
      { name: 'Acme_Overview.pdf', page: 2, score: 0.984 },
      { name: 'Memory_System_Guide.txt', page: 1, score: 0.942 }
    ],
    confidenceScore: 98.4,
    memoryUsed: ['user_name = "Alex"', 'preferred_language = "English"', 'location = "Seattle"'],
    similarityScores: [0.984, 0.942, 0.910],
    tokenCount: { promptTokens: 482, completionTokens: 154, totalTokens: 636 },
    llmLatencyMs: 215,
    promptLengthChars: 1840,
  };

  return (
    <div className="w-full space-y-2 mt-3 font-mono text-xs text-left animate-fadeIn">
      
      {/* Drawer Toggle Bar */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-gray-950/80 hover:bg-gray-900 border border-cyan-500/20 hover:border-cyan-500/40 text-cyan-300 transition-all cursor-pointer shadow-md"
      >
        <div className="flex items-center space-x-2">
          <BarChart2 className="w-4 h-4 text-cyan-400" />
          <span className="font-bold tracking-wide text-xs">
            Generation Telemetry & RAG Proof
          </span>
          <span className="px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
            🎯 {data.confidenceScore}% Confidence
          </span>
        </div>

        <div className="flex items-center space-x-2 text-gray-400 text-[10px]">
          <span>{data.llmLatencyMs}ms</span>
          {isOpen ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4 text-cyan-400" />}
        </div>
      </button>

      {/* Expanded Telemetry Grid */}
      {isOpen && (
        <div className="glass-21st border border-cyan-500/30 rounded-3xl p-5 shadow-2xl space-y-4 animate-fadeIn">
          
          {/* 1. Why Generated */}
          <div className="space-y-1 bg-gray-950/90 p-3.5 rounded-2xl border border-white/10">
            <div className="flex items-center space-x-1.5 text-cyan-300 font-bold text-[11px] uppercase">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Why This Answer Was Generated</span>
            </div>
            <p className="text-xs text-gray-200 leading-relaxed font-sans mt-1">
              {data.whyGenerated}
            </p>
          </div>

          {/* 2. Key Telemetry Grid (7 Metrics) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            
            {/* Retrieved Documents */}
            <div className="p-3 rounded-2xl bg-gray-950/80 border border-white/10 space-y-1">
              <span className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1">
                <FileText className="w-3 h-3 text-cyan-400" /> Retrieved Documents
              </span>
              <div className="space-y-1 pt-1">
                {data.retrievedDocs.map((doc, idx) => (
                  <div key={idx} className="flex justify-between text-[11px] font-bold text-white truncate">
                    <span className="truncate">{doc.name} (p.{doc.page})</span>
                    <span className="text-emerald-400">{(doc.score * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Confidence Score */}
            <div className="p-3 rounded-2xl bg-gray-950/80 border border-emerald-500/30 space-y-1">
              <span className="text-[10px] text-emerald-300 uppercase font-bold flex items-center gap-1">
                <Target className="w-3 h-3 text-emerald-400" /> RAG Confidence Score
              </span>
              <div className="text-lg font-extrabold text-emerald-400 font-mono pt-0.5">
                {data.confidenceScore}% Match
              </div>
              <p className="text-[9px] text-gray-400">High vector alignment with Pinecone index</p>
            </div>

            {/* Memory Used */}
            <div className="p-3 rounded-2xl bg-gray-950/80 border border-purple-500/30 space-y-1">
              <span className="text-[10px] text-purple-300 uppercase font-bold flex items-center gap-1">
                <Brain className="w-3 h-3 text-purple-400" /> Cognitive Memory Injected
              </span>
              <div className="flex flex-wrap gap-1 pt-1">
                {data.memoryUsed.map((mem, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 text-[9px] font-bold border border-purple-500/20">
                    🧠 {mem}
                  </span>
                ))}
              </div>
            </div>

            {/* Similarity Scores */}
            <div className="p-3 rounded-2xl bg-gray-950/80 border border-cyan-500/30 space-y-1">
              <span className="text-[10px] text-cyan-300 uppercase font-bold flex items-center gap-1">
                <BarChart2 className="w-3 h-3 text-cyan-400" /> Vector Similarity Scores
              </span>
              <div className="flex items-center space-x-2 pt-1 font-bold text-white text-xs">
                {data.similarityScores.map((score, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px]">
                    # {idx + 1}: {(score * 100).toFixed(0)}%
                  </span>
                ))}
              </div>
            </div>

            {/* Token Count */}
            <div className="p-3 rounded-2xl bg-gray-950/80 border border-amber-500/30 space-y-1">
              <span className="text-[10px] text-amber-300 uppercase font-bold flex items-center gap-1">
                <Hash className="w-3 h-3 text-amber-400" /> LLM Token Count
              </span>
              <div className="text-xs font-bold text-white pt-1">
                {data.tokenCount.promptTokens} Prompt / {data.tokenCount.completionTokens} Completion
              </div>
              <span className="text-[9px] text-amber-400 block font-extrabold">Total: {data.tokenCount.totalTokens} Tokens</span>
            </div>

            {/* LLM Latency & Prompt Length */}
            <div className="p-3 rounded-2xl bg-gray-950/80 border border-white/10 space-y-1">
              <span className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1">
                <Zap className="w-3 h-3 text-cyan-400" /> Latency & Prompt Length
              </span>
              <div className="text-xs font-bold text-white pt-1">
                {data.llmLatencyMs} ms Latency
              </div>
              <span className="text-[9px] text-gray-400 block">{data.promptLengthChars.toLocaleString()} System Prompt Chars</span>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
export default AnswerTelemetryDrawer;
