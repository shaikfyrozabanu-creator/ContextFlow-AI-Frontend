import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Bot, User, Database, Brain, ArrowDown, FileText, Sparkles, 
  Copy, Check, Layers, ChevronDown, ChevronUp, AlertCircle, WifiOff,
  UploadCloud, Zap, MessageCircle, Shield, Download
} from 'lucide-react';
import type { Message, SourceDetail } from '../services/mockStorage';
import { PdfPreviewPanel } from './PdfPreviewPanel';
import { SmartAutocompletePopup } from './SmartAutocompletePopup';
import { VoiceAssistantController } from './VoiceAssistantController';
import { RagPipelineTimeline } from './RagPipelineTimeline';
import { AnswerTelemetryDrawer } from './AnswerTelemetryDrawer';

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  onClearChat?: () => void;
  onExportPdf?: () => void;
  isTyping: boolean;
  activeSourcesCount: number;
  indexedDocuments?: { id: string; name: string; chunkCount: number }[];
}

const SUGGESTIONS = [
  'What is the summary of the document?',
  'What are the key points mentioned in the PDF?',
  'Explain the main concepts described in the file.',
  'What are the key findings or conclusions?',
  'List the most important points from this document.'
];



// Lightweight markdown → HTML renderer for bot messages
// Handles: ### headings, **bold**, `code`, - bullets, plain paragraphs
function renderMarkdown(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Heading (### or ## or #)
    const hMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (hMatch) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h3>${esc(hMatch[2])}</h3>`);
      continue;
    }

    // Bullet list item (- or * or •)
    const liMatch = line.match(/^[-*•]\s+(.+)$/);
    if (liMatch) {
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${inline(liMatch[1])}</li>`);
      continue;
    }

    // Close list if open
    if (inList) { out.push('</ul>'); inList = false; }

    // Empty line
    if (line.trim() === '') { out.push('<br/>'); continue; }

    // Regular paragraph
    out.push(`<p>${inline(line)}</p>`);
  }

  if (inList) out.push('</ul>');
  return out.join('');
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inline(s: string): string {
  // Bold **text**
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic *text*
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Inline code `code`
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  return s;
}

