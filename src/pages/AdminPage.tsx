import React, { useState, useEffect } from 'react';
import { 
  FileText, Clock, RotateCcw, Layers, Cpu, Brain, Zap, Server, ChevronDown, ChevronUp, Activity, HelpCircle, RefreshCw
} from 'lucide-react';
import { mockStorage, type Document, type MemoryItem } from '../services/mockStorage';
import { ChunkVisualizer } from '../components/ChunkVisualizer';
import { MemoryExplorer } from '../components/MemoryExplorer';
import { AnalyticsDashboard } from '../components/AnalyticsDashboard';
import { RetrievalHeatmap } from '../components/RetrievalHeatmap';
import { AdminSystemPanel } from '../components/AdminSystemPanel';
import { AiSettingsPanel } from '../components/AiSettingsPanel';
import { DocumentComparator } from '../components/DocumentComparator';
import { API_BASE_URL } from '../services/apiConfig';
import { EvaluationPanel } from '../components/EvaluationPanel';
import { toast } from '../components/Toast';

// ─── Reusable Stat Card ────────────────────────────────────────
interface StatCardProps {
  icon: React.FC<{ className?: string }>;
  color?: string;
  label: string;
  value: string | number;
  sub?: string;
  valueColor?: string;
}
const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, sub, valueColor }) => (
  <div className="p-5 rounded-3xl glass-21st hover-glow-card flex items-center space-x-3.5 text-left shadow-2xl">
    <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/10">
      <Icon className="w-5.5 h-5.5 text-cyan-400" />
    </div>
    <div className="min-w-0">
      <span className="text-[10px] text-cyan-300/80 font-mono uppercase tracking-widest leading-none block font-bold">{label}</span>
      <div className={`text-xl sm:text-2xl font-extrabold mt-0.5 font-mono truncate ${valueColor ?? 'text-white'}`}>{value}</div>
      {sub && <p className="text-[10px] text-gray-400 font-mono truncate">{sub}</p>}
    </div>
  </div>
);


