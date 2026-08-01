import React, { useMemo } from 'react';
import { History, Sparkles, FileText, ChevronRight } from 'lucide-react';
import { mockStorage, type Message } from '../services/mockStorage';

interface SmartAutocompletePopupProps {
  query: string;
  messages: Message[];
  onSelectSuggestion: (text: string) => void;
  onClose: () => void;
}

interface SuggestionItem {
  id: string;
  text: string;
  category: 'previous' | 'related' | 'document';
  label: string;
}

export const SmartAutocompletePopup: React.FC<SmartAutocompletePopupProps> = ({
  query,
  messages,
  onSelectSuggestion,
}) => {
  // Compute autocomplete suggestions dynamically based on user query
  const suggestions = useMemo(() => {
    if (!query || query.trim().length < 2) return [];

    const qLower = query.toLowerCase().trim();
    const result: SuggestionItem[] = [];

    // 1. Previous Questions from Chat History
    const pastUserPrompts = messages
      .filter(m => m.sender === 'user')
      .map(m => m.text)
      .filter((text, idx, self) => self.indexOf(text) === idx);

    pastUserPrompts.forEach((prompt, idx) => {
      if (prompt.toLowerCase().includes(qLower) && prompt.toLowerCase() !== qLower) {
        result.push({
          id: `prev-${idx}`,
          text: prompt,
          category: 'previous',
          label: 'Previous Question'
        });
      }
    });

    // 2. Related Questions (Templates & Topic Recommendations)
    const templates = [
      'What is the summary of the document?',
      'What are the key pricing tiers for Acme Corp?',
      'Explain the RAG vector search process.',
      'How does the memory engine store context?',
      'What are the main technical requirements mentioned?',
      'List all key features described in the uploaded files.',
      'What is the average response time for LLM queries?',
      'How are document text chunks processed into Pinecone?'
    ];

    templates.forEach((tpl, idx) => {
      if (tpl.toLowerCase().includes(qLower) && !result.some(r => r.text === tpl)) {
        result.push({
          id: `rel-${idx}`,
          text: tpl,
          category: 'related',
          label: 'Related Question'
        });
      }
    });

    // 3. Document Content Autocomplete (from indexed document text chunks)
    const docs = mockStorage.getDocuments();
    docs.forEach(doc => {
      doc.chunks.forEach((chunk, cIdx) => {
        const lines = chunk.text.split(/[.!?\n]+/);
        lines.forEach(line => {
          const trimmed = line.trim();
          if (
            trimmed.length > 15 &&
            trimmed.length < 90 &&
            trimmed.toLowerCase().includes(qLower) &&
            !result.some(r => r.text === trimmed)
          ) {
            result.push({
              id: `doc-${doc.id}-${cIdx}`,
              text: `What does the document say about "${trimmed.slice(0, 50)}..."?`,
              category: 'document',
              label: `Document (${doc.name})`
            });
          }
        });
      });
    });

    return result.slice(0, 6);
  }, [query, messages]);

  if (suggestions.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-3 mx-3 glass-21st border border-cyan-500/40 rounded-3xl p-3 shadow-2xl z-30 animate-fadeIn space-y-1.5 backdrop-blur-2xl text-left">
      <div className="flex items-center justify-between px-3 py-1 border-b border-white/10 text-[10px] font-mono text-cyan-300 font-bold uppercase tracking-widest">
        <span>Instant Smart Suggestions</span>
        <span className="text-gray-400 font-normal">{suggestions.length} Matches</span>
      </div>

      <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
        {suggestions.map(sug => {
          let Icon = Sparkles;
          let badgeStyle = 'bg-purple-500/10 text-purple-300 border-purple-500/30';

          if (sug.category === 'previous') {
            Icon = History;
            badgeStyle = 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
          } else if (sug.category === 'document') {
            Icon = FileText;
            badgeStyle = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
          }

          return (
            <button
              key={sug.id}
              onClick={() => onSelectSuggestion(sug.text)}
              className="w-full text-left p-2.5 rounded-2xl hover:bg-white/10 transition-all flex items-center justify-between group cursor-pointer border border-transparent hover:border-white/10"
            >
              <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                <div className="w-7 h-7 rounded-xl bg-gray-900 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:border-cyan-400">
                  <Icon className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-100 font-medium truncate group-hover:text-cyan-300 transition-colors">
                    {sug.text}
                  </p>
                  <span className={`inline-block text-[9px] font-mono px-2 py-0.2 rounded-full border mt-0.5 ${badgeStyle}`}>
                    {sug.label}
                  </span>
                </div>
              </div>

              <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
export default SmartAutocompletePopup;
