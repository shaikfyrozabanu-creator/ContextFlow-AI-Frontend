import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Trash2, RefreshCw, CheckCircle2, Search, Terminal,
  Cpu, Database, Brain, Zap, HardDrive, Layers
} from 'lucide-react';
import { mockStorage, type Document } from '../services/mockStorage';
import { FileUploadZone } from './FileUploadZone';
import { toast } from './Toast';

interface AdminSystemPanelProps {
  documents: Document[];
  memoryCount: number;
  onRefresh: () => void;
}

interface LlmLogEntry {
  id: string;
  timestamp: string;
  method: 'POST' | 'GET';
  endpoint: string;
  status: number;
  latencyMs: number;
  tokens: number;
  detail: string;
}

export const AdminSystemPanel: React.FC<AdminSystemPanelProps> = ({
  documents,
  memoryCount,
  onRefresh,
}) => {
  const [docSearch, setDocSearch] = useState('');
  const [reindexingDocId, setReindexingDocId] = useState<string | null>(null);
  const [embeddingProgress, setEmbeddingProgress] = useState<number>(0);
  const [logFilter, setLogFilter] = useState<'all' | 'chat' | 'health'>('all');

  // Live streaming mock LLM logs
  const [llmLogs, setLlmLogs] = useState<LlmLogEntry[]>([
    {
      id: 'log-1',
      timestamp: new Date(Date.now() - 120000).toLocaleTimeString(),
      method: 'POST',
      endpoint: '/chat',
      status: 200,
      latencyMs: 215,
      tokens: 482,
      detail: 'Retrieved 3 chunks from Pinecone. LLM response generated successfully using Groq Llama-3.3-70B.'
    },
    {
      id: 'log-2',
      timestamp: new Date(Date.now() - 60000).toLocaleTimeString(),
      method: 'GET',
      endpoint: '/health',
      status: 200,
      latencyMs: 18,
      tokens: 0,
      detail: 'Health check OK. Vector DB Pinecone connected.'
    },
    {
      id: 'log-3',
      timestamp: new Date().toLocaleTimeString(),
      method: 'POST',
      endpoint: '/chat',
      status: 200,
      latencyMs: 198,
      tokens: 524,
      detail: 'Memory node injected. Context synthesized with 98.4% cosine match.'
    }
  ]);

  // Append new log periodically for live terminal feel
  useEffect(() => {
    const interval = setInterval(() => {
      const isChat = Math.random() > 0.4;
      const newEntry: LlmLogEntry = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        method: isChat ? 'POST' : 'GET',
        endpoint: isChat ? '/chat' : '/health',
        status: 200,
        latencyMs: Math.floor(Math.random() * 180) + 120,
        tokens: isChat ? Math.floor(Math.random() * 300) + 300 : 0,
        detail: isChat 
          ? 'Query vector generated. Top 5 chunks retrieved from Pinecone index space.' 
          : 'Heartbeat ping: Pinecone vector index 100% active.'
      };
      setLlmLogs(prev => [newEntry, ...prev.slice(0, 15)]);
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  // Compute System Statistics
  const systemStats = useMemo(() => {
    const totalDocs = documents.length;
    const indexedDocs = documents.filter(d => d.status === 'indexed');
    const totalChunks = documents.reduce((sum, d) => sum + (d.chunkCount || 0), 0);
    const totalBytes = documents.reduce((sum, d) => sum + d.size, 0);
    const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
    
    // Average chunk length calculation
    let totalChars = 0;
    documents.forEach(d => {
      d.chunks.forEach(c => {
        totalChars += c.charCount || c.text.length;
      });
    });
    const avgChunkLength = totalChunks > 0 ? Math.round(totalChars / totalChunks) : 520;

    return {
      totalDocs,
      indexedCount: indexedDocs.length,
      totalChunks,
      totalMB,
      avgChunkLength,
      vectorCount: totalChunks,
      memoryCount,
      apiCalls: 248,
      storageGaugePct: Math.min(100, Math.round((totalBytes / (50 * 1024 * 1024)) * 100))
    };
  }, [documents, memoryCount]);

  // Re-embed Document Trigger with 0% -> 100% Progress Animation
  const handleReindexDocument = (docId: string, docName: string) => {
    setReindexingDocId(docId);
    setEmbeddingProgress(0);

    const interval = setInterval(() => {
      setEmbeddingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setReindexingDocId(null);
          toast.success('Document Re-embedded!', `Re-generated vector embeddings for "${docName}".`);
          onRefresh();
          return 100;
        }
        return prev + 20;
      });
    }, 300);
  };

  // Delete Document
  const handleDeleteDocument = (docId: string, docName: string) => {
    const updated = documents.filter(d => d.id !== docId);
    mockStorage.setDocuments(updated);
    toast.info('Document Deleted', `Removed "${docName}" from index and vector storage.`);
    onRefresh();
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filteredLogs = llmLogs.filter(l => {
    if (logFilter === 'chat') return l.endpoint === '/chat';
    if (logFilter === 'health') return l.endpoint === '/health';
    return true;
  });

  return (
    <div className="w-full space-y-8 text-left animate-fadeIn">

      {/* ── 1. LIVE METRICS GRID (6 SYSTEM METRIC CARDS) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Document Stats */}
        <div className="p-5 rounded-3xl glass-21st border border-white/10 shadow-2xl flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <span className="text-[10px] text-cyan-300 font-mono uppercase tracking-widest font-bold block">Document Statistics</span>
            <div className="text-xl font-extrabold text-white font-mono">{systemStats.totalDocs} Documents</div>
            <p className="text-[10px] text-gray-400 font-mono">{systemStats.totalMB} MB Storage Total</p>
          </div>
        </div>

        {/* Chunk Stats */}
        <div className="p-5 rounded-3xl glass-21st border border-white/10 shadow-2xl flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
            <Layers className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <span className="text-[10px] text-indigo-300 font-mono uppercase tracking-widest font-bold block">Chunk Statistics</span>
            <div className="text-xl font-extrabold text-white font-mono">{systemStats.totalChunks} Chunks</div>
            <p className="text-[10px] text-gray-400 font-mono">Avg {systemStats.avgChunkLength} Chars / Chunk</p>
          </div>
        </div>

        {/* Vector Count */}
        <div className="p-5 rounded-3xl glass-21st border border-white/10 shadow-2xl flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
            <Database className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <span className="text-[10px] text-emerald-300 font-mono uppercase tracking-widest font-bold block">Pinecone Vector Count</span>
            <div className="text-xl font-extrabold text-emerald-400 font-mono">{systemStats.vectorCount} Vectors</div>
            <p className="text-[10px] text-gray-400 font-mono">384-Dim Cosine Distance</p>
          </div>
        </div>

        {/* Memory Count */}
        <div className="p-5 rounded-3xl glass-21st border border-white/10 shadow-2xl flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
            <Brain className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <span className="text-[10px] text-purple-300 font-mono uppercase tracking-widest font-bold block">Memory Count</span>
            <div className="text-xl font-extrabold text-white font-mono">{systemStats.memoryCount} Memory Nodes</div>
            <p className="text-[10px] text-gray-400 font-mono">LLM System Prompt Synced</p>
          </div>
        </div>

        {/* API Usage */}
        <div className="p-5 rounded-3xl glass-21st border border-white/10 shadow-2xl flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
            <Zap className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <span className="text-[10px] text-amber-300 font-mono uppercase tracking-widest font-bold block">API Usage (Groq / Gemini)</span>
            <div className="text-xl font-extrabold text-white font-mono">{systemStats.apiCalls} Requests</div>
            <p className="text-[10px] text-emerald-400 font-mono font-bold">99.8% Healthy</p>
          </div>
        </div>

        {/* Storage Usage */}
        <div className="p-5 rounded-3xl glass-21st border border-white/10 shadow-2xl flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center flex-shrink-0">
            <HardDrive className="w-6 h-6 text-rose-400" />
          </div>
          <div className="flex-grow min-w-0">
            <span className="text-[10px] text-rose-300 font-mono uppercase tracking-widest font-bold block">Storage Usage</span>
            <div className="flex items-center justify-between font-mono">
              <span className="text-sm font-extrabold text-white">{systemStats.totalMB} MB</span>
              <span className="text-[10px] text-gray-400">{systemStats.storageGaugePct}% of 50 MB</span>
            </div>
            {/* Storage Progress Bar */}
            <div className="w-full bg-gray-900 rounded-full h-1.5 mt-1 overflow-hidden">
              <div className="bg-rose-500 h-full rounded-full transition-all" style={{ width: `${systemStats.storageGaugePct}%` }} />
            </div>
          </div>
        </div>

      </div>

      {/* ── 2. UPLOAD & EMBEDDING PROGRESS PANEL ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-1 text-left space-y-4 glass-21st p-6 rounded-3xl border border-white/10 shadow-2xl">
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-extrabold text-white tracking-wide font-display">Knowledge Ingestion</h3>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Upload PDFs or support documents into Pinecone vector storage. Documents undergo automatic chunking, 384-dimensional vector embedding, and real-time indexing.
          </p>
        </div>

        <div className="lg:col-span-2">
          <FileUploadZone onUploadSuccess={onRefresh} />
        </div>
      </div>

      {/* Re-embedding Global Progress Bar */}
      {reindexingDocId && (
        <div className="glass-21st border border-cyan-500/40 p-5 rounded-3xl shadow-2xl space-y-2.5 animate-fadeIn">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-cyan-300 font-bold flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
              Re-embedding Document Vector Chunks...
            </span>
            <span className="text-cyan-400 font-extrabold">{embeddingProgress}%</span>
          </div>
          <div className="w-full bg-gray-950 rounded-full h-2.5 border border-white/10 overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full rounded-full transition-all duration-300" style={{ width: `${embeddingProgress}%` }} />
          </div>
        </div>
      )}

      {/* ── 3. DOCUMENTS TABLE WITH RE-EMBED & DELETE ACTIONS ── */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="text-left">
            <h3 className="text-base font-extrabold text-white tracking-wide font-display">Knowledge Base Documents</h3>
            <p className="text-xs text-gray-400">Files actively queried by the RAG engine</p>
          </div>

          {documents.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                value={docSearch}
                onChange={e => setDocSearch(e.target.value)}
                placeholder="Search documents..."
                className="bg-gray-950/80 border border-white/10 rounded-2xl pl-9 pr-4 py-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-500 placeholder-gray-600 w-56 font-mono"
              />
            </div>
          )}
        </div>

        {(() => {
          const filtered = documents.filter(d =>
            !docSearch.trim() || d.name.toLowerCase().includes(docSearch.toLowerCase())
          );
          return filtered.length > 0 ? (
            <div className="overflow-x-auto rounded-3xl glass-21st border border-white/10 shadow-2xl">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-gray-950/80 font-mono text-[10px] text-cyan-300 uppercase tracking-widest">
                    <th className="p-4 font-bold">Document Name</th>
                    <th className="p-4 font-bold">Size</th>
                    <th className="p-4 font-bold">Uploaded</th>
                    <th className="p-4 font-bold">Chunks</th>
                    <th className="p-4 font-bold">Status</th>
                    <th className="p-4 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map((doc) => (
                    <tr key={doc.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-bold text-white flex items-center space-x-2.5 max-w-[220px] truncate">
                        <FileText className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                        <span className="truncate" title={doc.name}>{doc.name}</span>
                      </td>
                      <td className="p-4 text-gray-300 font-mono">{formatSize(doc.size)}</td>
                      <td className="p-4 text-gray-400">{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                      <td className="p-4 text-cyan-400 font-mono font-bold">{doc.chunkCount}</td>
                      <td className="p-4">
                        {doc.status === 'indexed' ? (
                          <span className="inline-flex items-center space-x-1 text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold px-2.5 py-0.5 rounded-full font-mono">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Indexed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-[10px] bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold px-2.5 py-0.5 rounded-full font-mono">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Embedding</span>
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right flex justify-end items-center space-x-2">
                        <button
                          onClick={() => handleReindexDocument(doc.id, doc.name)}
                          disabled={reindexingDocId === doc.id}
                          className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-gray-800 transition-colors cursor-pointer"
                          title="Re-embed document vector chunks"
                        >
                          <RefreshCw className={`w-4 h-4 ${reindexingDocId === doc.id ? 'animate-spin text-cyan-400' : ''}`} />
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc.id, doc.name)}
                          className="text-gray-400 hover:text-red-400 p-2 rounded-xl hover:bg-gray-800 transition-colors cursor-pointer"
                          title="Delete document and vector index"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-36 glass-21st rounded-3xl text-center p-6 text-gray-500 border border-white/10">
              <FileText className="w-8 h-8 text-gray-600 mb-2 animate-pulse" />
              <p className="text-sm font-bold text-white">No documents uploaded yet</p>
              <p className="text-xs text-gray-400 mt-1">Use the upload portal above to register PDFs into Pinecone vector storage.</p>
            </div>
          );
        })()}
      </div>

      {/* ── 4. LIVE LLM REQUEST & RESPONSE LOGS TERMINAL ── */}
      <div className="glass-21st border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-extrabold text-white tracking-wide font-display">Live LLM Operations Console</h3>
          </div>

          {/* Log Filters */}
          <div className="flex items-center space-x-2 font-mono text-xs">
            <button
              onClick={() => setLogFilter('all')}
              className={`px-3 py-1 rounded-xl border transition-all font-bold cursor-pointer ${logFilter === 'all' ? 'bg-cyan-500 text-white border-cyan-400' : 'bg-gray-950/80 border-white/10 text-gray-400'}`}
            >
              All Logs
            </button>
            <button
              onClick={() => setLogFilter('chat')}
              className={`px-3 py-1 rounded-xl border transition-all font-bold cursor-pointer ${logFilter === 'chat' ? 'bg-cyan-500 text-white border-cyan-400' : 'bg-gray-950/80 border-white/10 text-gray-400'}`}
            >
              Chat API
            </button>
            <button
              onClick={() => setLogFilter('health')}
              className={`px-3 py-1 rounded-xl border transition-all font-bold cursor-pointer ${logFilter === 'health' ? 'bg-cyan-500 text-white border-cyan-400' : 'bg-gray-950/80 border-white/10 text-gray-400'}`}
            >
              Health Ping
            </button>
          </div>
        </div>

        {/* Terminal Log Output Window */}
        <div className="bg-gray-950/95 border border-white/10 rounded-2xl p-4 font-mono text-xs space-y-2.5 max-h-64 overflow-y-auto shadow-inner text-left">
          {filteredLogs.map(log => (
            <div key={log.id} className="flex items-start space-x-2.5 border-b border-white/5 pb-2">
              <span className="text-gray-500 text-[10px]">{log.timestamp}</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${log.method === 'POST' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'}`}>
                {log.method} {log.endpoint}
              </span>
              <span className="text-emerald-400 font-bold">{log.status} OK</span>
              <span className="text-gray-400">({log.latencyMs}ms)</span>
              <span className="text-gray-300 flex-grow font-sans text-xs truncate" title={log.detail}>
                {log.detail}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
export default AdminSystemPanel;
