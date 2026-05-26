import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Header from "./components/Header";
import CareerGraph from "./components/CareerGraph";
import DetailPanel from "./components/DetailPanel";
import RoadmapTimeline from "./components/RoadmapTimeline";
import LoadingScreen from "./components/LoadingScreen";
import TrackSelector, { TrackKey } from "./components/TrackSelector";
import { loadMarketData } from "./data/transform";
import { DetailSelection, FilterState, MarketData } from "./types";

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
  const [activeTrack, setActiveTrack] = useState<TrackKey>("cloud");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DetailSelection | undefined>();
  const [focusRoadmap, setFocusRoadmap] = useState<string | null>(null);
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

  const activeData = datasets?.[activeTrack];

  const roadmaps = useMemo(() => {
    if (!activeData) return [];
    if (!focusRoadmap) return activeData.learning_roadmaps;
    return activeData.learning_roadmaps.filter((roadmap) => JSON.stringify(roadmap).toLowerCase().includes(focusRoadmap.toLowerCase()));
  }, [activeData, focusRoadmap]);

  const handleTrackChange = (track: TrackKey) => {
    setActiveTrack(track);
    setSelected(undefined);
    setFocusRoadmap(null);
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
        <TrackSelector active={activeTrack} datasets={datasets} onChange={handleTrackChange} />
        <CareerGraph data={activeData} rootLabel={rootLabels[activeTrack]} query="" filters={filters} selected={selected} onSelect={setSelected} />
        <DetailPanel data={activeData} selected={selected} onSelectRoadmap={setFocusRoadmap} />
      </motion.div>
      <RoadmapTimeline roadmaps={roadmaps} />
    </main>
  );
}
