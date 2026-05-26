import { MousePointerClick } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="grid h-full place-items-center p-8 text-center">
      <div>
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full border border-cyan-300/30 bg-cyan-400/10 text-cyan-100">
          <MousePointerClick />
        </div>
        <h3 className="text-xl font-black text-white">관심 있는 직무나 기술을 클릭해보세요</h3>
        <p className="mt-2 text-sm text-slate-400">직무 노드를 더블클릭하면 관련 기술, 프로젝트, 자격증 노드가 펼쳐집니다.</p>
      </div>
    </div>
  );
}
