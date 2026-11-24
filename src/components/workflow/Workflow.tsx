import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import { graphlib, layout } from '@dagrejs/dagre';
import { Bot, Database, FolderGit2, Gauge, Hand, Layers, RefreshCw, Route, Table2, MessageSquare, Maximize2, Minimize2, Pause, Play, Radio, Send, ShieldCheck, Smartphone, SkipForward, UserCheck, ZoomIn, ZoomOut, ScanLine } from 'lucide-react';
import '@xyflow/react/dist/style.css';
import './workflow.css';
import type { FlowDefinition, FlowIcon, FlowKind } from '../../data/workflows';

interface Props {
  flow: FlowDefinition;
  title?: string;
  height?: number;
}

interface CardData extends Record<string, unknown> {
  title: string;
  subtitle: string;
  kind: FlowKind;
  icon: FlowIcon;
  step: number;
  state: 'idle' | 'active' | 'done';
  selected: boolean;
}

const icons: Record<FlowIcon, typeof Bot> = {
  phone: Smartphone,
  chat: MessageSquare,
  radio: Radio,
  shield: ShieldCheck,
  bot: Bot,
  folder: FolderGit2,
  approve: UserCheck,
  send: Send,
  database: Database,
  route: Route,
  gauge: Gauge,
  layers: Layers,
  table: Table2,
  refresh: RefreshCw,
};

const SIZE = { wide: { width: 190, height: 68 }, tall: { width: 232, height: 64 } };

function Card({ data }: NodeProps<Node<CardData>>) {
  const Icon = icons[data.icon];
  return (
    <div className={`wf-card kind-${data.kind} state-${data.state}${data.selected ? ' is-selected' : ''}`}>
      <Handle type="target" position={Position.Top} id="t" className="wf-handle" />
      <Handle type="target" position={Position.Left} id="l" className="wf-handle" />
      <Handle type="target" position={Position.Right} id="rt" className="wf-handle" />
      <span className="wf-step">{data.step}</span>
      <span className="wf-icon">
        <Icon size={20} strokeWidth={2} />
      </span>
      <span className="wf-text">
        <strong>{data.title}</strong>
        <small>{data.subtitle}</small>
      </span>
      <Handle type="source" position={Position.Bottom} id="b" className="wf-handle" />
      <Handle type="source" position={Position.Right} id="r" className="wf-handle" />
      <Handle type="source" position={Position.Left} id="sl" className="wf-handle" />
      <Handle type="target" position={Position.Bottom} id="tb" className="wf-handle" />
    </div>
  );
}

const nodeTypes = { card: Card };

function arrange(flow: FlowDefinition, vertical: boolean) {
  const size = vertical ? SIZE.tall : SIZE.wide;
  const manual = vertical ? flow.tall : flow.wide;
  if (manual) {
    return { positions: new Map(Object.entries(manual)), size };
  }
  const graph = new graphlib.Graph();
  graph.setGraph({ rankdir: vertical ? 'TB' : 'LR', nodesep: vertical ? 18 : 54, ranksep: vertical ? 46 : 86, acyclicer: 'greedy', marginx: 10, marginy: 10 });
  graph.setDefaultEdgeLabel(() => ({}));
  flow.nodes.forEach((n) => graph.setNode(n.id, { ...size }));
  flow.edges.forEach((e) => graph.setEdge(e.from, e.to));
  layout(graph);
  const positions = new Map<string, { x: number; y: number }>();
  flow.nodes.forEach((n) => {
    const p = graph.node(n.id);
    positions.set(n.id, { x: p.x - size.width / 2, y: p.y - size.height / 2 });
  });
  return { positions, size };
}

