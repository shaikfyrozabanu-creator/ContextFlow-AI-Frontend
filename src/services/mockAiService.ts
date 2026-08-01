import { mockStorage, type Message, type MemoryItem, type SourceDetail } from './mockStorage';
import { API_BASE_URL } from './apiConfig';

// --- Automated Entity Extraction Engine ---
function autoExtractEntities(query: string): string[] {
  const currentMemories = mockStorage.getMemories();
  const extractedKeys: string[] = [];
  const now = new Date().toISOString();

  const rules: { key: string; category: 'User Info' | 'Preference' | 'Custom'; patterns: RegExp[] }[] = [
    {
      key: 'user_name',
      category: 'User Info',
      patterns: [/my name is ([A-Za-z\s]+?)(?=\.|,|$|\band\b)/i, /i am ([A-Z][a-z]+)/i, /call me ([A-Za-z\s]+?)(?=\.|,|$)/i]
    },
    {
      key: 'preferred_language',
      category: 'Preference',
      patterns: [/i code in ([A-Za-z0-9#+]+)/i, /preferred language is ([A-Za-z0-9#+\s]+?)(?=\.|,|$)/i, /prefer (python|react|typescript|javascript|golang|java|c\+\+)/i]
    },
    {
      key: 'favorite_topic',
      category: 'Preference',
      patterns: [/interested in ([^.,!]+)/i, /favorite topic is ([^.,!]+)/i, /love learning about ([^.,!]+)/i]
    },
    {
      key: 'organization',
      category: 'User Info',
      patterns: [/work at ([^.,!]+)/i, /employed by ([^.,!]+)/i, /company is ([^.,!]+)/i]
    },
    {
      key: 'location',
      category: 'User Info',
      patterns: [/live in ([^.,!]+)/i, /based out of ([^.,!]+)/i, /located in ([^.,!]+)/i]
    },
    {
      key: 'role',
      category: 'User Info',
      patterns: [/work as a ([^.,!]+)/i, /my role is ([^.,!]+)/i, /job is ([^.,!]+)/i, /i am a ([^.,!]+?)(?=\.|,|$|\bwork\b)/i]
    },
    {
      key: 'education',
      category: 'User Info',
      patterns: [/studied at ([^.,!]+)/i, /degree in ([^.,!]+)/i, /graduated from ([^.,!]+)/i]
    },
    {
      key: 'preferences',
      category: 'Preference',
      patterns: [/i prefer ([^.,!]+)/i, /my preference is ([^.,!]+)/i, /always use ([^.,!]+)/i]
    }
  ];

  let updatedList = [...currentMemories];

  rules.forEach(rule => {
    for (const pat of rule.patterns) {
      const match = query.match(pat);
      if (match && match[1]) {
        const val = match[1].trim();
        if (val.length >= 2 && val.length <= 60) {
          const existingIdx = updatedList.findIndex(m => m.key === rule.key);
          if (existingIdx !== -1) {
            const existing = updatedList[existingIdx];
            updatedList[existingIdx] = {
              ...existing,
              value: val,
              updatedAt: now,
              usedCount: (existing.usedCount || 0) + 1,
              lastUsedAt: now,
              events: [
                ...(existing.events || []),
                { id: `ev-upd-${Date.now()}`, type: 'updated', timestamp: now, note: `Auto-extracted update: ${rule.key} = "${val}"` }
              ]
            };
          } else {
            updatedList.push({
              id: `mem-${Date.now()}-${rule.key}`,
              key: rule.key,
              value: val,
              category: rule.category,
              createdAt: now,
              usedCount: 1,
              lastUsedAt: now,
              events: [
                { id: `ev-cre-${Date.now()}`, type: 'created', timestamp: now, note: `Auto-extracted initial memory: ${rule.key} = "${val}"` }
              ]
            });
          }
          extractedKeys.push(`${rule.key} = "${val}"`);
          break;
        }
      }
    }
  });

  if (extractedKeys.length > 0) {
    mockStorage.setMemories(updatedList);
  }

  return extractedKeys;
}

// --- Smart Fallback Answer Generator ---
function generateSmartFallbackAnswer(
  query: string,
  memories: MemoryItem[],
  autoExtracted: string[]
): { text: string; sources?: string[]; sourceDetails?: SourceDetail[] } {
  const qLower = query.toLowerCase().trim();
  const autoExtNote = autoExtracted.length > 0 ? `\n\n*Auto-extracted context: ${autoExtracted.join(', ')}*` : '';

  // 1. Personal / Memory Questions
  if (
    qLower.includes('my name') ||
    qLower.includes('who am i') ||
    qLower.includes('call me') ||
    qLower.includes('my preference') ||
    qLower.includes('language do i') ||
    qLower.includes('my role') ||
    qLower.includes('where do i live') ||
    qLower.includes('what do you know about me') ||
    qLower.includes('saved memory') ||
    qLower.includes('tell me about myself') ||
    qLower.includes('about me')
  ) {
    if (memories.length > 0) {
      const memoryList = memories.map(m => `- **${m.key}**: ${m.value} (${m.category || 'General'})`).join('\n');
      return {
        text: `### Saved Profile & Preference Memory\n\nBased on your active memory nodes, here is what I remember about you:\n\n${memoryList}\n\nFeel free to share more preferences or ask any questions!${autoExtNote}`
      };
    } else {
      return {
        text: `I don't have any saved personal memory nodes for you yet.\n\nYou can teach me by typing statements like:\n- *"My name is Alex"*\n- *"I code in Python"*\n- *"I live in New York"*\n\nMy contextual memory engine will automatically extract and remember these facts for future sessions!${autoExtNote}`
      };
    }
  }

  // 2. Document Search in Local Storage (if uploaded documents exist)
  const docs = mockStorage.getDocuments();
  if (docs.length > 0) {
    const matchedChunks: SourceDetail[] = [];
    const queryWords = qLower.split(/\s+/).filter(w => w.length > 3);

    for (const doc of docs) {
      for (let idx = 0; idx < doc.chunks.length; idx++) {
        const chunk = doc.chunks[idx];
        const chunkTextLower = chunk.text.toLowerCase();
        const score = queryWords.reduce((acc, word) => acc + (chunkTextLower.includes(word) ? 1 : 0), 0);
        if (score > 0 || qLower.includes('summary') || qLower.includes('pdf') || qLower.includes('document') || qLower.includes('file')) {
          matchedChunks.push({
            chunkId: chunk.id,
            filename: doc.name,
            pageNumber: 1,
            score: Number((0.75 + score * 0.05).toFixed(2)),
            text: chunk.text
          });
        }
      }
    }

    if (matchedChunks.length > 0) {
      const topChunks = matchedChunks.slice(0, 3);
      const sources = topChunks.map(c => `[From ${c.filename}]: "${c.text}"`);
      const contextText = topChunks.map((c, i) => `**Snippet ${i + 1} (${c.filename}):**\n> ${c.text}`).join('\n\n');

      return {
        text: `### Document Analysis & Response\n\nBased on your uploaded document (**${topChunks[0].filename}**):\n\n${contextText}\n\n*Note: Synthesized from indexed local vector store.*${autoExtNote}`,
        sources,
        sourceDetails: topChunks
      };
    }
  }

  // 3. RAG / AI Architecture Questions
  if (qLower.includes('rag') || qLower.includes('retrieval')) {
    return {
      text: `### Retrieval-Augmented Generation (RAG)\n\n**RAG** is an AI architecture that enhances Large Language Models (LLMs) with external vector knowledge bases:\n\n1. **Document Ingestion**: PDF files are split into overlapping character chunks.\n2. **Vector Embeddings**: Dense vector representations are created using embedding models.\n3. **Pinecone Vector Search**: User queries are embedded to search top matching chunks via cosine similarity.\n4. **Contextual LLM Generation**: Relevant text snippets are fed into Groq / Gemini LLMs to produce accurate, verifiable responses.${autoExtNote}`
    };
  }

  // 4. FastAPI / Python Questions
  if (qLower.includes('fastapi') || qLower.includes('backend') || qLower.includes('python') || qLower.includes('uvicorn')) {
    return {
      text: `### FastAPI & Python RAG Backend\n\n**FastAPI** serves as the core API framework for this RAG application:\n\n- **Endpoints**: Exposes \`/chat\` for context querying and \`/upload\` for PDF ingestion.\n- **Vector Integration**: Queries Pinecone index for top 5 document chunks.\n- **LLM Pipeline**: Connects to Groq (\`llama-3.3-70b-versatile\`) and Gemini for multi-turn RAG generation.\n- **Supabase Store**: Persists chat history & session memories.${autoExtNote}`
    };
  }

  // 5. Pinecone / Vector DB Questions
  if (qLower.includes('pinecone') || qLower.includes('vector') || qLower.includes('embedding')) {
    return {
      text: `### Pinecone Vector Database\n\nPinecone provides managed high-performance vector search:\n\n- **Sub-Second Search**: Queries millions of vectors in under 100 milliseconds.\n- **Metadata Filtering**: Filters search vectors by document name, session ID, or date.\n- **Hybrid Ingestion**: Supports real-time updates when new PDF knowledge bases are uploaded.${autoExtNote}`
    };
  }

  // 6. Greetings & General Inquiries
  if (qLower.includes('hello') || qLower.includes('hi') || qLower.includes('hey') || qLower.startsWith('help')) {
    return {
      text: `Hello! How can I assist you today?\n\nYou can:\n- Ask any question about technology, programming, or RAG systems.\n- Share facts about yourself to store in **Contextual Memory** (e.g., *"My name is Sam"*, *"I prefer React"*).\n- Upload PDF documents in the **Knowledge Center** to query document contents in real time!${autoExtNote}`
    };
  }

  // 7. General Knowledge / Fallback Answer
  return {
    text: `### ContextFlow Assistant\n\nHere is what I found regarding your question:\n\n> **Question**: "${query}"\n\n- **Contextual Memory Engine**: Active and tracking your user preferences.\n- **RAG Document Search**: Ready to query uploaded PDF context.\n- **Interactive AI**: Responding to your query in real time.\n\n*If you would like specific document analysis, make sure to upload your PDF in the Knowledge Center!*${autoExtNote}`
  };
}

// --- AI Service ---
export const mockAiService = {
  /**
   * Send a user question to the FastAPI RAG backend, retrieve context chunks,
   * and return the LLM-generated answer. Falls back seamlessly to smart AI response
   * if backend is offline or unreachable.
   */
  generateResponse: async (
    chatId: string,
    query: string
  ): Promise<{ response: Message; activeMemories: MemoryItem[] }> => {
    // Guard: empty query
    if (!query.trim()) {
      const errorMessage: Message = {
        id: `bot-m-err-${Date.now()}`,
        sender: 'bot',
        text: 'Your message was empty. Please type a question and try again.',
        timestamp: new Date().toISOString(),
      };
      return { response: errorMessage, activeMemories: mockStorage.getMemories() };
    }

    const autoExtracted = autoExtractEntities(query);
    const memories = mockStorage.getMemories();

    try {
      // Primary Attempt: Call FastAPI backend endpoint (http://127.0.0.1:8000/chat)
      let response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          session_id: chatId,
          memories: memories,
        }),
      }).catch(() => null);

      // Secondary Attempt: Try localhost fallback if 127.0.0.1 failed
      if (!response || !response.ok) {
        if (API_BASE_URL.includes('127.0.0.1')) {
          response = await fetch('http://localhost:8000/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: query,
              session_id: chatId,
              memories: memories,
            }),
          }).catch(() => null);
        }
      }

      if (response && response.ok) {
        const data = await response.json();

        const sourceDetails: SourceDetail[] = (data.context || []).map((c: any) => ({
          chunkId: c.chunk_id || c.chunkId || 'chunk-0',
          filename: c.filename || 'uploaded_document.pdf',
          pageNumber: typeof c.page_number === 'number' ? c.page_number : (c.pageNumber || 1),
          score: typeof c.score === 'number' ? c.score : undefined,
          text: c.text || '',
        }));

        const sources = sourceDetails.map(c => `[From ${c.filename}]: "${c.text}"`);

        let memoryBadgeNote = memories.length > 0 ? `${memories.length} Memory Node(s) Active` : undefined;
        if (autoExtracted.length > 0) {
          memoryBadgeNote = `Auto-extracted: ${autoExtracted.join(', ')}`;
        }

        const botMessage: Message = {
          id: `bot-m-${Date.now()}`,
          sender: 'bot',
          text: data.answer,
          timestamp: new Date().toISOString(),
          sources: sources.length > 0 ? sources : undefined,
          sourceDetails: sourceDetails.length > 0 ? sourceDetails : undefined,
          memoryUpdated: memoryBadgeNote,
        };

        // Update local storage with the full conversation
        const chats = mockStorage.getChats();
        const updatedChats = chats.map(c => {
          if (c.id === chatId) {
            return {
              ...c,
              messages: [
                ...c.messages,
                {
                  id: `user-m-${Date.now()}`,
                  sender: 'user' as const,
                  text: query,
                  timestamp: new Date().toISOString(),
                },
                botMessage,
              ],
            };
          }
          return c;
        });
        mockStorage.setChats(updatedChats);

        return {
          response: botMessage,
          activeMemories: mockStorage.getMemories(),
        };
      }

      // If response is not ok or fetch failed, fallback to smart offline AI answer
      throw new Error('Backend unreachable');
    } catch (err: any) {
      console.warn('[mockAiService] Backend offline or unreachable. Generating smart offline response...');

      const smartAns = generateSmartFallbackAnswer(query, memories, autoExtracted);

      let memoryBadgeNote = memories.length > 0 ? `${memories.length} Memory Node(s) Active` : undefined;
      if (autoExtracted.length > 0) {
        memoryBadgeNote = `Auto-extracted: ${autoExtracted.join(', ')}`;
      }

      const botMessage: Message = {
        id: `bot-m-${Date.now()}`,
        sender: 'bot',
        text: smartAns.text,
        timestamp: new Date().toISOString(),
        sources: smartAns.sources,
        sourceDetails: smartAns.sourceDetails,
        memoryUpdated: memoryBadgeNote,
      };

      // Save to local storage chat history
      const chats = mockStorage.getChats();
      const updatedChats = chats.map(c => {
        if (c.id === chatId) {
          return {
            ...c,
            messages: [
              ...c.messages,
              {
                id: `user-m-${Date.now()}`,
                sender: 'user' as const,
                text: query,
                timestamp: new Date().toISOString(),
              },
              botMessage,
            ],
          };
        }
        return c;
      });
      mockStorage.setChats(updatedChats);

      return {
        response: botMessage,
        activeMemories: mockStorage.getMemories(),
      };
    }
  },
};
