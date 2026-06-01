import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  PieController,
  ArcElement,
  Tooltip,
  Legend,
  ChartEvent,
  ActiveElement,
} from "chart.js";
import { SuiteStats } from "../types";
import { SuiteListPanel } from "./SuiteListPanel";
import { SkeletonBlock } from "./SkeletonLoader";

Chart.register(
  BarController, BarElement,
  CategoryScale, LinearScale,
  PieController, ArcElement,
  Tooltip, Legend
);

// ADO-themed colours for each outcome
const CLR = {
  passed:        "#107c10",
  failed:        "#a4262c",
  notRun:        "#797775",
  inProgress:    "#0078d4",
  notApplicable: "#c8c6c4",
  blocked:       "#7a7100",
  paused:        "#b3b0ad",
};

interface Props {
  suites: SuiteStats[];
  loading: boolean;
}

export const GraphsView: React.FC<Props> = ({ suites, loading }) => {
  const [isolated, setIsolated] = useState(true);
  const [deepView, setDeepView] = useState(true);
  const [maxLevel, setMaxLevel] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Keep maxLevel in sync when suite data changes (default to actual max level)
  useEffect(() => {
    if (suites.length > 0) {
      setMaxLevel(Math.max(...suites.map((s) => s.level)));
    }
  }, [suites]);

  const barRef    = useRef<HTMLCanvasElement>(null);
  const pieIsoRef = useRef<HTMLCanvasElement>(null);
  const pieAggRef = useRef<HTMLCanvasElement>(null);
  const barInst    = useRef<Chart | null>(null);
  const pieIsoInst = useRef<Chart | null>(null);
  const pieAggInst = useRef<Chart | null>(null);

  const visible = suites.filter(
    (s) => s.totalIncludeChildren > 0 && (deepView || s.level <= maxLevel)
  );

  const buildBarData = useCallback(() => {
    const labels = visible.map((s) => s.suiteName);
    const d = (iso: boolean, key: keyof SuiteStats, totalKey: keyof SuiteStats) =>
      visible.map((s) => (iso ? (s[key] as number) : (s[totalKey] as number)));

    return {
      labels,
      datasets: [
        { label: "Passed",       data: d(isolated, "passed",        "totalPassed"),        backgroundColor: CLR.passed },
        { label: "Failed",       data: d(isolated, "failed",        "totalFailed"),        backgroundColor: CLR.failed },
        { label: "Not Run",      data: d(isolated, "notRun",        "totalNotRun"),        backgroundColor: CLR.notRun },
        { label: "In Progress",  data: d(isolated, "inProgress",    "totalInProgress"),    backgroundColor: CLR.inProgress },
        { label: "Not Appl.",    data: d(isolated, "notApplicable", "totalNotApplicable"), backgroundColor: CLR.notApplicable },
        { label: "Blocked",      data: d(isolated, "blocked",       "totalBlocked"),       backgroundColor: CLR.blocked },
        { label: "Paused",       data: d(isolated, "paused",        "totalPaused"),        backgroundColor: CLR.paused },
      ],
    };
  }, [visible, isolated]);

  const buildPieData = useCallback(
    (suite: SuiteStats, agg: boolean) => {
      const vals = agg
        ? [suite.totalPassed, suite.totalFailed, suite.totalNotRun, suite.totalInProgress, suite.totalNotApplicable, suite.totalBlocked, suite.totalPaused]
        : [suite.passed,      suite.failed,      suite.notRun,      suite.inProgress,      suite.notApplicable,      suite.blocked,      suite.paused];
      return {
        labels: ["Passed", "Failed", "Not Run", "In Progress", "N/A", "Blocked", "Paused"],
        datasets: [{
          data: vals,
          backgroundColor: [CLR.passed, CLR.failed, CLR.notRun, CLR.inProgress, CLR.notApplicable, CLR.blocked, CLR.paused],
        }],
      };
    },
    []
  );

  // Rebuild bar chart when data or toggle changes
  useEffect(() => {
    if (!barRef.current || loading || visible.length === 0) return;
    barInst.current?.destroy();
    barInst.current = new Chart(barRef.current, {
      type: "bar",
      data: buildBarData(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: { stacked: true }, y: { stacked: true } },
        plugins: { legend: { position: "top" }, tooltip: { mode: "index" } },
        onClick: (_evt: ChartEvent, elements: ActiveElement[]) => {
          if (elements.length > 0) setSelectedIdx(elements[0].index);
        },
      },
    });
    return () => { barInst.current?.destroy(); barInst.current = null; };
  }, [loading, buildBarData, visible.length]);

  // Rebuild pie charts when selected suite changes
  useEffect(() => {
    if (!pieIsoRef.current || !pieAggRef.current || loading || visible.length === 0) return;
    const suite = visible[selectedIdx] ?? visible[0];
    if (!suite) return;

    pieIsoInst.current?.destroy();
    pieAggInst.current?.destroy();

    pieIsoInst.current = new Chart(pieIsoRef.current, {
      type: "pie",
      data: buildPieData(suite, false),
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } },
    });
    pieAggInst.current = new Chart(pieAggRef.current, {
      type: "pie",
      data: buildPieData(suite, true),
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } },
    });

    return () => {
      pieIsoInst.current?.destroy(); pieIsoInst.current = null;
      pieAggInst.current?.destroy(); pieAggInst.current = null;
    };
  }, [loading, selectedIdx, buildPieData, visible]);

  const selectedSuite = visible[selectedIdx] ?? null;

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SkeletonBlock height={300} />
        <div style={{ display: "flex", gap: 12 }}>
          <SkeletonBlock height={200} width="50%" />
          <SkeletonBlock height={200} width="50%" />
        </div>
      </div>
    );
  }

  if (visible.length === 0) {
    const totalSuites = suites.length;
    const totalPoints = suites.reduce((acc, s) => acc + s.totalPoints, 0);
    return (
      <div style={{ padding: 24, opacity: 0.7, fontSize: 13, fontFamily: "Segoe UI, sans-serif" }}>
        {totalSuites === 0
          ? "No test suites found in this plan."
          : `${totalSuites} suite(s) found but ${totalPoints === 0 ? "no test points" : "all filtered out"}. Check browser console (F12) for details.`}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Controls toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          flexWrap: "wrap",
          padding: "8px 12px",
          background: "var(--palette-neutral-2, #f3f2f1)",
          borderRadius: 4,
          fontSize: 13,
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={isolated}
            onChange={(e) => setIsolated(e.target.checked)}
          />
          Isolated view
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={deepView}
            onChange={(e) => setDeepView(e.target.checked)}
          />
          Deep view (all levels)
        </label>
        {!deepView && (
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            Max level:
            <input
              type="number"
              value={maxLevel}
              min={0}
              onChange={(e) => setMaxLevel(Number(e.target.value))}
              style={{ width: 56, padding: "2px 4px", fontSize: 13 }}
            />
          </label>
        )}
        {selectedSuite && (
          <span style={{ marginLeft: "auto", opacity: 0.7 }}>
            Pie: <strong>{selectedSuite.suiteName}</strong>
          </span>
        )}
      </div>

      {/* Charts row */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* Stacked bar — click to select suite for pie */}
        <div style={{ flex: "2 1 420px" }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, opacity: 0.7 }}>
            Outcomes per suite ({isolated ? "isolated" : "aggregate"}) — click a bar to update pie charts
          </div>
          <div style={{ height: 320 }}>
            <canvas ref={barRef} />
          </div>
        </div>

        {/* Pie charts */}
        <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, opacity: 0.7 }}>
              Isolated — {selectedSuite?.suiteName}
            </div>
            <div style={{ height: 210 }}>
              <canvas ref={pieIsoRef} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, opacity: 0.7 }}>
              Aggregate — {selectedSuite?.suiteName}
            </div>
            <div style={{ height: 210 }}>
              <canvas ref={pieAggRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Suite status lists */}
      <SuiteListPanel suites={suites} />
    </div>
  );
};
