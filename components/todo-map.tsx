"use client";

import {
  Background,
  BackgroundVariant,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  getBezierPath,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type EdgeProps,
  type Node,
  type NodeProps,
  type XYPosition,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Check, ChevronDown, LayoutGrid, Plus, SquareCheckBig, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  DOC_KINDS,
  DOC_STATUSES,
  KIND_INFO,
  MAP_HIDDEN_COOKIE,
  STATUS_INFO,
  displayTitle,
  type DocKind,
  type DocSummary,
  type DocStatus,
  type LinkType,
} from "@/lib/model";
import { KIND_ICONS } from "@/components/icons";
import { Menu } from "@/components/menu";
import { StatusDot } from "@/components/status-dot";
import { NewDocumentMenu } from "@/components/sidebar";
import { useDocuments } from "@/components/documents-store";
import { usePreferences } from "@/components/preferences";

type DocNode = Node<{ doc: DocSummary }, "doc">;
type DraftNode = Node<{ saving: string | null }, "draft">;
type MapNode = DocNode | DraftNode;

type MapActions = {
  submitDraft: (id: string, title: string, again: boolean) => void;
  closeDraft: (id: string) => void;
  unlink: (edgeIds: string[]) => void;
};

const MapActionsContext = createContext<MapActions | null>(null);

function useMapActions() {
  const actions = useContext(MapActionsContext);
  if (!actions) throw new Error("useMapActions must be used inside the todo map");
  return actions;
}

const CARD_WIDTH = 256;
const CARD_HEIGHT = 110;
const COLUMN = 320;
const ROW = 140;
const LOOSE_ROWS = 6;
const DRAFT_GAP = 104;

const EDGE_STYLE: Partial<Record<LinkType, { label: string; color: string; dashed?: boolean }>> = {
  starts: { label: "starts", color: "var(--accent)" },
  advances: { label: "advances", color: "var(--accent)" },
  completes: { label: "completes", color: "var(--c-world)" },
  fails: { label: "fails", color: "var(--c-effects)" },
  requires: { label: "unlocks", color: "var(--c-conditions)", dashed: true },
  mentions: { label: "", color: "var(--ink-faint)", dashed: true },
};

function cardMeta(doc: DocSummary) {
  const { stages, lines, actions, words } = doc.stats;
  if (doc.kind === "quest" || doc.kind === "story") {
    return `${stages} ${stages === 1 ? "stage" : "stages"} · ${lines} lines · ${actions} actions`;
  }
  return words ? `${words} ${words === 1 ? "word" : "words"}` : "";
}

function DocCard({ data }: NodeProps<DocNode>) {
  const { doc } = data;
  const store = useDocuments();
  const Icon = KIND_ICONS[doc.kind];
  const meta = cardMeta(doc);
  return (
    <div
      className={`sw-quest-node w-64 rounded-2xl border border-line bg-surface px-4 py-3 shadow-sm transition-colors hover:shadow-lg ${doc.kind === "task" ? "is-task" : ""} ${doc.status === "built" ? "is-done" : ""}`}
    >
      <Handle type="target" position={Position.Left} className="!size-2.5 !border-0 !bg-ink-faint" />
      <div className="flex items-center gap-2 text-xs text-ink-faint">
        <Icon size={13} />
        <span className="uppercase tracking-[0.14em]">{KIND_INFO[doc.kind].label}</span>
        <div className="nodrag nopan ml-auto">
          <Menu align="right" className="w-52" trigger={({ toggle }) => (
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-hover"
              title="Set status"
              aria-label={`Status: ${STATUS_INFO[doc.status].label}`}
              onClick={(event) => {
                event.stopPropagation();
                toggle();
              }}
            >
              <StatusDot status={doc.status} />
              {STATUS_INFO[doc.status].label}
              <ChevronDown size={12} />
            </button>
          )}>
            {(close) => DOC_STATUSES.map((status: DocStatus) => (
              <button
                key={status}
                type="button"
                className="sw-menu-item"
                data-active={status === doc.status}
                onClick={(event) => {
                  event.stopPropagation();
                  void store.update(doc.id, { status });
                  close();
                }}
              >
                <StatusDot status={status} />
                {STATUS_INFO[status].label}
                {status === "built" && <Check size={14} className="ml-auto text-(--c-world)" />}
              </button>
            ))}
          </Menu>
        </div>
      </div>
      <div className="mt-1.5 font-display text-lg leading-snug text-ink">{displayTitle(doc.title, doc.kind)}</div>
      {meta && <div className="mt-1 text-xs text-ink-faint">{meta}</div>}
      <Handle type="source" position={Position.Right} className="!size-2.5 !border-0 !bg-accent" />
    </div>
  );
}

