import React, { useState, useMemo } from 'react';
import { 
  Brain, Trash2, Plus, Search, Tag, Info, Clock, MessageSquare, Edit3
} from 'lucide-react';
import { mockStorage, type MemoryItem } from '../services/mockStorage';

interface MemoryExplorerProps {
  memories: MemoryItem[];
  onDeleteMemory: (id: string) => void;
  onAddMemory: (key: string, value: string, category: 'User Info' | 'Preference' | 'Custom') => void;
}

export const MemoryExplorer: React.FC<MemoryExplorerProps> = ({
  memories,
  onDeleteMemory,
  onAddMemory,
}) => {
  const [activeTab, setActiveTab] = useState<'cards' | 'timeline'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'created' | 'updated' | 'used' | 'deleted'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState<'User Info' | 'Preference' | 'Custom'>('User Info');
  const [isAdding, setIsAdding] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKey, setEditKey] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editCategory, setEditCategory] = useState<'User Info' | 'Preference' | 'Custom'>('User Info');

  const handleStartEdit = (m: MemoryItem) => {
    setEditingId(m.id);
    setEditKey(m.key);
    setEditValue(m.value);
    setEditCategory(m.category);
  };

  const handleSaveEdit = (id: string) => {
    if (!editKey.trim() || !editValue.trim()) return;
    const now = new Date().toISOString();

    const updatedMemories = memories.map(m => {
      if (m.id === id) {
        return {
          ...m,
          key: editKey.trim().toLowerCase().replace(/\s+/g, '_'),
          value: editValue.trim(),
          category: editCategory,
          updatedAt: now,
          events: [
            ...(m.events || []),
            { id: `ev-manual-upd-${Date.now()}`, type: 'updated' as const, timestamp: now, note: `Manually edited memory key "${editKey}"` }
          ]
        };
      }
      return m;
    });

    mockStorage.setMemories(updatedMemories);
    setEditingId(null);
  };

  // Deleted memories audit log cache for timeline view
  const [deletedEvents, setDeletedEvents] = useState<{ id: string; memoryKey: string; timestamp: string; note: string }[]>([
    {
      id: 'del-1',
      memoryKey: 'temporary_session_id',
      timestamp: '2026-07-30T18:45:00.000Z',
      note: 'Deleted temporary session identifier by admin'
    }
  ]);

  const handleDeleteWithAudit = (id: string, keyName: string) => {
    onDeleteMemory(id);
    setDeletedEvents(prev => [
      {
        id: `del-${Date.now()}`,
        memoryKey: keyName,
        timestamp: new Date().toISOString(),
        note: `Permanently removed memory node "${keyName}" from active LLM context.`
      },
      ...prev
    ]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;

    const formattedKey = newKey.trim().toLowerCase().replace(/\s+/g, '_');
    onAddMemory(formattedKey, newValue.trim(), newCategory);
    
    setNewKey('');
    setNewValue('');
    setIsAdding(false);
  };

  // Filtered Memory Cards
  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      const matchesSearch = 
        m.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = categoryFilter === 'all' || m.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [memories, searchTerm, categoryFilter]);

  // Assembled Chronological Timeline Events
  const timelineEvents = useMemo(() => {
    const events: {
      id: string;
      memoryKey: string;
      category: string;
      type: 'created' | 'updated' | 'used' | 'deleted';
      timestamp: string;
      note: string;
    }[] = [];

    // 1. Gather active memory events
    memories.forEach(m => {
      if (m.events && m.events.length > 0) {
        m.events.forEach(ev => {
          events.push({
            id: ev.id,
            memoryKey: m.key,
            category: m.category,
            type: ev.type,
            timestamp: ev.timestamp,
            note: ev.note || `Memory event for ${m.key}`
          });
        });
      } else {
        // Fallback default created event
        events.push({
          id: `ev-def-${m.id}`,
          memoryKey: m.key,
          category: m.category,
          type: 'created',
          timestamp: m.createdAt,
          note: `Seeded memory node: "${m.key}" = "${m.value}"`
        });
      }
    });

    // 2. Add deleted memory log entries
    deletedEvents.forEach(del => {
      events.push({
        id: del.id,
        memoryKey: del.memoryKey,
        category: 'Custom',
        type: 'deleted',
        timestamp: del.timestamp,
        note: del.note
      });
    });

    // 3. Filter timeline events
    const filtered = events.filter(e => {
      const matchesSearch = 
        e.memoryKey.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.note.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || e.type === statusFilter;
      const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });

    // Sort newest to oldest
    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [memories, deletedEvents, searchTerm, statusFilter, categoryFilter]);

  // Color Coding Helper for Event Types
  const getEventBadgeStyle = (type: 'created' | 'updated' | 'used' | 'deleted') => {
    switch (type) {
      case 'created':
        return { badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', label: '🟢 Created', dot: 'bg-emerald-400' };
      case 'updated':
        return { badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30', label: '🟡 Updated', dot: 'bg-amber-400' };
      case 'used':
        return { badge: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30', label: '🔵 Used', dot: 'bg-cyan-400' };
      case 'deleted':
        return { badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30', label: '🔴 Deleted', dot: 'bg-rose-400' };
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'User Info':
        return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
      case 'Preference':
        return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      default:
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
    }
  };

  return (
    <div className="w-full space-y-6 text-left animate-fadeIn">
      
      {/* ── 1. HEADER & VIEW NAVIGATION TABS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-21st p-5 rounded-3xl border border-white/10 shadow-2xl">
        <div className="flex items-center space-x-3 text-left">
          <div className="w-11 h-11 rounded-2xl bg-purple-500/15 flex items-center justify-center border border-purple-500/30 shadow-lg shadow-purple-500/20">
            <Brain className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-extrabold text-white tracking-wide font-display">Semantic Memory Engine</h4>
              <span className="text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-0.5 rounded-full">
                LLM Dual Sync
              </span>
            </div>
            <p className="text-xs text-gray-400">Stateful user preferences & identity variables included before every LLM prompt</p>
          </div>
        </div>

        {/* View Tabs & Seed Button */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <button
            onClick={() => setActiveTab('cards')}
            className={`px-3.5 py-2 rounded-xl border transition-all font-bold cursor-pointer ${activeTab === 'cards' ? 'bg-purple-500 text-white border-purple-400 shadow-md' : 'bg-gray-950/80 border-white/10 text-gray-400 hover:text-white'}`}
          >
            Memory Cards ({memories.length})
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-3.5 py-2 rounded-xl border transition-all font-bold cursor-pointer flex items-center space-x-1.5 ${activeTab === 'timeline' ? 'bg-purple-500 text-white border-purple-400 shadow-md' : 'bg-gray-950/80 border-white/10 text-gray-400 hover:text-white'}`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Memory Timeline</span>
          </button>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="btn-glow-cyan px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Seed Memory</span>
          </button>
        </div>
      </div>

      {/* ── 2. FILTERS & SEARCH CONTROL BAR ── */}
      <div className="glass-21st p-4 rounded-3xl border border-white/10 shadow-xl flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        
        {/* Search Bar */}
        <div className="relative flex-grow max-w-sm">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search memories by key, value, or event notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-950/90 border border-white/10 text-xs rounded-xl pl-9 pr-4 py-2 text-gray-200 focus:outline-none focus:border-purple-500 transition-all font-mono placeholder-gray-500"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center space-x-2 flex-wrap">
          {activeTab === 'timeline' && (
            <div className="flex items-center space-x-1">
              <span className="text-[10px] text-gray-400 uppercase font-bold">Event:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-gray-950 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-cyan-300 font-bold focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="all">All Events</option>
                <option value="created">🟢 Created</option>
                <option value="updated">🟡 Updated</option>
                <option value="used">🔵 Used</option>
                <option value="deleted">🔴 Deleted</option>
              </select>
            </div>
          )}

          <div className="flex items-center space-x-1">
            <span className="text-[10px] text-gray-400 uppercase font-bold">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-gray-950 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-gray-200 font-bold focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="User Info">User Info</option>
              <option value="Preference">Preference</option>
              <option value="Custom">Custom</option>
            </select>
          </div>
        </div>

      </div>

      {/* Manual Memory Form */}
      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="glass-21st border border-purple-500/30 rounded-3xl p-5 space-y-4 shadow-2xl animate-fadeIn"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h5 className="text-sm font-bold text-white flex items-center gap-2 font-display">
              <Plus className="w-4 h-4 text-cyan-400" />
              Seed Stateful Memory Variable
            </h5>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-gray-400 hover:text-white text-xs font-mono"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-gray-300 font-bold">Memory Key</label>
              <input
                type="text"
                placeholder="e.g. user_nickname"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="w-full bg-gray-950/90 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-gray-300 font-bold">Memory Value</label>
              <input
                type="text"
                placeholder="e.g. Ameer Basha"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="w-full bg-gray-950/90 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-sans"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-gray-300 font-bold">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="w-full bg-gray-950/90 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono cursor-pointer"
              >
                <option value="User Info">User Info</option>
                <option value="Preference">Preference</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="btn-glow-purple px-5 py-2.5 rounded-xl text-xs font-bold font-mono cursor-pointer"
            >
              Save Memory Node
            </button>
          </div>
        </form>
      )}

      {/* ── 3. TAB CONTENT 1: ACTIVE MEMORY CARDS VIEW ── */}
      {activeTab === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMemories.length > 0 ? (
            filteredMemories.map((mem) => {
              const usedCount = mem.usedCount ?? 6;
              return (
                <div
                  key={mem.id}
                  className="glass-21st border border-white/10 hover:border-purple-500/40 rounded-3xl p-5 space-y-3 shadow-xl transition-all hover:bg-gray-900/60 relative group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${getCategoryColor(mem.category)}`}>
                        {mem.category}
                      </span>

                      {/* Response Usage Metric */}
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-mono font-bold">
                        <MessageSquare className="w-3 h-3 text-cyan-400" />
                        <span>Used in {usedCount} responses</span>
                      </span>
                    </div>

                    {editingId === mem.id ? (
                      <div className="space-y-2 text-left pt-1">
                        <input
                          type="text"
                          value={editKey}
                          onChange={(e) => setEditKey(e.target.value)}
                          className="w-full bg-gray-950 border border-cyan-500 rounded-xl px-2.5 py-1 text-xs text-cyan-300 font-mono focus:outline-none"
                          placeholder="Memory Key"
                        />
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          rows={2}
                          className="w-full bg-gray-950 border border-cyan-500 rounded-xl px-2.5 py-1 text-xs text-white font-sans focus:outline-none resize-none"
                          placeholder="Memory Value"
                        />
                        <div className="flex items-center justify-between pt-1">
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value as any)}
                            className="bg-gray-950 border border-white/10 rounded-lg px-2 py-0.5 text-[10px] text-gray-300 font-mono"
                          >
                            <option value="User Info">User Info</option>
                            <option value="Preference">Preference</option>
                            <option value="Custom">Custom</option>
                          </select>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleSaveEdit(mem.id)}
                              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-bold font-mono rounded-lg transition-colors cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] font-mono rounded-lg transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-xs font-mono font-extrabold text-cyan-300 tracking-wide flex items-center space-x-1">
                          <Tag className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{mem.key}</span>
                        </div>
                        <div className="text-sm font-semibold text-white mt-1 font-sans leading-relaxed">
                          "{mem.value}"
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-white/10 pt-3 flex items-center justify-between text-[10px] font-mono text-gray-400">
                    <span>Created: {new Date(mem.createdAt).toLocaleDateString()}</span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleStartEdit(mem)}
                        className="p-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 transition-colors cursor-pointer"
                        title="Edit memory key/value"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteWithAudit(mem.id, mem.key)}
                        className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors cursor-pointer"
                        title="Delete memory key"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full border border-white/10 bg-gray-950/40 rounded-3xl p-8 text-center space-y-3">
              <Info className="w-8 h-8 text-gray-500 mx-auto" />
              <p className="text-sm font-bold text-white">No memory nodes found</p>
              <p className="text-xs text-gray-400">Seed a new memory node above to test stateful LLM prompt injections.</p>
            </div>
          )}
        </div>
      )}

      {/* ── 4. TAB CONTENT 2: MEMORY TIMELINE AUDIT VIEW ── */}
      {activeTab === 'timeline' && (
        <div className="glass-21st border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-purple-400" />
              <h4 className="text-sm font-extrabold text-white font-display tracking-wide">
                Chronological Memory Audit Stream
              </h4>
            </div>
            <span className="text-[10px] text-purple-300 font-mono font-bold">
              {timelineEvents.length} Event{timelineEvents.length !== 1 ? 's' : ''} Logged
            </span>
          </div>

          {/* Vertical Timeline Stream */}
          <div className="relative pl-6 space-y-6 border-l-2 border-white/10">
            {timelineEvents.length > 0 ? (
              timelineEvents.map((ev) => {
                const style = getEventBadgeStyle(ev.type);
                return (
                  <div key={ev.id} className="relative group text-left">
                    {/* Timeline Node Dot */}
                    <div className={`absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full ${style.dot} border-2 border-gray-950 shadow-md`} />

                    <div className="bg-gray-950/90 border border-white/10 hover:border-purple-500/40 rounded-2xl p-4 space-y-2 transition-all shadow-md">
                      <div className="flex items-center justify-between gap-2 flex-wrap font-mono text-[11px]">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold border ${style.badge}`}>
                            {style.label}
                          </span>
                          <span className="text-white font-extrabold">{ev.memoryKey}</span>
                        </div>

                        <span className="text-gray-400">
                          {new Date(ev.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-xs text-gray-300 font-sans leading-relaxed">
                        {ev.note}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs font-mono text-gray-500 py-4">No matching timeline events found.</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
export default MemoryExplorer;
