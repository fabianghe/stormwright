"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { LayoutGrid, Network } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { STATUS_INFO, displayTitle, type DocSummary, type LinkType } from "@/lib/model";
import { KIND_ICONS } from "@/components/icons";
import { StatusDot } from "@/components/status-dot";
import { NewDocumentMenu } from "@/components/sidebar";
import { useDocuments } from "@/components/documents-store";
import { usePreferences } from "@/components/preferences";

type DocNode = Node<{ doc: DocSummary }, "doc">;

const MAP_KINDS = new Set(["quest", "story"]);
const COLUMN = 320;
const ROW = 140;

const EDGE_STYLE: Partial<Record<LinkType, { label: string; color: string; dashed?: boolean }>> = {
  starts: { label: "starts", color: "var(--accent)" },
  advances: { label: "advances", color: "var(--accent)" },
  completes: { label: "completes", color: "var(--c-world)" },
  fails: { label: "fails", color: "var(--c-effects)" },
  requires: { label: "unlocks", color: "var(--c-conditions)", dashed: true },
  mentions: { label: "", color: "var(--ink-faint)", dashed: true },
};

function DocCard({ data }: NodeProps<DocNode>) {
  const { doc } = data;
  const Icon = KIND_ICONS[doc.kind];
  return (
    <div className="w-64 rounded-2xl border border-line bg-surface px-4 py-3 shadow-sm transition-shadow hover:shadow-lg">
      <Handle type="target" position={Position.Left} className="!size-2 !border-0 !bg-ink-faint" />
      <div className="flex items-center gap-2 text-xs text-ink-faint">
        <Icon size={13} />
        <span className="uppercase tracking-[0.14em]">{doc.kind}</span>
        <span className="ml-auto flex items-center gap-1.5">
          <StatusDot status={doc.status} /> {STATUS_INFO[doc.status].label}
        </span>
      </div>
      <div className="mt-1.5 font-display text-lg leading-snug text-ink">{displayTitle(doc.title, doc.kind)}</div>
      <div className="mt-1 text-xs text-ink-faint">
        {doc.stats.stages} {doc.stats.stages === 1 ? "stage" : "stages"} · {doc.stats.lines} lines · {doc.stats.actions} actions
      </div>
      <Handle type="source" position={Position.Right} className="!size-2 !border-0 !bg-accent" />
    </div>
  );
}

const nodeTypes = { doc: DocCard };

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
        style: { stroke: style.color, strokeWidth: link.type === "mentions" ? 1 : 1.6, strokeDasharray: style.dashed ? "5 5" : undefined },
        markerEnd: { type: MarkerType.ArrowClosed, color: style.color, width: 16, height: 16 },
      });
    }
  }
  return edges;
}

function autoLayout(docs: DocSummary[], edges: Edge[]) {
  const incoming = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.id.includes(":mentions:")) continue;
    incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge.source]);
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
  for (const doc of docs) {
    const d = visit(doc.id, new Set());
    const row = rows.get(d) ?? 0;
    rows.set(d, row + 1);
    positions.set(doc.id, { x: d * COLUMN, y: row * ROW });
  }
  return positions;
}

export function QuestMap() {
  const router = useRouter();
  const store = useDocuments();
  const prefs = usePreferences();

  const docs = useMemo(() => store.docs.filter((d) => MAP_KINDS.has(d.kind)), [store.docs]);
  const edges = useMemo(() => buildEdges(docs), [docs]);
  const [nodes, setNodes, onNodesChange] = useNodesState<DocNode>([]);

  useEffect(() => {
    const auto = autoLayout(docs, edges);
    setNodes((current) => {
      const placed = new Map(current.map((n) => [n.id, n.position]));
      return docs.map((doc) => ({
        id: doc.id,
        type: "doc",
        data: { doc },
        position:
          placed.get(doc.id) ??
          (doc.mapX !== null && doc.mapY !== null ? { x: doc.mapX, y: doc.mapY } : auto.get(doc.id)!),
      }));
    });
  }, [docs, edges, setNodes]);

  const arrange = () => {
    const auto = autoLayout(docs, edges);
    setNodes((current) => current.map((n) => ({ ...n, position: auto.get(n.id) ?? n.position })));
    for (const doc of docs) {
      if (doc.mapX !== null) void store.update(doc.id, { mapX: null, mapY: null });
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 px-6 pb-3 pt-5 pl-16 md:pl-6">
        <div className="mr-auto">
          <h1 className="font-display text-2xl">Quest map</h1>
          <p className="text-sm text-ink-faint">
            Quests and story chapters, linked by their Start / Complete / Only if quest actions. Drag cards to arrange.
          </p>
        </div>
        <button type="button" className="sw-btn sw-btn-ghost border border-line" onClick={arrange}>
          <LayoutGrid size={15} /> Tidy up
        </button>
        <NewDocumentMenu align="right" wide={false} />
      </header>

      {docs.length === 0 ? (
        <div className="grid flex-1 place-items-center p-8 text-center">
          <div className="max-w-md">
            <Network size={36} className="mx-auto text-ink-faint" />
            <p className="mt-4 font-display text-2xl">No quests yet</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Write a quest, then add an action like <b>Start quest</b> or <b>Only if quest</b> pointing to another one.
              The arrows show up here by themselves.
            </p>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onNodeClick={(_, node) => router.push(`/d/${node.id}`)}
            onNodeDragStop={(_, node) =>
              void store.update(node.id, { mapX: Math.round(node.position.x), mapY: Math.round(node.position.y) })
            }
            nodesConnectable={false}
            colorMode={prefs.theme.mode}
            fitView
            fitViewOptions={{ padding: 0.3, maxZoom: 1.1 }}
            minZoom={0.2}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="var(--line)" />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
      )}
    </div>
  );
}
