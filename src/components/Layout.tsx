import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Bot, Database, MessageSquare, Menu, X, Cpu, ExternalLink, Sun, Moon, GitBranch } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

const GithubIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
);

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const navigation = [
    { name: 'Home', href: '/', icon: Bot },
    { name: 'Workspace Chat', href: '/chat', icon: MessageSquare },
    { name: 'Knowledge Center', href: '/admin', icon: Database },
    { name: 'Explain RAG', href: '/explain', icon: Cpu },
    { name: 'Architecture', href: '/architecture', icon: GitBranch },
  ];

  return (
    <div className="relative min-h-screen bg-dark-deep text-gray-100 flex flex-col selection:bg-cyan-500/30 selection:text-white bg-mesh-grid">
      {/* Decorative 21st Ambient Background Glows */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/10 pointer-events-none rounded-full blur-[140px]" />
      <div className="fixed top-1/3 right-1/4 w-[700px] h-[700px] bg-purple-500/10 pointer-events-none rounded-full blur-[160px]" />
      <div className="fixed bottom-0 left-10 w-[500px] h-[500px] bg-indigo-500/10 pointer-events-none rounded-full blur-[120px]" />

      {/* Floating 21st Glass Navbar */}
      <header className="sticky top-3 z-50 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-21st rounded-2xl border border-white/10 px-4 sm:px-6 py-2.5 backdrop-blur-2xl shadow-2xl">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link to="/" className="flex items-center space-x-3 group">
                <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-cyan-500/25 group-hover:shadow-cyan-500/40 transition-all duration-300">
                  <Bot className="w-5.5 h-5.5 text-white animate-pulse-slow" />
                  <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="flex flex-col">
                  <span className="font-display font-extrabold text-lg sm:text-xl tracking-tight text-white group-hover:text-cyan-300 transition-colors duration-300">
                    ContextFlow<span className="text-cyan-400">.ai</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-[10px] text-cyan-300/80 tracking-widest uppercase font-mono font-bold leading-none">RAG Engine v1.2</span>
                  </div>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-1 items-center bg-gray-950/60 border border-white/10 p-1.5 rounded-full shadow-inner">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={({ isActive }) => `
                      relative px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 flex items-center space-x-2
                      ${isActive ? 'text-white' : 'text-gray-400 hover:text-gray-200'}
                    `}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-nav"
                        className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/40 rounded-full shadow-sm"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-cyan-400' : 'text-gray-500'}`} />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center space-x-3">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                className="p-2.5 rounded-xl border border-white/10 bg-gray-900/60 hover:bg-gray-800/80 text-gray-400 hover:text-white transition-all duration-200 group cursor-pointer"
              >
                {theme === 'dark'
                  ? <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform duration-300" />
                  : <Moon className="w-4 h-4 text-cyan-400 group-hover:-rotate-12 transition-transform duration-300" />
                }
              </button>

              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noreferrer" 
                className="text-gray-400 hover:text-white p-2.5 rounded-xl border border-white/10 bg-gray-900/60 hover:bg-gray-800/80 transition-all"
                title="View Source on Github"
              >
                <GithubIcon className="w-4.5 h-4.5" />
              </a>
              <Link
                to="/chat"
                className="btn-glow-cyan px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold tracking-wide flex items-center space-x-1.5 cursor-pointer"
              >
                <span>Launch Chatbot</span>
                <span>⚡</span>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800/50 border border-transparent hover:border-dark-border focus:outline-none transition-all duration-200"
              >
                <span className="sr-only">Open main menu</span>
                {mobileMenuOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-dark-border/60 bg-dark-slate/95 backdrop-blur-lg overflow-hidden"
            >
              <div className="px-4 pt-2 pb-6 space-y-1 sm:px-3">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`
                        flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200
                        ${isActive ? 'bg-brand-500/10 border-l-4 border-brand-500 text-white' : 'text-gray-400 hover:bg-gray-800/40 hover:text-white border-l-4 border-transparent'}
                      `}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-brand-400' : 'text-gray-500'}`} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
                <div className="pt-4 border-t border-dark-border/40 mt-4 flex flex-col space-y-3 px-4">
                  {/* Theme toggle in mobile drawer */}
                  <button
                    onClick={toggleTheme}
                    className="flex items-center space-x-3 py-2.5 px-4 rounded-xl border border-dark-border text-gray-300 text-sm font-semibold hover:bg-gray-800/40 transition-all"
                  >
                    {theme === 'dark'
                      ? <><Sun className="w-4 h-4 text-amber-400" /><span>Switch to Light Mode</span></>
                      : <><Moon className="w-4 h-4 text-brand-400" /><span>Switch to Dark Mode</span></>
                    }
                  </button>
                  <Link
                    to="/chat"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-3 px-5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-500 text-white text-sm font-semibold hover:from-brand-500 hover:to-indigo-400 transition-all shadow-md shadow-brand-500/20"
                  >
                    Launch Chatbot
                  </Link>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center space-x-2 text-center py-2.5 px-5 rounded-xl border border-dark-border text-gray-300 text-sm font-semibold hover:bg-gray-800/40 transition-all"
                  >
                    <GithubIcon className="w-4 h-4" />
                    <span>View GitHub</span>
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 z-10">
        {children}
      </main>

      {/* Footer */}
      <footer className="w-full glass-21st border-t border-white/10 mt-auto backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 text-left">
            {/* Branding Column */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <span className="font-display font-extrabold text-lg text-white">
                  ContextFlow<span className="text-cyan-400">.ai</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-400 max-w-sm leading-relaxed font-sans">
                Connect your knowledge bases, deploy interactive AI chatbots, and enable stateful contextual memory systems in minutes.
              </p>
              <div className="flex space-x-3">
                <a href="#github" className="w-8 h-8 rounded-xl bg-gray-950/80 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-cyan-500/40 transition-colors">
                  <GithubIcon className="w-4 h-4" />
                </a>
                <a href="#twitter" className="w-8 h-8 rounded-xl bg-gray-950/80 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-cyan-500/40 transition-colors">
                  <Cpu className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Links Columns */}
            <div>
              <h3 className="text-xs font-bold text-gray-300 tracking-wider uppercase mb-4 font-mono">Product</h3>
              <ul className="space-y-2.5">
                <li>
                  <Link to="/" className="text-xs sm:text-sm text-gray-400 hover:text-cyan-300 transition-colors flex items-center space-x-1.5 font-medium">
                    <span>Platform Landing</span>
                  </Link>
                </li>
                <li>
                  <Link to="/chat" className="text-xs sm:text-sm text-gray-400 hover:text-cyan-300 transition-colors flex items-center space-x-1.5 font-medium">
                    <span>Chat Interface</span>
                  </Link>
                </li>
                <li>
                  <Link to="/admin" className="text-xs sm:text-sm text-gray-400 hover:text-cyan-300 transition-colors flex items-center space-x-1.5 font-medium">
                    <span>Knowledge Hub</span>
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold text-gray-300 tracking-wider uppercase mb-4 font-mono">Developer Stack</h3>
              <ul className="space-y-2.5">
                <li className="flex items-center space-x-1 text-xs sm:text-sm text-gray-400 hover:text-cyan-300 transition-colors cursor-pointer font-medium">
                  <span>FastAPI & Uvicorn</span>
                  <ExternalLink className="w-3 h-3" />
                </li>
                <li className="flex items-center space-x-1 text-xs sm:text-sm text-gray-400 hover:text-cyan-300 transition-colors cursor-pointer font-medium">
                  <span>Pinecone Vector DB</span>
                  <ExternalLink className="w-3 h-3" />
                </li>
                <li className="flex items-center space-x-1 text-xs sm:text-sm text-gray-400 hover:text-cyan-300 transition-colors cursor-pointer font-medium">
                  <span>Groq Cloud Llama-3.3</span>
                  <ExternalLink className="w-3 h-3" />
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 sm:mt-16 pt-8 border-t border-white/10 flex flex-col items-center justify-center text-center space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-bold text-white font-display">
                AI-Powered Contextual Website Chatbot using RAG
              </p>
              <p className="text-xs text-cyan-300/90 font-mono">
                Built with React, FastAPI, Pinecone, Groq, and Sentence Transformers.
              </p>
            </div>
            <p className="text-xs text-gray-500 pt-2 font-mono">
              &copy; {new Date().getFullYear()} ContextFlow.ai Inc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default Layout;
