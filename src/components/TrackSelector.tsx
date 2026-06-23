import { FormEvent, useState } from "react";
import { CheckCircle2, CircleDashed, Cloud, Database, Loader2, Search, Sparkles, Trash2 } from "lucide-react";
import { KeywordAnalysisJob, MarketData } from "../types";

export type TrackKey = "cloud" | "data";

const presetKeywords = [
  {
    key: "cloud" as const,
    label: "CLOUD",
    title: "클라우드",
    description: "Cloud, DevOps, SRE, Platform, Security",
    icon: Cloud
  },
  {
    key: "data" as const,
    label: "DATA",
    title: "데이터",
    description: "Data Engineer, Analytics, AI, MLOps",
    icon: Database
  }
];

export default function TrackSelector({
  active,
  activeCustomKey,
  analysisJobs,
  customDatasets,
  datasets,
  onAnalyze,
  onChange,
  onCustomDelete,
  onCustomSelect
}: {
  active?: TrackKey;
  activeCustomKey?: string;
  analysisJobs: Record<string, KeywordAnalysisJob>;
  customDatasets: Record<string, MarketData>;
  datasets: Record<TrackKey, MarketData>;
  onAnalyze: (keyword: string) => void;
  onChange: (track: TrackKey) => void;
  onCustomDelete: (key: string) => void;
  onCustomSelect: (key: string) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const customEntries = Object.entries(analysisJobs).sort((a, b) => b[1].id.localeCompare(a[1].id));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextKeyword = keyword.trim();
    if (!nextKeyword) return;
    onAnalyze(nextKeyword);
    setKeyword("");
  };

  return (
    <aside className="flex min-h-0 flex-col gap-4 border-r border-white/10 bg-slate-950/75 p-4">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Interest Keyword</p>
        <h2 className="mt-2 text-xl font-black text-white">관심 키워드</h2>
        <p className="mt-2 text-sm leading-5 text-slate-400">분석하고 싶은 분야를 검색해 키워드 목록에 추가할 수 있습니다.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                event.preventDefault();
                const nextKeyword = keyword.trim();
                if (!nextKeyword) return;
                onAnalyze(nextKeyword);
                setKeyword("");
              }
            }}
            placeholder="예: 화학"
            className="h-11 w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:bg-white/8"
          />
        </label>
        <button type="submit" className="grid h-11 w-11 place-items-center rounded-lg bg-cyan-300 text-slate-950 transition hover:bg-cyan-200" aria-label="관심 키워드 추가">
          <Sparkles size={18} />
        </button>
      </form>

      <div className="min-h-0 space-y-3 overflow-y-auto pr-1">
        {customEntries.length ? (
          <div className="space-y-2">
            <p className="text-xs font-black text-slate-400">새 관심 키워드</p>
            {customEntries.map(([key, job]) => (
              <AnalysisCard
                active={activeCustomKey === key}
                dataReady={Boolean(customDatasets[key])}
                job={job}
                key={key}
                onDelete={() => onCustomDelete(key)}
                onSelect={() => onCustomSelect(key)}
              />
            ))}
          </div>
        ) : null}

        <div className="space-y-2">
          <p className="text-xs font-black text-slate-400">기본 관심 키워드</p>
          {presetKeywords.map((preset) => {
            const Icon = preset.icon;
            const data = datasets[preset.key];
            const selected = active === preset.key;
            return (
              <button
                key={preset.key}
                onClick={() => onChange(preset.key)}
                className={`w-full rounded-lg border p-4 text-left transition ${
                  selected
                    ? "border-cyan-300/70 bg-cyan-400/15 text-white shadow-glow"
                    : "border-white/10 bg-white/5 text-slate-200 hover:border-cyan-300/40 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`grid h-11 w-11 place-items-center rounded-lg border ${selected ? "border-cyan-200/60 bg-cyan-300/15 text-cyan-100" : "border-white/10 bg-slate-900 text-slate-300"}`}>
                    <Icon size={22} />
                  </div>
                  <div>
                    <div className="text-lg font-black">{preset.label}</div>
                    <div className="text-xs font-bold text-slate-400">{preset.title}</div>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-5 text-slate-300">{preset.description}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <span className="rounded-md bg-white/7 px-2 py-1">공고 {data.summary.total_job_postings_analyzed ?? data.raw_job_postings.length}개</span>
                  <span className="rounded-md bg-white/7 px-2 py-1">분석 가능</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function AnalysisCard({
  active,
  dataReady,
  job,
  onDelete,
  onSelect
}: {
  active: boolean;
  dataReady: boolean;
  job: KeywordAnalysisJob;
  onDelete: () => void;
  onSelect: () => void;
}) {
  const running = job.status === "running";
  const completed = job.status === "completed";
  const Icon = running ? Loader2 : completed ? CheckCircle2 : CircleDashed;

  return (
    <article className={`rounded-lg border p-4 text-left text-white transition ${active ? "border-emerald-300/70 bg-emerald-400/15 shadow-glow" : "border-emerald-300/30 bg-emerald-400/8"}`}>
      <div className="flex items-start gap-2">
        <button disabled={!dataReady} onClick={onSelect} className="block min-w-0 flex-1 text-left disabled:cursor-default">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg border border-emerald-200/50 bg-emerald-300/15 text-emerald-100">
              <Icon className={running ? "animate-spin" : ""} size={20} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-lg font-black">{job.keyword}</div>
            <div className="text-xs font-bold text-emerald-100">{completed ? "GPT 분석 완료" : running ? "GPT 분석 진행 중" : "확인 필요"}</div>
            </div>
          </div>
          <p className="mt-3 text-sm leading-5 text-slate-300">{job.message ?? "분석 작업을 준비하고 있습니다."}</p>
        </button>
        <button
          aria-label={`${job.keyword} 관심 키워드 삭제`}
          onClick={onDelete}
          title="삭제"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/10 bg-white/5 text-slate-300 transition hover:border-rose-300/50 hover:bg-rose-400/10 hover:text-rose-100"
          type="button"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <ol className="mt-3 space-y-1.5">
        {job.stages.map((stage) => (
          <li key={stage.id} className="flex items-start gap-2 text-xs text-slate-300">
            {stage.status === "done" ? (
              <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-200" size={14} />
            ) : stage.status === "running" ? (
              <Loader2 className="mt-0.5 shrink-0 animate-spin text-cyan-200" size={14} />
            ) : (
              <CircleDashed className="mt-0.5 shrink-0 text-slate-500" size={14} />
            )}
            <span>
              <b className={stage.status === "running" ? "text-cyan-100" : "text-slate-200"}>{stage.label}</b>
              <span className="block text-slate-500">{stage.description}</span>
            </span>
          </li>
        ))}
      </ol>

      {completed ? (
        <button onClick={onSelect} className="mt-3 w-full rounded-lg bg-emerald-300 px-3 py-2 text-xs font-black text-slate-950 transition hover:bg-emerald-200">
          분석 결과 보기
        </button>
      ) : null}
    </article>
  );
}
