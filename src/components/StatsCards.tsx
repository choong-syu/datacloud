import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip } from "recharts";
import { MarketData } from "../types";
import { buildJobs, buildSkills } from "../data/transform";

export default function StatsCards({ data }: { data: MarketData }) {
  const jobs = buildJobs(data);
  const skills = buildSkills(data, undefined, 8);
  const junior = data.raw_job_postings.filter((p) => p.newbie_or_junior_flag && p.newbie_or_junior_flag !== "experienced_or_unknown").length;
  return (
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Stat label="분석 공고" value={data.summary.total_job_postings_analyzed ?? data.raw_job_postings.length} />
      <Stat label="발견 직무" value={jobs.length} />
      <Stat label="발견 기술" value={skills.length} />
      <Stat label="신입/주니어" value={junior} />
      <div className="col-span-2 rounded-lg border border-white/10 bg-white/5 p-3 xl:col-span-4">
        <div className="mb-2 text-xs font-bold text-slate-300">분석 표본 내 주요 기술 TOP</div>
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={skills.slice(0, 5).map((s) => ({ name: s.label, count: s.frequency ?? 0 }))}>
              <XAxis dataKey="name" tick={{ fill: "#cbd5e1", fontSize: 10 }} interval={0} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,.15)", color: "#fff" }} />
              <Bar dataKey="count" fill="#22d3ee" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="text-xs font-semibold text-slate-400">{label}</div>
    </div>
  );
}
