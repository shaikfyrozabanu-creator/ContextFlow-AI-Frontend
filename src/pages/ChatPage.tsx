import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Plus, MessageSquare, Trash2, Sliders, ToggleLeft, ToggleRight, Menu, RotateCcw,
  Search, Pin, Edit3, Check, X, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { mockStorage, type Chat, type ChatSettings } from '../services/mockStorage';
import { mockAiService } from '../services/mockAiService';
import ChatWindow from '../components/ChatWindow';
import { toast } from '../components/Toast';
import { API_BASE_URL } from '../services/apiConfig';

// Helper to group conversations by date categories
interface DateGroup {
  label: string;
  chats: Chat[];
}

function groupChatsByDate(chats: Chat[], searchQuery: string): DateGroup[] {
  // 1. Filter by search query keyword
  const filtered = chats.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = c.title.toLowerCase().includes(q);
    const msgMatch = c.messages.some(m => m.text.toLowerCase().includes(q));
    return titleMatch || msgMatch;
  });

  const pinned: Chat[] = [];
  const today: Chat[] = [];
  const yesterday: Chat[] = [];
  const last7Days: Chat[] = [];
  const older: Chat[] = [];

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const startOf7Days = startOfToday - 6 * 24 * 60 * 60 * 1000;

  filtered.forEach(chat => {
    if (chat.pinned) {
      pinned.push(chat);
      return;
    }

    const chatDate = new Date(chat.createdAt).getTime();
    if (chatDate >= startOfToday) {
      today.push(chat);
    } else if (chatDate >= startOfYesterday) {
      yesterday.push(chat);
    } else if (chatDate >= startOf7Days) {
      last7Days.push(chat);
    } else {
      older.push(chat);
    }
  });

  const groups: DateGroup[] = [];
  if (pinned.length > 0) groups.push({ label: 'Pinned', chats: pinned });
  if (today.length > 0) groups.push({ label: 'Today', chats: today });
  if (yesterday.length > 0) groups.push({ label: 'Yesterday', chats: yesterday });
  if (last7Days.length > 0) groups.push({ label: 'Previous 7 Days', chats: last7Days });
  if (older.length > 0) groups.push({ label: 'Older', chats: older });

  return groups;
}

