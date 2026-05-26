export type NodeKind = "root" | "job" | "skill" | "combo" | "project" | "certificate";

export interface Summary {
  analysis_date?: string;
  total_job_postings_analyzed?: number;
  analyzed_sites?: string[];
  site_breakdown?: Array<{ site?: string; count?: number }>;
  limitations?: string[];
}

export interface JobPosting {
  site?: string;
  company?: string;
  title?: string;
  url?: string;
  job_name?: string;
  job_category?: string;
  main_tasks?: string[];
  experience_required?: string;
  required_skills?: string[];
  preferred_skills?: string[];
  mentioned_skills?: string[];
  certificates?: string[];
  newbie_or_junior_flag?: string;
}

export interface DiscoveredJob {
  job_name?: string;
  frequency?: number;
  representative_postings?: JobPosting[];
  required_skills?: string[];
  preferred_skills?: string[];
  mentioned_skills?: string[];
  related_jobs?: string[];
  newbie_or_junior_flag?: string;
  description?: string;
}

export interface SkillItem {
  skill?: string;
  name?: string;
  id?: string;
  category?: string;
  frequency?: number;
  total_count?: number;
  required_count?: number;
  preferred_count?: number;
  mentioned_count?: number;
  related_jobs?: string[];
}

export interface GraphEdgeRaw {
  type?: string;
  source?: string;
  target?: string;
  weight?: number | string;
  shared_skills?: string[];
  skills?: string[];
}

export interface RecommendedProject {
  project_name?: string;
  title?: string;
  target_jobs?: string[];
  target_job?: string;
  skills?: string[];
  difficulty?: string;
  core_features?: string[];
  readme_highlights?: string[];
  interview_points?: string[];
  expansion_ideas?: string[];
}

export interface RecommendedCertificate {
  certificate_name?: string;
  name?: string;
  related_jobs?: string[];
  mention_count?: number;
  required_or_preferred?: string;
  recommendation_reason?: string;
  recommended_timing?: string;
}

export interface LearningRoadmap {
  title?: string;
  name?: string;
  target_job?: string;
  steps?: string[];
  roadmap?: string[];
  phases?: Array<{ title?: string; skills?: string[]; description?: string }>;
}

export interface MarketData {
  summary: Summary;
  raw_job_postings: JobPosting[];
  discovered_jobs: DiscoveredJob[];
  skill_taxonomy: SkillItem[];
  skill_co_occurrence: GraphEdgeRaw[];
  job_relation_graph: GraphEdgeRaw[];
  learning_roadmaps: LearningRoadmap[];
  recommended_projects: RecommendedProject[];
  recommended_certificates: RecommendedCertificate[];
  graph_nodes: Array<{ type?: string; id?: string; frequency?: number; category?: string }>;
  graph_edges: GraphEdgeRaw[];
  recovered?: boolean;
}

export interface GraphNodeData {
  id: string;
  label: string;
  kind: NodeKind;
  frequency?: number;
  category?: string;
  source?: unknown;
  highlight?: boolean;
  dimmed?: boolean;
  beginner?: boolean;
}

export interface DetailSelection {
  id: string;
  kind: NodeKind;
  label: string;
  source?: unknown;
}

export interface FilterState {
  requiredOnly: boolean;
  includePreferred: boolean;
  beginnerOnly: boolean;
  showProjects: boolean;
  showCertificates: boolean;
  sites: string[];
}
