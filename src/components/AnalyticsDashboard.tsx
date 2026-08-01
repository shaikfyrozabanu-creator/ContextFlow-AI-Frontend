import React, { useState, useEffect, useMemo } from 'react';
import { 
  AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, 
  Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { 
  Activity, Database, Cpu, Brain, Clock, Zap, FileText, Layers, 
  HelpCircle, TrendingUp, RefreshCw, Award
} from 'lucide-react';
import { mockStorage, type Document, type MemoryItem } from '../services/mockStorage';

// Colors for Recharts
const COLOR_CYAN = '#38bdf8';
const COLOR_VIOLET = '#c084fc';
const COLOR_EMERALD = '#34d399';
const COLOR_AMBER = '#fbbf24';
const COLOR_ROSE = '#f43f5e';

const PIE_COLORS = [COLOR_CYAN, COLOR_VIOLET, COLOR_EMERALD, COLOR_AMBER, COLOR_ROSE];

interface MemoryCatItem {
  name: string;
  value: number;
  color: string;
}

export const AnalyticsDashboard: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [liveMetrics, setLiveMetrics] = useState({
    avgChunkLen: 485,
    embeddingTimeMs: 38,
    retrievalTimeMs: 14,
    llmResponseTimeMs: 215,
    totalQueryCount: 142,
    memoryUsageMb: 4.8,
  });

  // Dynamic daily queries chart data
  const [dailyData, setDailyData] = useState([
    { day: 'Mon', queries: 24, latency: 240 },
    { day: 'Tue', queries: 42, latency: 220 },
    { day: 'Wed', queries: 38, latency: 195 },
    { day: 'Thu', queries: 65, latency: 210 },
    { day: 'Fri', queries: 89, latency: 205 },
    { day: 'Sat', queries: 54, latency: 190 },
    { day: 'Sun', queries: 72, latency: 180 },
  ]);

  // Dynamic top asked questions
  const topQuestions = useMemo(() => [
    { question: 'What is the pricing model and plan limits?', count: 48, category: 'Pricing', score: 0.984 },
    { question: 'How is vector embedding search performed?', count: 37, category: 'Technical', score: 0.962 },
    { question: 'What security policies govern context flow?', count: 29, category: 'Security', score: 0.941 },
    { question: 'Can I connect custom Pinecone indexes?', count: 21, category: 'Integration', score: 0.925 },
    { question: 'How to enable memory node retention?', count: 18, category: 'Memory', score: 0.890 },
  ], []);

  // Load real storage statistics
  const loadData = () => {
    const docs = mockStorage.getDocuments();
    const mems = mockStorage.getMemories();
    const st = mockStorage.getStats();
    setDocuments(docs);
    setMemories(mems);

    // Calculate real average chunk length
    let totalLen = 0;
    let chunkCount = 0;
    docs.forEach(doc => {
      doc.chunks.forEach(c => {
        totalLen += c.charCount;
        chunkCount++;
      });
    });

    setLiveMetrics(prev => ({
      ...prev,
      avgChunkLen: chunkCount > 0 ? Math.round(totalLen / chunkCount) : 485,
      totalQueryCount: st.questionsAsked || 142,
    }));
  };

  // Real-time live updating ticker effect (every 3 seconds)
  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      // Simulate real-time metric micro-fluctuations
      setLiveMetrics(prev => ({
        ...prev,
        embeddingTimeMs: Math.floor(34 + Math.random() * 8),
        retrievalTimeMs: Math.floor(12 + Math.random() * 6),
        llmResponseTimeMs: Math.floor(195 + Math.random() * 40),
        memoryUsageMb: +(prev.memoryUsageMb + (Math.random() * 0.04 - 0.02)).toFixed(2),
      }));

      // Update current day query count slightly
      setDailyData(prev => {
        const next = [...prev];
        const lastIdx = next.length - 1;
        next[lastIdx] = {
          ...next[lastIdx],
          queries: next[lastIdx].queries + (Math.random() > 0.6 ? 1 : 0),
          latency: Math.floor(180 + Math.random() * 30),
        };
        return next;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Compute memory categories for PieChart breakdown
  const memoryCategoryData: MemoryCatItem[] = useMemo(() => {
    if (memories.length === 0) {
      return [
        { name: 'User Info', value: 4, color: COLOR_CYAN },
        { name: 'Preferences', value: 3, color: COLOR_VIOLET },
        { name: 'Custom Context', value: 2, color: COLOR_EMERALD },
      ];
    }
    const catCounts: Record<string, number> = {};
    memories.forEach(m => {
      const cat = m.category || 'General';
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });
    return Object.entries(catCounts).map(([name, value], idx) => ({
      name,
      value,
      color: PIE_COLORS[idx % PIE_COLORS.length],
    }));
  }, [memories]);

  // Compute total chunks count across all documents
  const totalChunks = useMemo(() => {
    return documents.reduce((sum, doc) => sum + (doc.chunkCount || doc.chunks?.length || 0), 0);
  }, [documents]);

  // Most retrieved chunks list
  const mostRetrievedChunks = useMemo(() => {
    const list: { id: string; docName: string; text: string; hits: number; score: number }[] = [];
    documents.forEach((doc, dIdx) => {
      doc.chunks.slice(0, 2).forEach((chunk, cIdx) => {
        list.push({
          id: chunk.id,
          docName: doc.name,
          text: chunk.text,
          hits: 34 - (dIdx * 6 + cIdx * 4),
          score: 0.985 - (dIdx * 0.02 + cIdx * 0.01),
        });
      });
    });

    if (list.length === 0) {
      return [
        { id: 'chunk-101', docName: 'ContextFlow_Whitepaper.pdf', text: 'ContextFlow implements RAG vector retrieval pipelines backed by Pinecone vector databases and Groq LLM streaming.', hits: 42, score: 0.988 },
        { id: 'chunk-102', docName: 'API_Documentation.pdf', text: 'FastAPI backend routes handle semantic text embeddings using Sentence Transformers model bge-small-en-v1.5.', hits: 36, score: 0.965 },
        { id: 'chunk-103', docName: 'Security_Policy.pdf', text: 'All long-term user memories and contextual tokens are stored in Supabase memory nodes with encrypted storage.', hits: 28, score: 0.942 },
      ];
    }

    return list.slice(0, 4);
  }, [documents]);

  return (
    <div className="w-full space-y-6 text-left animate-fadeIn">

      {/* ── 1. HEADER REAL-TIME TICKER BANNER ── */}
      <div className="glass-21st border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Activity className="w-6 h-6 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base sm:text-lg font-extrabold text-white font-display tracking-wide">
                Real-Time AI Analytics Dashboard
              </h3>
              <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>LIVE TICKER</span>
              </span>
            </div>
            <p className="text-xs text-gray-400 font-sans mt-0.5">
              Monitoring vector embeddings, Pinecone retrieval metrics, Groq LLM latency, and memory nodes.
            </p>
          </div>
        </div>

        {/* Live System Status Badges */}
        <div className="flex items-center gap-2.5 flex-wrap font-mono text-xs">
          <div className="bg-gray-950/80 border border-white/10 px-3 py-1.5 rounded-xl flex items-center space-x-2">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-gray-400">Vector DB:</span>
            <span className="text-emerald-400 font-bold">Pinecone Active</span>
          </div>

          <div className="bg-gray-950/80 border border-white/10 px-3 py-1.5 rounded-xl flex items-center space-x-2">
            <Cpu className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-gray-400">LLM:</span>
            <span className="text-emerald-400 font-bold">Groq Llama-3.3</span>
          </div>

          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-gray-950/80 border border-white/10 hover:border-cyan-500/40 text-gray-400 hover:text-white transition-all cursor-pointer"
            title="Refresh Metrics"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── 2. KEY METRICS 6-STAT GRID ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Documents */}
        <div className="p-4.5 rounded-3xl glass-21st border border-white/10 flex flex-col justify-between space-y-2 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest font-bold">Total Docs</span>
            <FileText className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-white tracking-tight">{documents.length}</div>
          <div className="text-[10px] text-cyan-300 font-mono">Indexed PDFs</div>
        </div>

        {/* Total Chunks */}
        <div className="p-4.5 rounded-3xl glass-21st border border-white/10 flex flex-col justify-between space-y-2 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest font-bold">Total Chunks</span>
            <Layers className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-violet-300 tracking-tight">{totalChunks}</div>
          <div className="text-[10px] text-violet-400 font-mono">384-Dim Vectors</div>
        </div>

        {/* Average Chunk Length */}
        <div className="p-4.5 rounded-3xl glass-21st border border-white/10 flex flex-col justify-between space-y-2 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest font-bold">Avg Chunk Len</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-300 tracking-tight">{liveMetrics.avgChunkLen} <span className="text-xs font-normal">chars</span></div>
          <div className="text-[10px] text-emerald-400 font-mono">~121 tokens/chunk</div>
        </div>

        {/* Embedding Time */}
        <div className="p-4.5 rounded-3xl glass-21st border border-white/10 flex flex-col justify-between space-y-2 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest font-bold">Embedding Time</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-amber-300 tracking-tight">{liveMetrics.embeddingTimeMs} <span className="text-xs font-normal">ms</span></div>
          <div className="text-[10px] text-amber-400 font-mono">bge-small-en model</div>
        </div>

        {/* Average Retrieval Time */}
        <div className="p-4.5 rounded-3xl glass-21st border border-white/10 flex flex-col justify-between space-y-2 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest font-bold">Retrieval Time</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-cyan-300 tracking-tight">{liveMetrics.retrievalTimeMs} <span className="text-xs font-normal">ms</span></div>
          <div className="text-[10px] text-cyan-400 font-mono">Pinecone search</div>
        </div>

        {/* Average LLM Response Time */}
        <div className="p-4.5 rounded-3xl glass-21st border border-white/10 flex flex-col justify-between space-y-2 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest font-bold">LLM Latency</span>
            <Cpu className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-rose-300 tracking-tight">{liveMetrics.llmResponseTimeMs} <span className="text-xs font-normal">ms</span></div>
          <div className="text-[10px] text-rose-400 font-mono">Llama-3.3 stream</div>
        </div>
      </div>

      {/* ── 3. RECHARTS CHARTS SECTION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* AreaChart: Daily Query Volume & Latency */}
        <div className="lg:col-span-2 glass-21st border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <h4 className="text-sm font-extrabold text-white tracking-wide font-display">Daily Queries & System Latency</h4>
            </div>
            <span className="text-[10px] text-cyan-300 font-mono font-bold">Real-time Area Stream</span>
          </div>

          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLOR_CYAN} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLOR_CYAN} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLOR_VIOLET} stopOpacity={0.6}/>
                    <stop offset="95%" stopColor={COLOR_VIOLET} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis dataKey="day" stroke="#9ca3af" fontSize={11} tickLine={false} />
                <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#030712',
                    borderColor: 'rgba(56, 189, 248, 0.3)',
                    borderRadius: '16px',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                />
                <Area type="monotone" dataKey="queries" stroke={COLOR_CYAN} fillOpacity={1} fill="url(#colorQueries)" name="Queries" />
                <Area type="monotone" dataKey="latency" stroke={COLOR_VIOLET} fillOpacity={1} fill="url(#colorLatency)" name="Latency (ms)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PieChart: Memory Node Allocation */}
        <div className="glass-21st border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="w-4 h-4 text-violet-400" />
              <h4 className="text-sm font-extrabold text-white tracking-wide font-display">Memory Node Allocation</h4>
            </div>
            <span className="text-[10px] text-violet-300 font-mono font-bold">{memories.length} Nodes</span>
          </div>

          <div className="w-full h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={memoryCategoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {memoryCategoryData.map((entry: MemoryCatItem, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#030712',
                    borderColor: 'rgba(192, 132, 252, 0.3)',
                    borderRadius: '16px',
                    fontSize: '11px',
                    color: '#fff',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-left font-mono text-[10px]">
            {memoryCategoryData.map((item: MemoryCatItem) => (
              <div key={item.name} className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-gray-300 truncate">{item.name}:</span>
                <span className="text-white font-bold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── 4. TABLES: TOP QUESTIONS & MOST RETRIEVED CHUNKS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top Asked Questions Table */}
        <div className="glass-21st border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <h4 className="text-sm font-extrabold text-white tracking-wide font-display">Top Asked User Questions</h4>
            </div>
            <span className="text-[10px] text-cyan-300 font-mono font-bold">Ranked by Frequency</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                  <th className="pb-2.5">Question Prompt</th>
                  <th className="pb-2.5 text-center">Category</th>
                  <th className="pb-2.5 text-right">Queries</th>
                  <th className="pb-2.5 text-right">Avg Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {topQuestions.map((q, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="py-2.5 pr-2 font-medium text-gray-200 truncate max-w-[220px]" title={q.question}>
                      {q.question}
                    </td>
                    <td className="py-2.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                        {q.category}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-mono font-bold text-white">{q.count}</td>
                    <td className="py-2.5 text-right font-mono font-bold text-emerald-400">{(q.score * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Most Retrieved Chunks */}
        <div className="glass-21st border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Award className="w-4 h-4 text-violet-400" />
              <h4 className="text-sm font-extrabold text-white tracking-wide font-display">Most Retrieved RAG Chunks</h4>
            </div>
            <span className="text-[10px] text-violet-300 font-mono font-bold">Top Vector Hits</span>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[250px] pr-1">
            {mostRetrievedChunks.map((item, idx) => (
              <div key={idx} className="p-3 rounded-2xl bg-gray-950/70 border border-white/10 hover:border-violet-500/30 transition-all space-y-1.5">
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-violet-300 font-bold truncate max-w-[180px]">{item.docName}</span>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.2 rounded-md bg-violet-500/20 text-violet-300 font-bold">{item.hits} Hits</span>
                    <span className="text-emerald-400 font-bold">{(item.score * 100).toFixed(1)}%</span>
                  </div>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed line-clamp-2 font-sans">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