export const ChatPage: React.FC = () => {
  const location = useLocation();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  
  const [settings, setSettings] = useState<ChatSettings>(() => mockStorage.getSettings());
  
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [docsCount, setDocsCount] = useState(0);
  const [indexedDocs, setIndexedDocs] = useState<any[]>([]);

  // Load chat and settings state with Supabase sync attempt
  useEffect(() => {
    const loadedChats = mockStorage.getChats();
    const loadedSettings = mockStorage.getSettings();
    const docs = mockStorage.getDocuments().filter(d => d.status === 'indexed');
    
    setChats(loadedChats);
    setSettings(loadedSettings);
    setDocsCount(docs.length);
    setIndexedDocs(docs);

    if (loadedChats.length > 0) {
      setActiveChatId(loadedChats[0].id);
    } else {
      const defaultChat: Chat = {
        id: `chat-${Date.now()}`,
        title: 'New Conversation',
        messages: [],
        createdAt: new Date().toISOString()
      };
      setChats([defaultChat]);
      mockStorage.setChats([defaultChat]);
      setActiveChatId(defaultChat.id);
    }

    // Try syncing chats with backend/Supabase API
    syncChatsWithSupabase();
  }, []);

  // Supabase Syncing Handler
  const syncChatsWithSupabase = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/chats`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        if (data.chats && data.chats.length > 0) {
          setChats(data.chats);
          mockStorage.setChats(data.chats);
        }
      }
    } catch {
      // Offline fallback: app continues using mockStorage seamlessly
    }
  };

  // Auto-send question if passed via navigation state
  useEffect(() => {
    const navQuestion = (location.state as any)?.question;
    if (navQuestion && activeChatId) {
      window.history.replaceState({}, document.title);
      handleSendMessage(navQuestion);
    }
  }, [location.state, activeChatId]);

  const activeChat = chats.find(c => c.id === activeChatId);

  // Grouped chats computed list
  const groupedChats = useMemo(() => {
    return groupChatsByDate(chats, searchQuery);
  }, [chats, searchQuery]);

  // Handle system prompt updates
  const handleSettingChange = <K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    mockStorage.setSettings(updated);
  };

  // Create new conversation thread
  const handleCreateNewChat = () => {
    const newChat: Chat = {
      id: `chat-${Date.now()}`,
      title: `Conversation ${chats.length + 1}`,
      messages: [],
      createdAt: new Date().toISOString()
    };
    
    const updated = [newChat, ...chats];
    setChats(updated);
    mockStorage.setChats(updated);
    setActiveChatId(newChat.id);
    toast.success('New Conversation Created', 'Started a fresh context session.');
  };

  // Toggle Pin Status on Chat
  const handleTogglePinChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = chats.map(c => c.id === id ? { ...c, pinned: !c.pinned } : c);
    setChats(updated);
    mockStorage.setChats(updated);
    const target = updated.find(c => c.id === id);
    if (target?.pinned) {
      toast.success('Chat Pinned', `Pinned "${target.title}" to top.`);
    }
  };

  // Inline Rename Chat
  const handleStartRename = (c: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(c.id);
    setEditingTitle(c.title);
  };

  const handleSaveRename = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editingTitle.trim()) return;
    const updated = chats.map(c => c.id === id ? { ...c, title: editingTitle.trim() } : c);
    setChats(updated);
    mockStorage.setChats(updated);
    setEditingChatId(null);
    toast.success('Renamed Conversation', 'Updated chat session title.');
  };

  // Start fresh new session (clears uploaded docs & chat history)
  const handleNewSession = () => {
    const { freshChatId } = mockStorage.resetAllData();
    const refreshedChats = mockStorage.getChats();
    setChats(refreshedChats);
    setActiveChatId(freshChatId);
    setDocsCount(0);
    setIndexedDocs([]);
    toast.success('New Session Started!', 'All uploaded documents, chat history, and memory nodes reset.');
  };

  // Clear current active conversation messages
  const handleClearChat = () => {
    if (!activeChatId) return;
    const updated = chats.map(c => c.id === activeChatId ? { ...c, messages: [] } : c);
    setChats(updated);
    mockStorage.setChats(updated);
  };

  // Delete chat conversation
  const handleDeleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = chats.filter(c => c.id !== id);
    setChats(updated);
    mockStorage.setChats(updated);
    
    if (activeChatId === id && updated.length > 0) {
      setActiveChatId(updated[0].id);
    } else if (updated.length === 0) {
      setActiveChatId('');
    }
    toast.info('Chat Deleted', 'Removed conversation thread.');
  };

  // Send message with Auto-Titling for new conversations
  const handleSendMessage = async (text: string) => {
    if (!activeChatId) return;

    const currentChat = chats.find(c => c.id === activeChatId);

    // Build user message
    const userMsg = {
      id: `user-m-temp-${Date.now()}`,
      sender: 'user' as const,
      text: text,
      timestamp: new Date().toISOString()
    };

    // Auto-rename chat title if this is the first message in the session
    let updatedTitle = currentChat?.title || 'Conversation';
    if (currentChat && currentChat.messages.length === 0) {
      const cleanPrompt = text.replace(/[\n\r]/g, ' ').trim();
      updatedTitle = cleanPrompt.length > 32 ? cleanPrompt.slice(0, 32) + '...' : cleanPrompt;
    }

    const updatedChats = chats.map(c => {
      if (c.id === activeChatId) {
        return {
          ...c,
          title: updatedTitle,
          messages: [...c.messages, userMsg],
          updatedAt: new Date().toISOString(),
        };
      }
      return c;
    });

    setChats(updatedChats);
    mockStorage.setChats(updatedChats);
    setIsTyping(true);

    try {
      await mockAiService.generateResponse(activeChatId, text);
      const refreshedChats = mockStorage.getChats();
      setChats(refreshedChats);
    } catch (e) {
      console.error(e);
    } finally {
      setIsTyping(false);
    }
  };

  // Export Conversation as PDF Handler
  const handleExportPdf = () => {
    if (!activeChat || activeChat.messages.length === 0) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Export Error', 'Please allow popups to export the PDF transcript.');
      return;
    }

    const dateStr = new Date(activeChat.createdAt).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const messagesHtml = activeChat.messages.map(m => {
      const isUser = m.sender === 'user';
      const timeStr = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `
        <div style="margin-bottom: 18px; padding: 14px 18px; border-radius: 14px; background: ${isUser ? '#f0fdf4' : '#f8fafc'}; border: 1px solid ${isUser ? '#bbf7d0' : '#e2e8f0'};">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <strong style="color: ${isUser ? '#166534' : '#0369a1'}; font-size: 13px;">${isUser ? '👤 User Query' : '🤖 ContextFlow AI Response'}</strong>
            <span style="font-size: 11px; color: #64748b; font-family: monospace;">${timeStr}</span>
          </div>
          <div style="font-size: 13px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">${m.text}</div>
          ${m.sources && m.sources.length > 0 ? `
            <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #cbd5e1; font-size: 11px; color: #475569;">
              <strong>RAG Sources:</strong> ${m.sources.join(' | ')}
            </div>
          ` : ''}
          ${m.memoryUpdated ? `
            <div style="margin-top: 6px; font-size: 10px; color: #7c3aed; font-family: monospace;">
              💾 ${m.memoryUpdated}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${activeChat.title} - Conversation Transcript</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 30px; color: #0f172a; max-width: 800px; margin: 0 auto; }
            .header { border-bottom: 2px solid #0284c7; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end; }
            .title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; }
            .meta { font-size: 12px; color: #64748b; font-family: monospace; }
            .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">ContextFlow.ai — ${activeChat.title}</h1>
              <div class="meta">Exported Transcript • ${dateStr}</div>
            </div>
            <div class="meta" style="color: #0284c7; font-weight: bold;">RAG Engine v1.2</div>
          </div>
          ${messagesHtml}
          <div class="footer">
            Generated by ContextFlow.ai RAG Platform • Pinecone Vector Index & Groq LLM
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      toast.success('PDF Export Triggered', 'Print dialog opened for conversation transcript.');
    }, 400);
  };

  return (
    <div className="flex-grow flex flex-col h-[calc(100vh-8.5rem)] relative overflow-hidden text-left">
      
      {/* Mobile Toggle Bar */}
      <div className="lg:hidden flex items-center justify-between glass-21st px-4 py-2.5 rounded-2xl mb-4 border border-white/10">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center space-x-2 text-xs font-semibold text-gray-300 hover:text-white cursor-pointer"
        >
          <Menu className="w-4 h-4 text-cyan-400" />
          <span>{sidebarOpen ? 'Hide Controls' : 'Show Controls'}</span>
        </button>
        <span className="text-xs font-bold font-mono text-cyan-400">RAG Engine Control</span>
      </div>

      <div className="flex-grow flex space-x-6 h-full items-stretch overflow-hidden relative">
        
        {/* Left Conversation History & Controls Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex-shrink-0 flex flex-col space-y-5 h-full overflow-y-auto pr-4 lg:pr-0 lg:flex"
            >
              {/* Controls Wrapper */}
              <div className="glass-21st border border-white/10 rounded-3xl p-4 space-y-4 shadow-2xl">
                
                {/* Header & New Chat Buttons */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold font-mono flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-cyan-400" />
                      Conversation History
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={handleNewSession}
                        className="flex items-center space-x-1 px-2 py-1 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 hover:text-white hover:bg-red-500/20 transition-all text-[10px] font-mono cursor-pointer font-bold"
                        title="Reset all documents and start fresh session"
                      >
                        <RotateCcw className="w-3 h-3 text-red-400" />
                        <span>Reset</span>
                      </button>
                      <button
                        onClick={handleCreateNewChat}
                        className="p-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 transition-all cursor-pointer"
                        title="New chat session"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Conversation Search Bar */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search previous chats..."
                      className="w-full bg-gray-950/80 border border-white/10 rounded-xl pl-9 pr-7 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500 font-mono placeholder-gray-500"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Grouped Date Conversation List */}
                <div className="space-y-3.5 max-h-[190px] overflow-y-auto pr-1">
                  {groupedChats.length > 0 ? (
                    groupedChats.map((group) => (
                      <div key={group.label} className="space-y-1">
                        <div className="text-[9px] font-mono font-extrabold text-cyan-300/80 uppercase tracking-widest px-1 py-0.5">
                          {group.label}
                        </div>
                        {group.chats.map((c) => {
                          const isActive = c.id === activeChatId;
                          const isEditing = editingChatId === c.id;
                          return (
                            <div
                              key={c.id}
                              onClick={() => setActiveChatId(c.id)}
                              className={`
                                w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-150 group relative
                                ${isActive 
                                  ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/40 text-white shadow-sm' 
                                  : 'bg-transparent border border-transparent text-gray-400 hover:bg-gray-900/50 hover:text-gray-200'}
                              `}
                            >
                              <div className="flex items-center space-x-2 truncate pr-2 min-w-0 flex-grow">
                                <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-cyan-400' : 'text-gray-500'}`} />
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editingTitle}
                                    onChange={(e) => setEditingTitle(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRename(c.id, e as any); }}
                                    className="bg-gray-950 border border-cyan-500 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none w-full font-mono"
                                    autoFocus
                                  />
                                ) : (
                                  <span className="truncate font-sans font-medium">{c.title}</span>
                                )}
                              </div>

                              {/* Action Icon Buttons */}
                              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                {isEditing ? (
                                  <button
                                    onClick={(e) => handleSaveRename(c.id, e)}
                                    className="text-emerald-400 hover:text-emerald-300 p-1"
                                    title="Save title"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={(e) => handleStartRename(c, e)}
                                    className="text-gray-400 hover:text-white p-1"
                                    title="Rename chat"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                )}

                                <button
                                  onClick={(e) => handleTogglePinChat(c.id, e)}
                                  className={`p-1 ${c.pinned ? 'text-amber-400 opacity-100' : 'text-gray-400 hover:text-amber-300'}`}
                                  title={c.pinned ? 'Unpin chat' : 'Pin chat to top'}
                                >
                                  <Pin className="w-3 h-3" />
                                </button>

                                <button
                                  onClick={(e) => handleDeleteChat(c.id, e)}
                                  className="text-gray-500 hover:text-red-400 p-1"
                                  title="Delete conversation"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-gray-500 font-mono py-2">No matching sessions found.</p>
                  )}
                </div>

                {/* LLM Engine Control Panel */}
                <div className="space-y-3.5 border-t border-white/10 pt-3.5">
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold font-mono block">AI Model Control Panel</span>
                  
                  {/* System Guidelines */}
                  <div className="space-y-1 text-left">
                    <label className="text-[11px] font-bold text-gray-300 font-mono flex items-center space-x-1">
                      <Sliders className="w-3 h-3 text-cyan-400" />
                      <span>System Guidelines</span>
                    </label>
                    <textarea
                      value={settings.systemPrompt}
                      onChange={(e) => handleSettingChange('systemPrompt', e.target.value)}
                      placeholder="Instruct how the chatbot responds..."
                      rows={2}
                      className="w-full bg-gray-950/80 border border-white/10 rounded-2xl p-2 text-xs text-gray-300 focus:outline-none focus:border-cyan-500 placeholder-gray-600 transition-all font-sans leading-relaxed resize-none"
                    />
                  </div>

                  {/* Model Picker */}
                  <div className="space-y-1 text-left">
                    <label className="text-[11px] font-bold text-gray-300 font-mono">LLM Provider Endpoint</label>
                    <select
                      value={settings.model}
                      onChange={(e) => handleSettingChange('model', e.target.value)}
                      className="w-full bg-gray-950/80 border border-white/10 rounded-xl p-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500 font-mono cursor-pointer"
                    >
                      <option value="groq-llama3.3">Groq (Llama-3.3-70B Versatile)</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro (RAG Vector)</option>
                      <option value="gpt-4o">OpenAI GPT-4o (Embeddings)</option>
                    </select>
                  </div>

                  {/* Temperature slider */}
                  <div className="space-y-1 text-left">
                    <div className="flex justify-between items-center text-[11px] font-mono">
                      <span className="text-gray-300 font-bold">Temperature</span>
                      <span className="text-cyan-400 font-bold">{settings.temperature}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={settings.temperature}
                      onChange={(e) => handleSettingChange('temperature', parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-gray-900 rounded-lg appearance-none"
                    />
                  </div>

                  {/* Cognitive Memory Toggle */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold text-gray-200">Stateful Memory</span>
                      <span className="text-[9px] text-gray-500 font-mono">Include user memory nodes</span>
                    </div>
                    <button
                      onClick={() => handleSettingChange('memoryEnabled', !settings.memoryEnabled)}
                      className="text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                    >
                      {settings.memoryEnabled 
                        ? <ToggleRight className="w-7 h-7 text-cyan-400" /> 
                        : <ToggleLeft className="w-7 h-7 text-gray-600" />}
                    </button>
                  </div>
                </div>

              </div>

            </motion.div>
          )}
        </AnimatePresence>

        {/* Right Active Conversation Stream */}
        <div className="flex-grow h-full overflow-hidden">
          {activeChat ? (
            <ChatWindow
              messages={activeChat.messages}
              onSendMessage={handleSendMessage}
              onClearChat={handleClearChat}
              onExportPdf={handleExportPdf}
              isTyping={isTyping}
              activeSourcesCount={docsCount}
              indexedDocuments={indexedDocs}
            />
          ) : (
            <div className="h-full border border-dark-border bg-gray-950/20 rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-4">
              <Plus className="w-12 h-12 text-gray-600 animate-pulse" />
              <div>
                <h3 className="text-base font-bold text-white tracking-wide">No Session Active</h3>
                <p className="text-xs text-gray-400 mt-1 max-w-xs">
                  Create a new conversation session in the sidebar to start querying indexed knowledge bases.
                </p>
              </div>
              <button
                onClick={handleCreateNewChat}
                className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold py-2.5 px-5 rounded-xl shadow-md transition-all cursor-pointer"
              >
                Create First Conversation
              </button>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
export default ChatPage;
