export interface DocumentChunk {
  id: string;
  text: string;
  vector: number[]; // 3D representation for visualizer [x, y, z]
  charCount: number;
}

export interface Document {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  status: 'processing' | 'indexed' | 'failed';
  chunkCount: number;
  chunks: DocumentChunk[];
}

export interface SourceDetail {
  chunkId: string;
  filename: string;
  pageNumber: number;
  score?: number;
  text: string;
}

export interface AnswerTelemetry {
  whyGenerated: string;
  retrievedDocs: { name: string; page: number; score: number }[];
  confidenceScore: number;
  memoryUsed: string[];
  similarityScores: number[];
  tokenCount: { promptTokens: number; completionTokens: number; totalTokens: number };
  llmLatencyMs: number;
  promptLengthChars: number;
}

export interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  sources?: string[]; // Array of chunk texts for backward compatibility
  sourceDetails?: SourceDetail[]; // Structured document sources from RAG
  memoryUpdated?: string; // Informational note if memory was written/updated
  telemetry?: AnswerTelemetry;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt?: string;
  pinned?: boolean;
}

export interface MemoryEvent {
  id: string;
  type: 'created' | 'updated' | 'used' | 'deleted';
  timestamp: string;
  note?: string;
}

export interface MemoryItem {
  id: string;
  key: string;
  value: string;
  category: 'User Info' | 'Preference' | 'Custom';
  createdAt: string;
  updatedAt?: string;
  usedCount?: number;
  lastUsedAt?: string;
  events?: MemoryEvent[];
}

export interface ChatSettings {
  systemPrompt: string;
  model: string;
  temperature: number;
  topP: number;
  topK: number;
  maxTokens: number;
  chunkSize: number;
  chunkOverlap: number;
  topKRetrieval: number;
  similarityThreshold: number;
  embeddingModel: string;
  memoryEnabled: boolean;
}

// Generate a random 3D coordinate for vector visualization
const generateMockVector = (): number[] => {
  return [
    Math.random() * 2 - 1,
    Math.random() * 2 - 1,
    Math.random() * 2 - 1,
  ];
};

const DEFAULT_DOCUMENTS: Document[] = [
  {
    id: 'doc-1',
    name: 'Acme_Overview.pdf',
    size: 2450000,
    uploadedAt: '2026-07-26T14:32:00.000Z',
    status: 'indexed',
    chunkCount: 4,
    chunks: [
      {
        id: 'c1-1',
        text: 'Acme Corp is a leading provider of AI-driven cognitive customer relations platforms. Founded in 2024, our mission is to democratize generative AI agent development for online enterprises.',
        vector: [0.15, -0.62, 0.44],
        charCount: 169
      },
      {
        id: 'c1-2',
        text: 'Our flagship product, ContextualFlow RAG, enables websites to upload documents (PDF, TXT, DOCX) and automatically index them into high-dimensional vector embeddings for context-aware customer support.',
        vector: [0.72, 0.08, -0.31],
        charCount: 201
      },
      {
        id: 'c1-3',
        text: 'Acme Corp offices are headquartered in San Francisco, CA. Standard support operations run Monday through Friday, 9:00 AM to 6:00 PM EST. Support requests can be sent to support@acmecorp.com.',
        vector: [-0.41, 0.53, 0.78],
        charCount: 191
      },
      {
        id: 'c1-4',
        text: 'Subscription options: Starter tier ($49/month) allows 5 indexed documents. Professional tier ($99/month) includes infinite documents and semantic memory. Enterprise tier (custom pricing) includes external DB connections.',
        vector: [-0.09, -0.81, -0.22],
        charCount: 215
      }
    ]
  },
  {
    id: 'doc-2',
    name: 'Memory_System_Guide.txt',
    size: 980000,
    uploadedAt: '2026-07-27T09:15:00.000Z',
    status: 'indexed',
    chunkCount: 3,
    chunks: [
      {
        id: 'c2-1',
        text: 'The memory module employs key-value semantic extraction. As conversations flow, the chatbot continuously scans messages for self-disclosed user profile fields or preferences.',
        vector: [0.55, -0.12, -0.68],
        charCount: 172
      },
      {
        id: 'c2-2',
        text: 'Extracted variables (like user name, timezone, programming preference) are saved as memory nodes in a persistent local memory database and injected into the LLM context window during prompt assembly.',
        vector: [0.38, 0.81, 0.05],
        charCount: 202
      },
      {
        id: 'c2-3',
        text: 'To clear or reset chatbot memory, administrators can head to the Admin Dashboard and delete specific memory keys. Alternatively, users can ask the bot to "forget my details" in a chat message.',
        vector: [-0.67, -0.22, 0.49],
        charCount: 199
      }
    ]
  }
];

