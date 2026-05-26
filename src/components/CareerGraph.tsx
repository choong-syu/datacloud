import { memo, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  Edge,
  Handle,
  Node,
  NodeProps,
  Position,
  useEdgesState,
  useNodesState
} from "reactflow";
import { motion } from "framer-motion";
import { Briefcase, Cloud, Medal, Rocket, Wrench } from "lucide-react";
import { buildJobs, buildSkills, demoProjects } from "../data/transform";
import { DetailSelection, FilterState, GraphNodeData, MarketData } from "../types";
import { layoutChildrenAsTree, layoutJobsAsTree, toFlowEdge, toFlowNode } from "../utils/graphUtils";
import { categoryTone, nodeClasses } from "../utils/skillCategory";

const CareerNode = memo(({ data }: NodeProps<GraphNodeData>) => {
  const Icon = data.kind === "root" ? Cloud : data.kind === "job" ? Briefcase : data.kind === "project" ? Rocket : data.kind === "certificate" ? Medal : Wrench;
  const tone = data.kind === "root" ? "cyan" : categoryTone(`${data.label} ${data.category ?? ""}`);

  return (
    <motion.div
      layout
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ y: [0, -3, 0], scale: 1, opacity: data.dimmed ? 0.35 : 1 }}
      transition={{
        y: { repeat: Infinity, duration: 3.2, ease: "easeInOut" },
        scale: { duration: 0.2 },
        opacity: { duration: 0.2 }
      }}
      whileHover={{ scale: 1.04 }}
      className={`flex h-[72px] w-[240px] flex-col justify-center overflow-hidden rounded-lg border px-4 py-3 shadow-xl ${nodeClasses(tone)} ${data.kind === "root" ? "w-[210px]" : ""} ${data.highlight ? "ring-4 ring-cyan-200/40" : ""}`}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-cyan-100 !bg-cyan-300" />
      <div className="flex items-center gap-2">
        <Icon size={18} />
        <span className="block min-w-0 max-w-[180px] overflow-hidden truncate whitespace-nowrap text-sm font-black" title={data.label}>{data.label}</span>
      </div>
      <div className="mt-1 flex items-center gap-2 text-[11px] opacity-80">
        <span>{data.kind.toUpperCase()}</span>
        {data.frequency ? <span>{data.frequency} hits</span> : null}
        {data.beginner ? <span className="rounded-full bg-lime-300/20 px-1.5 text-lime-100">Beginner</span> : null}
      </div>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-cyan-100 !bg-cyan-300" />
    </motion.div>
  );
});

