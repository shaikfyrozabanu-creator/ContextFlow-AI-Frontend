import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bot, Brain, Database, Cpu, Sparkles, Check, ChevronDown, 
  HelpCircle, ArrowRight, Zap, Code, Layers 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { mockAiService } from '../services/mockAiService';
import type { Message, SourceDetail } from '../services/mockStorage';

export const LandingPage: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Landing Page Interactive Sandbox Chat state (connected to FastAPI RAG backend)
  const [demoChat, setDemoChat] = useState<Message[]>([
    {
      id: 'sandbox-init',
      sender: 'bot',
      text: 'Hello! I am your ContextFlow RAG assistant. Ask me questions about your uploaded documents to test real-time RAG responses!',
      timestamp: new Date().toISOString()
    }
  ]);
  const [demoInput, setDemoInput] = useState('');
  const [demoTyping, setDemoTyping] = useState(false);

  const handleDemoSend = async (textToSend: string) => {
    if (!textToSend.trim() || demoTyping) return;

    const userMsg: Message = {
      id: `sandbox-user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toISOString()
    };

    setDemoChat(prev => [...prev, userMsg]);
    setDemoInput('');
    setDemoTyping(true);

    try {
      const { response } = await mockAiService.generateResponse('sandbox_session', textToSend);
      setDemoChat(prev => [...prev, response]);
    } catch (err: any) {
      setDemoChat(prev => [
        ...prev,
        {
          id: `sandbox-err-${Date.now()}`,
          sender: 'bot',
          text: 'Failed to communicate with RAG backend. Ensure FastAPI server is running.',
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setDemoTyping(false);
    }
  };

  const pricingPlans = [
    {
      name: 'Starter',
      price: billingCycle === 'monthly' ? 49 : 39,
      description: 'Ideal for local websites or personal documentation indexing.',
      features: [
        'Up to 5 Indexed Documents',
        'Max 10MB per Document upload',
        'Standard RAG Vector search',
        '1000 messages / month',
        'Standard Email Support',
      ],
      cta: 'Get Started',
      popular: false,
    },
    {
      name: 'Professional',
      price: billingCycle === 'monthly' ? 99 : 79,
      description: 'Perfect for growing businesses requiring custom personality and memory.',
      features: [
        'Unlimited Documents',
        'Max 50MB per Document upload',
        'Adaptive Semantic Memory Module',
        'Custom System Prompts & Temperature',
        'Unlimited monthly messages',
        'Widget HTML Embed Script',
        'Priority Slack Support',
      ],
      cta: 'Try Pro Free',
      popular: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      description: 'For large platforms requiring external databases and dedicated SLA.',
      features: [
        'Dedicated Vector Indexing (Pinecone/pgvector)',
        'Enterprise OCR for scanned PDFs',
        'Custom LLM Fine-Tuning endpoints',
        'Single Sign-On (SSO / SAML)',
        'Dedicated Solution Architect',
        '99.9% Uptime SLA Guarantee',
      ],
      cta: 'Contact Sales',
      popular: false,
    },
  ];

  const faqs = [
    {
      question: 'What is Retrieval-Augmented Generation (RAG)?',
      answer: 'RAG is a technique that references an external knowledge base to supply background context for a Large Language Model (LLM). Instead of relying solely on the pre-trained weights of the model, RAG search engines index your PDFs, parse them into chunks, extract matching context based on user queries, and inject those snippets into the prompt to guarantee factual, contextual replies.',
    },
    {
      question: 'How does the long-term contextual memory work?',
      answer: 'Our memory engine uses NLP regex entities and vector embeddings to extract specific declarations made by users (e.g. names, user preferences, API choices). These variables are logged to a key-value store, which is automatically read and appended to the AI’s prompt sequence. If the user clears their cache, or asks the bot to "forget my details", the memory nodes are wiped.',
    },
    {
      question: 'Can I customize the chatbot\'s personality?',
      answer: 'Absolutely! The Knowledge Center and active chat sidebars allow you to define a specific "System Prompt". This controls the chatbot\'s tone, boundaries, and formatting instructions. You can also adjust the Creativity Temperature slider (lower values make responses strict and focused on documentation; higher values make them creative).',
    },
    {
      question: 'Is my data secure?',
      answer: 'Yes. Documents are parsed and stored locally or on dedicated encrypted vector hosts. We do not use your proprietary documents to train public base models, ensuring your business credentials, contact numbers, and pricing guidelines remain strictly confidential.',
    },
  ];

  return (
    <div className="space-y-20 md:space-y-32">
      
      {/* Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pt-4 md:pt-8">
        
        {/* Left marketing columns */}
        <div className="lg:col-span-7 space-y-6 text-left">
          <div className="inline-flex items-center space-x-2 bg-cyan-500/10 border border-cyan-500/25 px-4 py-1.5 rounded-full backdrop-blur-md shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-mono font-bold text-cyan-300 tracking-wide">Next-Gen RAG Engine v1.2</span>
          </div>

          <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.08] text-white">
            Contextual AI Chatbots with <span className="gradient-text-21st font-extrabold">Stateful Memory</span>
          </h1>

          <p className="text-base sm:text-lg text-gray-400 max-w-xl leading-relaxed">
            Upload company PDFs, manuals, or spec sheets. ContextFlow parses documents into vector space, memorizes user preferences across sessions, and delivers instant, zero-hallucination answers.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
            <Link
              to="/chat"
              className="btn-glow-cyan px-7 py-3.5 rounded-2xl text-sm font-bold tracking-wide flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              <span>Launch Chatbot</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/admin"
              className="border border-white/10 hover:border-cyan-500/40 bg-gray-950/60 hover:bg-gray-900/60 text-gray-300 hover:text-white font-semibold py-3.5 px-6 rounded-2xl text-center text-sm transition-all shadow-md backdrop-blur-md"
            >
              Knowledge Center & PDFs
            </Link>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-4 pt-6 sm:pt-8 border-t border-white/10 max-w-lg">
            <div className="p-3 rounded-2xl bg-gray-950/40 border border-white/5 space-y-0.5">
              <div className="text-xl sm:text-2xl font-extrabold text-cyan-400 font-mono">1.2s</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Avg Latency</div>
            </div>
            <div className="p-3 rounded-2xl bg-gray-950/40 border border-white/5 space-y-0.5">
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono">99.4%</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Recall Score</div>
            </div>
            <div className="p-3 rounded-2xl bg-gray-950/40 border border-white/5 space-y-0.5">
              <div className="text-xl sm:text-2xl font-extrabold text-purple-400 font-mono">Zero</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Hallucinations</div>
            </div>
          </div>
        </div>

        {/* Right mini chat demo widget */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-md glass-21st rounded-3xl overflow-hidden flex flex-col relative aspect-[4/5] shadow-2xl border border-white/10">
            {/* Header info */}
            <div className="bg-gray-950/80 p-4 border-b border-white/10 flex items-center justify-between backdrop-blur-md">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center shadow-md shadow-cyan-500/20">
                  <Bot className="w-4.5 h-4.5 text-white" />
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-bold text-white tracking-wide leading-none">Interactive RAG Sandbox</h4>
                  <span className="text-[9px] text-cyan-400 font-mono flex items-center space-x-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block mr-1" />
                    FastAPI Endpoint Active
                  </span>
                </div>
              </div>
              <span className="text-[9px] font-mono bg-purple-500/10 text-purple-300 py-0.5 px-2.5 rounded-full border border-purple-500/20 font-bold">Memory Active</span>
            </div>

            {/* Bubble logs */}
            <div className="flex-grow p-4 overflow-y-auto space-y-4 flex flex-col">
              {demoChat.map((msg, index) => {
                const isBot = msg.sender === 'bot';
                const hasSources = isBot && msg.sourceDetails && msg.sourceDetails.length > 0;

                return (
                  <div key={msg.id || index} className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
                    <div 
                      className={`
                        p-3.5 rounded-2xl text-[11px] sm:text-xs leading-relaxed max-w-[85%] text-left space-y-2 shadow-sm
                        ${isBot 
                          ? 'bg-gray-900/80 border border-white/10 text-gray-200 backdrop-blur-md' 
                          : 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-medium shadow-cyan-500/10'}
                      `}
                    >
                      <div>{msg.text}</div>

                      {hasSources && (
                        <div className="pt-2 border-t border-white/10 text-[10px] space-y-1 text-left">
                          <div className="flex items-center space-x-1 font-mono font-bold text-cyan-400">
                            <Layers className="w-3 h-3 text-cyan-400" />
                            <span>Retrieved Context ({msg.sourceDetails!.length}):</span>
                          </div>
                          {msg.sourceDetails!.map((src: SourceDetail, sIdx: number) => (
                            <div key={sIdx} className="bg-gray-950/80 p-1.5 rounded-lg border border-white/5 font-mono text-[10px] text-gray-300">
                              <span className="text-cyan-300 font-semibold">[{src.filename}]:</span> "{src.text}"
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {demoTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-900/80 border border-white/10 px-3.5 py-2.5 rounded-2xl flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Quick Suggestion buttons */}
            <div className="px-4 py-2 border-t border-white/10 bg-gray-950/40 flex gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none">
              <button 
                onClick={() => handleDemoSend('How does the memory work?')}
                className="text-[9px] bg-gray-900 border border-dark-border hover:border-brand-500/30 rounded-lg py-1 px-2.5 text-gray-300 transition-colors"
              >
                🧠 How memory works
              </button>
              <button 
                onClick={() => handleDemoSend('What document types are supported?')}
                className="text-[9px] bg-gray-900 border border-dark-border hover:border-brand-500/30 rounded-lg py-1 px-2.5 text-gray-300 transition-colors"
              >
                📄 Supported files
              </button>
            </div>

            {/* Bottom Form */}
            <div className="p-3 border-t border-dark-border bg-gray-950/60 flex space-x-2">
              <input
                type="text"
                value={demoInput}
                onChange={(e) => setDemoInput(e.target.value)}
                placeholder="Ask about memory, documents, HTML tag..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleDemoSend(demoInput);
                }}
                className="flex-grow bg-gray-900 border border-dark-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-500 text-gray-200 placeholder-gray-600"
              />
              <button
                onClick={() => handleDemoSend(demoInput)}
                className="bg-brand-600 hover:bg-brand-500 text-white p-2 rounded-xl transition-all flex items-center justify-center"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* RAG Architecture Workflow Section */}
      <section className="space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold text-white tracking-wide">
            How The RAG Architecture Works
          </h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            RAG (Retrieval-Augmented Generation) translates raw documents into factual answers in three simple steps.
          </p>
        </div>

        {/* Workflow Diagram cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Step 1 */}
          <div className="p-6 rounded-3xl glass-21st hover-glow-card relative flex flex-col space-y-4 group text-left">
            <div className="absolute -top-3.5 left-6 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 px-3 py-1 text-[10px] font-mono font-bold rounded-full backdrop-blur-md">
              STEP 01
            </div>
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center mt-2 shadow-lg shadow-cyan-500/20">
              <Database className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="space-y-2 text-left">
              <h3 className="text-base font-bold text-white tracking-wide font-display">Semantic Vector Ingestion</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Upload PDFs or text files. ContextFlow splits text into overlapping semantic chunks of ~500 characters and computes vector embeddings using deep-learning models.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-3xl glass-21st hover-glow-card relative flex flex-col space-y-4 group text-left">
            <div className="absolute -top-3.5 left-6 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 px-3 py-1 text-[10px] font-mono font-bold rounded-full backdrop-blur-md">
              STEP 02
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center mt-2 shadow-lg shadow-indigo-500/20">
              <Brain className="w-6 h-6 text-indigo-400" />
            </div>
            <div className="space-y-2 text-left">
              <h3 className="text-base font-bold text-white tracking-wide font-display">Cosine Similarity Search</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                When a user queries the bot, the system queries Pinecone vector space for the top 5 nearest neighbor context chunks with high accuracy recall.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-3xl glass-21st hover-glow-card relative flex flex-col space-y-4 group text-left">
            <div className="absolute -top-3.5 left-6 bg-purple-500/10 border border-purple-500/30 text-purple-300 px-3 py-1 text-[10px] font-mono font-bold rounded-full backdrop-blur-md">
              STEP 03
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center mt-2 shadow-lg shadow-purple-500/20">
              <Bot className="w-6 h-6 text-purple-400" />
            </div>
            <div className="space-y-2 text-left">
              <h3 className="text-base font-bold text-white tracking-wide font-display">Memory & Groq Synthesis</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Groq (Llama-3.3-70B) synthesizes the user question, conversation history, memory nodes, and retrieved PDF chunks to generate a natural Markdown answer.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Core Features */}
      <section className="space-y-16">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold text-white tracking-tight font-display">
            Supercharged <span className="gradient-text-21st">AI SaaS Architecture</span>
          </h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            Everything you need to deploy context-aware, stateful AI chatbots for company websites or private document spaces.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* F1 */}
          <div className="p-6 glass-21st hover-glow-card rounded-3xl flex flex-col space-y-3 text-left">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-cyan-400" />
            </div>
            <h4 className="text-sm font-bold text-white font-display">3D Vector Space Plotter</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Interactively rotate and inspect document text chunks plotted in 3D coordinate space with real-time similarity metrics.
            </p>
          </div>

          {/* F2 */}
          <div className="p-6 glass-21st hover-glow-card rounded-3xl flex flex-col space-y-3 text-left">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Brain className="w-5 h-5 text-indigo-400" />
            </div>
            <h4 className="text-sm font-bold text-white font-display">Integrated Memory Explorer</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Stateful key-value user preferences (name, language, profile details) automatically passed into LLM prompt assembly.
            </p>
          </div>

          {/* F3 */}
          <div className="p-6 glass-21st hover-glow-card rounded-3xl flex flex-col space-y-3 text-left">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-purple-400" />
            </div>
            <h4 className="text-sm font-bold text-white font-display">Groq Llama-3.3-70B Engine</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Ultra-fast inference powered by Groq cloud serverless architecture for instant RAG response generation.
            </p>
          </div>

          {/* F4 */}
          <div className="p-6 glass-21st hover-glow-card rounded-3xl flex flex-col space-y-3 text-left">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Code className="w-5 h-5 text-emerald-400" />
            </div>
            <h4 className="text-sm font-bold text-white font-display">Instant PDF Citation Drawer</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Click any source badge to open the slide-in PDF viewer drawer with text highlighting and exact page numbers.
            </p>
          </div>

        </div>
      </section>

      {/* Pricing Section */}
      <section className="space-y-12">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold text-white tracking-tight font-display">
            Transparent <span className="gradient-text-21st">SaaS Pricing</span>
          </h2>
          <p className="text-sm text-gray-400">
            Flexible plans designed for indie developers, startup platforms, and enterprise solutions.
          </p>

          {/* Billing Switch */}
          <div className="inline-flex items-center space-x-2 bg-gray-950/80 border border-white/10 p-1.5 rounded-full mt-2 backdrop-blur-md">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-5 py-2 rounded-full text-xs font-bold tracking-wider transition-all duration-200 cursor-pointer ${billingCycle === 'monthly' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25' : 'text-gray-400 hover:text-gray-200'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`relative px-5 py-2 rounded-full text-xs font-bold tracking-wider transition-all duration-200 cursor-pointer ${billingCycle === 'yearly' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <span>Yearly</span>
              <span className="absolute -top-5 -right-2 bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[8px] font-extrabold px-2 py-0.5 rounded-full font-mono">
                20% OFF
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {pricingPlans.map((plan, idx) => (
            <div
              key={idx}
              className={`
                relative p-8 rounded-3xl border flex flex-col justify-between transition-all duration-300 hover-glow-card
                ${plan.popular 
                  ? 'border-cyan-500/50 bg-gray-950/70 shadow-[0_0_50px_0_rgba(6,182,212,0.15)]' 
                  : 'border-white/10 glass-21st'}
              `}
            >
              {plan.popular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-mono text-[9px] font-extrabold px-4 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-cyan-500/25">
                  Most Popular
                </span>
              )}

              <div className="space-y-6">
                {/* Header */}
                <div className="text-left space-y-2">
                  <h4 className="text-sm font-bold text-cyan-400 font-mono tracking-wider uppercase">{plan.name}</h4>
                  <div className="flex items-baseline space-x-1 text-white">
                    {typeof plan.price === 'number' ? (
                      <>
                        <span className="text-3xl font-extrabold font-display">$</span>
                        <span className="text-5xl font-extrabold font-display tracking-tight">{plan.price}</span>
                        <span className="text-gray-400 text-xs font-semibold ml-1">/ mo</span>
                      </>
                    ) : (
                      <span className="text-4xl font-extrabold font-display tracking-tight py-1">{plan.price}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed min-h-[32px] pt-1">{plan.description}</p>
                </div>

                {/* Features List */}
                <ul className="space-y-3.5 border-t border-white/10 pt-6 text-left">
                  {plan.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-center space-x-2.5 text-xs text-gray-300">
                      <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA button */}
              <div className="pt-8">
                <Link
                  to="/chat"
                  className={`
                    block w-full py-3.5 rounded-2xl text-center text-xs font-bold transition-all shadow-md cursor-pointer
                    ${plan.popular 
                      ? 'btn-glow-cyan' 
                      : 'border border-white/10 hover:border-cyan-500/40 bg-gray-900/60 text-gray-300 hover:text-white'}
                  `}
                >
                  {plan.cta}
                </Link>
              </div>

            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-3xl mx-auto space-y-12 pb-10">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-extrabold text-white tracking-wide">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-gray-400">
            Everything you need to understand about memory-augmented website retrieval chatbot operations.
          </p>
        </div>

        {/* FAQs list accordion */}
        <div className="space-y-4 text-left">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="border border-dark-border rounded-2xl bg-gray-950/25 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left text-sm font-semibold text-white focus:outline-none hover:bg-gray-900/40 transition-colors"
                >
                  <div className="flex items-center space-x-3 pr-4">
                    <HelpCircle className="w-4.5 h-4.5 text-brand-400 flex-shrink-0" />
                    <span>{faq.question}</span>
                  </div>
                  <ChevronDown className={`w-4.5 h-4.5 text-gray-500 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180 text-brand-400' : ''}`} />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-dark-border/40 bg-gray-950/40"
                    >
                      <p className="p-5 text-xs sm:text-sm text-gray-400 leading-relaxed">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
};
export default LandingPage;
