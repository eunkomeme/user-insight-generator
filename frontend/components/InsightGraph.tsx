"use client";

import { useEffect } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MarkerType,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Insight, InsightRelationship } from "../lib/types";

const TYPE_COLORS: Record<string, { bg: string; border: string; badge: string }> = {
  pain_point:      { bg: "#fef2f2", border: "#fca5a5", badge: "#ef4444" },
  usability_issue: { bg: "#fff7ed", border: "#fdba74", badge: "#f97316" },
  positive_signal: { bg: "#f0fdf4", border: "#86efac", badge: "#22c55e" },
  task_friction:   { bg: "#faf5ff", border: "#d8b4fe", badge: "#a855f7" },
};

const TYPE_LABELS: Record<string, string> = {
  pain_point:      "불만",
  usability_issue: "사용성",
  positive_signal: "긍정",
  task_friction:   "마찰",
};

const NODE_W = 240;
const NODE_H = 100;
const COLS = 3;
const H_GAP = 80;
const V_GAP = 60;

function InsightNode({ data }: { data: { insight: Insight } }) {
  const { insight } = data;
  const colors = TYPE_COLORS[insight.type] ?? TYPE_COLORS.usability_issue;
  return (
    <div
      style={{
        width: NODE_W,
        minHeight: NODE_H,
        background: colors.bg,
        border: `1.5px solid ${colors.border}`,
        borderRadius: 12,
        padding: "10px 14px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      <span
        style={{
          display: "inline-block",
          background: colors.badge,
          color: "#fff",
          fontSize: 10,
          fontWeight: 700,
          borderRadius: 6,
          padding: "1px 7px",
          marginBottom: 6,
          letterSpacing: 0.3,
        }}
      >
        {TYPE_LABELS[insight.type] ?? insight.type}
      </span>
      <p style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.4, color: "#1c1c1a", margin: 0 }}>
        {insight.title}
      </p>
    </div>
  );
}

const nodeTypes = { insightNode: InsightNode };

type Props = {
  insights: Insight[];
  relationships: InsightRelationship[];
};

function InsightGraphInner({ insights, relationships }: Props) {
  const { fitView } = useReactFlow();

  const insightIds = new Set(insights.map((i) => i.id));

  const initialNodes: Node[] = insights.map((insight, i) => ({
    id: insight.id,
    type: "insightNode",
    position: {
      x: (i % COLS) * (NODE_W + H_GAP),
      y: Math.floor(i / COLS) * (NODE_H + V_GAP),
    },
    data: { insight },
    draggable: true,
  }));

  const initialEdges: Edge[] = relationships
    .filter((r) => insightIds.has(r.from_id) && insightIds.has(r.to_id))
    .map((r, idx) => ({
      id: `e-${r.from_id}-${r.to_id}-${idx}`,
      source: r.from_id,
      target: r.to_id,
      label: r.label,
      markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
      style: { stroke: "#94a3b8", strokeWidth: 1.5 },
      labelStyle: { fontSize: 11, fill: "#64748b", fontWeight: 600 },
      labelBgStyle: { fill: "#f8fafc", fillOpacity: 0.9 },
    }));

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.2 }), 50);
    return () => clearTimeout(t);
  }, [fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.3}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#e6dfd8" gap={20} size={1} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}

export default function InsightGraph({ insights, relationships }: Props) {
  if (!insights.length) return null;

  return (
    <ReactFlowProvider>
      <div style={{ width: "100%", height: 400 }}>
        <InsightGraphInner insights={insights} relationships={relationships} />
      </div>
    </ReactFlowProvider>
  );
}
