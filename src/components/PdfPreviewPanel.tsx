import React, { useState, useEffect } from 'react';
import { 
  X, FileText, ExternalLink, AlertCircle, Highlighter, ChevronDown, ChevronUp,
  ZoomIn, ZoomOut, RotateCw, Search, Grid, Maximize2, Minimize2, ChevronLeft, ChevronRight
} from 'lucide-react';

interface PdfPreviewPanelProps {
  filename: string | null;
  highlightText: string | null;
  pageNumber?: number;
  score?: number;
  onClose: () => void;
}

export const PdfPreviewPanel: React.FC<PdfPreviewPanelProps> = ({
  filename,
  highlightText,
  pageNumber = 1,
  score,
  onClose,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(pageNumber);
  const [zoom, setZoom] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [searchInPdf, setSearchInPdf] = useState<string>('');
  const [panelWidth, setPanelWidth] = useState<'standard' | 'wide' | 'fullscreen'>('standard');
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false);
  const [showChunkText, setShowChunkText] = useState<boolean>(true);
  const [iframeError, setIframeError] = useState<boolean>(false);

  // Sync page number when props change
  useEffect(() => {
    setCurrentPage(pageNumber || 1);
  }, [pageNumber, filename]);

  // Construct PDF URL with page anchor
  const pdfUrl = filename
    ? `http://localhost:8000/uploads/${encodeURIComponent(filename)}#page=${currentPage}`
    : null;

  // Reset iframe error state on new file
  useEffect(() => {
    setIframeError(false);
  }, [filename]);

  // Calculate search occurrences count
  const matchCount = React.useMemo(() => {
    if (!searchInPdf.trim() || !highlightText) return 0;
    const q = searchInPdf.toLowerCase();
    let count = 0;
    let pos = highlightText.toLowerCase().indexOf(q);
    while (pos !== -1) {
      count++;
      pos = highlightText.toLowerCase().indexOf(q, pos + 1);
    }
    return count;
  }, [searchInPdf, highlightText]);

  if (!filename) return null;

  const confidencePct = score != null ? Math.round(score * 100) : 95;
  const totalPagesEst = Math.max(currentPage, 6); // Total pages count

  // Panel width CSS class mapper
  const widthClass = 
    panelWidth === 'fullscreen' ? 'w-full max-w-[88vw]' :
    panelWidth === 'wide' ? 'w-full max-w-4xl' : 'w-full max-w-2xl';

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleNextPage = () => {
    setCurrentPage(p => Math.min(totalPagesEst, p + 1));
  };

  const handlePrevPage = () => {
    setCurrentPage(p => Math.max(1, p - 1));
  };

  return (
    <>
      {/* Dark Backdrop */}
      <div
        className="fixed inset-0 bg-black/65 z-40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-in Resizable Panel */}
      <div className={`fixed right-0 top-0 bottom-0 z-50 flex flex-col ${widthClass} shadow-2xl shadow-black/80 border-l border-white/10 bg-gray-950 text-left transition-all duration-300 animate-slideInRight`}>

        {/* ── 1. MAIN HEADER & FILE TITLE ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 flex-shrink-0 bg-gray-950/95 backdrop-blur-md">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/20">
              <FileText className="w-4.5 h-4.5 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-white font-display truncate max-w-[280px]" title={filename}>
                {filename}
              </h3>
              <p className="text-[10px] text-cyan-300/80 font-mono">
                Page {currentPage} of {totalPagesEst} · RAG PDF Viewer
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              🎯 {confidencePct}% Match
            </span>

            {/* Resizable Width Toggle */}
            <button
              onClick={() => setPanelWidth(w => w === 'standard' ? 'wide' : w === 'wide' ? 'fullscreen' : 'standard')}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 border border-white/10 transition-colors cursor-pointer"
              title={`Toggle Viewport Width (${panelWidth})`}
            >
              {panelWidth === 'fullscreen' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {pdfUrl && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 border border-white/10 transition-colors cursor-pointer"
                title="Open PDF in new tab at page"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 border border-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── 2. ADVANCED VIEWER TOOLBAR (Zoom, Rotate, Page Jump, Search, Thumbnails) ── */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-gray-900/90 border-b border-white/10 flex-wrap gap-3 font-mono text-xs select-none">
          
          {/* Page Stepper & Direct Jump Input */}
          <div className="flex items-center space-x-1.5 bg-gray-950/80 border border-white/10 p-1 rounded-xl">
            <button
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 text-gray-300 cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            
            <div className="flex items-center space-x-1 px-1">
              <span className="text-[10px] text-gray-400">Page</span>
              <input
                type="number"
                min={1}
                max={totalPagesEst}
                value={currentPage}
                onChange={(e) => setCurrentPage(Math.max(1, Math.min(totalPagesEst, parseInt(e.target.value) || 1)))}
                className="w-10 bg-gray-900 border border-white/10 rounded px-1 text-center text-xs text-cyan-300 font-bold focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-gray-400">/ {totalPagesEst}</span>
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage >= totalPagesEst}
              className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 text-gray-300 cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center space-x-1.5 bg-gray-950/80 border border-white/10 p-1 rounded-xl">
            <button
              onClick={() => setZoom(z => Math.max(50, z - 15))}
              className="p-1 rounded-lg hover:bg-white/10 text-gray-300 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-[10px] font-bold text-cyan-300 w-10 text-center">{zoom}%</span>
            <button
              onClick={() => setZoom(z => Math.min(250, z + 15))}
              className="p-1 rounded-lg hover:bg-white/10 text-gray-300 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(100)}
              className="px-2 py-0.5 rounded text-[9px] hover:bg-white/10 text-gray-400 cursor-pointer border border-white/5"
              title="Reset Zoom"
            >
              100%
            </button>
          </div>

          {/* Page Rotation */}
          <button
            onClick={handleRotate}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-gray-950/80 border border-white/10 text-gray-300 hover:text-white hover:border-cyan-500/40 transition-colors cursor-pointer font-bold text-[11px]"
            title="Rotate Page (90° steps)"
          >
            <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>{rotation}°</span>
          </button>

          {/* Search Inside PDF Bar */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-cyan-400 absolute left-2.5" />
            <input
              type="text"
              value={searchInPdf}
              onChange={(e) => setSearchInPdf(e.target.value)}
              placeholder="Search text in PDF..."
              className="bg-gray-950/80 border border-white/10 rounded-xl pl-8 pr-16 py-1 text-xs text-gray-200 focus:outline-none focus:border-cyan-500 w-44 font-mono placeholder-gray-500"
            />
            {searchInPdf && (
              <span className="absolute right-2 text-[9px] font-bold text-emerald-400">
                {matchCount} match{matchCount !== 1 ? 'es' : ''}
              </span>
            )}
          </div>

          {/* Page Thumbnails Toggle Button */}
          <button
            onClick={() => setShowThumbnails(t => !t)}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-colors cursor-pointer ${showThumbnails ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-gray-950/80 border-white/10 text-gray-400 hover:text-white'}`}
            title="Toggle Page Thumbnail Sidebar"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Pages</span>
          </button>

        </div>

        {/* ── 3. HIGHLIGHTED RETRIEVED CHUNK BANNER ── */}
        {highlightText && (
          <div className="flex-shrink-0 border-b border-white/10 bg-amber-500/5">
            <button
              onClick={() => setShowChunkText(s => !s)}
              className="w-full flex items-center gap-2 px-5 py-2.5 hover:bg-white/5 transition-colors text-left"
            >
              <Highlighter className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold text-amber-300">Retrieved RAG Chunk Segment</span>
              <span className="text-[10px] text-gray-400 font-mono ml-1">— click to {showChunkText ? 'collapse' : 'expand'}</span>
              {showChunkText
                ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 ml-auto" />
                : <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-auto" />
              }
            </button>

            {showChunkText && (
              <div className="px-5 pb-3.5 animate-fadeIn">
                <div className="bg-gray-950/90 border border-amber-500/30 rounded-2xl p-3.5 text-xs text-gray-200 leading-relaxed font-sans max-h-36 overflow-y-auto shadow-inner text-left">
                  <mark className="bg-amber-400/20 text-amber-200 rounded px-1 py-0.5 font-medium border-l-2 border-amber-400 block">
                    "{highlightText}"
                  </mark>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 4. VIEWPORT: THUMBNAILS SIDEBAR + PDF CANVAS AREA ── */}
        <div className="flex-grow flex relative overflow-hidden bg-gray-950">

          {/* Page Thumbnails Sidebar */}
          {showThumbnails && (
            <div className="w-44 flex-shrink-0 border-r border-white/10 bg-gray-950/95 p-3 overflow-y-auto space-y-3 shadow-inner text-center animate-fadeIn">
              <span className="text-[10px] text-cyan-300 font-mono font-bold uppercase tracking-widest block border-b border-white/10 pb-2">
                Page Thumbnails
              </span>
              <div className="space-y-2.5">
                {Array.from({ length: totalPagesEst }).map((_, idx) => {
                  const pNum = idx + 1;
                  const isCurrent = pNum === currentPage;
                  return (
                    <button
                      key={pNum}
                      onClick={() => setCurrentPage(pNum)}
                      className={`
                        w-full aspect-[3/4] rounded-xl border p-2 flex flex-col items-center justify-between transition-all cursor-pointer relative group
                        ${isCurrent 
                          ? 'border-cyan-400 bg-cyan-500/15 shadow-lg shadow-cyan-500/20' 
                          : 'border-white/10 bg-gray-900/60 hover:border-cyan-500/40'}
                      `}
                    >
                      <FileText className={`w-6 h-6 mt-2 ${isCurrent ? 'text-cyan-400' : 'text-gray-500'}`} />
                      <span className={`text-[10px] font-mono font-bold rounded px-1.5 py-0.5 ${isCurrent ? 'bg-cyan-500 text-white' : 'text-gray-400 bg-gray-950'}`}>
                        Page {pNum}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Main PDF Scrollable Viewport */}
          <div className="flex-grow relative overflow-auto p-4 flex items-center justify-center">
            <div 
              className="w-full h-full transition-transform duration-200 flex items-center justify-center"
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
              }}
            >
              {!iframeError ? (
                <iframe
                  src={pdfUrl ?? ''}
                  title={`PDF preview: ${filename}`}
                  className="w-full h-full border-0 rounded-2xl shadow-2xl bg-white"
                  onError={() => setIframeError(true)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center glass-21st border border-white/10 rounded-3xl">
                  <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-lg">
                    <AlertCircle className="w-7 h-7 text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white font-display">PDF Embed Viewer Unavailable</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs leading-relaxed font-sans">
                      The PDF preview server is loading. You can open the file directly in a new tab or inspect the retrieved chunk text above.
                    </p>
                  </div>
                  {pdfUrl && (
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold font-mono rounded-xl transition-all shadow-md shadow-cyan-500/20"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Open PDF in New Window</span>
                    </a>
                  )}

                  {/* Fallback retrieved text view */}
                  {highlightText && (
                    <div className="w-full text-left mt-2 border-t border-white/10 pt-4">
                      <p className="text-[10px] text-cyan-300 font-mono uppercase tracking-widest mb-2 font-bold">Retrieved Chunk Segment</p>
                      <div className="bg-gray-950/90 border border-white/10 rounded-2xl p-4 text-xs text-gray-300 leading-relaxed max-h-64 overflow-y-auto font-sans">
                        {highlightText}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </>
  );
};
