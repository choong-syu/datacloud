import { Medal } from "lucide-react";
import { RecommendedCertificate } from "../types";

export default function CertificateCard({ certificate }: { certificate: RecommendedCertificate }) {
  return (
    <article className="rounded-lg border border-lime-300/20 bg-lime-400/8 p-3">
      <div className="mb-2 flex items-center gap-2 text-lime-100">
        <Medal size={17} />
        <h4 className="font-black">{certificate.certificate_name ?? certificate.name}</h4>
      </div>
      <p className="text-xs text-slate-300">관련 직무: {(certificate.related_jobs ?? []).join(", ") || "Cloud / DevOps"}</p>
      <p className="mt-1 text-xs text-slate-300">취득 시점: {certificate.recommended_timing ?? "기초 프로젝트 이후"}</p>
    </article>
  );
}