function DraftCard({ id, data }: NodeProps<DraftNode>) {
  const actions = useMapActions();
  const [title, setTitle] = useState("");
  const settled = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const Icon = KIND_ICONS.task;

  useEffect(() => {
    const frame = requestAnimationFrame(() => input.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  const finish = (again: boolean) => {
    if (settled.current) return;
    settled.current = true;
    if (title.trim()) actions.submitDraft(id, title.trim(), again);
    else actions.closeDraft(id);
  };

  return (
    <div className="sw-quest-node is-task nodrag nopan w-64 rounded-2xl border border-accent bg-surface px-4 py-3 shadow-lg">
      <div className="flex items-center gap-2 text-xs text-ink-faint">
        <Icon size={13} />
        <span className="uppercase tracking-[0.14em]">{KIND_INFO.task.label}</span>
      </div>
      {data.saving !== null ? (
        <div className="mt-1.5 font-display text-lg leading-snug text-ink">{data.saving}</div>
      ) : (
        <>
          <input
            ref={input}
            value={title}
            maxLength={300}
            placeholder="What needs doing?"
            aria-label="New task"
            onChange={(event) => setTitle(event.target.value)}
            onBlur={() => finish(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                finish(true);
              } else if (event.key === "Escape") {
                settled.current = true;
                actions.closeDraft(id);
              }
            }}
            className="mt-1.5 w-full bg-transparent font-display text-lg leading-snug text-ink outline-none placeholder:text-ink-faint"
          />
          <div className="mt-1 text-xs text-ink-faint">Enter adds another · Esc closes</div>
        </>
      )}
    </div>
  );
}

function LinkEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, style, selected }: EdgeProps) {
  const actions = useMapActions();
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} interactionWidth={20} />
      {selected && (
        <EdgeLabelRenderer>
          <button
            type="button"
            title="Remove arrow"
            aria-label="Remove arrow"
            onClick={() => actions.unlink([id])}
            className="nodrag nopan pointer-events-auto absolute grid size-6 place-items-center rounded-full border border-line bg-raised text-ink-soft shadow-sm hover:text-ink"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            <X size={13} />
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const nodeTypes = { doc: DocCard, draft: DraftCard };
const edgeTypes = { link: LinkEdge };

function linkEdgeId(source: string, target: string) {
  return `${source}:map:${target}`;
}

function buildEdges(docs: DocSummary[]): Edge[] {
  const ids = new Set(docs.map((d) => d.id));
  const edges: Edge[] = [];
  for (const doc of docs) {
    for (const link of doc.links) {
      if (!ids.has(link.to) || link.to === doc.id) continue;
      const style = EDGE_STYLE[link.type];
      if (!style) continue;
      const [source, target] = link.type === "requires" ? [link.to, doc.id] : [doc.id, link.to];
      edges.push({
        id: `${doc.id}:${link.type}:${link.to}`,
        source,
        target,
        label: style.label || undefined,
        animated: link.type === "starts",
        selectable: false,
        deletable: false,
        style: { stroke: style.color, strokeWidth: link.type === "mentions" ? 1 : 1.6, strokeDasharray: style.dashed ? "5 5" : undefined },
        markerEnd: { type: MarkerType.ArrowClosed, color: style.color, width: 16, height: 16 },
      });
    }
    for (const to of doc.mapLinks) {
      if (!ids.has(to) || to === doc.id) continue;
      edges.push({ id: linkEdgeId(doc.id, to), source: doc.id, target: to, type: "link" });
    }
  }
  return edges;
}

function autoLayout(docs: DocSummary[], edges: Edge[]) {
  const incoming = new Map<string, string[]>();
  const connected = new Set<string>();
  for (const edge of edges) {
    if (edge.id.includes(":mentions:")) continue;
    incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge.source]);
    connected.add(edge.source);
    connected.add(edge.target);
  }
  const depth = new Map<string, number>();
  const visit = (id: string, trail: Set<string>): number => {
    if (depth.has(id)) return depth.get(id)!;
    if (trail.has(id)) return 0;
    trail.add(id);
    const parents = incoming.get(id) ?? [];
    const d = parents.length ? Math.max(...parents.map((p) => visit(p, trail) + 1)) : 0;
    trail.delete(id);
    depth.set(id, d);
    return d;
  };

  const rows = new Map<number, number>();
  const positions = new Map<string, { x: number; y: number }>();
  let column = 0;
  for (const doc of docs) {
    if (!connected.has(doc.id)) continue;
    const d = visit(doc.id, new Set());
    const row = rows.get(d) ?? 0;
    rows.set(d, row + 1);
    positions.set(doc.id, { x: d * COLUMN, y: row * ROW });
    column = Math.max(column, d + 1);
  }

  for (const kind of DOC_KINDS) {
    const loose = docs.filter((doc) => doc.kind === kind && !connected.has(doc.id));
    loose.forEach((doc, i) => {
      positions.set(doc.id, { x: (column + Math.floor(i / LOOSE_ROWS)) * COLUMN, y: (i % LOOSE_ROWS) * ROW });
    });
    column += Math.ceil(loose.length / LOOSE_ROWS);
  }
  return positions;
}

