import { motion } from "framer-motion";
import { LearningRoadmap } from "../types";
import { demoRoadmaps } from "../data/transform";

export default function RoadmapTimeline({ roadmaps = [] }: { roadmaps?: LearningRoadmap[] }) {
  const list = roadmaps.length ? roadmaps : demoRoadmaps;
  return (
    <section className="border-t border-white/10 bg-slate-950/75 px-5 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-black text-white">학생용 추천 경로</h2>
        <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-100">공고 기반 추천</span>
      </div>
      <div className="grid gap-3 lg:grid-cols-5">
        {list.slice(0, 5).map((r, idx) => {
          const steps: string[] = r.steps ?? r.roadmap ?? r.phases?.flatMap((p) => p.skills ?? []) ?? [];
          return (
            <motion.div key={r.title ?? r.name ?? idx} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="rounded-lg border border-white/10 bg-white/5 p-3">
              <h3 className="mb-2 text-sm font-black text-cyan-50">{r.title ?? r.name ?? r.target_job}</h3>
              <div className="flex flex-wrap gap-1.5">
                {steps.slice(0, 8).map((step, i) => <span key={`${step}-${i}`} className="rounded-full bg-white/8 px-2 py-1 text-[11px] font-bold text-slate-200">{step}</span>)}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
