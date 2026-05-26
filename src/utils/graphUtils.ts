import { MarkerType, Node, Edge } from "reactflow";
import { GraphNodeData } from "../types";

export const layoutJobs = (jobs: GraphNodeData[]) => {
  const radius = 270;
  return jobs.map((job, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(jobs.length, 1) - Math.PI / 2;
    return {
      ...job,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius
    };
  });
};

export const layoutJobsAsTree = (jobs: GraphNodeData[]) => {
  const gap = 92;
  return jobs.map((job, index) => ({
    ...job,
    x: 340,
    y: index === 0 ? 0 : (index % 2 === 1 ? -1 : 1) * Math.ceil(index / 2) * gap
  }));
};

export const layoutChildrenAsTree = (children: GraphNodeData[], startX = 760, centerY = 0) => {
  const gapY = 104;
  const startY = centerY - ((children.length - 1) * gapY) / 2;
  return children.map((child, index) => ({
    ...child,
    x: startX,
    y: startY + index * gapY
  }));
};

export const toFlowNode = (item: GraphNodeData & { x: number; y: number }): Node<GraphNodeData> => ({
  id: item.id,
  type: "career",
  position: { x: item.x, y: item.y },
  data: item,
  draggable: true
});

export const toFlowEdge = (source: string, target: string, weight = 1, animated = false): Edge => ({
  id: `${source}->${target}`,
  source,
  target,
  animated,
  markerEnd: { type: MarkerType.ArrowClosed, color: "#67e8f9" },
  style: {
    stroke: animated ? "#22d3ee" : "#64748b",
    strokeWidth: Math.max(1.5, Math.min(6, Number(weight) || 1)),
    opacity: animated ? 0.85 : 0.45
  }
});
