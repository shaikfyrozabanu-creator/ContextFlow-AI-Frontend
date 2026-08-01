import React, { useState, useMemo } from 'react';
import { 
  Flame, Zap, Snowflake, Search, FileText, Info, BarChart3
} from 'lucide-react';
import type { Document, DocumentChunk } from '../services/mockStorage';

interface RetrievalHeatmapProps {
  documents: Document[];
}

interface EnrichedChunk extends DocumentChunk {
  docName: string;
  docId: string;
  pageNumber: number;
  retrievalCount: number;
  tier: 'frequently' | 'rarely' | 'never';
}

export const RetrievalHeatmap: React.FC<RetrievalHeatmapProps> = ({ documents }) => {
  const [selectedDocId, setSelectedDocId] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<'all' | 'frequently' | 'rarely' | 'never'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeChunk, setActiveChunk] = useState<EnrichedChunk | null>(null);

  // Derive retrieval counts & classify chunks into tiers
  const enrichedDocs = useMemo(() => {
    return documents.map(doc => {
      const enrichedChunks: EnrichedChunk[] = doc.chunks.map((chunk, idx) => {
        // Deterministic mock retrieval count based on chunk text length and position
        let retrievalCount = 0;
        const seed = (chunk.text.length * (idx + 1) * 7) % 31;
        if (seed > 15) {
          retrievalCount = seed + 4; // Frequently Used (Hot)
        } else if (seed > 4) {
          retrievalCount = seed - 2; // Rarely Used (Warm)
        } else {
          retrievalCount = 0; // Never Used (Cold)
        }

        let tier: 'frequently' | 'rarely' | 'never' = 'never';
        if (retrievalCount >= 10) tier = 'frequently';
        else if (retrievalCount > 0) tier = 'rarely';

        return {
          ...chunk,
          docName: doc.name,
          docId: doc.id,
          pageNumber: idx + 1,
          retrievalCount,
          tier,
        };
      });

      const freqCount = enrichedChunks.filter(c => c.tier === 'frequently').length;
      const rareCount = enrichedChunks.filter(c => c.tier === 'rarely').length;
      const neverCount = enrichedChunks.filter(c => c.tier === 'never').length;

      return {
        ...doc,
        chunks: enrichedChunks,
        freqCount,
        rareCount,
        neverCount,
      };
    });
  }, [documents]);

  // Overall Statistics
  const totalStats = useMemo(() => {
    let totalChunks = 0;
    let freqTotal = 0;
    let rareTotal = 0;
    let neverTotal = 0;
    let sumRetrievals = 0;

    enrichedDocs.forEach(d => {
      d.chunks.forEach(c => {
        totalChunks++;
        sumRetrievals += c.retrievalCount;
        if (c.tier === 'frequently') freqTotal++;
        else if (c.tier === 'rarely') rareTotal++;
        else neverTotal++;
      });
    });

    return { totalChunks, freqTotal, rareTotal, neverTotal, sumRetrievals };
  }, [enrichedDocs]);

  // Filtered Documents & Chunks
  const displayedDocs = useMemo(() => {
    return enrichedDocs
      .filter(d => selectedDocId === 'all' || d.id === selectedDocId)
      .map(d => {
        const filteredChunks = d.chunks.filter(c => {
          const matchesTier = tierFilter === 'all' || c.tier === tierFilter;
          const matchesSearch = !searchTerm.trim() || c.text.toLowerCase().includes(searchTerm.toLowerCase());
          return matchesTier && matchesSearch;
        });
        return { ...d, chunks: filteredChunks };
      })
      .filter(d => d.chunks.length > 0);
  }, [enrichedDocs, selectedDocId, tierFilter, searchTerm]);

  // Color Coding Helper for Heatmap Nodes
  const getNodeColorStyle = (tier: 'frequently' | 'rarely' | 'never') => {
    switch (tier) {
      case 'frequently':
        return 'bg-gradient-to-tr from-rose-500 via-amber-500 to-yellow-400 text-white shadow-lg shadow-rose-500/25 border-rose-400/40 hover:scale-105';
      case 'rarely':
        return 'bg-gradient-to-tr from-amber-500 to-yellow-500 text-gray-950 shadow-md shadow-amber-500/15 border-amber-400/30 hover:scale-105';
      case 'never':
        return 'bg-gray-900 text-gray-400 border-white/10 hover:border-cyan-500/40 hover:scale-105';
    }
  };

  return (
    <div className="w-full space-y-6 text-left animate-fadeIn">

      {/* ── 1. HEADER STATS & SUMMARY ── */}
      <div className="glass-21st border border-white/10 rounded-3xl p-5 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Flame className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white font-display tracking-wide">
                Retrieval Heatmap Analysis
              </h3>
              <p className="text-xs text-gray-400 font-sans">
                Analyze chunk usage density across indexed documents to optimize RAG context recall.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 font-mono text-xs">
            <span className="px-3 py-1.5 rounded-xl bg-gray-950/80 border border-white/10 text-cyan-300 font-bold">
              Total Retrievals: {totalStats.sumRetrievals}
            </span>
          </div>
        </div>

        {/* Tier Counter Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
          <div className="p-4 rounded-2xl bg-gray-950/80 border border-rose-500/30 flex items-center justify-between shadow-lg">
            <div className="flex items-center space-x-2.5">
              <Flame className="w-5 h-5 text-rose-400" />
              <div>
                <span className="text-[10px] text-rose-300 font-bold uppercase tracking-widest block">Frequently Used</span>
                <span className="text-xs text-gray-400">🔥 10+ Retrievals</span>
              </div>
            </div>
            <span className="text-xl font-extrabold text-white">{totalStats.freqTotal}</span>
          </div>

          <div className="p-4 rounded-2xl bg-gray-950/80 border border-amber-500/30 flex items-center justify-between shadow-lg">
            <div className="flex items-center space-x-2.5">
              <Zap className="w-5 h-5 text-amber-400" />
              <div>
                <span className="text-[10px] text-amber-300 font-bold uppercase tracking-widest block">Rarely Used</span>
                <span className="text-xs text-gray-400">⚡ 1 - 9 Retrievals</span>
              </div>
            </div>
            <span className="text-xl font-extrabold text-white">{totalStats.rareTotal}</span>
          </div>

          <div className="p-4 rounded-2xl bg-gray-950/80 border border-white/10 flex items-center justify-between shadow-lg">
            <div className="flex items-center space-x-2.5">
              <Snowflake className="w-5 h-5 text-indigo-400" />
              <div>
                <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest block">Never Used</span>
                <span className="text-xs text-gray-400">🧊 0 Retrievals</span>
              </div>
            </div>
            <span className="text-xl font-extrabold text-white">{totalStats.neverTotal}</span>
          </div>
        </div>
      </div>

      {/* ── 2. FILTERS & SEARCH CONTROLS ── */}
      <div className="glass-21st p-4 rounded-3xl border border-white/10 shadow-xl flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        
        {/* Search Bar */}
        <div className="relative flex-grow max-w-sm">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search heatmap by chunk text..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-950/90 border border-white/10 text-xs rounded-xl pl-9 pr-4 py-2 text-gray-200 focus:outline-none focus:border-rose-500 transition-all placeholder-gray-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-3 flex-wrap">
          {/* Document Filter */}
          <div className="flex items-center space-x-1">
            <span className="text-[10px] text-gray-400 uppercase font-bold">Document:</span>
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="bg-gray-950 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-cyan-300 font-bold focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              <option value="all">All Documents ({documents.length})</option>
              {documents.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Usage Tier Filter */}
          <div className="flex items-center space-x-1">
            <span className="text-[10px] text-gray-400 uppercase font-bold">Heatmap Tier:</span>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value as any)}
              className="bg-gray-950 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-rose-400 font-bold focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              <option value="all">All Chunks</option>
              <option value="frequently">🔥 Frequently Used (10+)</option>
              <option value="rarely">⚡ Rarely Used (1-9)</option>
              <option value="never">🧊 Never Used (0)</option>
            </select>
          </div>
        </div>

      </div>

      {/* ── 3. HEATMAP CANVAS BY DOCUMENT ── */}
      <div className="space-y-6">
        {displayedDocs.length > 0 ? (
          displayedDocs.map((doc) => (
            <div key={doc.id} className="glass-21st border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4">
              
              {/* Document Subheader */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-wrap gap-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white font-display">{doc.name}</h4>
                    <p className="text-[10px] text-gray-400 font-mono">{doc.chunks.length} Chunk Node{doc.chunks.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                {/* Tier Counts Badges */}
                <div className="flex items-center space-x-2 font-mono text-[10px]">
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 font-bold">
                    🔥 {doc.freqCount} Hot
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                    ⚡ {doc.rareCount} Warm
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-white/10 font-bold">
                    🧊 {doc.neverCount} Cold
                  </span>
                </div>
              </div>

              {/* Heatmap Grid of Chunks */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {doc.chunks.map((chunk) => {
                  const nodeStyle = getNodeColorStyle(chunk.tier);
                  const isSelected = activeChunk?.id === chunk.id;
                  return (
                    <button
                      key={chunk.id}
                      onClick={() => setActiveChunk(chunk)}
                      className={`
                        p-3 rounded-2xl border transition-all duration-200 flex flex-col justify-between h-24 text-left cursor-pointer relative group
                        ${nodeStyle}
                        ${isSelected ? 'ring-2 ring-white scale-105 z-10' : ''}
                      `}
                    >
                      <div className="flex items-center justify-between w-full font-mono">
                        <span className="text-[10px] font-extrabold uppercase">p.{chunk.pageNumber}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/30 backdrop-blur-sm">
                          {chunk.retrievalCount}x
                        </span>
                      </div>

                      <div className="text-[10px] font-sans font-medium line-clamp-2 leading-tight opacity-90">
                        "{chunk.text}"
                      </div>
                    </button>
                  );
                })}
              </div>

            </div>
          ))
        ) : (
          <div className="glass-21st border border-white/10 rounded-3xl p-8 text-center space-y-3">
            <Info className="w-8 h-8 text-gray-500 mx-auto" />
            <p className="text-sm font-bold text-white">No chunks match current filter settings</p>
            <p className="text-xs text-gray-400 font-mono">Adjust the Document or Usage Tier filters to examine chunk heatmap nodes.</p>
          </div>
        )}
      </div>

      {/* ── 4. CHUNK HEATMAP INSPECTOR DRAWER ── */}
      {activeChunk && (
        <div className="glass-21st border border-rose-500/30 rounded-3xl p-5 shadow-2xl space-y-3 animate-fadeIn text-left">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-rose-400" />
              <h4 className="text-sm font-extrabold text-white font-display">
                Chunk Inspector — {activeChunk.docName} (Page {activeChunk.pageNumber})
              </h4>
            </div>
            <button
              onClick={() => setActiveChunk(null)}
              className="text-xs font-mono text-gray-400 hover:text-white cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-3 rounded-2xl bg-gray-950/80 border border-white/10">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Retrieval Count</span>
              <span className="text-lg font-extrabold text-cyan-300">{activeChunk.retrievalCount} Times</span>
            </div>

            <div className="p-3 rounded-2xl bg-gray-950/80 border border-white/10">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Usage Tier</span>
              <span className="text-lg font-extrabold text-rose-400 uppercase">{activeChunk.tier}</span>
            </div>

            <div className="p-3 rounded-2xl bg-gray-950/80 border border-white/10">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Chunk ID</span>
              <span className="text-xs font-extrabold text-white truncate block">{activeChunk.id}</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-gray-400 font-mono font-bold uppercase">Full Chunk Text Segment:</span>
            <div className="bg-gray-950/90 border border-white/10 rounded-2xl p-4 text-xs text-gray-200 leading-relaxed font-sans max-h-40 overflow-y-auto">
              "{activeChunk.text}"
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default RetrievalHeatmap;