const MarkdownMessage: React.FC<{ text: string }> = ({ text }) => (
  <div
    className="prose-chat text-sm leading-relaxed font-sans"
    dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
  />
);

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  onSendMessage,
  onClearChat,
  onExportPdf,
  isTyping,
  activeSourcesCount,
  indexedDocuments = []
}) => {
  const [inputText, setInputText] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [shakeInput, setShakeInput] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [showDocList, setShowDocList] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{
    filename: string;
    highlightText: string;
    pageNumber: number;
    score?: number;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const hasMultipleDocs = indexedDocuments.length > 1;
  const activeDocName = indexedDocuments.length > 0 
    ? hasMultipleDocs 
      ? `${indexedDocuments.length} Documents Active`
      : indexedDocuments[0].name 
    : 'No documents indexed';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setShowScrollBtn(!isNearBottom);
  };

  const triggerShake = () => {
    setShakeInput(true);
    setTimeout(() => setShakeInput(false), 600);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) {
      setInputError('Please type a message before sending.');
      triggerShake();
      return;
    }
    setInputError(null);
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (e.target.value.trim()) setInputError(null);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSource = (msgId: string) => {
    setExpandedSources(prev => ({
      ...prev,
      [msgId]: prev[msgId] === undefined ? false : !prev[msgId]
    }));
  };

  return (
    <>
    <div className="flex flex-col h-full glass-21st rounded-3xl border border-white/10 overflow-hidden relative shadow-2xl backdrop-blur-2xl">
      
      {/* Active Knowledge base context header */}
      <div className="bg-gray-950/90 px-5 py-3.5 border-b border-white/10 flex items-center justify-between gap-4 flex-wrap backdrop-blur-md">
        
        {/* Active PDF File Display */}
        <div className="relative flex items-center space-x-2.5 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/20">
            <FileText className="w-4.5 h-4.5 text-cyan-400" />
          </div>
          <button
            onClick={() => hasMultipleDocs && setShowDocList(p => !p)}
            className={`flex flex-col text-left truncate ${hasMultipleDocs ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <div className="flex items-center space-x-2">
              <span className="text-xs font-extrabold text-white font-display truncate max-w-[200px] sm:max-w-[320px]">
                {activeDocName}
              </span>
              {indexedDocuments.length > 0 ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse mr-1" />
                  {hasMultipleDocs ? `${indexedDocuments.length} docs` : 'Indexed'}
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-800/60 text-gray-400 border border-white/10 font-mono">
                  No docs
                </span>
              )}
            </div>
            <span className="text-[10px] text-cyan-300/80 font-mono">
              {indexedDocuments.length === 0 ? 'Upload PDFs in Admin Panel first' : 'Pinecone Vector Database Connected'}
            </span>
          </button>

          {/* Multi-doc dropdown */}
          {showDocList && hasMultipleDocs && (
            <div className="absolute top-full left-0 mt-2 z-20 w-64 glass-21st border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              <div className="px-3.5 py-2 border-b border-white/10 bg-gray-950">
                <span className="text-[10px] text-cyan-300 font-mono font-bold uppercase tracking-widest">Indexed Knowledge Base</span>
              </div>
              <div className="max-h-40 overflow-y-auto divide-y divide-white/5">
                {indexedDocuments.map(doc => (
                  <div key={doc.id} className="flex items-center gap-2 px-3.5 py-2.5 hover:bg-white/5 transition-colors">
                    <FileText className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    <span className="text-xs text-gray-200 truncate font-semibold">{doc.name}</span>
                    <span className="ml-auto text-[10px] text-cyan-400 font-mono font-bold">{doc.chunkCount}c</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Header Actions: Context Stats + Export PDF + Clear Chat Button */}
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <div className="flex items-center space-x-1.5 bg-gray-950/80 border border-white/10 px-3 py-1.5 rounded-2xl font-mono text-[11px]">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>Context: <strong className="text-cyan-300 font-bold">{activeSourcesCount} Docs</strong></span>
          </div>

          {messages.length > 0 && onExportPdf && (
            <button
              onClick={onExportPdf}
              className="flex items-center space-x-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:text-white px-3 py-1.5 rounded-2xl font-mono text-[11px] transition-all cursor-pointer font-bold"
              title="Export active conversation transcript as PDF"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export PDF</span>
            </button>
          )}

          {messages.length > 0 && onClearChat && (
            <button
              onClick={onClearChat}
              className="flex items-center space-x-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 hover:text-red-200 px-3 py-1.5 rounded-2xl font-mono text-[11px] transition-all cursor-pointer font-bold"
              title="Clear current chat messages"
            >
              <span>Clear Chat</span>
            </button>
          )}
        </div>

      </div>

      {/* Messages Stream Container */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-grow overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth min-h-[350px]"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-5 max-w-xl mx-auto py-8 px-2">

            {/* Hero Icon */}
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-500 p-0.5 shadow-2xl shadow-cyan-500/30">
                <div className="w-full h-full bg-gray-950 rounded-[22px] flex items-center justify-center">
                  <Bot className="w-10 h-10 text-cyan-400" />
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-6.5 h-6.5 rounded-full bg-emerald-500 border-2 border-gray-950 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
            </div>

            <div className="space-y-1.5 text-center">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">Welcome to ContextFlow AI</h3>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-sm font-sans">
                Your intelligent document assistant powered by RAG — ask anything about your uploaded PDFs.
              </p>
            </div>

            {indexedDocuments.length === 0 ? (
              /* ── No documents state ── */
              <div className="w-full space-y-4">
                {/* Alert banner */}
                <div className="flex items-start gap-3 p-4 rounded-3xl glass-21st border border-cyan-500/30 text-left">
                  <div className="w-8 h-8 rounded-2xl bg-cyan-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <UploadCloud className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-cyan-300 font-display">No documents uploaded yet</p>
                    <p className="text-xs text-slate-700 dark:text-cyan-200/80 mt-0.5 leading-relaxed font-sans font-medium">
                      Upload a PDF to start chatting. Your document will be chunked, embedded, and indexed in seconds.
                    </p>
                  </div>
                </div>

                {/* How it works steps */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                  {[
                    { num: '1', color: 'cyan', icon: UploadCloud, label: 'Upload PDF', desc: 'Drop any PDF into the Knowledge Center — up to 10 MB.' },
                    { num: '2', color: 'indigo', icon: Layers, label: 'Auto-Indexed', desc: 'Text is chunked, embedded with HuggingFace, and stored in Pinecone.' },
                    { num: '3', color: 'emerald', icon: MessageCircle, label: 'Ask Questions', desc: 'Ask anything — the AI retrieves relevant chunks and answers naturally.' },
                  ].map(step => (
                    <div key={step.num} className="p-4 rounded-2xl glass-21st border border-white/10 space-y-2">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/15 flex items-center justify-center">
                        <step.icon className="w-4 h-4 text-cyan-400" />
                      </div>
                      <h4 className="text-xs font-bold text-white font-display">{step.label}</h4>
                      <p className="text-[11px] text-gray-400 leading-relaxed font-sans">{step.desc}</p>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <a
                  href="/admin"
                  className="btn-glow-cyan inline-flex items-center justify-center gap-2 text-white font-bold text-xs px-6 py-3.5 rounded-2xl shadow-xl transition-all cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload PDF in Knowledge Center</span>
                </a>
              </div>
            ) : (
              /* ── Documents available state ── */
              <div className="w-full space-y-4">
                {/* Active docs badge */}
                <div className="flex items-center justify-center gap-2">
                  <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold px-3.5 py-1.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {indexedDocuments.length} document{indexedDocuments.length > 1 ? 's' : ''} indexed & ready
                  </div>
                  <div className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold px-3.5 py-1.5 rounded-full">
                    <Brain className="w-3.5 h-3.5" />
                    Memory Active
                  </div>
                </div>

                {/* Feature highlights */}
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  {[
                    { icon: Shield, label: 'RAG Retrieval', sub: 'Top-5 chunks' },
                    { icon: Brain, label: 'Conversation', sub: 'Memory active' },
                    { icon: Sparkles, label: 'Groq LLM', sub: 'llama-3.3-70b' },
                  ].map(feat => (
                    <div key={feat.label} className="p-3.5 rounded-2xl glass-21st border border-white/10 space-y-1">
                      <div className="w-7 h-7 rounded-xl bg-cyan-500/15 flex items-center justify-center mx-auto">
                        <feat.icon className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                      <p className="text-[11px] font-bold text-white font-display">{feat.label}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{feat.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Suggested questions */}
                <div className="space-y-2">
                  <span className="text-[10px] text-cyan-300/80 uppercase tracking-widest font-bold font-mono block text-center">
                    Try asking
                  </span>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {SUGGESTIONS.slice(0, 4).map((sug, idx) => (
                      <button
                        key={idx}
                        onClick={() => onSendMessage(sug)}
                        className="text-left glass-21st hover:border-cyan-500/40 rounded-2xl px-4 py-2.5 text-xs text-gray-200 transition-all duration-200 shadow-sm cursor-pointer hover:-translate-y-0.5"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((msg) => {
              const isBot = msg.sender === 'bot';
              
              // Prepare sources array for display
              const hasStructuredSources = msg.sourceDetails && msg.sourceDetails.length > 0;
              const hasStringSources = msg.sources && msg.sources.length > 0;
              const sourceCount = hasStructuredSources 
                ? msg.sourceDetails!.length 
                : hasStringSources ? msg.sources!.length : 0;
              
              const isExpanded = expandedSources[msg.id] !== false; // Default expanded for clear sources display

              return (
                <div 
                  key={msg.id}
                  className={`flex ${isBot ? 'justify-start' : 'justify-end'} items-start space-x-3.5`}
                >
                  {/* Bot Avatar */}
                  {isBot && (
                    <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 flex-shrink-0 mt-1 border border-cyan-400/30">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  )}

                  <div className="flex flex-col space-y-2 max-w-[90%] sm:max-w-[80%]">
                    
                    {/* Sender badge & timestamp + confidence score */}
                    <div className={`flex items-center gap-2 text-[10px] text-gray-400 flex-wrap ${isBot ? 'justify-start' : 'justify-end'}`}>
                      <span className="font-bold text-gray-200 font-mono">{isBot ? 'ContextFlow AI' : 'You'}</span>
                      <span>•</span>
                      <span className="font-mono">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {isBot && (() => {
                        const topScore = hasStructuredSources
                          ? Math.max(...msg.sourceDetails!.map((s: SourceDetail) => s.score ?? 0))
                          : 0;
                        if (topScore > 0) {
                          const pct = Math.round(topScore * 100);
                          return (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono font-bold text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <Sparkles className="w-2.5 h-2.5" />
                              {pct}% Confidence
                            </span>
                          );
                        }
                        return null;
                      })()}
                      {isBot && sourceCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/30 font-bold">
                          <Brain className="w-2.5 h-2.5" />
                          {sourceCount} src
                        </span>
                      )}
                    </div>

                    {/* Message Content Card */}
                    {(() => {
                      const isErrorMsg = isBot && (
                        msg.text.startsWith('Error connecting to backend') ||
                        msg.text.startsWith('Cannot reach') ||
                        msg.text.toLowerCase().includes('chat execution failed')
                      );
                      return (
                        <div 
                          className={`
                            p-5 rounded-3xl shadow-xl relative group text-left
                            ${isErrorMsg
                              ? 'bg-red-950/50 border border-red-500/40 text-red-200 backdrop-blur-xl'
                              : isBot 
                                ? 'glass-21st border border-white/10 text-gray-100 backdrop-blur-xl animate-fadeIn' 
                                : 'btn-glow-cyan text-white font-medium shadow-cyan-500/15'}
                          `}
                        >
                          {isErrorMsg && (
                            <div className="flex items-center gap-1.5 mb-2">
                              <WifiOff className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                              <span className="text-[10px] text-red-400 font-mono font-bold uppercase tracking-wide">Connection Error</span>
                            </div>
                          )}

                          {/* Render markdown for bot, plain text for user/error */}
                          {isBot && !isErrorMsg
                            ? <MarkdownMessage text={msg.text} />
                            : <span className="text-sm leading-relaxed whitespace-pre-wrap font-sans">{msg.text}</span>
                          }

                          {/* Copy message text button */}
                          <button
                            onClick={() => handleCopyText(msg.text, msg.id)}
                            className="absolute top-3 right-3 p-1.5 rounded-xl bg-gray-900/80 border border-white/10 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Copy message"
                          >
                            {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      );
                    })()}

                    {/* Meta Section: Bot Memory Updates & Retrieved Vector Sources */}
                    {isBot && (
                      <div className="flex flex-col space-y-2.5 pt-1 text-left w-full">
                        
                        {/* Memory update badge */}
                        {msg.memoryUpdated && (
                          <div className="flex items-center space-x-2 text-[11px] text-purple-300 font-mono bg-purple-500/10 border border-purple-500/30 py-1.5 px-3.5 rounded-2xl w-max max-w-full font-bold">
                            <Brain className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 animate-pulse" />
                            <span>{msg.memoryUpdated}</span>
                          </div>
                        )}

                        {/* DISPLAY RETRIEVED DOCUMENT CHUNKS BELOW EVERY BOT RESPONSE AS SOURCES */}
                        {sourceCount > 0 && (
                          <div className="w-full glass-21st border border-cyan-500/30 rounded-3xl p-4 space-y-3 shadow-xl backdrop-blur-md">
                            
                            {/* Sources Header */}
                            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 rounded-xl bg-cyan-500/15 flex items-center justify-center">
                                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                                </div>
                                <span className="text-xs font-extrabold text-white font-mono tracking-wide">
                                  Sources ({sourceCount} Chunk{sourceCount > 1 ? 's' : ''} Retrieved)
                                </span>
                              </div>

                              <button
                                onClick={() => toggleSource(msg.id)}
                                className="flex items-center space-x-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-mono font-bold cursor-pointer"
                              >
                                <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            </div>

                            {/* Render Citation Cards */}
                            {isExpanded && (
                              <div className="space-y-3 pt-1">
                                {hasStructuredSources ? (
                                  msg.sourceDetails!.map((src: SourceDetail, sIdx: number) => {
                                    const scorePct = src.score !== undefined ? Math.round(src.score * 100) : 95;
                                    const chunkNumStr = src.chunkId ? src.chunkId.split('-').pop()?.toUpperCase() : `${sIdx + 1}`;
                                    const pageNum = src.pageNumber ?? 1;
                                    const directPdfUrl = `http://localhost:8000/uploads/${encodeURIComponent(src.filename)}#page=${pageNum}`;

                                    return (
                                      <div
                                        key={sIdx}
                                        onClick={() => setPdfPreview({
                                          filename: src.filename,
                                          highlightText: src.text ?? '',
                                          pageNumber: pageNum,
                                          score: src.score ?? 0.95,
                                        })}
                                        className="bg-gray-950/90 border border-white/10 hover:border-cyan-500/50 rounded-2xl p-4 space-y-2.5 transition-all text-left shadow-lg cursor-pointer group hover:bg-gray-900/60"
                                      >
                                        <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] font-mono border-b border-white/5 pb-2">
                                          {/* PDF Name & Icon */}
                                          <div className="flex items-center space-x-2 text-cyan-300 font-bold truncate max-w-[220px] sm:max-w-[300px]">
                                            <div className="w-5 h-5 rounded-lg bg-cyan-500/15 flex items-center justify-center flex-shrink-0">
                                              <FileText className="w-3.5 h-3.5 text-cyan-400" />
                                            </div>
                                            <span className="truncate group-hover:text-cyan-200" title={src.filename}>{src.filename}</span>
                                          </div>

                                          {/* Citation Metadata Badges: Page Number, Chunk Number, Similarity Score */}
                                          <div className="flex items-center space-x-1.5 flex-wrap">
                                            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 text-[10px] font-bold">
                                              Page {pageNum}
                                            </span>
                                            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/25 text-[10px] font-bold">
                                              Chunk #{chunkNumStr}
                                            </span>
                                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[10px] font-bold">
                                              🎯 {scorePct}% Match
                                            </span>
                                            <a
                                              href={directPdfUrl}
                                              target="_blank"
                                              rel="noreferrer"
                                              onClick={(e) => e.stopPropagation()}
                                              className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-gray-900 hover:bg-gray-800 text-cyan-400 hover:text-white border border-white/10 text-[10px] font-bold transition-all"
                                              title={`Open ${src.filename} at Page ${pageNum} in new tab`}
                                            >
                                              <span>Open PDF (p.{pageNum})</span>
                                              <Zap className="w-3 h-3 text-cyan-400" />
                                            </a>
                                          </div>
                                        </div>

                                        {/* Highlighted Source Text Snippet */}
                                        <div className="text-xs text-slate-900 dark:text-gray-200 leading-relaxed font-sans bg-gray-900/90 p-3.5 rounded-xl border-l-2 border-cyan-400 text-left whitespace-pre-wrap font-medium">
                                          <mark className="bg-cyan-500/20 text-slate-900 dark:text-cyan-100 rounded px-1.5 py-0.5 font-bold">
                                            "{src.text}"
                                          </mark>
                                        </div>
                                      </div>
                                    );
                                  })
                                ) : (
                                  msg.sources!.map((srcStr: string, sIdx: number) => (
                                    <div 
                                      key={sIdx} 
                                      className="bg-gray-950/90 border border-white/10 rounded-2xl p-3.5 text-xs text-gray-200 leading-relaxed border-l-2 border-cyan-400 text-left font-sans"
                                    >
                                      {srcStr}
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Generation Telemetry & RAG Proof Drawer */}
                        <AnswerTelemetryDrawer telemetry={msg.telemetry} sourcesCount={msg.sources?.length || 0} />

                      </div>
                    )}
                  </div>

                  {/* User Avatar */}
                  {!isBot && (
                    <div className="w-9 h-9 rounded-2xl bg-gray-900 border border-white/10 flex items-center justify-center shadow-md flex-shrink-0 mt-1">
                      <User className="w-4.5 h-4.5 text-gray-300" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Animated typing indicator while waiting for backend */}
            {isTyping && (
              <div className="flex justify-start items-start space-x-3.5 max-w-md">
                {/* Bot avatar */}
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 flex-shrink-0 mt-1 border border-cyan-400/30">
                  <Bot className="w-5 h-5 text-white" />
                </div>

                <div className="glass-21st border border-cyan-500/30 p-4 rounded-3xl shadow-xl backdrop-blur-xl w-full">
                  <RagPipelineTimeline />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-20 right-6 btn-glow-cyan text-white rounded-full p-3 shadow-2xl hover:scale-105 transition-all cursor-pointer z-10"
        >
          <ArrowDown className="w-4 h-4 animate-bounce" />
        </button>
      )}

      {/* Suggestion list if conversation is active */}
      {messages.length > 0 && !isTyping && (
        <div className="px-4 py-2.5 border-t border-white/10 bg-gray-950/80 flex gap-2 overflow-x-auto whitespace-nowrap">
          {SUGGESTIONS.map((sug, idx) => (
            <button
              key={idx}
              onClick={() => onSendMessage(sug)}
              className="inline-block glass-21st hover:border-cyan-500/40 rounded-xl px-3.5 py-1.5 text-xs text-gray-300 transition-colors cursor-pointer"
            >
              {sug}
            </button>
          ))}
        </div>
      )}

      {/* Text Area Form Input */}
      <div className="border-t border-white/10 bg-gray-950/90 backdrop-blur-xl relative">
        
        {/* Floating Instant Smart Autocomplete Suggestions Popover */}
        <SmartAutocompletePopup
          query={inputText}
          messages={messages}
          onSelectSuggestion={(text) => {
            setInputText(text);
            setInputError(null);
          }}
          onClose={() => {}}
        />

        {/* Empty question error hint */}
        {inputError && (
          <div className="flex items-center gap-2 px-5 pt-3 pb-0">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            <span className="text-[11px] text-red-300 font-medium">{inputError}</span>
          </div>
        )}
        <form
          onSubmit={handleSend}
          className="p-3.5 flex items-center space-x-3"
        >
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder={indexedDocuments.length === 0 ? 'Upload PDFs first to start chatting...' : 'Ask anything about your documents...'}
            disabled={isTyping}
            className={`
              flex-grow bg-gray-950/80 border rounded-2xl px-4 py-3.5 text-xs sm:text-sm focus:outline-none text-slate-900 dark:text-slate-100 font-medium
              disabled:opacity-60 disabled:cursor-not-allowed placeholder-gray-500 transition-all duration-200
              ${shakeInput ? 'animate-[shake_0.4s_ease-in-out]' : ''}
              ${inputError ? 'border-red-500/60 focus:border-red-400' : 'border-white/10 focus:border-cyan-500'}
            `}
          />
          {/* Voice Assistant Microphone & Speech Controller */}
          <VoiceAssistantController
            onTranscript={(text) => setInputText(text)}
            latestBotMessage={messages.filter(m => m.sender === 'bot').slice(-1)[0]?.text}
            isBotTyping={isTyping}
          />

          <button
            type="submit"
            disabled={isTyping}
            className="btn-glow-cyan text-white p-3.5 rounded-2xl transition-all flex items-center justify-center flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg"
          >
            <Send className="w-4.5 h-4.5" />
          </button>
        </form>
      </div>

    </div>

    {/* PDF Preview Panel — slide-in drawer on source click */}
    {pdfPreview && (
      <PdfPreviewPanel
        filename={pdfPreview.filename}
        highlightText={pdfPreview.highlightText}
        pageNumber={pdfPreview.pageNumber}
        score={pdfPreview.score}
        onClose={() => setPdfPreview(null)}
      />
    )}
    </>
  );
};

export default ChatWindow;