function openPositions(docs: DocSummary[], edges: Edge[]) {
  const auto = autoLayout(docs, edges);
  const taken: XYPosition[] = [];
  for (const doc of docs) {
    if (doc.mapX !== null && doc.mapY !== null) taken.push({ x: doc.mapX, y: doc.mapY });
  }
  const overlaps = (p: XYPosition) =>
    taken.some((t) => Math.abs(t.x - p.x) < CARD_WIDTH + 24 && Math.abs(t.y - p.y) < CARD_HEIGHT + 16);
  const positions = new Map<string, XYPosition>();
  for (const doc of docs) {
    if (doc.mapX !== null && doc.mapY !== null) continue;
    const position = { ...auto.get(doc.id)! };
    while (overlaps(position)) position.y += ROW;
    taken.push(position);
    positions.set(doc.id, position);
  }
  return positions;
}

function draftNode(position: XYPosition): DraftNode {
  return {
    id: `draft:${crypto.randomUUID()}`,
    type: "draft",
    position,
    data: { saving: null },
    initialWidth: CARD_WIDTH,
    initialHeight: 96,
    draggable: false,
    selectable: false,
    deletable: false,
  };
}

export function TodoMap({ initialHidden }: { initialHidden: DocKind[] }) {
  return (
    <ReactFlowProvider>
      <Board initialHidden={initialHidden} />
    </ReactFlowProvider>
  );
}

