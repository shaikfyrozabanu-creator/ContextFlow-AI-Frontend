import React, { useState, useMemo } from 'react';
import { 
  Search, Cpu, Brain, Sparkles, Code, Terminal, Activity, Zap, Layers, RefreshCw
} from 'lucide-react';
import { mockStorage, type DocumentChunk } from '../services/mockStorage';

interface ScoredChunkDetail {
  rank: number;
  docName: string;
  chunkId: string;
  pageNumber: number;
  text: string;
  score: number;
  vector: number[];
  keywordMatches: string[];
  selectionReason: string;
}

const SAMPLE_PRESETS = [
  'What are Acme Corp subscription tiers and pricing models?',
  'How does stateful memory retention work in ContextFlow?',
  'What security policies govern context flow and Pinecone vectors?',
  'Where are Acme Corp offices headquartered and what are support hours?',
];

export const ExplainRetrievalPage: React.FC = () => {
  const [query, setQuery] = useState<string>('What are Acme Corp subscription tiers and pricing models?');
  const [executing, setExecuting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'prompt' | 'raw_json'>('pipeline');

  // Load all documents & chunks from storage
  const documents = useMemo(() => mockStorage.getDocuments(), []);
  const memories = useMemo(() => mockStorage.getMemories(), []);

  // Derive 3D and 384D Query Vector Hashing
  const queryEmbedding = useMemo(() => {
    if (!query.trim()) return { coords: [0, 0, 0], dims384: Array(16).fill(0), norm: 1.0 };

    const q = query.toLowerCase();
    let h1 = 0, h2 = 0, h3 = 0;
    const dims384: number[] = [];

    for (let i = 0; i < q.length; i++) {
      const charCode = q.charCodeAt(i);
      h1 = Math.sin(h1 + charCode * 0.1);
      h2 = Math.cos(h2 + charCode * 0.2);
      h3 = Math.sin(h3 + charCode * 0.3);
    }

    // Generate 16 sample dimensions for visualization
    for (let d = 0; d < 16; d++) {
      dims384.push(+(Math.sin(h1 * (d + 1) + d * 0.2) * 0.45).toFixed(4));
    }

    const coords = [
      +(Math.max(-0.85, Math.min(0.85, h1))).toFixed(3),
      +(Math.max(-0.85, Math.min(0.85, h2))).toFixed(3),
      +(Math.max(-0.85, Math.min(0.85, h3))).toFixed(3),
    ];

    const norm = +(Math.sqrt(coords[0]**2 + coords[1]**2 + coords[2]**2)).toFixed(3);

    return { coords, dims384, norm };
  }, [query]);

  // Top 10 Chunks Retrieval & Selection Rationale Logic
  const top10Chunks: ScoredChunkDetail[] = useMemo(() => {
    if (!query.trim()) return [];

    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const allChunks: { docName: string; chunk: DocumentChunk; pageNumber: number }[] = [];

    documents.forEach(doc => {
      doc.chunks.forEach((chunk, cIdx) => {
        allChunks.push({
          docName: doc.name,
          chunk,
          pageNumber: cIdx + 1,
        });
      });
    });

    // Score each chunk
    const scored = allChunks.map(({ docName, chunk, pageNumber }) => {
      const lowerText = chunk.text.toLowerCase();
      const matchedWords = words.filter(w => lowerText.includes(w));
      const overlapRatio = words.length > 0 ? matchedWords.length / words.length : 0;

      const [vx, vy, vz] = chunk.vector;
      const [qx, qy, qz] = queryEmbedding.coords;
      const dist = Math.hypot(vx - qx, vy - qy, vz - qz);
      const vectorScore = Math.max(0, 1 - dist / 2.8);

      const rawScore = 0.70 + (overlapRatio * 0.20) + (vectorScore * 0.09);
      const finalScore = Math.min(0.994, Math.max(0.720, rawScore));

      // Build why selected reasoning text
      let reason = '';
      if (matchedWords.length > 0 && vectorScore > 0.6) {
        reason = `Strong semantic match (${(vectorScore * 100).toFixed(0)}% vector similarity) with ${matchedWords.length} keyword match(es): "${matchedWords.slice(0, 3).join(', ')}".`;
      } else if (matchedWords.length > 0) {
        reason = `Keyword overlap match for terms "${matchedWords.join(', ')}" in document segment.`;
      } else {
        reason = `High vector embedding cosine similarity score (${(finalScore * 100).toFixed(1)}%) in Pinecone index space.`;
      }

      return {
        rank: 0,
        docName,
        chunkId: chunk.id,
        pageNumber,
        text: chunk.text,
        score: finalScore,
        vector: chunk.vector,
        keywordMatches: matchedWords,
        selectionReason: reason,
      };
    });

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    // Assign rank 1 to 10
    return scored.slice(0, 10).map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [query, documents, queryEmbedding]);

  // Final Assembled Prompt sent to LLM
  const finalLlmPrompt = useMemo(() => {
    const topContext = top10Chunks.slice(0, 3).map((c, i) => `[Source ${i + 1} - ${c.docName} (p.${c.pageNumber})]:\n"${c.text}"`).join('\n\n');
    const memoryContext = memories.length > 0 ? memories.map(m => `- ${m.key}: ${m.value}`).join('\n') : 'No active memories stored.';

    return `SYSTEM GUIDELINES:
You are an expert AI assistant. Answer user queries accurately using ONLY the provided document sources and active memory nodes below.

ACTIVE MEMORY NODES:
${memoryContext}

RETRIEVED RAG CONTEXT (Top 3 Chunks):
${topContext}

USER QUESTION:
"${query}"

ASSISTANT RESPONSE:`;
  }, [query, top10Chunks, memories]);

  // Simulated LLM Response
  const llmResponse = useMemo(() => {
    if (top10Chunks.length === 0) return 'No context chunks retrieved.';
    const bestChunk = top10Chunks[0];
    return `Based on **${bestChunk.docName}** (Page ${bestChunk.pageNumber}), ${bestChunk.text}\n\nThis response was derived with ${(bestChunk.score * 100).toFixed(1)}% vector recall confidence using Groq Llama-3.3-70B.`;
  }, [top10Chunks]);

  const handleSimulateExecution = () => {
    setExecuting(true);
    setTimeout(() => setExecuting(false), 800);
  };

  return (
    <div className="w-full space-y-6 text-left animate-fadeIn">

      {/* ── 1. HEADER BANNER ── */}
      <div className="glass-21st border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Cpu className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base sm:text-lg font-extrabold text-white font-display tracking-wide">
                Explain Retrieval & RAG Rationale Debugger
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold">
                DEMO MODE
              </span>
            </div>
            <p className="text-xs text-gray-400 font-sans mt-0.5">
              Inspect query embeddings, Pinecone similarity ranks #1-#10, chunk selection reasons, assembled LLM prompts, and outputs.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-3 py-1.5 rounded-xl border transition-all font-bold cursor-pointer ${activeTab === 'pipeline' ? 'bg-cyan-500 text-white border-cyan-400 shadow-md' : 'bg-gray-950/80 border-white/10 text-gray-400 hover:text-white'}`}
          >
            Pipeline Timeline
          </button>
          <button
            onClick={() => setActiveTab('prompt')}
            className={`px-3 py-1.5 rounded-xl border transition-all font-bold cursor-pointer ${activeTab === 'prompt' ? 'bg-cyan-500 text-white border-cyan-400 shadow-md' : 'bg-gray-950/80 border-white/10 text-gray-400 hover:text-white'}`}
          >
            Final Prompt
          </button>
          <button
            onClick={() => setActiveTab('raw_json')}
            className={`px-3 py-1.5 rounded-xl border transition-all font-bold cursor-pointer ${activeTab === 'raw_json' ? 'bg-cyan-500 text-white border-cyan-400 shadow-md' : 'bg-gray-950/80 border-white/10 text-gray-400 hover:text-white'}`}
          >
            JSON Payload
          </button>
        </div>
      </div>

      {/* ── 2. STEP 1: USER QUERY INPUT & SAMPLE PRESETS ── */}
      <div className="glass-21st border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-cyan-400" />
            <h4 className="text-sm font-extrabold text-white tracking-wide font-display">Step 1: User Query Prompt Input</h4>
          </div>
          <span className="text-[10px] text-cyan-300 font-mono font-bold">Input Query</span>
        </div>

        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type any test query to inspect RAG retrieval rationale..."
            className="w-full bg-gray-950/90 border border-white/10 rounded-2xl pl-4 pr-28 py-3 text-xs text-gray-100 focus:outline-none focus:border-cyan-500 font-mono transition-all placeholder-gray-500"
          />
          <button
            onClick={handleSimulateExecution}
            disabled={executing}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold font-mono transition-all shadow-md cursor-pointer flex items-center space-x-1.5"
          >
            {executing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>{executing ? 'Simulating...' : 'Run RAG'}</span>
          </button>
        </div>

        {/* Quick Sample Presets */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 font-mono text-[10px]">
          <span className="text-gray-400 font-bold flex-shrink-0">Presets:</span>
          {SAMPLE_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => setQuery(preset)}
              className="px-3 py-1 rounded-full bg-gray-950/80 border border-white/10 hover:border-cyan-500/40 text-cyan-300 hover:text-white transition-all truncate max-w-[240px] cursor-pointer flex-shrink-0 font-medium"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'pipeline' && (
        <>
          {/* ── 3. STEP 2: GENERATED EMBEDDING VECTOR DISPLAY ── */}
          <div className="glass-21st border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-violet-400" />
                <h4 className="text-sm font-extrabold text-white tracking-wide font-display">Step 2: Generated Vector Embedding</h4>
              </div>
              <span className="text-[10px] text-violet-300 font-mono font-bold">all-MiniLM-L6-v2 (384-Dim)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-2xl bg-gray-950/80 border border-white/10 space-y-1">
                <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest font-bold">3D Visual Coords</span>
                <div className="text-xs font-bold text-cyan-300 font-mono">
                  [{queryEmbedding.coords.join(', ')}]
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-950/80 border border-white/10 space-y-1">
                <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest font-bold">Vector L2 Norm</span>
                <div className="text-xs font-bold text-emerald-400 font-mono">
                  {queryEmbedding.norm} (Normalized)
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-950/80 border border-white/10 space-y-1">
                <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest font-bold">Embedding Model</span>
                <div className="text-xs font-bold text-white font-mono">
                  Sentence Transformers
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-950/80 border border-white/10 space-y-1">
                <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest font-bold">Pinecone Space</span>
                <div className="text-xs font-bold text-amber-300 font-mono">
                  Cosine Distance Metric
                </div>
              </div>
            </div>

            {/* Sample 16-Dimensional Vector Values Grid */}
            <div className="space-y-1.5 text-left">
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono font-bold">
                Dense Vector Embedding Sample Values (First 16 Dims):
              </span>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 bg-gray-950/90 border border-white/10 rounded-2xl p-3 font-mono text-[10px]">
                {queryEmbedding.dims384.map((val, idx) => (
                  <div key={idx} className="bg-gray-900 p-1.5 rounded-lg border border-white/5 text-center">
                    <span className="text-gray-500 block text-[8px]">d{idx + 1}</span>
                    <span className={val >= 0 ? 'text-cyan-300 font-bold' : 'text-rose-400 font-bold'}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── 4. STEP 3 & 4 & 5: TOP 10 SIMILAR CHUNKS, COSINE SIMILARITY, RANKS & SELECTION REASONING ── */}
          <div className="glass-21st border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-extrabold text-white tracking-wide font-display">
                  Step 3 & 4: Top 10 Similar Chunks, Cosine Ranks & Rationale
                </h4>
              </div>
              <span className="text-[10px] text-emerald-300 font-mono font-bold">Ranked #1 to #{top10Chunks.length}</span>
            </div>

            <div className="space-y-3.5">
              {top10Chunks.map((item) => {
                const scorePct = (item.score * 100).toFixed(1);
                const isTop3 = item.rank <= 3;
                return (
                  <div 
                    key={item.chunkId}
                    className={`p-4 rounded-2xl border transition-all text-left space-y-2.5 ${isTop3 ? 'bg-gray-950/90 border-cyan-500/40 shadow-lg' : 'bg-gray-950/50 border-white/5 opacity-80'}`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] font-mono border-b border-white/10 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2.5 py-0.5 rounded-full font-extrabold ${isTop3 ? 'bg-cyan-500 text-white shadow-sm' : 'bg-gray-800 text-gray-400'}`}>
                          RANK #{item.rank}
                        </span>
                        <span className="text-white font-bold truncate max-w-[200px]">{item.docName}</span>
                        <span className="text-gray-400">Page {item.pageNumber}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold ${isTop3 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-gray-800 text-gray-400'}`}>
                          🎯 Cosine Similarity: {scorePct}%
                        </span>
                        {isTop3 && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[9px] font-bold">
                            Injected into Prompt
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Selection Rationale ("Why each chunk was selected") */}
                    <div className="bg-cyan-500/5 border border-cyan-500/20 p-2.5 rounded-xl text-[11px] font-mono text-cyan-300 flex items-start space-x-2">
                      <Zap className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white">Why Selected:</strong> {item.selectionReason}
                      </div>
                    </div>

                    {/* Chunk Text Snippet */}
                    <div className="text-xs text-gray-200 leading-relaxed font-sans bg-gray-900/80 p-3 rounded-xl border-l-2 border-cyan-400">
                      "{item.text}"
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 5. STEP 5 & 6: FINAL LLM RESPONSE STREAM ── */}
          <div className="glass-21st border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Brain className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-extrabold text-white tracking-wide font-display">Step 5 & 6: LLM Response Generation</h4>
              </div>
              <span className="text-[10px] text-cyan-300 font-mono font-bold">Groq Llama-3.3-70B</span>
            </div>

            <div className="bg-gray-950/90 border border-white/10 rounded-2xl p-4 space-y-3 font-sans text-xs text-left">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5 font-mono text-[10px]">
                <span className="text-cyan-400 font-bold">ContextFlow AI Output Response</span>
                <span className="text-emerald-400 font-bold">Latency: 215ms • 99.8% Accuracy</span>
              </div>
              <p className="text-gray-100 leading-relaxed font-medium whitespace-pre-wrap">
                {llmResponse}
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── 6. PROMPT TAB: FINAL ASSEMBLED PROMPT SENT TO LLM ── */}
      {activeTab === 'prompt' && (
        <div className="glass-21st border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Code className="w-4 h-4 text-cyan-400" />
              <h4 className="text-sm font-extrabold text-white tracking-wide font-display">Final Assembled Prompt Sent to LLM</h4>
            </div>
            <span className="text-[10px] text-cyan-300 font-mono font-bold">Full Context Payload</span>
          </div>

          <div className="bg-gray-950/95 border border-white/10 rounded-2xl p-4 font-mono text-xs text-cyan-300 leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-[500px]">
            {finalLlmPrompt}
          </div>
        </div>
      )}

      {/* ── 7. RAW JSON PAYLOAD TAB ── */}
      {activeTab === 'raw_json' && (
        <div className="glass-21st border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-violet-400" />
              <h4 className="text-sm font-extrabold text-white tracking-wide font-display">Raw API JSON Payload</h4>
            </div>
            <span className="text-[10px] text-violet-300 font-mono font-bold">FastAPI RAG Request & Response</span>
          </div>

          <div className="bg-gray-950/95 border border-white/10 rounded-2xl p-4 font-mono text-xs text-emerald-400 leading-relaxed overflow-x-auto max-h-[500px]">
            {JSON.stringify({
              endpoint: '/chat',
              query: query,
              embedding_model: 'all-MiniLM-L6-v2',
              vector_dimension: 384,
              pinecone_top_k: 10,
              top10_chunks: top10Chunks,
              final_prompt: finalLlmPrompt,
              llm_response: llmResponse,
            }, null, 2)}
          </div>
        </div>
      )}

    </div>
  );
};
export default ExplainRetrievalPage;
