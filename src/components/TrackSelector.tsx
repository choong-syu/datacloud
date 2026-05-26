import { Cloud, Database } from "lucide-react";
import { MarketData } from "../types";

export type TrackKey = "cloud" | "data";

const tracks = [
  {
    key: "cloud" as const,
    label: "CLOUD",
    title: "Cloud Track",
    description: "Cloud, DevOps, SRE, Platform, Security",
    icon: Cloud
  },
  {
    key: "data" as const,
    label: "DATA",
    title: "Data Track",
    description: "Data Engineer, Analytics, AI, MLOps",
    icon: Database
  }
];

export default function TrackSelector({
  active,
  datasets,
  onChange
}: {
  active: TrackKey;
  datasets: Record<TrackKey, MarketData>;
  onChange: (track: TrackKey) => void;
}) {
  return (
    <aside className="flex min-h-0 flex-col gap-4 border-r border-white/10 bg-slate-950/75 p-4">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Track Root</p>
        <h2 className="mt-2 text-xl font-black text-white">트랙 선택</h2>
        <p className="mt-2 text-sm leading-5 text-slate-400">루트는 DATA와 CLOUD 두 개만 허용됩니다. 선택한 루트만 중앙 트리에 표시됩니다.</p>
      </div>

      <div className="space-y-3">
        {tracks.map((track) => {
          const Icon = track.icon;
          const data = datasets[track.key];
          const selected = active === track.key;
          return (
            <button
              key={track.key}
              onClick={() => onChange(track.key)}
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
                  <div className="text-lg font-black">{track.label}</div>
                  <div className="text-xs font-bold text-slate-400">{track.title}</div>
                </div>
              </div>
              <p className="mt-3 text-sm leading-5 text-slate-300">{track.description}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <span className="rounded-md bg-white/7 px-2 py-1">공고 {data.summary.total_job_postings_analyzed ?? data.raw_job_postings.length}개</span>
                <span className="rounded-md bg-white/7 px-2 py-1">직무 {data.graph_nodes.filter((node) => node.type === "job").length || "복구"}</span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
