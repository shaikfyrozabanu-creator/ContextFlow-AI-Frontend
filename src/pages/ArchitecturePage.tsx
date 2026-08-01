import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Upload, Scissors, Cpu, Database, Search, Layers,
  MessageSquare, Zap, ArrowRight, CheckCircle, Info,
} from 'lucide-react';

// ─── Pipeline step definition ──────────────────────────────────────────────
interface PipelineStep {
  id: number;
  icon: React.FC<{ className?: string }>;
  label: string;
  sublabel: string;
  color: string;
  bg: string;
  border: string;
  glow: string;
  description: string;
  tech: string;
  phase: 'ingestion' | 'query';
}

const STEPS: PipelineStep[] = [
  {
    id: 1,
    icon: Upload,
    label: 'PDF Upload',
    sublabel: 'Document Ingestion',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    glow: 'shadow-cyan-500/20',
    description: 'Raw PDF documents are ingested through the FastAPI backend. Binary content is extracted using PyMuPDF and normalized to plain text.',
    tech: 'FastAPI · PyMuPDF · Python 3.11',
    phase: 'ingestion',
  },
  {
    id: 2,
    icon: Scissors,
    label: 'Chunking',
    sublabel: 'Sliding Window Split',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    glow: 'shadow-indigo-500/20',
    description: 'Text is split into overlapping chunks of 500 characters with a 100-character stride, preserving semantic context across boundaries.',
    tech: 'LangChain · RecursiveCharacterTextSplitter',
    phase: 'ingestion',
  },
  {
    id: 3,
    icon: Cpu,
    label: 'Embedding',
    sublabel: 'Dense Vector Encoding',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    glow: 'shadow-violet-500/20',
    description: 'Each chunk is encoded into a 384-dimensional dense vector using a sentence-transformer model running locally on the server.',
    tech: 'all-MiniLM-L6-v2 · SentenceTransformers',
    phase: 'ingestion',
  },
  {
    id: 4,
    icon: Database,
    label: 'Pinecone Storage',
    sublabel: 'Vector Index',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    glow: 'shadow-emerald-500/20',
    description: 'Embedding vectors and chunk metadata are upserted into a Pinecone Serverless index under a namespace unique to each document.',
    tech: 'Pinecone Serverless · Cosine Similarity · dim=384',
    phase: 'ingestion',
  },
  {
    id: 5,
    icon: MessageSquare,
    label: 'User Query',
    sublabel: 'Natural Language Input',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    glow: 'shadow-amber-500/20',
    description: 'The user submits a natural language question via the chat interface. The query is passed to the retrieval pipeline.',
    tech: 'React · WebSocket / REST · FastAPI',
    phase: 'query',
  },
  {
    id: 6,
    icon: Search,
    label: 'Vector Search',
    sublabel: 'Approximate Nearest-Neighbor',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    glow: 'shadow-rose-500/20',
    description: 'The query is embedded with the same model and used for ANN search in Pinecone. Top-K=5 most similar chunks are returned.',
    tech: 'Pinecone ANN · top-k=5 · Cosine Distance',
    phase: 'query',
  },
  {
    id: 7,
    icon: Layers,
    label: 'Context Assembly',
    sublabel: 'Prompt Construction',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    glow: 'shadow-orange-500/20',
    description: 'Retrieved chunks are ranked, deduped, and injected into a structured system prompt alongside conversation memory for the LLM.',
    tech: 'Python · Session Memory · Supabase',
    phase: 'query',
  },
  {
    id: 8,
    icon: Zap,
    label: 'LLM',
    sublabel: 'Llama 3.3 70B via Groq',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    glow: 'shadow-yellow-500/20',
    description: 'The assembled prompt is sent to Llama-3.3-70B running on Groq Cloud. Ultra-low latency inference returns a grounded, cited answer.',
    tech: 'Groq Cloud · llama-3.3-70b-versatile',
    phase: 'query',
  },
  {
    id: 9,
    icon: CheckCircle,
    label: 'Response',
    sublabel: 'Grounded Answer',
    color: 'text-cyan-300',
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-400/30',
    glow: 'shadow-cyan-400/20',
    description: 'The final answer is streamed back to the chat UI with source citations, telemetry (latency, token usage), and an optional audio readout.',
    tech: 'React · Streaming · Text-to-Speech API',
    phase: 'query',
  },
];

// ─── Arrow connector ────────────────────────────────────────────────────────
const Connector: React.FC<{ isPhaseBreak?: boolean }> = ({ isPhaseBreak }) => (
  <div className="flex flex-col items-center justify-center flex-shrink-0 px-1">
    {isPhaseBreak ? (
      <div className="flex flex-col items-center gap-0.5">
        <ArrowRight className="w-5 h-5 text-amber-400/80" />
        <span className="text-[8px] font-mono text-amber-400/60 uppercase tracking-widest whitespace-nowrap">
          query
        </span>
      </div>
    ) : (
      <ArrowRight className="w-4 h-4 text-gray-500" />
    )}
  </div>
);

