import { Database, Globe2 } from "lucide-react";
import type { ReactNode } from "react";
import { Summary } from "../types";

export default function Header({ summary, recovered }: { summary: Summary; recovered?: boolean }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-slate-950/80 px-6 py-4 backdrop-blur">
      <div>
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-black text-white">채용공고 기반 직무 탐색</h1>
            <p className="text-sm font-medium text-cyan-200">SU-tudy 성과공유회</p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <Badge icon={<Database size={16} />} label={`분석 공고 ${summary.total_job_postings_analyzed ?? 0}개`} />
        <Badge icon={<Globe2 size={16} />} label="사람인 / 잡코리아 / 인크루트" />
        <Badge label={summary.analysis_date ? `기준일 ${summary.analysis_date}` : "실제 공개 채용공고 기반"} />
        {recovered && <Badge label="복구 모드" warn />}
      </div>
    </header>
  );
}

function Badge({ label, icon, warn }: { label: string; icon?: ReactNode; warn?: boolean }) {
  return <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 ${warn ? "border-amber-300/40 bg-amber-400/10 text-amber-100" : "border-white/10 bg-white/8 text-slate-100"}`}>{icon}{label}</span>;
}
