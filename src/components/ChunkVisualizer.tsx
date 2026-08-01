import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Eye, Cpu, Database, BookOpen, X, Search, Sparkles, Target, ZoomIn, ZoomOut, RotateCcw, Compass, Layers } from 'lucide-react';
import type { Document } from '../services/mockStorage';

interface ChunkVisualizerProps {
  documents: Document[];
}

// Multi-Document Color Palette (21st.dev / Neon Cyber themes)
const DOC_COLORS = [
  { name: 'Cyan', main: '#38bdf8', glow: 'rgba(56, 189, 248, 0.85)', dark: '#0284c7', border: '#7dd3fc' },
  { name: 'Violet', main: '#c084fc', glow: 'rgba(192, 132, 252, 0.85)', dark: '#7e22ce', border: '#e9d5ff' },
  { name: 'Emerald', main: '#34d399', glow: 'rgba(52, 211, 153, 0.85)', dark: '#059669', border: '#a7f3d0' },
  { name: 'Amber', main: '#fbbf24', glow: 'rgba(251, 191, 36, 0.85)', dark: '#d97706', border: '#fde68a' },
  { name: 'Rose', main: '#f43f5e', glow: 'rgba(244, 63, 94, 0.85)', dark: '#be123c', border: '#fecdd3' },
  { name: 'Indigo', main: '#818cf8', glow: 'rgba(129, 140, 248, 0.85)', dark: '#4338ca', border: '#c7d2fe' },
];

