import { GraphNodeData, JobPosting, MarketData } from "../types";
import { asArray, uniq } from "../utils/textUtils";

const pickObjects = (text: string, keys: string[]) => {
  const re = new RegExp(`\\{[\\s\\S]*?${keys.map((k) => `"${k}"`).join("[\\s\\S]*?")}[\\s\\S]*?\\}`, "g");
  return Array.from(text.matchAll(re)).map((m) => m[0]);
};

const extractString = (block: string, key: string) => {
  const m = block.match(new RegExp(`"${key}"\\s*:\\s*"([^"\\r\\n]*)"`));
  return m?.[1]?.trim();
};

const extractNumber = (block: string, key: string) => {
  const m = block.match(new RegExp(`"${key}"\\s*:\\s*(\\d+)`));
  return m ? Number(m[1]) : undefined;
};

const extractStringArray = (block: string, key: string) => {
  const m = block.match(new RegExp(`"${key}"\\s*:\\s*\\[([\\s\\S]*?)\\]`));
  if (!m) return [];
  return Array.from(m[1].matchAll(/"([^"\r\n]+)"/g)).map((v) => v[1]);
};

const recoverFromBrokenText = (text: string): MarketData => {
  const nodeBlocks = pickObjects(text, ["type", "id"]).filter((b) => b.includes('"frequency"') || b.includes('"category"'));
  const graph_nodes = nodeBlocks.map((block) => ({
    type: extractString(block, "type"),
    id: extractString(block, "id"),
    frequency: extractNumber(block, "frequency"),
    category: extractString(block, "category")
  })).filter((n) => n.id);

  const edgeBlocks = pickObjects(text, ["type", "source", "target"]);
  const graph_edges = edgeBlocks.map((block) => ({
    type: extractString(block, "type"),
    source: extractString(block, "source"),
    target: extractString(block, "target"),
    weight: extractNumber(block, "weight") ?? extractString(block, "weight"),
    shared_skills: extractStringArray(block, "shared_skills"),
    skills: extractStringArray(block, "skills")
  })).filter((e) => e.source && e.target);

  const postingBlocks = pickObjects(text, ["site", "company", "title", "url", "job_name"]);
  const raw_job_postings: JobPosting[] = postingBlocks.map((block) => ({
    site: extractString(block, "site"),
    company: extractString(block, "company"),
    title: extractString(block, "title"),
    url: extractString(block, "url"),
    job_name: extractString(block, "job_name"),
    job_category: extractString(block, "job_category"),
    main_tasks: extractStringArray(block, "main_tasks"),
    experience_required: extractString(block, "experience_required"),
    required_skills: extractStringArray(block, "required_skills"),
    preferred_skills: extractStringArray(block, "preferred_skills"),
    mentioned_skills: extractStringArray(block, "mentioned_skills"),
    certificates: extractStringArray(block, "certificates"),
    newbie_or_junior_flag: extractString(block, "newbie_or_junior_flag")
  })).filter((p) => p.url || p.job_name);

  return normalizeData({
    summary: {
      analysis_date: extractString(text, "analysis_date") ?? "2026-05-26",
      total_job_postings_analyzed: extractNumber(text, "total_job_postings_analyzed") ?? raw_job_postings.length,
      analyzed_sites: ["사람인", "잡코리아", "인크루트"],
      limitations: ["원본 JSON에 인코딩/문자열 손상이 있어 핵심 직무, 기술, 그래프 필드를 복구해 표시합니다."]
    },
    raw_job_postings,
    discovered_jobs: [],
    skill_taxonomy: [],
    skill_co_occurrence: graph_edges.filter((e) => e.type === "skill_to_skill"),
    job_relation_graph: graph_edges.filter((e) => e.type === "job_to_job"),
    learning_roadmaps: [],
    recommended_projects: [],
    recommended_certificates: [],
    graph_nodes,
    graph_edges,
    recovered: true
  });
};