const DEFAULT_MEMORIES: MemoryItem[] = [
  {
    id: 'mem-1',
    key: 'user_name',
    value: 'Ameer',
    category: 'User Info',
    createdAt: '2026-07-28T10:00:00.000Z',
    usedCount: 14,
    lastUsedAt: '2026-07-31T16:30:00.000Z',
    events: [
      { id: 'ev-1-1', type: 'created', timestamp: '2026-07-28T10:00:00.000Z', note: 'Created initial memory key user_name' },
      { id: 'ev-1-2', type: 'used', timestamp: '2026-07-29T14:10:00.000Z', note: 'Used in LLM response for greeting' },
      { id: 'ev-1-3', type: 'used', timestamp: '2026-07-31T16:30:00.000Z', note: 'Injected into prompt for personal query' },
    ]
  },
  {
    id: 'mem-2',
    key: 'preferred_language',
    value: 'React & TypeScript',
    category: 'Preference',
    createdAt: '2026-07-28T10:05:00.000Z',
    usedCount: 8,
    lastUsedAt: '2026-07-31T15:20:00.000Z',
    events: [
      { id: 'ev-2-1', type: 'created', timestamp: '2026-07-28T10:05:00.000Z', note: 'Created preference preferred_language' },
      { id: 'ev-2-2', type: 'updated', timestamp: '2026-07-30T09:15:00.000Z', note: 'Updated value to "React & TypeScript"' },
      { id: 'ev-2-3', type: 'used', timestamp: '2026-07-31T15:20:00.000Z', note: 'Used in LLM code recommendation prompt' },
    ]
  },
  {
    id: 'mem-3',
    key: 'plan_interest',
    value: 'Professional Plan ($99/mo)',
    category: 'Preference',
    createdAt: '2026-07-28T10:12:00.000Z',
    usedCount: 5,
    lastUsedAt: '2026-07-31T12:00:00.000Z',
    events: [
      { id: 'ev-3-1', type: 'created', timestamp: '2026-07-28T10:12:00.000Z', note: 'Created preference plan_interest' },
      { id: 'ev-3-2', type: 'used', timestamp: '2026-07-31T12:00:00.000Z', note: 'Used in LLM response for pricing breakdown' },
    ]
  }
];

const DEFAULT_SETTINGS: ChatSettings = {
  systemPrompt: 'You are a helpful, friendly AI assistant for Acme Corp. You answer user queries accurately based on the provided documents. If you do not know the answer, politely state that the information is not in your current database and offer to direct them to support@acmecorp.com.',
  model: 'groq-llama3.3',
  temperature: 0.4,
  topP: 0.90,
  topK: 40,
  maxTokens: 2048,
  chunkSize: 500,
  chunkOverlap: 100,
  topKRetrieval: 5,
  similarityThreshold: 0.70,
  embeddingModel: 'all-MiniLM-L6-v2',
  memoryEnabled: true
};

const DEFAULT_CHATS: Chat[] = [
  {
    id: 'chat-1',
    title: 'Acme Pricing & Features',
    createdAt: '2026-07-28T11:20:00.000Z',
    messages: [
      {
        id: 'm-1',
        sender: 'user',
        text: 'Hi there, I am Ameer and I am looking for details about your plans.',
        timestamp: '2026-07-28T11:20:00.000Z'
      },
      {
        id: 'm-2',
        sender: 'bot',
        text: 'Hello Ameer! Nice to meet you. Acme Corp offers three tiers: \n1. **Starter** ($49/month): Includes up to 5 indexed documents.\n2. **Professional** ($99/month): Includes unlimited documents and support for semantic memory.\n3. **Enterprise** (Custom pricing): Integrates with external vector databases like Pinecone.\n\nSince you are interested in React & TypeScript, our Professional plan is excellent for integrating dynamic memory. Would you like more details on how to deploy this plan?',
        timestamp: '2026-07-28T11:20:10.000Z',
        sources: [
          'Subscription options: Starter tier ($49/month) allows 5 indexed documents. Professional tier ($99/month) includes infinite documents and semantic memory. Enterprise tier (custom pricing) includes external DB connections.'
        ],
        memoryUpdated: 'Remembered: user_name = "Ameer", plan_interest = "Professional Plan ($99/mo)"'
      }
    ]
  }
];

// Helper functions for localStorage manipulation
const getStorageItem = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`Failed to read key ${key} from storage:`, e);
    return defaultValue;
  }
};