export const AdminPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'analytics' | 'upload' | 'vectors' | 'memory' | 'heatmap' | 'settings' | 'compare' | 'evaluation'>('analytics');
  const [stats, setStats] = useState({ pdfsUploaded: 0, totalChunksIndexed: 0, questionsAsked: 0, avgResponseTime: '—' });
  const [vectorDbStatus, setVectorDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [showSysInfo, setShowSysInfo] = useState(false);

  // Load resources from localStorage
  const loadResources = () => {
    setDocuments(mockStorage.getDocuments());
    setMemories(mockStorage.getMemories());
    setStats(mockStorage.getStats());
  };

  // Live health-check for vector DB status
  const checkVectorDb = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(4000) });
      setVectorDbStatus(res.ok ? 'connected' : 'error');
    } catch {
      setVectorDbStatus('error');
    }
  };

  useEffect(() => {
    loadResources();
    checkVectorDb();
    const interval = setInterval(checkVectorDb, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Start fresh new session (clears uploaded docs & chat history)
  const handleNewSession = () => {
    mockStorage.resetAllData();
    loadResources();
    toast.success('New Session Started!', 'All uploaded documents, chat history, and memory nodes reset.');
  };

  // Delete memory node
  const handleDeleteMemory = (memId: string) => {
    const updated = memories.filter(m => m.id !== memId);
    setMemories(updated);
    mockStorage.setMemories(updated);
    toast.info('Memory Deleted', 'Removed memory node from cognitive storage.');
  };

  // Seed memory node
  const handleAddMemory = (
    key: string,
    value: string,
    category: 'User Info' | 'Preference' | 'Custom'
  ) => {
    const newMem: MemoryItem = {
      id: `mem-${Date.now()}`,
      key,
      value,
      category,
      createdAt: new Date().toISOString()
    };

    const updated = [...memories, newMem];
    setMemories(updated);
    mockStorage.setMemories(updated);
    toast.success('Memory Node Seeded!', `Added ${key} to LLM prompt memory database.`);
  };

  return (
    <div className="space-y-8 text-left max-w-7xl mx-auto">
      
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">Knowledge Hub & Analytics</h2>
            <span className="badge-21st">21st.dev UI</span>
          </div>
          <p className="text-xs text-gray-400">Manage indexed vector documents and examine RAG application statistics</p>
        </div>

        <button
          onClick={handleNewSession}
          className="flex items-center space-x-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 hover:text-white px-4 py-2.5 rounded-2xl text-xs font-bold font-mono transition-all shadow-md cursor-pointer"
          title="Clear uploaded documents, chats, and start a fresh session"
        >
          <RotateCcw className="w-4 h-4 text-red-400" />
          <span>New Session</span>
        </button>
      </div>

      {/* ── 8-Card Statistics Grid ── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">

        {/* 1. Document Count */}
        <StatCard
          icon={FileText} color="cyan"
          label="Documents"
          value={documents.length}
        />

        {/* 2. Total Chunks */}
        <StatCard
          icon={Layers} color="indigo"
          label="Chunks Indexed"
          value={documents.reduce((s, d) => s + (d.chunkCount || 0), 0)}
        />

        {/* 3. Avg Response Time */}
        <StatCard
          icon={Clock} color="emerald"
          label="Avg Response Time"
          value={stats.avgResponseTime}
          valueColor="text-emerald-400"
        />

        {/* 4. Questions Asked */}
        <StatCard
          icon={HelpCircle} color="purple"
          label="Questions Asked"
          value={stats.questionsAsked}
        />

        {/* 5. Vector DB Status */}
        <div className="p-5 rounded-3xl glass-21st hover-glow-card flex items-center space-x-3.5 text-left shadow-2xl">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/10">
            <Server className="w-5.5 h-5.5 text-emerald-400" />
          </div>
          <div>
            <span className="text-[10px] text-cyan-300/80 font-mono uppercase tracking-widest leading-none font-bold">Vector DB</span>
            <div className="flex items-center gap-1.5 mt-1">
              {vectorDbStatus === 'checking' && (
                <><RefreshCw className="w-3 h-3 text-gray-400 animate-spin" /><span className="text-sm font-bold text-gray-400 font-mono">Checking…</span></>
              )}
              {vectorDbStatus === 'connected' && (
                <><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span className="text-sm font-bold text-emerald-400 font-mono">Connected</span></>
              )}
              {vectorDbStatus === 'error' && (
                <><span className="w-2 h-2 rounded-full bg-red-400" /><span className="text-sm font-bold text-red-400 font-mono">Offline</span></>
              )}
            </div>
            <span className="text-[10px] text-gray-500 font-mono">Pinecone Serverless</span>
          </div>
        </div>

        {/* 6. Embedding Model */}
        <StatCard
          icon={Cpu} color="cyan"
          label="Embedding Model"
          value="MiniLM-L6"
          sub="all-MiniLM-L6-v2"
        />

        {/* 7. LLM Model */}
        <StatCard
          icon={Zap} color="amber"
          label="LLM Model"
          value="Llama 3.3"
          sub="llama-3.3-70b-versatile"
          valueColor="text-amber-400"
        />

        {/* 8. Memory Nodes */}
        <StatCard
          icon={Brain} color="purple"
          label="Memory Nodes"
          value={memories.length}
        />

      </section>

      {/* ── Collapsible System Info Panel ── */}
      <div className="rounded-3xl glass-21st border border-white/10 overflow-hidden shadow-2xl">
        <button
          onClick={() => setShowSysInfo(s => !s)}
          className="w-full flex items-center justify-between p-4.5 text-left hover:bg-white/5 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold text-white font-display">System Configuration</span>
            <span className="text-[10px] font-mono text-cyan-300/70 font-bold ml-1">RAG Architecture Stack</span>
          </div>
          {showSysInfo ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {showSysInfo && (
          <div className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 border-t border-white/10 pt-4">
            {[
              { label: 'Backend', value: 'FastAPI (Python)' },
              { label: 'Embedding', value: 'all-MiniLM-L6-v2', mono: true },
              { label: 'Vector DB', value: 'Pinecone Serverless', mono: true },
              { label: 'Index Name', value: 'chatbot', mono: true },
              { label: 'Dimensions', value: '384', mono: true },
              { label: 'Top-K Retrieval', value: '5 chunks', mono: true },
              { label: 'LLM Provider', value: 'Groq Cloud', mono: true },
              { label: 'Chunk Size', value: '500 chars / 100 overlap', mono: true },
              { label: 'Session Memory', value: 'Supabase DB', mono: true },
              { label: 'Frontend', value: 'React + Vite', mono: false },
              { label: 'Chunk Strategy', value: 'Sliding Window', mono: false },
              { label: 'Similarity', value: 'Cosine Distance', mono: false },
            ].map(item => (
              <div key={item.label} className="p-3 rounded-2xl bg-gray-950/60 border border-white/5 space-y-0.5 text-left">
                <p className="text-[10px] uppercase tracking-widest text-cyan-300/80 font-mono font-bold">{item.label}</p>
                <p className={`text-xs font-bold text-white ${item.mono ? 'font-mono' : ''}`}>{item.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Admin Tab Panels navigation */}
      <section className="space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`pb-4 text-sm font-bold relative transition-colors cursor-pointer flex-shrink-0 ${activeTab === 'analytics' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >
            {activeTab === 'analytics' && (
              <span className="absolute bottom-0 left-0 w-full h-[2.5px] bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full" />
            )}
            <span>Analytics Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-4 text-sm font-bold relative transition-colors cursor-pointer flex-shrink-0 ${activeTab === 'upload' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >
            {activeTab === 'upload' && (
              <span className="absolute bottom-0 left-0 w-full h-[2.5px] bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full" />
            )}
            <span>Document Hub</span>
          </button>
          
          <button
            onClick={() => setActiveTab('vectors')}
            className={`pb-4 text-sm font-bold relative transition-colors cursor-pointer flex-shrink-0 ${activeTab === 'vectors' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >
            {activeTab === 'vectors' && (
              <span className="absolute bottom-0 left-0 w-full h-[2.5px] bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full" />
            )}
            <span>Vector Space Visualizer</span>
          </button>

          <button
            onClick={() => setActiveTab('memory')}
            className={`pb-4 text-sm font-bold relative transition-colors cursor-pointer flex-shrink-0 ${activeTab === 'memory' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >
            {activeTab === 'memory' && (
              <span className="absolute bottom-0 left-0 w-full h-[2.5px] bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full" />
            )}
            <span>Memory Engine</span>
          </button>

          <button
            onClick={() => setActiveTab('heatmap')}
            className={`pb-4 text-sm font-bold relative transition-colors cursor-pointer flex-shrink-0 ${activeTab === 'heatmap' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >
            {activeTab === 'heatmap' && (
              <span className="absolute bottom-0 left-0 w-full h-[2.5px] bg-gradient-to-r from-rose-400 to-amber-500 rounded-full" />
            )}
            <span>Retrieval Heatmap</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-4 text-sm font-bold relative transition-colors cursor-pointer flex-shrink-0 ${activeTab === 'settings' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >
            {activeTab === 'settings' && (
              <span className="absolute bottom-0 left-0 w-full h-[2.5px] bg-gradient-to-r from-cyan-400 to-emerald-500 rounded-full" />
            )}
            <span>AI Engine Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('compare')}
            className={`pb-4 text-sm font-bold relative transition-colors cursor-pointer flex-shrink-0 ${activeTab === 'compare' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >
            {activeTab === 'compare' && (
              <span className="absolute bottom-0 left-0 w-full h-[2.5px] bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full" />
            )}
            <span>PDF Comparator</span>
          </button>

          <button
            onClick={() => setActiveTab('evaluation')}
            className={`pb-4 text-sm font-bold relative transition-colors cursor-pointer flex-shrink-0 ${activeTab === 'evaluation' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >
            {activeTab === 'evaluation' && (
              <span className="absolute bottom-0 left-0 w-full h-[2.5px] bg-gradient-to-r from-violet-400 to-fuchsia-500 rounded-full" />
            )}
            <span>Evaluation</span>
          </button>
        </div>

        {/* Tab contents */}
        <div className="w-full">
          {activeTab === 'analytics' && <AnalyticsDashboard />}
          {activeTab === 'heatmap' && <RetrievalHeatmap documents={documents} />}
          {activeTab === 'settings' && <AiSettingsPanel />}
          {activeTab === 'compare' && <DocumentComparator documents={documents} />}
          {activeTab === 'evaluation' && <EvaluationPanel />}

          {activeTab === 'upload' && (
            <AdminSystemPanel 
              documents={documents} 
              memoryCount={memories.length} 
              onRefresh={loadResources} 
            />
          )}

          {activeTab === 'vectors' && (
            <div className="space-y-4">
              <div className="text-left max-w-2xl">
                <h3 className="text-lg font-bold text-white tracking-wide font-display">3D Vector Database Analysis</h3>
                <p className="text-xs text-gray-400 leading-relaxed mt-1">
                  Visualize the mathematical positions of text chunks in the embedding vector index space. 
                  Click and drag to rotate the axes. Hover or click chunk cards to view detail mapping.
                </p>
              </div>
              <div className="glass-21st rounded-3xl p-6 shadow-2xl">
                <ChunkVisualizer documents={documents.filter(d => d.status === 'indexed')} />
              </div>
            </div>
          )}

          {activeTab === 'memory' && (
            <div className="space-y-4">
              <div className="glass-21st rounded-3xl p-6 shadow-2xl">
                <MemoryExplorer 
                  memories={memories} 
                  onDeleteMemory={handleDeleteMemory} 
                  onAddMemory={handleAddMemory} 
                />
              </div>
            </div>
          )}
        </div>

      </section>

    </div>
  );
};
export default AdminPage;