export const loadMarketData = async (path = "/data/cloud_job_market_analysis_2026-05-26.json"): Promise<MarketData> => {
  const response = await fetch(path);
  const text = await response.text();
  try {
    return normalizeData(JSON.parse(text));
  } catch {
    return recoverFromBrokenText(text);
  }
};

export const normalizeData = (raw: Partial<MarketData>): MarketData => ({
  summary: raw.summary ?? {},
  raw_job_postings: asArray<JobPosting>(raw.raw_job_postings),
  discovered_jobs: asArray<MarketData["discovered_jobs"][number]>(raw.discovered_jobs),
  skill_taxonomy: asArray<MarketData["skill_taxonomy"][number]>(raw.skill_taxonomy),
  skill_co_occurrence: asArray<MarketData["skill_co_occurrence"][number]>(raw.skill_co_occurrence),
  job_relation_graph: asArray<MarketData["job_relation_graph"][number]>(raw.job_relation_graph),
  learning_roadmaps: asArray<MarketData["learning_roadmaps"][number]>(raw.learning_roadmaps),
  recommended_projects: asArray<MarketData["recommended_projects"][number]>(raw.recommended_projects),
  recommended_certificates: asArray<MarketData["recommended_certificates"][number]>(raw.recommended_certificates),
  graph_nodes: asArray<MarketData["graph_nodes"][number]>(raw.graph_nodes),
  graph_edges: asArray<MarketData["graph_edges"][number]>(raw.graph_edges),
  recovered: raw.recovered
});

export const buildJobs = (data: MarketData): GraphNodeData[] => {
  const fromGraph = data.graph_nodes.filter((n) => n.type === "job" && n.id);
  const counts = new Map<string, number>();
  data.raw_job_postings.forEach((p) => p.job_name && counts.set(p.job_name, (counts.get(p.job_name) ?? 0) + 1));
  const names = uniq([...fromGraph.map((n) => n.id!), ...Array.from(counts.keys())]);
  return names.slice(0, 12).map((name) => ({
    id: `job:${name}`,
    label: name,
    kind: "job",
    frequency: fromGraph.find((n) => n.id === name)?.frequency ?? counts.get(name) ?? 1,
    source: collectJobDetail(data, name),
    beginner: data.raw_job_postings.some((p) => p.job_name === name && p.newbie_or_junior_flag && p.newbie_or_junior_flag !== "experienced_or_unknown")
  }));
};

export const buildSkills = (data: MarketData, jobName?: string, limit = 8): GraphNodeData[] => {
  const postings = jobName ? data.raw_job_postings.filter((p) => p.job_name === jobName) : data.raw_job_postings;
  const counts = new Map<string, { total: number; required: number; preferred: number; mentioned: number }>();
  const add = (skill: string, key: "required" | "preferred" | "mentioned") => {
    const cur = counts.get(skill) ?? { total: 0, required: 0, preferred: 0, mentioned: 0 };
    cur.total += 1;
    cur[key] += 1;
    counts.set(skill, cur);
  };
  postings.forEach((p) => {
    p.required_skills?.forEach((s) => add(s, "required"));
    p.preferred_skills?.forEach((s) => add(s, "preferred"));
    p.mentioned_skills?.forEach((s) => add(s, "mentioned"));
  });
  if (jobName) {
    data.graph_edges
      .filter((edge) => edge.type === "job_to_skill" && edge.source === jobName && edge.target)
      .forEach((edge) => add(edge.target!, "mentioned"));
  } else {
    data.graph_nodes.filter((n) => n.type === "skill" && n.id).forEach((n) => {
      const cur = counts.get(n.id!) ?? { total: 0, required: 0, preferred: 0, mentioned: 0 };
      cur.total = Math.max(cur.total, n.frequency ?? 0);
      counts.set(n.id!, cur);
    });
  }
  return Array.from(counts.entries()).sort((a, b) => b[1].total - a[1].total).slice(0, limit).map(([name, stat]) => ({
    id: `skill:${name}`,
    label: name,
    kind: "skill",
    frequency: stat.total,
    category: data.graph_nodes.find((n) => n.id === name)?.category,
    source: collectSkillDetail(data, name, stat)
  }));
};

