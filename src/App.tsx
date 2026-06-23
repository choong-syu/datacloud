import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Header from "./components/Header";
import CareerGraph from "./components/CareerGraph";
import DetailPanel from "./components/DetailPanel";
import LoadingScreen from "./components/LoadingScreen";
import TrackSelector, { TrackKey } from "./components/TrackSelector";
import { runKeywordAnalysis } from "./data/keywordAnalysis";
import { loadMarketData } from "./data/transform";
import { DetailSelection, FilterState, KeywordAnalysisJob, MarketData } from "./types";

const dataPaths: Record<TrackKey, string> = {
  cloud: "/data/cloud_job_market_analysis_2026-05-26.json",
  data: "/data/data_job_market_analysis_2026-05-26.json"
};

const rootLabels: Record<TrackKey, string> = {
  cloud: "CLOUD",
  data: "DATA"
};

export default function App() {
  const [datasets, setDatasets] = useState<Record<TrackKey, MarketData> | null>(null);
  const [activeKey, setActiveKey] = useState<string>("cloud");
  const [customDatasets, setCustomDatasets] = useState<Record<string, MarketData>>({});
  const [analysisJobs, setAnalysisJobs] = useState<Record<string, KeywordAnalysisJob>>({});
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DetailSelection | undefined>();
  const [filters] = useState<FilterState>({
    requiredOnly: false,
    includePreferred: true,
    beginnerOnly: false,
    showProjects: true,
    showCertificates: true,
    sites: ["Saramin", "JobKorea", "Incruit"]
  });

  useEffect(() => {
    Promise.all([loadMarketData(dataPaths.cloud), loadMarketData(dataPaths.data)])
      .then(([cloud, data]) => setDatasets({ cloud, data }))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load data."));
  }, []);

  const activePreset = activeKey === "cloud" || activeKey === "data" ? activeKey : undefined;
  const activeData = activePreset ? datasets?.[activePreset] : customDatasets[activeKey];
  const activeLabel = activePreset ? rootLabels[activePreset] : analysisJobs[activeKey]?.keyword ?? "CUSTOM";

  const handleTrackChange = (track: TrackKey) => {
    setActiveKey(track);
    setSelected(undefined);
  };

  const handleCustomSelect = (key: string) => {
    if (!customDatasets[key]) return;
    setActiveKey(key);
    setSelected(undefined);
  };

  const handleCustomDelete = (key: string) => {
    setAnalysisJobs((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setCustomDatasets((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    if (activeKey === key) {
      setActiveKey("cloud");
      setSelected(undefined);
    }
  };

  const handleKeywordAnalyze = (keyword: string) => {
    const key = `custom:${keyword.trim().toLowerCase()}`;
    if (!keyword.trim() || analysisJobs[key]?.status === "running") return;

    runKeywordAnalysis(keyword.trim(), (job) => {
      setAnalysisJobs((current) => ({ ...current, [key]: job }));
    }).then((data) => {
      setCustomDatasets((current) => ({ ...current, [key]: data }));
    }).catch((error) => {
      setAnalysisJobs((current) => ({
        ...current,
        [key]: {
          id: key,
          keyword,
          status: "failed",
          stages: current[key]?.stages ?? [],
          message: error instanceof Error ? error.message : "분석 작업 중 오류가 발생했습니다."
        }
      }));
    });
  };

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 p-8 text-center text-white">
        <div>
          <h1 className="text-2xl font-black text-rose-200">Data loading failed</h1>
          <p className="mt-3 text-slate-300">{error}</p>
        </div>
      </div>
    );
  }

  if (!datasets || !activeData) return <LoadingScreen />;

  return (
    <main className="flex h-screen flex-col bg-slate-950 text-slate-100">
      <Header summary={activeData.summary} recovered={activeData.recovered} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid min-h-0 flex-1 grid-cols-[260px_minmax(640px,1fr)_400px] xl:grid-cols-[280px_minmax(760px,1fr)_430px]"
      >
        <TrackSelector
          active={activePreset}
          activeCustomKey={activePreset ? undefined : activeKey}
          analysisJobs={analysisJobs}
          customDatasets={customDatasets}
          datasets={datasets}
          onAnalyze={handleKeywordAnalyze}
          onChange={handleTrackChange}
          onCustomDelete={handleCustomDelete}
          onCustomSelect={handleCustomSelect}
        />
        <CareerGraph data={activeData} rootLabel={activeLabel} query="" filters={filters} selected={selected} onSelect={setSelected} />
        <DetailPanel data={activeData} selected={selected} />
      </motion.div>
    </main>
  );
}