function Board({ initialHidden }: { initialHidden: DocKind[] }) {
  const router = useRouter();
  const store = useDocuments();
  const prefs = usePreferences();
  const flow = useReactFlow<MapNode>();
  const pane = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(() => new Set(initialHidden));
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);

  const counts = useMemo(() => {
    const byKind = new Map<DocKind, number>();
    for (const doc of store.docs) byKind.set(doc.kind, (byKind.get(doc.kind) ?? 0) + 1);
    return byKind;
  }, [store.docs]);
  const docs = useMemo(() => store.docs.filter((d) => !hidden.has(d.kind)), [store.docs, hidden]);
  const allEdges = useMemo(() => buildEdges(store.docs), [store.docs]);
  const baseEdges = useMemo(() => buildEdges(docs), [docs]);
  const edges = useMemo(() => {
    const ink = "var(--ink-soft)";
    return baseEdges.map((edge): Edge => {
      if (edge.type !== "link") return edge;
      const selected = edge.id === selectedEdge;
      const color = selected ? "var(--accent)" : ink;
      return {
        ...edge,
        selected,
        style: { stroke: color, strokeWidth: selected ? 2 : 1.6 },
        markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
      };
    });
  }, [baseEdges, selectedEdge]);
  const [nodes, setNodes, onNodesChange] = useNodesState<MapNode>([]);

  useEffect(() => {
    const open = openPositions(store.docs, allEdges);
    setNodes((current) => {
      const placed = new Map(current.map((n) => [n.id, n.position]));
      const drafts = current.filter((n) => n.type === "draft");
      const cards = docs.map(
        (doc): DocNode => ({
          id: doc.id,
          type: "doc",
          data: { doc },
          deletable: false,
          position:
            placed.get(doc.id) ??
            (doc.mapX !== null && doc.mapY !== null ? { x: doc.mapX, y: doc.mapY } : open.get(doc.id)!),
        }),
      );
      return [...cards, ...drafts];
    });
  }, [docs, store.docs, allEdges, setNodes]);

  const toggleKind = (kind: DocKind) => {
    const next = new Set(hidden);
    if (next.has(kind)) next.delete(kind);
    else next.add(kind);
    setHidden(next);
    document.cookie = `${MAP_HIDDEN_COOKIE}=${[...next].join(",")}; path=/; max-age=31536000; samesite=lax`;
  };

  const openDraft = (center: XYPosition) => {
    if (hidden.has("task")) toggleKind("task");
    const position = { x: Math.round(center.x - CARD_WIDTH / 2), y: Math.round(center.y - 36) };
    setNodes((current) => [...current.filter((n) => n.type !== "draft" || n.data.saving !== null), draftNode(position)]);
  };

  const addFromButton = () => {
    const rect = pane.current?.getBoundingClientRect();
    if (!rect) return;
    openDraft(flow.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }));
  };

  const actions: MapActions = {
    closeDraft: (id) => setNodes((current) => current.filter((n) => n.id !== id)),
    submitDraft: (id, title, again) => {
      const draft = flow.getNode(id);
      if (!draft) return;
      const position = { x: Math.round(draft.position.x), y: Math.round(draft.position.y) };
      setNodes((current) => [
        ...current.map((n) => (n.id === id && n.type === "draft" ? { ...n, data: { saving: title } } : n)),
        ...(again ? [draftNode({ x: position.x, y: position.y + DRAFT_GAP })] : []),
      ]);
      void store.create("task", title, false, position).finally(() => {
        setNodes((current) => current.filter((n) => n.id !== id));
      });
    },
    unlink: (edgeIds) => {
      const removed = new Map<string, Set<string>>();
      for (const edgeId of edgeIds) {
        const [source, type, target] = edgeId.split(":");
        if (type !== "map") continue;
        removed.set(source, (removed.get(source) ?? new Set()).add(target));
      }
      for (const [source, targets] of removed) {
        const doc = store.docsById.get(source);
        if (doc) void store.update(source, { mapLinks: doc.mapLinks.filter((to) => !targets.has(to)) });
      }
      setSelectedEdge(null);
    },
  };

  const link = ({ source, target }: Connection) => {
    const doc = store.docsById.get(source);
    if (!doc || source === target || !store.docsById.has(target) || doc.mapLinks.includes(target)) return;
    void store.update(source, { mapLinks: [...doc.mapLinks, target] });
  };

  const onEdgesChange = (changes: EdgeChange[]) => {
    for (const change of changes) {
      if (change.type !== "select") continue;
      setSelectedEdge((current) => (change.selected ? change.id : current === change.id ? null : current));
    }
  };

  const arrange = () => {
    const auto = autoLayout(docs, baseEdges);
    setNodes((current) => current.map((n) => (n.type === "doc" ? { ...n, position: auto.get(n.id) ?? n.position } : n)));
    for (const doc of docs) {
      if (doc.mapX !== null) void store.update(doc.id, { mapX: null, mapY: null });
    }
  };

  const empty = docs.length === 0 && !nodes.some((n) => n.type === "draft");

  return (
    <MapActionsContext.Provider value={actions}>
      <div className="flex h-full flex-col">
        <header className="flex flex-wrap items-center gap-3 px-6 pb-3 pt-5 pl-16 md:pl-6">
          <div className="mr-auto">
            <h1 className="font-display text-2xl">Todo map</h1>
            <p className="text-sm text-ink-faint">
              Your whole game at a glance. Double-click to add a task, drag from a card&apos;s dot to another card to connect
              them, and set cards to Done once they&apos;re in the game.
            </p>
          </div>
          <button type="button" className="sw-btn sw-btn-ghost border border-line" onClick={arrange}>
            <LayoutGrid size={15} /> Tidy up
          </button>
          <button type="button" className="sw-btn sw-btn-ghost border border-line" onClick={addFromButton}>
            <Plus size={15} /> Add task
          </button>
          <NewDocumentMenu align="right" wide={false} />
        </header>

        <div className="flex flex-wrap gap-1.5 px-6 pb-3" role="group" aria-label="Show on the map">
          {DOC_KINDS.map((kind) => {
            const Icon = KIND_ICONS[kind];
            const shown = !hidden.has(kind);
            return (
              <button
                key={kind}
                type="button"
                aria-pressed={shown}
                onClick={() => toggleKind(kind)}
                className={`sw-chip transition-opacity ${shown ? "!text-ink" : "line-through opacity-50"}`}
              >
                <Icon size={13} /> {KIND_INFO[kind].plural}
                <span className="text-ink-faint">{counts.get(kind) ?? 0}</span>
              </button>
            );
          })}
        </div>

        <div ref={pane} className="relative min-h-0 flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={link}
            onEdgesDelete={(deleted) => actions.unlink(deleted.map((edge) => edge.id))}
            onNodeClick={(_, node) => {
              if (node.type === "doc") router.push(`/d/${node.id}`);
            }}
            onNodeDragStop={(_, node) => {
              if (node.type === "doc") void store.update(node.id, { mapX: Math.round(node.position.x), mapY: Math.round(node.position.y) });
            }}
            onDoubleClick={(event) => {
              if ((event.target as Element).classList.contains("react-flow__pane")) {
                openDraft(flow.screenToFlowPosition({ x: event.clientX, y: event.clientY }));
              }
            }}
            zoomOnDoubleClick={false}
            deleteKeyCode={["Backspace", "Delete"]}
            connectionLineStyle={{ stroke: "var(--accent)", strokeWidth: 1.6 }}
            colorMode={prefs.theme.mode}
            fitView
            fitViewOptions={{ padding: 0.3, maxZoom: 1.1 }}
            minZoom={0.2}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="var(--line)" />
            <Controls showInteractive={false} />
          </ReactFlow>

          {empty && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center p-8 text-center">
              <div className="max-w-md">
                <SquareCheckBig size={36} className="mx-auto text-ink-faint" />
                <p className="mt-4 font-display text-2xl">
                  {store.docs.length ? "Everything is filtered out" : "Lay out your whole game"}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  Double-click anywhere to add a task, like <b>Settings menu</b>. Quests, story, notes and everything else you
                  write show up here too.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </MapActionsContext.Provider>
  );
}