function Canvas({ flow, title, height }: Props) {
  const wrapper = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { zoomIn, zoomOut, setViewport } = useReactFlow();
  const [vertical, setVertical] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const [full, setFull] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [active, setActive] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    const read = () => setDark(root.dataset.theme !== 'light');
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = wrapper.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setVertical(entry.contentRect.width < 640));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const order = flow.nodes.map((n) => n.id);
  const layoutResult = useMemo(() => arrange(flow, vertical), [flow, vertical]);

  const nodes = useMemo<Node<CardData>[]>(
    () =>
      flow.nodes.map((n, i) => ({
        id: n.id,
        type: 'card',
        position: layoutResult.positions.get(n.id)!,
        width: layoutResult.size.width,
        height: layoutResult.size.height,
        draggable: false,
        data: {
          title: n.title,
          subtitle: n.subtitle,
          kind: n.kind,
          icon: n.icon,
          step: i + 1,
          state: active === i ? 'active' : active > i ? 'done' : 'idle',
          selected: selected === n.id,
        },
      })),
    [flow, layoutResult, active, selected],
  );

  const edges = useMemo<Edge[]>(
    () =>
      flow.edges.map((e) => {
        const from = order.indexOf(e.from);
        const to = order.indexOf(e.to);
        const live = (active >= 0 && to === active && from < to) || (selected !== null && (selected === e.from || selected === e.to));
        const forward = to > from;
        return {
          id: `${e.from}-${e.to}`,
          source: e.from,
          target: e.to,
          sourceHandle: vertical ? (to - from > 1 ? 'r' : 'b') : (e.via?.[0] ?? 'r'),
          targetHandle: vertical ? (to - from > 1 ? 'rt' : 't') : (e.via?.[1] ?? 'l'),
          type: 'smoothstep',
          pathOptions: { borderRadius: 14 },
          label: e.label,
          animated: live,
          className: `${e.dashed ? 'is-dashed ' : ''}${live ? 'is-live' : ''}${forward ? '' : ' is-back'}`,
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
          labelBgPadding: [6, 3] as [number, number],
          labelBgBorderRadius: 6,
        };
      }),
    [flow, order, active, selected, vertical],
  );

  const refit = useCallback(
    (animate = true) => {
      const stage = stageRef.current;
      if (!stage) return;
      const { width, height } = stage.getBoundingClientRect();
      const points = [...layoutResult.positions.values()];
      if (!points.length || !width || !height) return;
      const minX = Math.min(...points.map((p) => p.x));
      const minY = Math.min(...points.map((p) => p.y));
      const maxX = Math.max(...points.map((p) => p.x)) + layoutResult.size.width + (vertical ? 60 : 0);
      const maxY = Math.max(...points.map((p) => p.y)) + layoutResult.size.height;
      const pad = vertical ? 14 : 28;
      const scale = Math.min((width - pad * 2) / (maxX - minX), (height - pad * 2) / (maxY - minY), 1.25);
      const x = (width - (maxX - minX) * scale) / 2 - minX * scale;
      const y = (height - (maxY - minY) * scale) / 2 - minY * scale;
      setViewport({ x, y, zoom: scale }, { duration: animate ? 250 : 0 });
    },
    [layoutResult, setViewport, vertical],
  );

  const refitRef = useRef(refit);
  refitRef.current = refit;

  useEffect(() => {
    const id = window.setTimeout(() => refit(false), 60);
    return () => window.clearTimeout(id);
  }, [refit, full]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => refit(false));
    observer.observe(el);
    return () => observer.disconnect();
  }, [refit]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % order.length), 1700);
    return () => window.clearInterval(id);
  }, [playing, order.length]);

  useEffect(() => {
    if (!full) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setFull(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [full]);

  const step = () => {
    setPlaying(false);
    setActive((a) => (a + 1) % order.length);
  };

  const current = flow.nodes.find((n) => n.id === (active >= 0 ? order[active] : selected)) ?? null;

  return (
    <div ref={wrapper} className={`wf${full ? ' wf-full' : ''}${interactive ? ' is-interactive' : ''}`} style={{ ['--wf-height' as string]: `${height ?? 440}px` }}>
      <div className="wf-bar">
        <span className="wf-title">{title ?? 'Workflow'}</span>
        <div className="wf-actions">
          <button type="button" onClick={() => setPlaying((p) => !p)} aria-pressed={playing} title={playing ? 'Pause walkthrough' : 'Play walkthrough'}>
            {playing ? <Pause size={15} /> : <Play size={15} />}
            <span>{playing ? 'Pause' : 'Play'}</span>
          </button>
          <button type="button" onClick={step} title="Next step">
            <SkipForward size={15} />
            <span>Step</span>
          </button>
          <button type="button" onClick={() => setInteractive((v) => !v)} aria-pressed={interactive} title="Pan and zoom with the pointer">
            <Hand size={15} />
            <span>Explore</span>
          </button>
          <button type="button" onClick={() => setFull((v) => !v)} aria-label={full ? 'Exit full screen' : 'Full screen'} title={full ? 'Exit full screen' : 'Full screen'}>
            {full ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>
      <div className="wf-stage" ref={stageRef} style={vertical && !full ? { height: 660 } : undefined}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          colorMode={dark ? 'dark' : 'light'}
                    minZoom={0.2}
          maxZoom={2.5}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          panOnDrag={interactive}
          zoomOnScroll={interactive}
          zoomOnPinch={interactive}
          zoomOnDoubleClick={interactive}
          preventScrolling={interactive}
          proOptions={{ hideAttribution: true }}
          onInit={() => window.setTimeout(() => refitRef.current(false), 80)}
          onNodeClick={(_, node) => {
            setPlaying(false);
            setActive(-1);
            setSelected((s) => (s === node.id ? null : node.id));
          }}
          onPaneClick={() => setSelected(null)}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} />
        </ReactFlow>
        {interactive && (
          <div className="wf-zoom">
            <button type="button" onClick={() => zoomIn({ duration: 150 })} aria-label="Zoom in">
              <ZoomIn size={15} />
            </button>
            <button type="button" onClick={() => zoomOut({ duration: 150 })} aria-label="Zoom out">
              <ZoomOut size={15} />
            </button>
            <button type="button" onClick={() => refit(true)} aria-label="Fit to view">
              <ScanLine size={15} />
            </button>
          </div>
        )}
      </div>
      <div className="wf-detail" aria-live="polite">
        {current ? (
          <>
            <strong>
              {order.indexOf(current.id) + 1}. {current.title}
            </strong>
            <span>{current.detail}</span>
          </>
        ) : (
          <span className="wf-hint">Select a step, or press Play to walk through the flow.</span>
        )}
      </div>
      <ol className="wf-sr">
        {flow.nodes.map((n) => (
          <li key={n.id}>
            {n.title}: {n.detail}
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function Workflow(props: Props) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}
