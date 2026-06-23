import { ExternalLink, GraduationCap, Network } from "lucide-react";
import type { ReactNode } from "react";
import { DetailSelection, MarketData } from "../types";
import { collectJobDetail, collectSkillDetail, demoProjects } from "../data/transform";
import SkillBadge from "./SkillBadge";
import ProjectCard from "./ProjectCard";
import CertificateCard from "./CertificateCard";
import EmptyState from "./EmptyState";
import { compact, koreanSiteName, uniq } from "../utils/textUtils";

export default function DetailPanel({ data, selected }: { data: MarketData; selected?: DetailSelection }) {
  if (!selected) return <aside className="min-h-0 overflow-y-auto border-l border-white/10 bg-slate-950/70"><EmptyState /></aside>;
  const body = selected.kind === "job" ? <JobDetail data={data} label={selected.label} /> : selected.kind === "skill" ? <SkillDetail data={data} label={selected.label} /> : selected.kind === "project" ? <ProjectCard project={selected.source as any} /> : selected.kind === "certificate" ? <CertificateCard certificate={selected.source as any} /> : <EmptyState />;
  return (
    <aside className="min-h-0 overflow-y-auto border-l border-white/10 bg-slate-950/75 p-4">
      {body}
      {data.summary.limitations?.length ? (
        <section className="mt-4 rounded-lg border border-amber-300/20 bg-amber-400/8 p-3">
          <h4 className="mb-2 text-sm font-black text-amber-100">분석 한계</h4>
          <ul className="space-y-1 text-xs text-amber-50/80">{data.summary.limitations.slice(0, 2).map((l) => <li key={l}>• {compact(l, "표본 기반 분석입니다.")}</li>)}</ul>
        </section>
      ) : null}
    </aside>
  );
}

function JobDetail({ data, label }: { data: MarketData; label: string }) {
  const detail = collectJobDetail(data, label);
  const postings = detail.postings.slice(0, 5);
  const projects = demoProjects.filter((p) => p.target_jobs?.includes(label)).slice(0, 2);
  const difficulty = detail.required.length > 7 ? "높음" : detail.required.length > 3 ? "중간" : "입문 가능";
  return (
    <div className="space-y-4">
      <Title icon={<Network />} label={label} kicker="직무 노드" />
      <InfoGrid items={[["등장 빈도", `${detail.postings.length || "표본"}회`], ["요구 경력", compact(postings[0]?.experience_required, "공고별 상이")], ["신입 가능성", detail.postings.some((p) => p.newbie_or_junior_flag !== "experienced_or_unknown") ? "확인됨" : "공고별 확인 필요"], ["진입 난이도", difficulty]]} />
      <Section title="이 직무는 어떤 일을 하나요?" tag="공고 기반 해석">
        <p>분석 표본 내 공고에서 {detail.required.slice(0, 4).join(", ") || "클라우드 인프라"}를 활용해 서비스 인프라를 운영, 자동화, 개선하는 역할로 나타납니다.</p>
      </Section>
      <Section title="주요 업무">
        <ul className="space-y-1">{uniq(postings.flatMap((p) => p.main_tasks ?? [])).slice(0, 5).map((t) => <li key={t}>• {compact(t, "클라우드 인프라 운영 및 자동화")}</li>)}</ul>
      </Section>
      <SkillList title="필수 기술" skills={detail.required} kind="required" />
      <SkillList title="우대 기술" skills={detail.preferred} kind="preferred" />
      <SkillList title="단순 언급 기술" skills={detail.mentioned} kind="mentioned" />
      <Section title="추천 프로젝트" tag="공고 기반 추천">
        <div className="space-y-2">{(projects.length ? projects : demoProjects.slice(0, 2)).map((p) => <ProjectCard key={p.project_name} project={p} />)}</div>
      </Section>
      <Evidence postings={postings} />
    </div>
  );
}

function SkillDetail({ data, label }: { data: MarketData; label: string }) {
  const detail = collectSkillDetail(data, label);
  return (
    <div className="space-y-4">
      <Title icon={<GraduationCap />} label={label} kicker="기술 노드" />
      <InfoGrid items={[["전체 등장", `${detail.stat.total}회`], ["필수", `${detail.stat.required}회`], ["우대", `${detail.stat.preferred}회`], ["언급", `${detail.stat.mentioned}회`]]} />
      <Section title="신입/주니어에게 필요한 정도" tag="추천 해석">
        <p>{detail.stat.required > 3 ? "여러 공고에서 필수로 등장해 우선 학습 가치가 큽니다." : "관련 직무를 탐색하며 프로젝트 안에서 익히기 좋습니다."}</p>
      </Section>
      <SkillList title="관련 직무" skills={detail.relatedJobs} />
      <SkillList title="다음으로 연결되는 기술" skills={detail.nextSkills} />
      <Section title="관련 프로젝트">
        <div className="space-y-2">{demoProjects.filter((p) => p.skills?.includes(label) || JSON.stringify(p).includes(label)).slice(0, 2).map((p) => <ProjectCard key={p.project_name} project={p} />)}</div>
      </Section>
      <Evidence postings={detail.postings.slice(0, 5)} />
    </div>
  );
}

function Evidence({ postings }: { postings: any[] }) {
  return (
    <Section title="근거 URL 목록">
      <div className="space-y-2">{postings.map((p, idx) => <a key={`${p.url}-${idx}`} href={p.url} target="_blank" rel="noreferrer" className="block rounded-md border border-white/10 bg-white/5 p-2 text-xs text-cyan-100 hover:bg-white/10"><ExternalLink className="mr-1 inline" size={13} />공고 보기 · {koreanSiteName(p.site)} · {compact(p.title, p.job_name)}</a>)}</div>
    </Section>
  );
}

function Title({ icon, label, kicker }: { icon: ReactNode; label: string; kicker: string }) {
  return <div><div className="mb-2 flex items-center gap-2 text-cyan-100">{icon}<span className="text-xs font-black uppercase">{kicker}</span></div><h2 className="text-2xl font-black text-white">{label}</h2></div>;
}

function InfoGrid({ items }: { items: Array<[string, string]> }) {
  return <div className="grid grid-cols-2 gap-2">{items.map(([k, v]) => <div key={k} className="rounded-lg border border-white/10 bg-white/5 p-3"><div className="text-xs text-slate-400">{k}</div><div className="mt-1 font-black text-white">{v}</div></div>)}</div>;
}

function Section({ title, children, tag }: { title: string; children: ReactNode; tag?: string }) {
  return <section className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-300"><div className="mb-2 flex items-center justify-between"><h3 className="font-black text-white">{title}</h3>{tag && <span className="rounded-full border border-cyan-300/20 px-2 py-0.5 text-[10px] font-bold text-cyan-100">{tag}</span>}</div>{children}</section>;
}

function SkillList({ title, skills, kind }: { title: string; skills?: string[]; kind?: "required" | "preferred" | "mentioned" }) {
  return <Section title={title}><div className="flex flex-wrap gap-1.5">{skills?.length ? skills.map((s) => <SkillBadge key={s} label={s} kind={kind} />) : <span className="text-xs text-slate-500">표본 내 명시 없음</span>}</div></Section>;
}
