export const compact = (value?: string, fallback = "정보 없음") => {
  if (!value || value.includes("�") || /^[?\s]+$/.test(value)) return fallback;
  return value.trim();
};

export const uniq = <T,>(items: T[]) => Array.from(new Set(items.filter(Boolean)));

export const includesTerm = (value: unknown, term: string) =>
  JSON.stringify(value ?? "").toLowerCase().includes(term.trim().toLowerCase());

export const koreanSiteName = (site?: string) => {
  const value = site ?? "";
  if (value.includes("saramin") || value.includes("щ")) return "사람인";
  if (value.includes("jobkorea") || value.includes("≪")) return "잡코리아";
  if (value.includes("incruit") || value.includes("명")) return "인크루트";
  return compact(value, "기타");
};

export const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
