import { motion } from "framer-motion";
import { Cloud } from "lucide-react";

export default function LoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-950 text-cyan-50">
      <div className="text-center">
        <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }} transition={{ repeat: Infinity, duration: 1.6 }} className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-full border border-cyan-300/40 bg-cyan-400/10 shadow-glow">
          <Cloud size={44} />
        </motion.div>
        <p className="text-xl font-bold">채용공고 그래프를 불러오는 중</p>
        <p className="mt-2 text-sm text-slate-400">직무, 기술, 프로젝트 노드를 연결하고 있습니다.</p>
      </div>
    </div>
  );
}