export default function CareerGraph({
  data,
  rootLabel = "CLOUD",
  query,
  filters,
  selected,
  onSelect
}: {
  data: MarketData;
  rootLabel?: string;
  query: string;
  filters: FilterState;
  selected?: DetailSelection;
  onSelect: (s: DetailSelection) => void;
}) {
  const [rootExpanded, setRootExpanded] = useState(false);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const nodeTypes = useMemo(() => ({ career: CareerNode }), []);
  const q = query.trim().toLowerCase();

  useEffect(() => {
    setRootExpanded(false);
    setExpandedJob(null);
  }, [rootLabel, data]);

  const graph = useMemo(() => {
    const root: GraphNodeData & { x: number; y: number } = {
      id: `root:${rootLabel}`,
      label: rootLabel,
      kind: "root",
      x: 0,
      y: 0,
      highlight: !q || rootLabel.toLowerCase().includes(q) || selected?.id === `root:${rootLabel}`
    };

    const jobs = rootExpanded
      ? layoutJobsAsTree(
          buildJobs(data)
            .filter((job) => !filters.beginnerOnly || job.beginner)
            .map((job) => ({
              ...job,
              highlight: q ? JSON.stringify(job).toLowerCase().includes(q) : selected?.id === job.id,
              dimmed: Boolean(q) && !JSON.stringify(job).toLowerCase().includes(q)
            }))
        )
      : [];

    let childNodes: Array<GraphNodeData & { x: number; y: number }> = [];
    const childEdges: Edge[] = [];

    if (expandedJob) {
      const jobLabel = expandedJob.replace("job:", "");
      const expandedJobY = jobs.find((job) => job.id === expandedJob)?.y ?? 0;
      const children: GraphNodeData[] = buildSkills(data, jobLabel, filters.requiredOnly ? 6 : 9).map((skill) => ({
        ...skill,
        highlight: q ? JSON.stringify(skill).toLowerCase().includes(q) : selected?.id === skill.id,
        dimmed: Boolean(q) && !JSON.stringify(skill).toLowerCase().includes(q)
      }));

      if (filters.showProjects) {
        const dataProjects = data.recommended_projects.filter((project) => {
          const targetJobs = project.target_jobs ?? (project.target_job ? [project.target_job] : []);
          return targetJobs.includes(jobLabel);
        });
        const fallbackProjects = demoProjects.filter((project) => project.target_jobs?.includes(jobLabel));
        children.push(
          ...(dataProjects.length ? dataProjects : fallbackProjects)
            .slice(0, 2)
            .map((project) => ({
              id: `project:${project.project_name ?? project.title}`,
              label: (project.project_name ?? project.title)!,
              kind: "project" as const,
              source: project,
              highlight: q ? JSON.stringify(project).toLowerCase().includes(q) : false
            }))
        );
      }

      if (filters.showCertificates) {
        const postingCertificates = data.raw_job_postings
          .filter((posting) => posting.job_name === jobLabel)
          .flatMap((posting) => posting.certificates ?? []);
        const recommendedCertificates = data.recommended_certificates
          .filter((certificate) => (certificate.related_jobs ?? []).includes(jobLabel))
          .map((certificate) => certificate.certificate_name ?? certificate.name)
          .filter(Boolean) as string[];
        Array.from(new Set([...postingCertificates, ...recommendedCertificates])).slice(0, 4).forEach((certificate) => {
          children.push({
            id: `certificate:${certificate}`,
            label: certificate,
            kind: "certificate",
            source: {
              certificate_name: certificate,
              related_jobs: [jobLabel],
              required_or_preferred: "preferred or recommended",
              recommended_timing: "after one foundation project"
            }
          });
        });
      }

      childNodes = layoutChildrenAsTree(children, 720, expandedJobY);
      childNodes.forEach((node) => childEdges.push(toFlowEdge(expandedJob, node.id, node.kind === "skill" ? 2 : 1, true)));
    }

    const nodes = [toFlowNode(root), ...jobs.map(toFlowNode), ...childNodes.map(toFlowNode)];
    const edges = [
      ...jobs.map((job) => toFlowEdge(`root:${rootLabel}`, job.id, Math.min(5, job.frequency ?? 1), true)),
      ...childEdges
    ].filter((edge) => nodes.some((node) => node.id === edge.source) && nodes.some((node) => node.id === edge.target));

    return { nodes, edges };
  }, [data, expandedJob, filters.beginnerOnly, filters.requiredOnly, filters.showCertificates, filters.showProjects, q, rootExpanded, rootLabel, selected?.id]);

  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);

  useEffect(() => {
    setNodes((current) => {
      const positions = new Map(current.map((node) => [node.id, node.position]));
      return graph.nodes.map((node) => ({
        ...node,
        position: positions.get(node.id) ?? node.position
      }));
    });
    setEdges(graph.edges);
  }, [graph.nodes, graph.edges, setEdges, setNodes]);

  const handleNodeClick = (_event: React.MouseEvent, node: Node<GraphNodeData>) => {
    onSelect({ id: node.id, kind: node.data.kind, label: node.data.label, source: node.data.source });

    if (node.data.kind === "root") {
      setRootExpanded(true);
      setExpandedJob(null);
    }

    if (node.data.kind === "job") {
      setRootExpanded(true);
      setExpandedJob((current) => (current === node.id ? null : node.id));
    }
  };

  return (
    <div className="relative min-h-0 overflow-hidden bg-[radial-gradient(circle_at_18%_50%,rgba(34,211,238,.16),transparent_32%),#020617]">
      <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-lg border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-200 backdrop-blur">
        <b className="text-cyan-100">Interactive Tree Graph</b>
        <div>Click the selected root to expand jobs. Click a job to branch related nodes. Drag nodes to reposition.</div>
      </div>
      <ReactFlow
        key={`${rootLabel}-${rootExpanded}-${expandedJob ?? "none"}`}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={(_event, node) => {
          if (node.data.kind === "root") {
            setRootExpanded((current) => !current);
            setExpandedJob(null);
          }
          if (node.data.kind === "job") {
            setExpandedJob((current) => (current === node.id ? null : node.id));
          }
        }}
        nodesDraggable
        fitView
        minZoom={0.35}
        maxZoom={1.4}
      >
        <Background color="#164e63" gap={28} />
        <Controls className="!bg-slate-900 !text-white" />
      </ReactFlow>
    </div>
  );
}