export const collectJobDetail = (data: MarketData, name: string) => {
  const postings = data.raw_job_postings.filter((p) => p.job_name === name || p.job_category?.includes(name));
  return {
    name,
    postings,
    required: uniq(postings.flatMap((p) => p.required_skills ?? [])).slice(0, 12),
    preferred: uniq(postings.flatMap((p) => p.preferred_skills ?? [])).slice(0, 12),
    mentioned: uniq(postings.flatMap((p) => p.mentioned_skills ?? [])).slice(0, 12),
    related: data.job_relation_graph.filter((e) => e.source === name || e.target === name)
  };
};

export const collectSkillDetail = (data: MarketData, name: string, stat?: { total: number; required: number; preferred: number; mentioned: number }) => {
  const postings = data.raw_job_postings.filter((p) =>
    [...(p.required_skills ?? []), ...(p.preferred_skills ?? []), ...(p.mentioned_skills ?? [])].includes(name)
  );
  return {
    name,
    postings,
    stat: stat ?? {
      total: postings.length,
      required: postings.filter((p) => p.required_skills?.includes(name)).length,
      preferred: postings.filter((p) => p.preferred_skills?.includes(name)).length,
      mentioned: postings.filter((p) => p.mentioned_skills?.includes(name)).length
    },
    relatedJobs: uniq(postings.map((p) => p.job_name ?? "").filter(Boolean)),
    nextSkills: uniq(data.skill_co_occurrence.filter((e) => e.source === name || e.target === name || e.skills?.includes(name)).flatMap((e) => e.skills ?? [e.source!, e.target!]).filter((s) => s !== name)).slice(0, 8)
  };
};

export const demoRoadmaps: MarketData["learning_roadmaps"] = [
  { title: "처음 시작하는 학생 추천 경로", steps: ["Linux", "Network", "AWS", "Docker", "Kubernetes", "CI/CD"] },
  { title: "DevOps 목표 경로", steps: ["Linux", "Git", "Docker", "Kubernetes", "CI/CD", "Terraform", "Monitoring"] },
  { title: "Cloud Infra 목표 경로", steps: ["Network", "Linux", "AWS", "IAM", "VPC", "EKS", "Terraform"] },
  { title: "MLOps 목표 경로", steps: ["Python", "Docker", "Kubernetes", "ML Pipeline", "Model Serving", "Monitoring"] },
  { title: "Cloud Security 목표 경로", steps: ["Network", "Linux", "IAM", "Kubernetes Security", "Terraform", "Incident Response"] }
];

export const demoProjects: MarketData["recommended_projects"] = [
  { project_name: "Kubernetes 기반 무중단 배포 데모", target_jobs: ["DevOps Engineer", "SRE Engineer"], skills: ["Docker", "Kubernetes", "CI/CD"], difficulty: "중", core_features: ["컨테이너 이미지 빌드", "롤링 업데이트", "헬스체크"], interview_points: ["장애 없이 배포하는 흐름을 설명"] },
  { project_name: "Terraform으로 AWS 인프라 자동 생성", target_jobs: ["Cloud Infra / System Engineer", "Platform / Kubernetes Engineer"], skills: ["AWS", "Terraform", "VPC", "EKS"], difficulty: "중상", core_features: ["VPC", "보안 그룹", "EKS 클러스터"], interview_points: ["IaC와 재현 가능한 인프라를 설명"] },
  { project_name: "Prometheus/Grafana 관측성 대시보드", target_jobs: ["SRE Engineer", "Cloud Observability Engineer"], skills: ["Prometheus", "Grafana", "Monitoring"], difficulty: "중", core_features: ["메트릭 수집", "알림", "SLO 보드"], interview_points: ["장애 탐지와 대응 기준을 설명"] }
];