// ─── Single node card ───────────────────────────────────────────────────────
const StepCard: React.FC<{
  step: PipelineStep;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}> = ({ step, index, isSelected, onClick }) => {
  const Icon = step.icon;
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: 'easeOut' }}
      onClick={onClick}
      className={`
        relative flex flex-col items-center text-center p-4 rounded-2xl border transition-all duration-300 cursor-pointer
        min-w-[108px] max-w-[120px] flex-shrink-0
        ${isSelected
          ? `${step.bg} ${step.border} shadow-xl ${step.glow} scale-105`
          : 'bg-gray-950/60 border-white/10 hover:border-white/20 hover:bg-white/5'}
      `}
      aria-label={`View details for ${step.label}`}
    >
      {/* Step number badge */}
      <span className={`absolute -top-2 -left-2 w-5 h-5 rounded-full text-[9px] font-bold font-mono flex items-center justify-center
        ${isSelected ? `${step.bg} ${step.color} border ${step.border}` : 'bg-gray-800 text-gray-500 border border-white/10'}`}>
        {step.id}
      </span>

      <div className={`w-10 h-10 rounded-xl ${step.bg} border ${step.border} flex items-center justify-center mb-2.5 shadow-lg`}>
        <Icon className={`w-5 h-5 ${step.color}`} />
      </div>
      <p className={`text-xs font-bold leading-tight ${isSelected ? step.color : 'text-gray-200'}`}>
        {step.label}
      </p>
      <p className="text-[9px] text-gray-500 mt-0.5 leading-tight font-mono">{step.sublabel}</p>
    </motion.button>
  );
};

// ─── Page component ─────────────────────────────────────────────────────────
export const ArchitecturePage: React.FC = () => {
  const [selectedId, setSelectedId] = useState<number>(1);
  const selected = STEPS.find(s => s.id === selectedId)!;
  const SelectedIcon = selected.icon;

  const ingestionSteps = STEPS.filter(s => s.phase === 'ingestion');
  const querySteps = STEPS.filter(s => s.phase === 'query');

  return (
    <div className="space-y-10 text-left max-w-7xl mx-auto">

      {/* ── Page header ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-2 border-b border-white/10 pb-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
              RAG Pipeline Architecture
            </h1>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              End-to-end retrieval-augmented generation · ContextFlow.ai
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-400 max-w-2xl leading-relaxed">
          Click any node below to explore how data flows through each stage —
          from raw PDF upload all the way to a grounded LLM response.
        </p>
      </motion.div>

      {/* ── Phase labels + diagram ── */}
      <div className="space-y-6">

        {/* Ingestion phase */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-widest uppercase bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              📥 Ingestion Phase
            </span>
            <span className="text-[10px] text-gray-500 font-mono">Runs once per document upload</span>
          </div>

          <div className="w-full overflow-x-auto pb-2">
            <div className="flex items-center gap-2 min-w-max px-1 py-3">
              {ingestionSteps.map((step, i) => (
                <React.Fragment key={step.id}>
                  <StepCard
                    step={step}
                    index={i}
                    isSelected={selectedId === step.id}
                    onClick={() => setSelectedId(step.id)}
                  />
                  {i < ingestionSteps.length - 1 && <Connector />}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Query phase */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-widest uppercase bg-amber-500/10 border border-amber-500/30 text-amber-400">
              🔍 Query Phase
            </span>
            <span className="text-[10px] text-gray-500 font-mono">Runs on every user question</span>
          </div>

          <div className="w-full overflow-x-auto pb-2">
            <div className="flex items-center gap-2 min-w-max px-1 py-3">
              {querySteps.map((step, i) => (
                <React.Fragment key={step.id}>
                  <StepCard
                    step={step}
                    index={ingestionSteps.length + i}
                    isSelected={selectedId === step.id}
                    onClick={() => setSelectedId(step.id)}
                  />
                  {i < querySteps.length - 1 && <Connector />}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Detail panel ── */}
      <motion.div
        key={selectedId}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`rounded-3xl glass-21st border ${selected.border} p-6 sm:p-8 shadow-2xl ${selected.glow}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <div className={`w-14 h-14 rounded-2xl ${selected.bg} border ${selected.border} flex items-center justify-center flex-shrink-0 shadow-xl`}>
            <SelectedIcon className={`w-7 h-7 ${selected.color}`} />
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className={`text-xl font-extrabold font-display ${selected.color}`}>
                  Step {selected.id} — {selected.label}
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase tracking-widest ${selected.bg} ${selected.color} border ${selected.border}`}>
                  {selected.phase}
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono mt-0.5">{selected.sublabel}</p>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">{selected.description}</p>
            <div className="flex items-start gap-2 p-3 rounded-xl bg-gray-950/60 border border-white/10">
              <Info className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] font-mono text-gray-400">
                <span className="text-gray-300 font-bold">Tech stack: </span>
                {selected.tech}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Full linear flow summary ── */}
      <div className="rounded-3xl glass-21st border border-white/10 p-5 sm:p-6 shadow-xl">
        <h3 className="text-sm font-bold text-white font-display mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          Complete Pipeline at a Glance
        </h3>
        <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => setSelectedId(step.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all duration-200 cursor-pointer
                    ${selectedId === step.id
                      ? `${step.bg} ${step.border} ${step.color}`
                      : 'bg-gray-900/60 border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20'}`}
                >
                  <Icon className={`w-3 h-3 ${selectedId === step.id ? step.color : 'text-gray-500'}`} />
                  {step.label}
                </button>
                {i < STEPS.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-gray-600 flex-shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default ArchitecturePage;