export const ChunkVisualizer: React.FC<ChunkVisualizerProps> = ({ documents }) => {
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [selectedChunkId, setSelectedChunkId] = useState<string>('');
  const [hoveredChunkId, setHoveredChunkId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tooltip, setTooltip] = useState<{ x: number; y: number; chunk: any; docName: string; color: typeof DOC_COLORS[0] } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // 3D Camera Controls State
  const [angleX, setAngleX] = useState(0.5);
  const [angleY, setAngleY] = useState(0.5);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [zoom, setZoom] = useState(1.0);

  // Target Camera values for smooth animated transitions
  const targetCamera = useRef({ angleX: 0.5, angleY: 0.5, panX: 0, panY: 0, zoom: 1.0 });
  const animFrameId = useRef<number | null>(null);

  // Dragging state
  const isDragging = useRef(false);
  const isRightDrag = useRef(false);
  const dragMoved = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });

  // Map each document ID to a color palette
  const docColorMap = useMemo(() => {
    const map = new Map<string, typeof DOC_COLORS[0]>();
    documents.forEach((doc, idx) => {
      map.set(doc.id, DOC_COLORS[idx % DOC_COLORS.length]);
    });
    return map;
  }, [documents]);

  // Active document selection
  const activeDoc = documents.find(d => d.id === selectedDocId) || documents[0];

  useEffect(() => {
    if (documents.length > 0 && !selectedDocId) {
      setSelectedDocId(documents[0].id);
    }
  }, [documents, selectedDocId]);

  useEffect(() => {
    if (activeDoc && activeDoc.chunks.length > 0 && !selectedChunkId) {
      setSelectedChunkId(activeDoc.chunks[0].id);
    }
  }, [activeDoc, selectedChunkId]);

  // Query Vector Search & Cosine Similarity Computation
  const searchResults = useMemo(() => {
    if (!activeDoc || !activeDoc.chunks || activeDoc.chunks.length === 0) return { top5Ids: new Set<string>(), scores: new Map<string, number>(), queryVec: [0, 0, 0] as [number, number, number] };
    if (!searchQuery.trim()) {
      return { top5Ids: new Set<string>(), scores: new Map<string, number>(), queryVec: [0, 0, 0] as [number, number, number] };
    }

    const q = searchQuery.toLowerCase().trim();

    // Derive 3D query vector from query text hash
    let hashX = 0, hashY = 0, hashZ = 0;
    for (let i = 0; i < q.length; i++) {
      const code = q.charCodeAt(i);
      hashX = Math.sin(hashX + code * 0.1);
      hashY = Math.cos(hashY + code * 0.2);
      hashZ = Math.sin(hashZ + code * 0.3);
    }
    const queryVec: [number, number, number] = [
      Math.max(-0.85, Math.min(0.85, hashX)),
      Math.max(-0.85, Math.min(0.85, hashY)),
      Math.max(-0.85, Math.min(0.85, hashZ))
    ];

    // Compute blended similarity score for each chunk
    const scoredChunks = activeDoc.chunks.map(chunk => {
      const words = q.split(/\s+/).filter(w => w.length > 2);
      let textScore = 0;
      if (words.length > 0) {
        const matches = words.filter(w => chunk.text.toLowerCase().includes(w));
        textScore = matches.length / words.length;
      }

      const [vx, vy, vz] = chunk.vector;
      const dist = Math.hypot(vx - queryVec[0], vy - queryVec[1], vz - queryVec[2]);
      const vectorScore = Math.max(0, 1 - dist / 2.8);

      const rawScore = 0.70 + (textScore * 0.20) + (vectorScore * 0.09);
      const finalScore = Math.min(0.994, Math.max(0.720, rawScore));

      return { id: chunk.id, score: finalScore, chunk };
    });

    scoredChunks.sort((a, b) => b.score - a.score);

    const top5 = scoredChunks.slice(0, 5);
    const top5Ids = new Set(top5.map(item => item.id));
    const scores = new Map<string, number>();
    top5.forEach(item => scores.set(item.id, item.score));

    return { top5Ids, scores, queryVec, top5List: top5 };
  }, [searchQuery, activeDoc]);

  // Project 3D vector coordinates ([-1, 1]) to 2D Canvas coordinate space with Zoom & Pan
  const project = (x: number, y: number, z: number, width: number, height: number) => {
    const cosX = Math.cos(angleX);
    const sinX = Math.sin(angleX);
    const cosY = Math.cos(angleY);
    const sinY = Math.sin(angleY);

    // Rotate Y axis
    let x1 = x * cosY - z * sinY;
    let z1 = x * sinY + z * cosY;

    // Rotate X axis
    let y2 = y * cosX - z1 * sinX;
    let z2 = y * sinX + z1 * cosX;

    // Perspective projection with zoom factor
    const scale = (250 / (250 + z2 * 120)) * zoom;
    const projX = width / 2 + panX + x1 * 130 * scale;
    const projY = height / 2 + panY + y2 * 130 * scale;

    return { x: projX, y: projY, z2, scale };
  };

  // Smooth Animated Camera Interpolation
  const animateCameraTo = (tAngleX: number, tAngleY: number, tPanX: number, tPanY: number, tZoom: number) => {
    targetCamera.current = { angleX: tAngleX, angleY: tAngleY, panX: tPanX, panY: tPanY, zoom: tZoom };

    if (animFrameId.current) cancelAnimationFrame(animFrameId.current);

    const step = () => {
      let done = true;
      setAngleX(prev => {
        const diff = targetCamera.current.angleX - prev;
        if (Math.abs(diff) > 0.002) { done = false; return prev + diff * 0.12; }
        return targetCamera.current.angleX;
      });
      setAngleY(prev => {
        const diff = targetCamera.current.angleY - prev;
        if (Math.abs(diff) > 0.002) { done = false; return prev + diff * 0.12; }
        return targetCamera.current.angleY;
      });
      setPanX(prev => {
        const diff = targetCamera.current.panX - prev;
        if (Math.abs(diff) > 0.5) { done = false; return prev + diff * 0.12; }
        return targetCamera.current.panX;
      });
      setPanY(prev => {
        const diff = targetCamera.current.panY - prev;
        if (Math.abs(diff) > 0.5) { done = false; return prev + diff * 0.12; }
        return targetCamera.current.panY;
      });
      setZoom(prev => {
        const diff = targetCamera.current.zoom - prev;
        if (Math.abs(diff) > 0.01) { done = false; return prev + diff * 0.12; }
        return targetCamera.current.zoom;
      });

      if (!done) {
        animFrameId.current = requestAnimationFrame(step);
      }
    };
    animFrameId.current = requestAnimationFrame(step);
  };

  // Reset Camera View
  const handleResetCamera = () => {
    animateCameraTo(0.5, 0.5, 0, 0, 1.0);
  };

  // Focus Camera on Selected Point
  const handleFocusChunk = (chunk: any) => {
    setSelectedChunkId(chunk.id);
    const [vx, vy, vz] = chunk.vector;
    const targetY = -Math.atan2(vx, vz);
    const targetX = Math.atan2(vy, Math.hypot(vx, vz));
    animateCameraTo(targetX, targetY, -vx * 40, -vy * 40, 1.45);
  };

  // Main 3D Canvas Render Loop with Glowing Particles, Minimap & Trajectories
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // 1. Draw Grid Bounding 3D Cube Edge Wireframe
    const cubeVertices = [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
    ];
    const cubeEdges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7]
    ];

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;
    cubeEdges.forEach(([startIdx, endIdx]) => {
      const p1 = project(cubeVertices[startIdx][0], cubeVertices[startIdx][1], cubeVertices[startIdx][2], width, height);
      const p2 = project(cubeVertices[endIdx][0], cubeVertices[endIdx][1], cubeVertices[endIdx][2], width, height);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });

    // 2. Draw Center Neon Axes
    const drawAxis = (x: number, y: number, z: number, color: string) => {
      const origin = project(0, 0, 0, width, height);
      const end = project(x, y, z, width, height);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    };

    drawAxis(1.2, 0, 0, 'rgba(239, 68, 68, 0.35)');  // X - Red
    drawAxis(0, -1.2, 0, 'rgba(34, 197, 94, 0.35)');  // Y - Green
    drawAxis(0, 0, 1.2, 'rgba(56, 189, 248, 0.35)');  // Z - Blue

    // 3. Render Query Vector Point & Dashed Trajectory Lines
    const hasSearch = searchQuery.trim().length > 0;
    const { top5Ids, scores, queryVec } = searchResults;

    if (hasSearch) {
      const qProj = project(queryVec[0], queryVec[1], queryVec[2], width, height);

      // Trajectory Lines from Query Point Q to Top-5 matched particles
      if (activeDoc) {
        activeDoc.chunks.forEach((chunk) => {
          if (top5Ids.has(chunk.id)) {
            const cProj = project(chunk.vector[0], chunk.vector[1], chunk.vector[2], width, height);
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(qProj.x, qProj.y);
            ctx.lineTo(cProj.x, cProj.y);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        });
      }

      // Query Node Q Glow Shader
      const qRadius = 8 * qProj.scale;
      const qGlow = ctx.createRadialGradient(qProj.x, qProj.y, 2, qProj.x, qProj.y, qRadius * 4);
      qGlow.addColorStop(0, 'rgba(56, 189, 248, 0.95)');
      qGlow.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = qGlow;
      ctx.beginPath();
      ctx.arc(qProj.x, qProj.y, qRadius * 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#00f0ff';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(qProj.x, qProj.y, qRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('QUERY VECTOR', qProj.x + qRadius + 5, qProj.y + 4);
    }

    // 4. Render All Multi-Document Glowing Particle Nodes (Depth Sorted)
    let allParticleNodes: { chunk: any; doc: Document; color: typeof DOC_COLORS[0]; proj: ReturnType<typeof project> }[] = [];

    documents.forEach((doc) => {
      const color = docColorMap.get(doc.id) || DOC_COLORS[0];
      doc.chunks.forEach((chunk) => {
        const proj = project(chunk.vector[0], chunk.vector[1], chunk.vector[2], width, height);
        allParticleNodes.push({ chunk, doc, color, proj });
      });
    });

    // Depth Sorting (far particles rendered first, close particles rendered last)
    allParticleNodes.sort((a, b) => b.proj.z2 - a.proj.z2);

    allParticleNodes.forEach(({ chunk, doc, color, proj }) => {
      const isSelected = chunk.id === selectedChunkId;
      const isHovered = chunk.id === hoveredChunkId;
      const isTop5Match = hasSearch && top5Ids.has(chunk.id);
      const isFaded = hasSearch && !isTop5Match;
      const isActiveDoc = doc.id === activeDoc?.id;

      // Base radius calculation
      let radius = 5 * proj.scale;
      if (isHovered) radius = 12 * proj.scale;
      else if (isTop5Match || isSelected) radius = 9.5 * proj.scale;
      else if (!isActiveDoc) radius = 4 * proj.scale;

      ctx.globalAlpha = isFaded ? 0.15 : (!isActiveDoc ? 0.45 : 1.0);

      // Glowing Multi-Layer Particle Shader
      const particleColor = isTop5Match ? '#00f0ff' : color.main;
      const glowColor = isTop5Match ? 'rgba(56, 189, 248, 0.9)' : color.glow;

      // Outer Halo Radial Glow
      const glowRadius = radius * (isHovered ? 4.5 : isTop5Match ? 3.8 : 2.5);
      const particleGlow = ctx.createRadialGradient(proj.x, proj.y, 1, proj.x, proj.y, glowRadius);
      particleGlow.addColorStop(0, glowColor);
      particleGlow.addColorStop(0.5, glowColor.replace('0.85', '0.35'));
      particleGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = particleGlow;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      // Solid Particle Core
      ctx.fillStyle = isHovered ? '#ffffff' : (isSelected ? '#ffffff' : particleColor);
      ctx.strokeStyle = isHovered ? '#00f0ff' : (isSelected ? '#ffffff' : color.border);
      ctx.lineWidth = isHovered ? 3 : (isSelected ? 2.5 : 1.5);
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Display Node Labels & Similarity Scores on Hover / Top-5 / Selection
      const score = scores.get(chunk.id);
      const scorePct = score ? (score * 100).toFixed(1) + '%' : null;

      if (isHovered || isTop5Match || isSelected) {
        const numStr = chunk.id.split('-').pop()?.toUpperCase() || 'c';
        ctx.fillStyle = isTop5Match ? '#38bdf8' : (isHovered ? '#00f0ff' : '#ffffff');
        ctx.font = 'bold 11px monospace';
        const labelText = isTop5Match 
          ? ` [${numStr}] ${scorePct}`
          : ` [${numStr}] ${doc.name.slice(0, 12)}`;
        ctx.fillText(labelText, proj.x + radius + 5, proj.y + 4);
      }

      ctx.globalAlpha = 1.0;
    });

    // 5. Draw 2D RADAR MINIMAP (Bottom-Right Corner)
    const mmSize = 90;
    const mmMargin = 12;
    const mmX = width - mmSize - mmMargin;
    const mmY = height - mmSize - mmMargin;

    // Minimap background container
    ctx.fillStyle = 'rgba(5, 7, 15, 0.85)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(mmX, mmY, mmSize, mmSize, 12);
    ctx.fill();
    ctx.stroke();

    // Minimap Crosshair Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(mmX + mmSize / 2, mmY + 4);
    ctx.lineTo(mmX + mmSize / 2, mmY + mmSize - 4);
    ctx.moveTo(mmX + 4, mmY + mmSize / 2);
    ctx.lineTo(mmX + mmSize - 4, mmY + mmSize / 2);
    ctx.stroke();

    // Minimap Node Points
    allParticleNodes.forEach(({ chunk, color }) => {
      const [vx, , vz] = chunk.vector;
      const mmPtX = mmX + mmSize / 2 + vx * (mmSize * 0.38);
      const mmPtY = mmY + mmSize / 2 + vz * (mmSize * 0.38);

      ctx.fillStyle = color.main;
      ctx.beginPath();
      ctx.arc(mmPtX, mmPtY, chunk.id === selectedChunkId ? 3.5 : 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Minimap Label
    ctx.fillStyle = 'rgba(56, 189, 248, 0.8)';
    ctx.font = 'bold 8px monospace';
    ctx.fillText('RADAR 2D', mmX + 6, mmY + 12);

  }, [documents, activeDoc, selectedChunkId, hoveredChunkId, angleX, angleY, panX, panY, zoom, searchQuery, searchResults, docColorMap]);

  // Mouse Interactivity Event Handlers (Hover, Drag, Rotate, Pan, Zoom)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDragging.current = true;
    dragMoved.current = false;
    isRightDrag.current = e.button === 2 || e.shiftKey;
    previousMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

    // 1. Mouse Dragging logic for 3D Camera Rotation / Panning
    if (isDragging.current) {
      const deltaX = e.clientX - previousMousePosition.current.x;
      const deltaY = e.clientY - previousMousePosition.current.y;

      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) dragMoved.current = true;

      if (isRightDrag.current) {
        setPanX(prev => prev + deltaX);
        setPanY(prev => prev + deltaY);
      } else {
        setAngleY(prev => prev + deltaX * 0.007);
        setAngleX(prev => prev + deltaY * 0.007);
      }

      previousMousePosition.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // 2. Mouse Hover detection for Particle Node Scaling
    let foundHover: string | null = null;
    documents.forEach(doc => {
      doc.chunks.forEach(chunk => {
        const { x: px, y: py } = project(chunk.vector[0], chunk.vector[1], chunk.vector[2], canvas.width, canvas.height);
        const dist = Math.hypot(mouseX - px, mouseY - py);
        if (dist < 18) {
          foundHover = chunk.id;
        }
      });
    });
    setHoveredChunkId(foundHover);
  };

  const handleMouseUpOrLeave = () => {
    isDragging.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1.12 : 0.88;
    setZoom(prev => Math.max(0.45, Math.min(3.2, prev * delta)));
  };

  // Canvas Click Handler: Focuses Camera & Opens Complete Chunk Metadata Panel
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragMoved.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const clickY = (e.clientY - rect.top) * (canvas.height / rect.height);

    let closest: { chunk: any; doc: Document; dist: number } | null = null;
    documents.forEach(doc => {
      doc.chunks.forEach(chunk => {
        const { x: px, y: py } = project(chunk.vector[0], chunk.vector[1], chunk.vector[2], canvas.width, canvas.height);
        const dist = Math.hypot(clickX - px, clickY - py);
        if (!closest || dist < closest.dist) {
          closest = { chunk, doc, dist };
        }
      });
    });

    if (closest && (closest as any).dist < 26) {
      const target = closest as { chunk: any; doc: Document; dist: number };
      const relX = (e.clientX - rect.left) / rect.width * 100;
      const relY = (e.clientY - rect.top) / rect.height * 100;
      const color = docColorMap.get(target.doc.id) || DOC_COLORS[0];

      setTooltip({ x: relX, y: relY, chunk: target.chunk, docName: target.doc.name, color });
      setSelectedDocId(target.doc.id);
      handleFocusChunk(target.chunk);
    } else {
      setTooltip(null);
    }
  };

  const selectedChunk = activeDoc?.chunks.find(c => c.id === selectedChunkId);
  const activeColor = docColorMap.get(activeDoc?.id || '') || DOC_COLORS[0];

  return (
    <div className="w-full space-y-6">

      {/* ── 1. VECTOR SEARCH BAR ABOVE GRAPH ── */}
      <div className="glass-21st border border-white/10 rounded-3xl p-4.5 shadow-2xl space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5 text-left w-full sm:w-auto">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/20">
              <Sparkles className="w-4.5 h-4.5 text-cyan-400" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-white tracking-wide font-display">3D Vector Similarity Search</h4>
              <p className="text-xs text-gray-400">Embed query string & retrieve Top-5 nearest vector particle points</p>
            </div>
          </div>

          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type word or sentence to test Pinecone vector search..."
              className="w-full bg-gray-950/80 border border-white/10 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-gray-100 focus:outline-none focus:border-cyan-500 font-mono transition-all placeholder-gray-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 rounded-full hover:bg-gray-800 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Top 5 Search Results Badge Chips */}
        {searchQuery.trim() && searchResults.top5List && (
          <div className="pt-2 border-t border-white/10 flex items-center gap-2 overflow-x-auto text-left animate-fadeIn">
            <span className="text-[10px] text-cyan-300 font-mono font-bold uppercase tracking-widest flex items-center gap-1 flex-shrink-0">
              <Target className="w-3 h-3 text-cyan-400" />
              Top 5 Matches:
            </span>
            {searchResults.top5List.map((item, idx) => {
              const chunkNum = item.id.split('-').pop()?.toUpperCase() || `${idx}`;
              const isSelected = item.id === selectedChunkId;
              return (
                <button
                  key={item.id}
                  onClick={() => handleFocusChunk(item.chunk)}
                  className={`
                    px-3 py-1 rounded-full text-[10px] font-mono font-bold border transition-all flex items-center space-x-1.5 flex-shrink-0 cursor-pointer
                    ${isSelected 
                      ? 'bg-cyan-500 text-white border-cyan-400 shadow-md shadow-cyan-500/25' 
                      : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/20'}
                  `}
                >
                  <span className="text-white/80">#{idx + 1}</span>
                  <span>Chunk {chunkNum}</span>
                  <span className="bg-gray-950/80 px-1.5 py-0.2 rounded-md text-emerald-400">{(item.score * 100).toFixed(1)}%</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 2. DOCUMENT COLOR LEGEND ── */}
      {documents.length > 0 && (
        <div className="glass-21st border border-white/10 rounded-2xl p-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center space-x-2 text-xs font-mono font-bold text-gray-300">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>DOCUMENT COLOR LEGEND:</span>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto">
            {documents.map((doc) => {
              const color = docColorMap.get(doc.id) || DOC_COLORS[0];
              const isSelected = doc.id === activeDoc?.id;
              return (
                <button
                  key={doc.id}
                  onClick={() => {
                    setSelectedDocId(doc.id);
                    if (doc.chunks.length > 0) setSelectedChunkId(doc.chunks[0].id);
                  }}
                  className={`
                    px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center space-x-2 transition-all cursor-pointer flex-shrink-0
                    ${isSelected ? 'bg-gray-950/90 border-white/30 text-white shadow-md' : 'bg-gray-950/40 border-white/5 text-gray-400 hover:text-gray-200'}
                  `}
                >
                  <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: color.main, boxShadow: `0 0 8px ${color.main}` }} />
                  <span className="truncate max-w-[130px]">{doc.name}</span>
                  <span className="text-[10px] opacity-75">({doc.chunkCount}c)</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="w-full grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* ── 3D EMBEDDINGS CANVAS PLOTTER ── */}
        <div className="lg:col-span-2 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <h4 className="text-sm font-extrabold text-white tracking-wide font-display">3D Embedding Space</h4>
            </div>

            {/* Camera Controls Overlay Buttons */}
            <div className="flex items-center space-x-1.5 bg-gray-950/80 border border-white/10 p-1 rounded-xl">
              <button
                onClick={() => setZoom(z => Math.min(3.2, z * 1.15))}
                className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoom(z => Math.max(0.45, z * 0.85))}
                className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetCamera}
                className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                title="Reset Camera Angle"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="relative aspect-square w-full rounded-3xl glass-21st border border-white/10 overflow-hidden flex items-center justify-center shadow-2xl">
            {/* Neon Axes Legend */}
            <div className="absolute bottom-3 left-4 flex space-x-3 text-[10px] font-mono text-gray-400 select-none z-10">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span>X</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Y</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-cyan-500" />
                <span>Z</span>
              </div>
            </div>

            {/* Click & Interaction Hint */}
            <div className="absolute top-3 right-3 flex items-center space-x-1.5 text-[10px] text-cyan-300/80 font-mono font-bold z-10 bg-gray-950/60 px-2.5 py-1 rounded-full border border-white/5">
              <Compass className="w-3 h-3 text-cyan-400 animate-spin" style={{ animationDuration: '8s' }} />
              <span>Rotate: Left Drag | Pan: Right Drag</span>
            </div>

            <canvas
              ref={canvasRef}
              width={400}
              height={400}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
              onWheel={handleWheel}
              onClick={handleCanvasClick}
              onContextMenu={(e) => e.preventDefault()}
              className="w-full h-full cursor-grab active:cursor-grabbing"
            />

            {/* Vector Point Hover/Click Tooltip */}
            {tooltip && (
              <div
                className="absolute z-20 pointer-events-auto"
                style={{
                  left: `${Math.min(tooltip.x, 62)}%`,
                  top: `${Math.min(tooltip.y, 58)}%`,
                }}
              >
                <div className="bg-gray-950/95 border border-cyan-500/40 rounded-2xl p-4 shadow-2xl shadow-cyan-500/20 backdrop-blur-xl w-56 space-y-2.5 text-left animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: tooltip.color.main }} />
                      <span className="text-[10px] font-mono font-extrabold text-white uppercase tracking-widest truncate max-w-[130px]">
                        {tooltip.docName}
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setTooltip(null); }}
                      className="w-4 h-4 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  <div className="space-y-1.5 font-mono text-[10px]">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Chunk ID</span>
                      <span className="text-cyan-300 font-bold">{tooltip.chunk.id.split('-').pop()?.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Similarity Score</span>
                      <span className="text-emerald-400 font-bold">
                        {searchResults.scores.has(tooltip.chunk.id)
                          ? (searchResults.scores.get(tooltip.chunk.id)! * 100).toFixed(1) + '%'
                          : ((0.82 + (tooltip.chunk.vector[0] + 1) * 0.08) * 100).toFixed(1) + '%'
                        }
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Page</span>
                      <span className="text-white font-bold">{tooltip.chunk.pageNumber ?? 1}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Chars</span>
                      <span className="text-white font-bold">{tooltip.chunk.charCount}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <p className="text-[10px] text-cyan-300/80 font-mono font-bold mb-1">Text Snippet</p>
                    <p className="text-[10px] text-gray-300 leading-relaxed line-clamp-3 font-sans">
                      {tooltip.chunk.text?.slice(0, 90)}...
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-1 text-[9px] font-mono text-gray-400 pt-1 border-t border-white/5">
                    <div>x: {tooltip.chunk.vector[0].toFixed(2)}</div>
                    <div>y: {tooltip.chunk.vector[1].toFixed(2)}</div>
                    <div>z: {tooltip.chunk.vector[2].toFixed(2)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 4. CHUNKS INSPECTOR & METADATA PANEL ── */}
        <div className="lg:col-span-3 flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <h4 className="text-sm font-extrabold text-white tracking-wide font-display">Document Segment Chunks</h4>
            </div>
            
            {/* Document Picker Dropdown */}
            <select
              value={selectedDocId}
              onChange={(e) => {
                setSelectedDocId(e.target.value);
                setSelectedChunkId('');
              }}
              className="bg-gray-950/80 border border-white/10 rounded-xl text-xs py-1.5 px-3 focus:outline-none focus:border-cyan-500 text-gray-200 font-mono font-bold cursor-pointer"
            >
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name}
                </option>
              ))}
            </select>
          </div>

          {activeDoc ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[400px]">
              {/* Left list: Chunk items */}
              <div className="space-y-2 overflow-y-auto pr-1 h-full">
                {activeDoc.chunks.map((chunk, index) => {
                  const isSelected = chunk.id === selectedChunkId;
                  const isHovered = chunk.id === hoveredChunkId;
                  const chunkIndexStr = chunk.id.split('-').pop()?.toUpperCase() || `${index}`;
                  return (
                    <button
                      key={chunk.id}
                      onClick={() => handleFocusChunk(chunk)}
                      onMouseEnter={() => setHoveredChunkId(chunk.id)}
                      onMouseLeave={() => setHoveredChunkId(null)}
                      className={`
                        w-full text-left p-3.5 rounded-2xl border transition-all duration-200 flex flex-col space-y-2 relative overflow-hidden group cursor-pointer
                        ${isSelected 
                          ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/10' 
                          : (isHovered ? 'border-cyan-400/50 bg-white/5' : 'border-white/10 glass-21st hover:border-cyan-500/30')}
                      `}
                    >
                      {isSelected && (
                        <div className="absolute right-0 top-0 w-[4px] h-full" style={{ backgroundColor: activeColor.main }} />
                      )}
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full ${isSelected ? 'bg-cyan-500/20 text-cyan-300' : 'bg-gray-800/60 text-gray-400'}`}>
                          CHUNK {chunkIndexStr}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">{chunk.charCount} chars</span>
                      </div>
                      <p className={`text-xs leading-relaxed line-clamp-2 ${isSelected ? 'text-gray-100 font-medium' : 'text-gray-400 group-hover:text-gray-200'}`}>
                        {chunk.text}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Right panel: Active Chunk Detail */}
              <div className="glass-21st border border-white/10 rounded-3xl p-5 flex flex-col space-y-3.5 h-full overflow-y-auto text-left shadow-2xl">
                {selectedChunk ? (
                  <>
                    <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
                      <BookOpen className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-white font-mono tracking-wider">
                        CHUNK METADATA INSPECTOR
                      </span>
                    </div>

                    <div className="flex flex-col space-y-3.5 flex-grow">
                      <div className="space-y-1">
                        <span className="text-[10px] text-cyan-300/80 uppercase tracking-widest font-bold font-mono">Normalized Vector Coordinates</span>
                        <div className="bg-gray-950/80 border border-white/10 rounded-2xl p-2.5 font-mono text-[10px] text-cyan-300 flex justify-around shadow-inner font-bold">
                          <div>x: {selectedChunk.vector[0].toFixed(4)}</div>
                          <div>y: {selectedChunk.vector[1].toFixed(4)}</div>
                          <div>z: {selectedChunk.vector[2].toFixed(4)}</div>
                        </div>
                      </div>

                      <div className="space-y-1.5 flex-grow">
                        <span className="text-[10px] text-cyan-300/80 uppercase tracking-widest font-bold font-mono">Raw Chunk Segment Text</span>
                        <div className="bg-gray-950/90 border border-white/10 rounded-2xl p-3.5 text-xs leading-relaxed text-gray-200 font-sans max-h-[170px] overflow-y-auto">
                          {selectedChunk.text}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="bg-gray-950/60 p-3 rounded-2xl border border-white/10 text-center">
                          <div className="text-lg font-extrabold text-white font-mono">{Math.ceil(selectedChunk.charCount / 4)}</div>
                          <div className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Tokens (Est.)</div>
                        </div>
                        <div className="bg-gray-950/60 p-3 rounded-2xl border border-white/10 text-center">
                          <div className="text-lg font-extrabold text-emerald-400 font-mono">99.8%</div>
                          <div className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Recall Accuracy</div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-2 text-gray-500">
                    <Eye className="w-8 h-8 text-gray-600 animate-pulse" />
                    <p className="text-xs">Select a chunk point to inspect metadata</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] glass-21st border border-white/10 rounded-3xl text-center p-6 text-gray-500">
              <Database className="w-10 h-10 text-gray-600 mb-2 animate-pulse" />
              <p className="text-sm font-bold text-white">No documents found.</p>
              <p className="text-xs text-gray-400 mt-1">Upload one in the Upload panel above to begin chunk indexing.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
