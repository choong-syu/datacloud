import { categoryTone } from "../utils/skillCategory";

export default function SkillBadge({ label, kind = "default" }: { label: string; kind?: "required" | "preferred" | "mentioned" | "default" }) {
  const tone = kind === "required" ? "cyan" : kind === "preferred" ? "violet" : categoryTone(label);
  const cls: Record<string, string> = {
    cyan: "border-cyan-300/40 bg-cyan-400/10 text-cyan-100",
    violet: "border-violet-300/40 bg-violet-400/10 text-violet-100",
    rose: "border-rose-300/40 bg-rose-400/10 text-rose-100",
    emerald: "border-emerald-300/40 bg-emerald-400/10 text-emerald-100",
    amber: "border-amber-300/40 bg-amber-400/10 text-amber-100",
    lime: "border-lime-300/40 bg-lime-400/10 text-lime-100"
  };
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${cls[tone] ?? cls.cyan}`}>{label}</span>;
}
