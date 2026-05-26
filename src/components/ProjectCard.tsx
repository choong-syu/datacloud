import { Rocket } from "lucide-react";
import { RecommendedProject } from "../types";
import SkillBadge from "./SkillBadge";

export default function ProjectCard({ project }: { project: RecommendedProject }) {
  return (
    <article className="rounded-lg border border-emerald-300/20 bg-emerald-400/8 p-3">
      <div className="mb-2 flex items-center gap-2 text-emerald-100">
        <Rocket size={17} />
        <h4 className="font-black">{project.project_name ?? project.title}</h4>
      </div>
      <div className="mb-2 flex flex-wrap gap-1.5">{project.skills?.slice(0, 6).map((s) => <SkillBadge key={s} label={s} />)}</div>
      <p className="text-xs text-slate-300">난이도: {project.difficulty ?? "중"}</p>
      <ul className="mt-2 space-y-1 text-xs text-slate-300">
        {(project.core_features ?? project.interview_points ?? []).slice(0, 3).map((f) => <li key={f}>• {f}</li>)}
      </ul>
    </article>
  );
}
