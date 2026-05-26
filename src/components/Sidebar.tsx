import { Award, Briefcase, Database, GraduationCap, Search, Shield, Sparkles } from "lucide-react";
import { MarketData, FilterState, DetailSelection } from "../types";
import StatsCards from "./StatsCards";
import { buildJobs, buildSkills, demoProjects } from "../data/transform";

const quick = [
  { label: "Cloud", icon: Sparkles },
  { label: "DevOps", icon: Briefcase },
  { label: "Data / MLOps", icon: Database },
  { label: "Security", icon: Shield },
  { label: "Beginner Friendly", icon: GraduationCap },
  { label: "Certificate", icon: Award }
];

export default function Sidebar({
  data,
  query,
  setQuery,
  filters,
  setFilters,
  onSelect
}: {
  data: MarketData;
  query: string;
  setQuery: (v: string) => void;
  filters: FilterState;
  setFilters: (v: FilterState) => void;
  onSelect: (s: DetailSelection) => void;
}) {
  const results = query.trim()
    ? [
        ...buildJobs(data).filter((j) => j.label.toLowerCase().includes(query.toLowerCase())),
        ...buildSkills(data, undefined, 12).filter((s) => s.label.toLowerCase().includes(query.toLowerCase())),
        ...demoProjects.filter((p) => JSON.stringify(p).toLowerCase().includes(query.toLowerCase())).map((p) => ({ id: `project:${p.project_name}`, label: p.project_name!, kind: "project" as const, source: p }))
      ].slice(0, 8)
    : [];

  return (
    <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto border-r border-white/10 bg-slate-950/70 p-4">
      <div className="relative">
        <Search className="absolute left-3 top-3 text-slate-400" size={18} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="AWS, Kubernetes, DevOps..." className="w-full rounded-lg border border-white/10 bg-white/8 py-3 pl-10 pr-3 text-sm text-white outline-none ring-cyan-300/30 transition focus:ring-4" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {quick.map(({ label, icon: Icon }) => (
          <button key={label} onClick={() => setQuery(label.replace(" / ", " "))} className="rounded-lg border border-white/10 bg-white/5 p-3 text-left text-sm font-bold text-slate-100 transition hover:border-cyan-300/40 hover:bg-cyan-400/10">
            <Icon size={18} className="mb-2 text-cyan-200" />
            {label}
          </button>
        ))}
      </div>

      {results.length > 0 && (
        <section className="rounded-lg border border-cyan-300/20 bg-cyan-400/5 p-3">
          <h3 className="mb-2 text-sm font-black text-cyan-100">검색 결과</h3>
          <div className="space-y-2">
            {results.map((r) => (
              <button key={r.id} onClick={() => onSelect({ id: r.id, kind: r.kind, label: r.label, source: r.source })} className="w-full rounded-md bg-white/7 px-3 py-2 text-left text-xs font-bold text-slate-100 hover:bg-white/12">
                {r.label}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-lg border border-white/10 bg-white/5 p-3">
        <h3 className="mb-3 text-sm font-black text-white">필터 옵션</h3>
        <Check label="필수 기술만 보기" checked={filters.requiredOnly} onChange={(v) => setFilters({ ...filters, requiredOnly: v })} />
        <Check label="우대 기술 포함" checked={filters.includePreferred} onChange={(v) => setFilters({ ...filters, includePreferred: v })} />
        <Check label="신입/주니어 가능 직무" checked={filters.beginnerOnly} onChange={(v) => setFilters({ ...filters, beginnerOnly: v })} />
        <Check label="프로젝트 추천 보기" checked={filters.showProjects} onChange={(v) => setFilters({ ...filters, showProjects: v })} />
        <Check label="자격증 보기" checked={filters.showCertificates} onChange={(v) => setFilters({ ...filters, showCertificates: v })} />
      </section>

      <section className="rounded-lg border border-white/10 bg-white/5 p-3">
        <h3 className="mb-3 text-sm font-black text-white">공고 사이트</h3>
        {["사람인", "잡코리아", "인크루트"].map((site) => (
          <Check key={site} label={site} checked={filters.sites.includes(site)} onChange={(v) => setFilters({ ...filters, sites: v ? [...filters.sites, site] : filters.sites.filter((s) => s !== site) })} />
        ))}
      </section>

      <StatsCards data={data} />
    </aside>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="mb-2 flex cursor-pointer items-center justify-between gap-3 text-sm text-slate-200">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-cyan-300" />
    </label>
  );
}
