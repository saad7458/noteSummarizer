import { useMemo } from "react";
import ReactFlow, { Background, Controls, Handle, MarkerType, Position } from "reactflow";
import "reactflow/dist/style.css";

const COLUMN_GAP = 240;
const ROW_GAP = 110;

/**
 * The backend only sends node ids/labels and edge source/target/label —
 * no positions. This computes a simple left-to-right layered layout from
 * the graph structure so any subject's flowchart lays out sensibly.
 */
function layoutGraph(nodes, edges) {
  const ids = new Set(nodes.map((n) => n.id));
  const validEdges = edges.filter((e) => ids.has(e.source) && ids.has(e.target));

  const incoming = new Map(nodes.map((n) => [n.id, 0]));
  const adjacency = new Map(nodes.map((n) => [n.id, []]));
  validEdges.forEach((e) => {
    incoming.set(e.target, (incoming.get(e.target) || 0) + 1);
    adjacency.get(e.source)?.push(e.target);
  });

  const level = new Map();
  let queue = nodes.filter((n) => (incoming.get(n.id) || 0) === 0).map((n) => n.id);
  if (queue.length === 0 && nodes.length > 0) queue = [nodes[0].id];
  queue.forEach((id) => level.set(id, 0));

  const visited = new Set(queue);
  while (queue.length > 0) {
    const next = [];
    for (const id of queue) {
      const currentLevel = level.get(id);
      for (const neighbor of adjacency.get(id) || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          level.set(neighbor, currentLevel + 1);
          next.push(neighbor);
        }
      }
    }
    queue = next;
  }

  // Any node untouched by BFS (disconnected) still needs a level.
  let maxLevel = 0;
  level.forEach((v) => { if (v > maxLevel) maxLevel = v; });
  nodes.forEach((n) => {
    if (!level.has(n.id)) {
      maxLevel += 1;
      level.set(n.id, maxLevel);
    }
  });

  const columnCounts = new Map();
  const positioned = nodes.map((n) => {
    const col = level.get(n.id) || 0;
    const row = columnCounts.get(col) || 0;
    columnCounts.set(col, row + 1);
    return {
      id: n.id,
      type: "flowNode",
      data: { label: n.label ?? n.id, level: col },
      position: { x: col * COLUMN_GAP, y: row * ROW_GAP },
    };
  });

  // Center each column vertically relative to the tallest column.
  const maxRows = Math.max(...Array.from(columnCounts.values()), 1);
  const colSeen = new Map();
  positioned.forEach((n) => {
    const col = Math.round(n.position.x / COLUMN_GAP);
    const rowsInCol = columnCounts.get(col) || 1;
    const idx = colSeen.get(col) || 0;
    colSeen.set(col, idx + 1);
    const offset = ((maxRows - rowsInCol) * ROW_GAP) / 2;
    n.position.y = idx * ROW_GAP + offset;
  });

  const flowEdges = validEdges.map((e, i) => ({
    id: `${e.source}-${e.target}-${i}`,
    source: e.source,
    target: e.target,
    label: e.label || undefined,
    type: "smoothstep",
    animated: false,
    style: { stroke: "#818cf8", strokeWidth: 2 },
    labelStyle: { fill: "#4338ca", fontSize: 11, fontWeight: 600, fontFamily: "Inter, sans-serif" },
    labelBgStyle: { fill: "#ffffff", fillOpacity: 0.95 },
    labelBgPadding: [6, 4],
    labelBgBorderRadius: 4,
    markerEnd: { type: MarkerType.ArrowClosed, color: "#6366f1", width: 18, height: 18 },
  }));

  return { flowNodes: positioned, flowEdges };
}

function FlowNode({ data }) {
  const levelClass = `flow-node-level-${(data.level || 0) % 5}`;
  return (
    <div className={`flow-node ${levelClass}`}>
      <Handle type="target" position={Position.Left} className="flow-handle" />
      <span>{data.label}</span>
      <Handle type="source" position={Position.Right} className="flow-handle" />
    </div>
  );
}

const nodeTypes = { flowNode: FlowNode };

export default function Flowchart({ flowchart }) {
  const nodes = flowchart?.nodes || [];
  const edges = flowchart?.edges || [];

  const { flowNodes, flowEdges } = useMemo(() => layoutGraph(nodes, edges), [nodes, edges]);

  return (
    <div className="card flowchart-card">
      <div className="flowchart-toolbar">
        <h2 className="section-heading" style={{ marginBottom: 0 }}>
          <span className="marker-underline">Flowchart</span>
        </h2>
        <span className="flowchart-hint">scroll to zoom · drag to pan</span>
      </div>

      {flowNodes.length === 0 ? (
        <div className="flowchart-empty">This note didn't produce a flowchart to display.</div>
      ) : (
        <div className="flowchart-canvas">
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="transparent" />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
      )}
    </div>
  );
}
