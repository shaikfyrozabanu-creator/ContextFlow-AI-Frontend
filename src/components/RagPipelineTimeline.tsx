import React, { useState, useEffect } from 'react';
import { 
  Brain, Search, Download, Settings, Zap, CheckCircle2, Loader2
} from 'lucide-react';

interface StageInfo {
  id: number;
  label: string;
  sublabel: string;
  icon: React.FC<{ className?: string }>;
  expectedLatencyMs: number;
}

const RAG_STAGES: StageInfo[] = [
  { id: 1, label: 'Embedding Query', sublabel: '384-Dim all-MiniLM-L6-v2 vector encoding', icon: Brain, expectedLatencyMs: 45 },
  { id: 2, label: 'Searching Pinecone', sublabel: 'Cosine distance vector space query', icon: Search, expectedLatencyMs: 110 },
  { id: 3, label: 'Retrieving Chunks', sublabel: 'Top-5 context chunks fetched', icon: Download, expectedLatencyMs: 85 },
  { id: 4, label: 'Building Prompt', sublabel: 'System prompt + memory + context synthesis', icon: Settings, expectedLatencyMs: 40 },
  { id: 5, label: 'Generating Answer', sublabel: 'Streaming tokens via Groq Llama-3.3-70B', icon: Zap, expectedLatencyMs: 380 },
  { id: 6, label: 'Answer Ready', sublabel: 'Markdown response synthesis complete', icon: CheckCircle2, expectedLatencyMs: 20 },
];

export const RagPipelineTimeline: React.FC = () => {
  const [currentStageIdx, setCurrentStageIdx] = useState<number>(0);
  const [stageLatencies, setStageLatencies] = useState<Record<number, number>>({});

  useEffect(() => {
    setCurrentStageIdx(0);
    setStageLatencies({});

    // Step through the 6 RAG pipeline stages sequentially
    const stepIntervals = [350, 450, 400, 300, 700];
    let stepCount = 0;

    const timer = setInterval(() => {
      stepCount++;
      if (stepCount <= 5) {
        setCurrentStageIdx(stepCount);
        setStageLatencies(prev => ({
          ...prev,
          [stepCount]: Math.floor(Math.random() * 40) + RAG_STAGES[stepCount - 1].expectedLatencyMs
        }));
      } else {
        clearInterval(timer);
      }
    }, stepIntervals[stepCount] || 400);

    return () => clearInterval(timer);
  }, []);

  const progressPct = Math.round(((currentStageIdx + 1) / RAG_STAGES.length) * 100);

  return (
    <div className="w-full space-y-3.5 text-left font-mono animate-fadeIn">
      
      {/* 1. Header Progress Bar */}
      <div className="space-y-1.5 border-b border-white/10 pb-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-cyan-300 font-bold tracking-wide uppercase text-[10px] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            Live RAG Pipeline Execution
          </span>
          <span className="text-cyan-400 font-extrabold text-[11px]">{progressPct}%</span>
        </div>
        <div className="w-full bg-gray-950 rounded-full h-1.5 border border-white/10 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* 2. Vertical Stage Timeline */}
      <div className="space-y-2 relative pl-2">
        {/* Connecting Line */}
        <div className="absolute left-[17px] top-3 bottom-3 w-0.5 bg-gray-800 -z-0" />

        {RAG_STAGES.map((stage, idx) => {
          const isCompleted = idx < currentStageIdx;
          const isActive = idx === currentStageIdx;
          const isPending = idx > currentStageIdx;
          const Icon = stage.icon;
          const latency = stageLatencies[idx + 1] || stage.expectedLatencyMs;

          return (
            <div 
              key={stage.id}
              className={`
                flex items-start space-x-3 p-2 rounded-2xl transition-all duration-300 relative z-10 text-xs
                ${isActive ? 'bg-cyan-500/10 border border-cyan-500/30 shadow-lg shadow-cyan-500/10' : ''}
                ${isCompleted ? 'opacity-90' : ''}
                ${isPending ? 'opacity-40' : ''}
              `}
            >
              {/* Stage Status Icon Badge */}
              <div className={`
                w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 transition-all font-bold text-xs
                ${isCompleted ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : ''}
                ${isActive ? 'bg-cyan-500 text-white border border-cyan-300 shadow-md shadow-cyan-500/40 animate-pulse' : ''}
                ${isPending ? 'bg-gray-900 text-gray-500 border border-white/10' : ''}
              `}>
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : isActive ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Icon className="w-3.5 h-3.5 text-gray-500" />
                )}
              </div>

              {/* Stage Information */}
              <div className="flex-grow min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`font-bold tracking-wide ${isActive ? 'text-cyan-300' : isCompleted ? 'text-white' : 'text-gray-400'}`}>
                    {stage.label}
                  </span>
                  {(isCompleted || isActive) && (
                    <span className="text-[9px] text-gray-400 bg-gray-950 px-1.5 py-0.5 rounded border border-white/10">
                      {latency}ms
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 font-sans truncate mt-0.5">
                  {stage.sublabel}
                </p>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
export default RagPipelineTimeline;
