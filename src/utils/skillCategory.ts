export const categoryTone = (label = "") => {
  const text = label.toLowerCase();
  if (text.includes("security") || text.includes("보안")) return "rose";
  if (text.includes("data") || text.includes("ml") || text.includes("ai")) return "emerald";
  if (text.includes("devops") || text.includes("sre")) return "violet";
  if (text.includes("infra") || text.includes("system") || text.includes("linux")) return "amber";
  if (text.includes("certificate") || text.includes("cka") || text.includes("aws certification")) return "lime";
  return "cyan";
};

export const nodeClasses = (tone: string) => {
  const map: Record<string, string> = {
    rose: "border-rose-300/70 bg-rose-500/15 text-rose-50 shadow-rose-500/30",
    emerald: "border-emerald-300/70 bg-emerald-500/15 text-emerald-50 shadow-emerald-500/30",
    violet: "border-violet-300/70 bg-violet-500/15 text-violet-50 shadow-violet-500/30",
    amber: "border-amber-300/70 bg-amber-500/15 text-amber-50 shadow-amber-500/30",
    lime: "border-lime-300/70 bg-lime-500/15 text-lime-50 shadow-lime-500/30",
    cyan: "border-cyan-300/70 bg-cyan-500/15 text-cyan-50 shadow-cyan-500/30"
  };
  return map[tone] ?? map.cyan;
};
