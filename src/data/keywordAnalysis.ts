import { AnalysisStage, KeywordAnalysisJob, MarketData } from "../types";
import { buildMarketAnalysisPrompt, createAnalysisStages } from "./marketAnalysisPrompt";
import { normalizeData } from "./transform";

type ProgressCallback = (job: KeywordAnalysisJob) => void;

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const updateStages = (stages: AnalysisStage[], activeId: string, doneIds: string[] = []) =>
  stages.map((stage) => ({
    ...stage,
    status: doneIds.includes(stage.id) ? "done" as const : stage.id === activeId ? "running" as const : "waiting" as const
  }));

const getApiBaseUrl = () => {
  const configuredApiBaseUrl = (import.meta as any).env?.VITE_ANALYSIS_API_URL;
  if (configuredApiBaseUrl) return configuredApiBaseUrl;

  return window.location.port === "5173" ? `${window.location.protocol}//${window.location.hostname}:8787` : "";
};

export const createKeywordAnalysisJob = (keyword: string): KeywordAnalysisJob => ({
  id: `custom:${keyword}:${Date.now()}`,
  keyword,
  status: "running",
  stages: createAnalysisStages(),
  activeStageId: "prepare",
  message: "분석 작업을 준비하고 있습니다.",
  promptPreview: buildMarketAnalysisPrompt(keyword)
});

const requestKeywordAnalysis = async (keyword: string): Promise<MarketData> => {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword })
  });

  const responseText = await response.text();
  let payload: { data?: MarketData; error?: string } = {};
  if (responseText.trim()) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      throw new Error(`API가 JSON이 아닌 응답을 반환했습니다. status=${response.status}`);
    }
  }

  if (!response.ok) throw new Error(payload?.error ?? `GPT 분석 API 호출에 실패했습니다. status=${response.status}`);
  if (!payload.data) throw new Error("GPT 분석 API 응답에 data가 없습니다.");
  return normalizeData(payload.data);
};

export const runKeywordAnalysis = async (keyword: string, onProgress: ProgressCallback): Promise<MarketData> => {
  const baseJob = createKeywordAnalysisJob(keyword);
  let doneIds: string[] = [];

  onProgress({
    ...baseJob,
    stages: updateStages(baseJob.stages, "prepare"),
    message: `"${keyword}" 키워드의 조사 범위를 정리하고 있습니다.`
  });

  const progressSteps = [
    { id: "prepare", delay: 600, message: "키워드 기반 내부 분석 프롬프트를 구성했습니다." },
    { id: "collect", delay: 1600, message: "GPT가 공개 채용공고와 검색 결과를 조회하고 있습니다." },
    { id: "extract", delay: 5200, message: "조회 결과에서 직무명, 기술스택, 필수/우대 조건을 추출하고 있습니다." },
    { id: "analyze", delay: 9000, message: "직무 관계와 기술 동시 등장 관계를 분석하고 있습니다." },
    { id: "compose", delay: 13000, message: "서비스 화면에서 사용할 JSON 구조로 정리하고 있습니다." },
    { id: "compose", delay: 20000, message: "reasoning 모델이 근거와 스키마를 다시 점검하고 있습니다. 조금 더 걸릴 수 있습니다." },
    { id: "compose", delay: 30000, message: "채용공고 근거 URL과 그래프 노드를 최종 검증하고 있습니다." },
    { id: "compose", delay: 45000, message: "분석 결과를 기다리는 중입니다. 기존 CLOUD/DATA 데이터는 계속 확인할 수 있습니다." }
  ];

  let finished = false;
  const analysisPromise = requestKeywordAnalysis(keyword).finally(() => {
    finished = true;
  });

  for (const step of progressSteps) {
    if (finished) break;
    await wait(step.delay);
    if (finished) break;
    onProgress({
      ...baseJob,
      status: "running",
      activeStageId: step.id,
      stages: updateStages(baseJob.stages, step.id, doneIds),
      message: step.message
    });
    if (!doneIds.includes(step.id)) doneIds = [...doneIds, step.id];
  }

  const data = await analysisPromise;
  onProgress({
    ...baseJob,
    status: "completed",
    activeStageId: undefined,
    stages: baseJob.stages.map((stage) => ({ ...stage, status: "done" })),
    message: "GPT 분석과 JSON 생성이 완료되었습니다."
  });

  return data;
};
