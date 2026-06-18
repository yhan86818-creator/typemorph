'use client';
import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { extractTypeGraph, type TypeNode, type TypeGraph } from '@/lib/graph';
import type { ImpactKind } from '@/lib/impact';

interface Props {
  tsCode: string;
  isDark: boolean;
  onFieldRename?: (nodeId: string, fieldName: string, newName: string) => void;
  highlights?: Map<string, ImpactKind>;
  hideHint?: boolean;
}

interface NodePos {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const NODE_WIDTH = 240;
const NODE_HEADER = 36;
const FIELD_HEIGHT = 28;
const H_GAP = 80;
const V_GAP = 48;

function layoutNodes(graph: TypeGraph): NodePos[] {
  // Layered layout: roots on left, children cascade right
  const positions: NodePos[] = [];

  // BFS to assign layers
  const layers: string[][] = [];
  const assigned = new Set<string>();
  const roots = graph.nodes.filter(n => n.isRoot).map(n => n.id);
  
  // Fallback: if no roots, treat first node as root
  const seedRoots = roots.length > 0 ? roots : graph.nodes.slice(0, 1).map(n => n.id);

  let currentLayer = seedRoots;
  while (currentLayer.length > 0) {
    layers.push(currentLayer.filter(id => !assigned.has(id)));
    currentLayer.forEach(id => assigned.add(id));

    const nextLayer: string[] = [];
    for (const id of currentLayer) {
      const children = graph.edges.filter(e => e.from === id).map(e => e.to);
      for (const child of children) {
        if (!assigned.has(child)) nextLayer.push(child);
      }
    }
    currentLayer = nextLayer;
  }

  // Any orphaned nodes (isolated, no edges at all)
  const orphans = graph.nodes.filter(n => !assigned.has(n.id)).map(n => n.id);
  if (orphans.length > 0) layers.push(orphans);

  let x = 40;
  for (const layer of layers) {
    let y = 40;
    for (const id of layer) {
      const node = graph.nodes.find(n => n.id === id);
      if (!node) continue;
      const height = NODE_HEADER + node.fields.length * FIELD_HEIGHT + 12;
      positions.push({ id, x, y, width: NODE_WIDTH, height });
      y += height + V_GAP;
    }
    x += NODE_WIDTH + H_GAP;
  }

  return positions;
}

function getEdgePath(from: NodePos, to: NodePos): string {
  const x1 = from.x + from.width;
  const y1 = from.y + from.height / 2;
  const x2 = to.x;
  const y2 = to.y + to.height / 2;

  const cx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
}

export default function TypeGraphPanel({ tsCode, isDark, onFieldRename, highlights, hideHint }: Props) {
  const [editingField, setEditingField] = useState<{ nodeId: string; fieldName: string } | null>(null);
  const [hoveredField, setHoveredField] = useState<{ nodeId: string; fieldName: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isInitialized, setIsInitialized] = useState(false);
  const containerRef2 = useRef<HTMLDivElement>(null);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('typemorph_graph_hint_dismissed')) setShowHint(true);
  }, []);

  const dismissHint = () => {
    localStorage.setItem('typemorph_graph_hint_dismissed', '1');
    setShowHint(false);
  };

  const graph = useMemo(() => {
    if (!tsCode || tsCode.trim().length === 0) return { nodes: [], edges: [] };
    try { return extractTypeGraph(tsCode); } catch { return { nodes: [], edges: [] }; }
  }, [tsCode]);

  const nodePositions = useMemo(() => {
    const positions = layoutNodes(graph);
    // Deduplicate by id to prevent React duplicate key warnings
    const seen = new Set<string>();
    return positions.filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [graph]);

  const svgWidth = useMemo(() => {
    if (nodePositions.length === 0) return 600;
    return Math.max(...nodePositions.map(p => p.x + p.width)) + 80;
  }, [nodePositions]);

  const svgHeight = useMemo(() => {
    if (nodePositions.length === 0) return 400;
    return Math.max(...nodePositions.map(p => p.y + p.height)) + 80;
  }, [nodePositions]);

  useEffect(() => {
    if (nodePositions.length === 0) return;
    const container = svgRef.current?.parentElement;
    if (!container) return;

    const containerW = container.clientWidth;
    const containerH = container.clientHeight;

    const minX = Math.min(...nodePositions.map(p => p.x));
    const maxX = Math.max(...nodePositions.map(p => p.x + p.width));
    const minY = Math.min(...nodePositions.map(p => p.y));
    const maxY = Math.max(...nodePositions.map(p => p.y + p.height));

    const graphW = maxX - minX + 80;
    const graphH = maxY - minY + 80;

    const scaleX = containerW / graphW;
    const scaleY = containerH / graphH;
    const newZoom = Math.min(scaleX, scaleY, 1);

    const offsetX = (containerW - graphW * newZoom) / 2 - minX * newZoom + 40 * newZoom;
    const offsetY = (containerH - graphH * newZoom) / 2 - minY * newZoom + 40 * newZoom;

    setZoom(newZoom);
    setDragOffset({ x: offsetX, y: offsetY });
  }, [nodePositions]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.3, Math.min(2, z - e.deltaY * 0.001)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as Element).tagName === 'svg') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    }
  }, [dragOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setDragOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  if (graph.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/10 flex items-center justify-center mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-600 dark:text-slate-300">
            <circle cx="5" cy="12" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="19" r="2"/>
            <path d="M7 12h8M17 6l-8 5M17 18l-8-5"/>
          </svg>
        </div>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">No interfaces to visualize yet</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500">Paste some JSON on the left, then switch to the TS tab</p>
      </div>
    );
  }

  // Single hue + opacity for depth hierarchy (Linear-style)
  const nodeColors = [
    { header: isDark ? '#1e293b' : '#f1f5f9', border: isDark ? '#334155' : '#cbd5e1', text: isDark ? '#e2e8f0' : '#334155' },
    { header: isDark ? '#1e293b' : '#f1f5f9', border: isDark ? '#475569' : '#94a3b8', text: isDark ? '#cbd5e1' : '#475569' },
    { header: isDark ? '#1e293b' : '#f1f5f9', border: isDark ? '#64748b' : '#64748b', text: isDark ? '#94a3b8' : '#64748b' },
    { header: isDark ? '#1e293b' : '#f1f5f9', border: isDark ? '#94a3b8' : '#475569', text: isDark ? '#64748b' : '#94a3b8' },
    { header: isDark ? '#1e293b' : '#f1f5f9', border: isDark ? '#cbd5e1' : '#334155', text: isDark ? '#475569' : '#cbd5e1' },
  ];

  const getNodeColor = (nodeId: string) => {
    if (highlights) {
      const kind = highlights.get(nodeId);
      if (kind === 'changed') return isDark
        ? { header: '#2d0a0a', border: '#ef4444', text: '#fca5a5' }
        : { header: '#fee2e2', border: '#dc2626', text: '#991b1b' };
      if (kind === 'impacted') return isDark
        ? { header: '#311207', border: '#f97316', text: '#fdba74' }
        : { header: '#ffedd5', border: '#ea580c', text: '#9a3412' };
      // safe — dim out
      return isDark
        ? { header: '#0f172a', border: '#1e293b', text: '#334155' }
        : { header: '#f8fafc', border: '#e2e8f0', text: '#cbd5e1' };
    }
    const roots = graph.nodes.filter(n => n.isRoot);
    if (roots.some(r => r.id === nodeId)) return nodeColors[0];
    const idx = graph.nodes.findIndex(n => n.id === nodeId);
    return nodeColors[(idx % (nodeColors.length - 1)) + 1];
  };

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const fieldBg = isDark ? '#1e293b' : '#ffffff';
  const fieldText = isDark ? '#94a3b8' : '#475569';
  const typeText = isDark ? '#94a3b8' : '#64748b';

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-900/50 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-500 dark:text-slate-400">
            <circle cx="5" cy="12" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="19" r="2"/>
            <path d="M7 12h8M17 6l-8 5M17 18l-8-5"/>
          </svg>
          <span className="text-[10px] font-mono uppercase font-bold text-slate-500 dark:text-slate-350 tracking-wider">
            {highlights ? 'Impact Propagation Graph' : 'Type Relationship Graph'}
          </span>
          <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">
            {graph.nodes.length} types · {graph.edges.length} refs
          </span>
          {highlights && (
            <span className="flex items-center gap-2 text-[9px] font-mono ml-2">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />changed</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />impacted</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />safe</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">
            Scroll to zoom · Drag to pan
          </span>
          <button 
            onClick={() => {
              if (nodePositions.length === 0) return;
              const container = svgRef.current?.parentElement;
              if (!container) return;

              const containerW = container.clientWidth;
              const containerH = container.clientHeight;

              const minX = Math.min(...nodePositions.map(p => p.x));
              const maxX = Math.max(...nodePositions.map(p => p.x + p.width));
              const minY = Math.min(...nodePositions.map(p => p.y));
              const maxY = Math.max(...nodePositions.map(p => p.y + p.height));

              const graphW = maxX - minX + 80;
              const graphH = maxY - minY + 80;

              const scaleX = containerW / graphW;
              const scaleY = containerH / graphH;
              const newZoom = Math.min(scaleX, scaleY, 1);

              const offsetX = (containerW - graphW * newZoom) / 2 - minX * newZoom + 40 * newZoom;
              const offsetY = (containerH - graphH * newZoom) / 2 - minY * newZoom + 40 * newZoom;

              setZoom(newZoom);
              setDragOffset({ x: offsetX, y: offsetY });
            }}
            className="text-[9px] font-mono text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 transition-all"
          >
            Reset View
          </button>
        </div>
      </div>

      {/* One-time hint banner */}
      {showHint && !hideHint && (
        <div className="flex items-center justify-between px-4 py-2 bg-indigo-50 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/50 shrink-0">
          <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
            ✦ Click any field name to rename it — the change rewrites all output languages instantly
          </p>
          <button
            onClick={dismissHint}
            className="ml-4 text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200 transition-colors text-xs font-black leading-none"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* SVG Canvas */}
      <div className="flex-1 overflow-hidden relative" style={{ background: bg }}>
        {/* Grid dots background */}
        <svg width="100%" height="100%" className="absolute inset-0 pointer-events-none opacity-30">
          <defs>
            <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill={isDark ? '#334155' : '#cbd5e1'} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>

        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          className={`absolute inset-0 ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill={isDark ? '#475569' : '#94a3b8'} />
            </marker>
            <marker id="arrowhead-hover" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#6366f1" />
            </marker>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="shadow">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor={isDark ? '#000000' : '#94a3b8'} floodOpacity="0.3"/>
            </filter>
          </defs>

          <g transform={`translate(${dragOffset.x},${dragOffset.y}) scale(${zoom})`}>
            {/* Edges */}
            {graph.edges.map((edge, i) => {
              const fromPos = nodePositions.find(p => p.id === edge.from);
              const toPos = nodePositions.find(p => p.id === edge.to);
              if (!fromPos || !toPos) return null;

              const edgeKey = `${edge.from}-${edge.to}-${edge.label}`;
              const isHovered = hoveredEdge === edgeKey || hoveredNode === edge.from || hoveredNode === edge.to;
              const d = getEdgePath(fromPos, toPos);

              // Midpoint for label
              const midX = (fromPos.x + fromPos.width + toPos.x) / 2;
              const midY = (fromPos.y + fromPos.height / 2 + toPos.y + toPos.height / 2) / 2;

              return (
                <g key={i}>
                  <path
                    d={d}
                    fill="none"
                    stroke={isHovered ? '#6366f1' : (isDark ? '#334155' : '#cbd5e1')}
                    strokeWidth={isHovered ? 2 : 1.5}
                    strokeDasharray={isHovered ? 'none' : '5,3'}
                    markerEnd={isHovered ? 'url(#arrowhead-hover)' : 'url(#arrowhead)'}
                    style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
                    onMouseEnter={() => setHoveredEdge(edgeKey)}
                    onMouseLeave={() => setHoveredEdge(null)}
                    className="cursor-pointer"
                  />
                  {isHovered && (
                    <g>
                      <rect
                        x={midX - 30} y={midY - 9}
                        width={60} height={18}
                        rx={4} ry={4}
                        fill={isDark ? '#1e293b' : '#f1f5f9'}
                        stroke="#6366f1"
                        strokeWidth={1}
                      />
                      <text
                        x={midX} y={midY + 4}
                        textAnchor="middle"
                        fontSize={9}
                        fontFamily="monospace"
                        fill="#6366f1"
                        fontWeight="bold"
                      >
                        {edge.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {nodePositions.map(pos => {
              const node = graph.nodes.find(n => n.id === pos.id);
              if (!node) return null;

              const isHovered = hoveredNode === pos.id;
              const color = getNodeColor(pos.id);
              const isConnected = graph.edges.some(e => e.from === pos.id || e.to === pos.id);
              const refCount = graph.edges.filter(e => e.to === pos.id).length;

              return (
                <g
                  key={pos.id}
                  transform={`translate(${pos.x},${pos.y})`}
                  onMouseEnter={() => setHoveredNode(pos.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  style={{ filter: isHovered ? 'url(#shadow)' : 'none', cursor: 'pointer', transition: 'filter 0.2s' }}
                >
                  {/* Node border / glow effect */}
                  {isHovered && (
                    <rect
                      x={-2} y={-2}
                      width={pos.width + 4}
                      height={pos.height + 4}
                      rx={14} ry={14}
                      fill="none"
                      stroke={color.border}
                      strokeWidth={2}
                      opacity={0.5}
                      style={{ filter: 'url(#glow)' }}
                    />
                  )}

                  {/* Node background */}
                  <rect
                    width={pos.width}
                    height={pos.height}
                    rx={12} ry={12}
                    fill={fieldBg}
                    stroke={isHovered ? color.border : (isDark ? '#334155' : '#e2e8f0')}
                    strokeWidth={isHovered ? 2 : 1}
                    style={{ transition: 'stroke 0.2s' }}
                  />

                  {/* Header */}
                  <rect
                    width={pos.width}
                    height={NODE_HEADER}
                    rx={12} ry={12}
                    fill={color.header}
                  />
                  <rect
                    y={NODE_HEADER - 10}
                    width={pos.width}
                    height={10}
                    fill={color.header}
                  />

                  {/* Interface name */}
                  <text
                    x={12} y={21}
                    fontSize={13}
                    fontFamily="monospace"
                    fontWeight="bold"
                    fill={color.text}
                  >
                    {node.isRoot ? '⬡ ' : '◇ '}{node.label}
                  </text>

                  {/* Ref count badge */}
                  {refCount > 0 && (
                    <g transform={`translate(${pos.width - 32}, 10)`}>
                      <rect width={24} height={16} rx={8} fill={color.border} opacity={0.2} />
                      <text x={10} y={11.5} textAnchor="middle" fontSize={8} fontFamily="monospace" fontWeight="bold" fill={color.text}>
                        ×{refCount}
                      </text>
                    </g>
                  )}

                  {/* Fields */}
                  {node.fields.map((field, fi) => {
                    const fy = NODE_HEADER + fi * FIELD_HEIGHT + 4;
                    const typeStr = field.type.length > 16 ? field.type.slice(0, 14) + '…' : field.type;
                    const isEditing = editingField?.nodeId === pos.id && editingField?.fieldName === field.name;

                    return (
                      <g
                        key={field.name}
                        transform={`translate(0,${fy})`}
                        onMouseEnter={() => {
                          if (onFieldRename) {
                            setHoveredField({ nodeId: pos.id, fieldName: field.name });
                          }
                        }}
                        onMouseLeave={() => {
                          if (onFieldRename) {
                            setHoveredField(null);
                          }
                        }}
                      >
                        <rect
                          width={pos.width}
                          height={FIELD_HEIGHT}
                          fill="transparent"
                          style={{ cursor: onFieldRename ? 'text' : 'default' }}
                          onClick={() => {
                            if (onFieldRename) {
                              setEditingField({ nodeId: pos.id, fieldName: field.name });
                              setEditValue(field.name);
                            }
                          }}
                        />
                        {fi % 2 === 0 && (
                          <rect width={pos.width} height={FIELD_HEIGHT} fill={isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'} style={{ pointerEvents: 'none' }} />
                        )}
                        {isEditing ? (
                          <foreignObject x={8} y={2} width={pos.width - 16} height={FIELD_HEIGHT - 2}>
                            <input
                              type="text"
                              value={editValue}
                              autoFocus
                              onChange={e => setEditValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  if (editValue.trim() && onFieldRename) {
                                    onFieldRename(pos.id, field.name, editValue.trim());
                                  }
                                  setEditingField(null);
                                } else if (e.key === 'Escape') {
                                  setEditingField(null);
                                }
                              }}
                              onBlur={() => setEditingField(null)}
                              style={{
                                width: '100%',
                                fontSize: '9px',
                                fontFamily: 'monospace',
                                background: isDark ? '#1e40af' : '#dbeafe',
                                color: isDark ? '#e2e8f0' : '#1e3a8a',
                                border: 'none',
                                outline: 'none',
                                padding: '2px 4px',
                                borderRadius: '2px',
                              }}
                            />
                          </foreignObject>
                        ) : (
                          (() => {
                            const isHoveredField = hoveredField?.nodeId === pos.id && hoveredField?.fieldName === field.name;
                            return (
                              <text
                                x={12} y={19}
                                fontSize={12}
                                fontFamily="monospace"
                                fill={isHoveredField ? (isDark ? '#ffffff' : '#000000') : fieldText}
                                style={{ pointerEvents: 'none' }}
                              >
                                {field.optional ? (
                                  <tspan fill={isHoveredField ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#64748b' : '#94a3b8')}>{field.name}?</tspan>
                                ) : field.name}
                                {isHoveredField && <tspan fill={isDark ? '#94a3b8' : '#475569'} dx="4">✎</tspan>}
                              </text>
                            );
                          })()
                        )}
                        <text x={pos.width - 8} y={19} textAnchor="end" fontSize={11} fontFamily="monospace" fill={typeText} fontWeight="600" style={{ pointerEvents: 'none' }}>
                          {typeStr}
                        </text>
                      </g>
                    );
                  })}

                  {/* Bottom border */}
                  <rect
                    y={pos.height - 1}
                    width={pos.width}
                    height={1}
                    rx={1}
                    fill={color.border}
                    opacity={0.4}
                  />
                </g>
              );
            })}
          </g>
        </svg>

        {/* Hovered node tooltip */}
        {hoveredNode && (() => {
          const node = graph.nodes.find(n => n.id === hoveredNode);
          const refs = graph.edges.filter(e => e.to === hoveredNode).map(e => e.from);
          const deps = graph.edges.filter(e => e.from === hoveredNode).map(e => e.to);
          if (!node) return null;

          return (
            <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 w-48 pointer-events-none z-10">
              <p className="text-[10px] font-mono font-bold text-slate-800 dark:text-white mb-2">
                {node.isRoot ? '⬡ Root' : '◇ Interface'}: <span className="text-slate-700 dark:text-slate-200">{node.id}</span>
              </p>
              <p className="text-[9px] font-mono text-slate-500 dark:text-slate-400">{node.fields.length} fields</p>
              {refs.length > 0 && <p className="text-[9px] font-mono text-amber-600 dark:text-amber-400">Referenced by: {refs.join(', ')}</p>}
              {deps.length > 0 && <p className="text-[9px] font-mono text-slate-600 dark:text-slate-400">References: {deps.join(', ')}</p>}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