const setStorageItem = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to write key ${key} to storage:`, e);
  }
};

export const mockStorage = {
  getDocuments: (): Document[] => getStorageItem<Document[]>('rag_documents', DEFAULT_DOCUMENTS),
  setDocuments: (docs: Document[]): void => setStorageItem<Document[]>('rag_documents', docs),
  
  getChats: (): Chat[] => getStorageItem<Chat[]>('rag_chats', DEFAULT_CHATS),
  setChats: (chats: Chat[]): void => setStorageItem<Chat[]>('rag_chats', chats),
  
  getMemories: (): MemoryItem[] => getStorageItem<MemoryItem[]>('rag_memories', DEFAULT_MEMORIES),
  setMemories: (memories: MemoryItem[]): void => setStorageItem<MemoryItem[]>('rag_memories', memories),
  
  getSettings: (): ChatSettings => getStorageItem<ChatSettings>('rag_settings', DEFAULT_SETTINGS),
  setSettings: (settings: ChatSettings): void => setStorageItem<ChatSettings>('rag_settings', settings),

  // Reset all uploaded documents, chats, and memories to start a completely fresh session
  resetAllData: (): { freshChatId: string } => {
    localStorage.removeItem('rag_documents');
    localStorage.removeItem('rag_chats');
    localStorage.removeItem('rag_memories');

    const freshChat: Chat = {
      id: `chat-${Date.now()}`,
      title: 'Fresh Session',
      messages: [],
      createdAt: new Date().toISOString()
    };

    setStorageItem<Document[]>('rag_documents', []);
    setStorageItem<Chat[]>('rag_chats', [freshChat]);
    setStorageItem<MemoryItem[]>('rag_memories', []);

    return { freshChatId: freshChat.id };
  },

  // Calculate live application statistics
  getStats: () => {
    const docs = getStorageItem<Document[]>('rag_documents', DEFAULT_DOCUMENTS);
    const chats = getStorageItem<Chat[]>('rag_chats', DEFAULT_CHATS);

    const pdfsUploaded = docs.filter(d => d.name.toLowerCase().endsWith('.pdf') || d.status === 'indexed').length;
    const totalChunksIndexed = docs.reduce((sum, d) => sum + (d.status === 'indexed' ? (d.chunkCount || 0) : 0), 0);
    
    let questionsAsked = 0;
    chats.forEach(c => {
      questionsAsked += c.messages.filter(m => m.sender === 'user').length;
    });

    const avgResponseTime = questionsAsked > 0 ? '1.2s' : '0.8s';

    return {
      pdfsUploaded,
      totalChunksIndexed,
      questionsAsked,
      avgResponseTime
    };
  },
  
  // Custom utility to process an uploaded file
  addDocument: (name: string, content: string, size: number): Promise<Document> => {
    return new Promise((resolve) => {
      // Simulate file upload process
      const id = `doc-${Date.now()}`;
      const newDoc: Document = {
        id,
        name,
        size,
        uploadedAt: new Date().toISOString(),
        status: 'processing',
        chunkCount: 0,
        chunks: []
      };
      
      const docs = mockStorage.getDocuments();
      mockStorage.setDocuments([newDoc, ...docs]);
      
      setTimeout(() => {
        const sentences = content
          .split(/(?<=[.!?])\s+/)
          .filter(s => s.trim().length > 10);
          
        const chunks: DocumentChunk[] = [];
        let index = 0;
        
        let currentChunkText = '';
        for (const sentence of sentences) {
          if ((currentChunkText + ' ' + sentence).length > 250 && currentChunkText.length > 0) {
            chunks.push({
              id: `${id}-c${index++}`,
              text: currentChunkText.trim(),
              vector: generateMockVector(),
              charCount: currentChunkText.length
            });
            currentChunkText = sentence;
          } else {
            currentChunkText = currentChunkText ? currentChunkText + ' ' + sentence : sentence;
          }
        }
        
        if (currentChunkText.trim().length > 0) {
          chunks.push({
            id: `${id}-c${index++}`,
            text: currentChunkText.trim(),
            vector: generateMockVector(),
            charCount: currentChunkText.length
          });
        }
        
        if (chunks.length === 0) {
          chunks.push({
            id: `${id}-c0`,
            text: `This document contains info about ${name}. Embedded details and semantic RAG structures are generated.`,
            vector: generateMockVector(),
            charCount: 95
          });
        }
        
        const currentDocs = mockStorage.getDocuments();
        const updatedDocs = currentDocs.map(d => {
          if (d.id === id) {
            return {
              ...d,
              status: 'indexed' as const,
              chunkCount: chunks.length,
              chunks: chunks
            };
          }
          return d;
        });
        mockStorage.setDocuments(updatedDocs);
        
        const finalDoc = updatedDocs.find(d => d.id === id) || newDoc;
        resolve(finalDoc);
      }, 2500);
    });
  }
};
