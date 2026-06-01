import React, { useEffect, useState, useCallback } from "react";
import ReactDOM from "react-dom";
import * as SDK from "azure-devops-extension-sdk";
import { SuiteStats, TestPlanInfo, TestPlanSummary } from "../types";
import {
  loadPlans,
  loadPlanInfo,
  loadSuiteStats,
} from "../services/TestAnalysisService";
import {
  getLastSelectedPlan,
  setLastSelectedPlan,
} from "../services/StorageService";
import { exportToCsv } from "../services/CsvService";
import { PlanSelector } from "../components/PlanSelector";
import { PlanInfoBar } from "../components/PlanInfoBar";
import { GraphsView } from "../components/GraphsView";
import { SuiteTable } from "../components/SuiteTable";
import { SuiteTreeView } from "../components/SuiteTreeView";
import "./Hub.scss";

type TabId = "graphs" | "table" | "tree";

const STORAGE_KEY = "ta-last-plan";

const App: React.FC = () => {
  const [project, setProject] = useState("");
  const [plans, setPlans] = useState<TestPlanSummary[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [planInfo, setPlanInfo] = useState<TestPlanInfo | null>(null);
  const [suites, setSuites] = useState<SuiteStats[]>([]);
  const [sdkReady, setSdkReady] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("graphs");

  // ── SDK init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let done = false;
    const notify = () => { try { SDK.notifyLoadSucceeded(); } catch (_) {} };
    const timeout = setTimeout(() => { notify(); setSdkReady(true); }, 3000);

    SDK.init({ loaded: false, applyTheme: true })
      .then(async () => {
        if (done) return;
        done = true;
        clearTimeout(timeout);
        notify();

        // Get project from SDK context (multiple methods for robustness)
        let proj = "";
        const debugInfo: string[] = [];

        try {
          const ctx = SDK.getWebContext();
          debugInfo.push(`webCtx.project.name="${ctx?.project?.name}" id="${ctx?.project?.id}"`);
          proj = ctx?.project?.name || ctx?.project?.id || "";
        } catch (e) {
          debugInfo.push(`webCtx failed: ${e}`);
        }

        if (!proj) {
          try {
            const pc = SDK.getPageContext();
            const p = pc?.webContext?.project;
            debugInfo.push(`pageCtx.project.name="${p?.name}" id="${p?.id}"`);
            proj = p?.name || p?.id || "";
          } catch (e) {
            debugInfo.push(`pageCtx failed: ${e}`);
          }
        }

        if (!proj) {
          try {
            const cfg = SDK.getConfiguration() as Record<string, unknown>;
            debugInfo.push(`cfg=${JSON.stringify(cfg)}`);
            proj = (cfg?.project as string) || (cfg?.projectName as string) || "";
          } catch (e) {
            debugInfo.push(`cfg failed: ${e}`);
          }
        }

        if (!proj && document.referrer) {
          try {
            const parts = new URL(document.referrer).pathname.split("/").filter(Boolean);
            // ADO URL pattern: /{org}/{project}/_...
            if (parts.length >= 2) proj = decodeURIComponent(parts[1]);
            debugInfo.push(`referrer "${document.referrer}" → "${proj}"`);
          } catch (_) {}
        }

        console.log("[TestAnalysis] project =", proj, "| debug:", debugInfo.join(" || "));
        setProject(proj);
        if (!proj) {
          setError(`Could not determine project. Debug: ${debugInfo.join(" | ")}`);
          setSdkReady(true);
          setLoadingPlans(false);
          return;
        }
        setSdkReady(true);

        try {
          setLoadingPlans(true);
          const fetchedPlans = await loadPlans(proj);
          console.log("[TestAnalysis] loadPlans returned", fetchedPlans.length, "plans:", fetchedPlans.map(p => `${p.id}:${p.name}`).join(", "));
          setPlans(fetchedPlans);

          const lastId = await getLastSelectedPlan(STORAGE_KEY);
          const initId =
            lastId && fetchedPlans.some((p) => p.id === lastId)
              ? lastId
              : fetchedPlans[0]?.id ?? null;

          if (initId) {
            setSelectedPlanId(initId);
            fetchPlanData(proj, initId);
          }
        } catch (e) {
          console.error("[TestAnalysis] loadPlans failed:", e);
          setError(`Failed to load plans from project "${proj}": ${String(e)}`);
        } finally {
          setLoadingPlans(false);
        }
      })
      .catch((err) => {
        if (done) return;
        done = true;
        clearTimeout(timeout);
        notify();
        setSdkReady(true);
        setError(`SDK init failed: ${String(err)}`);
        setLoadingPlans(false);
      });

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch suite data ────────────────────────────────────────────────────────
  const fetchPlanData = useCallback(
    async (proj: string, planId: number) => {
      setLoadingData(true);
      setError(null);
      try {
        const [info, suiteData] = await Promise.all([
          loadPlanInfo(proj, planId),
          loadSuiteStats(proj, planId),
        ]);
        setPlanInfo(info);
        setSuites(suiteData);
      } catch (e) {
        setError(`Failed to load plan data: ${String(e)}`);
      } finally {
        setLoadingData(false);
      }
    },
    []
  );

  const handlePlanChange = useCallback(
    (planId: number) => {
      setSelectedPlanId(planId);
      setLastSelectedPlan(STORAGE_KEY, planId);
      fetchPlanData(project, planId);
    },
    [project, fetchPlanData]
  );

  // ── CSV export ──────────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = suites.flatMap((s) =>
      s.points.map((p) => ({
        Suite: s.suiteName,
        TestCase: p.testCaseName,
        Outcome: p.outcome,
        AssignedTo: p.assignedTo,
        Configuration: p.configuration,
        FailureType: p.failureType,
        Comment: p.comment,
        FailedStep: p.failedStep,
      }))
    );
    const planName = plans.find((p) => p.id === selectedPlanId)?.name ?? "plan";
    exportToCsv(`TestAnalysis_${planName.replace(/\s+/g, "_")}.csv`, rows);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  if (!sdkReady) {
    return (
      <div style={{ padding: 24, fontFamily: "Segoe UI, sans-serif" }}>
        Loading Test Plan Analysis…
      </div>
    );
  }

  return (
    <div className="ta-hub">
      {/* Toolbar */}
      <div className="ta-toolbar">
        <span className="ta-toolbar__title">Test Plan Analysis</span>
        {project && <span className="ta-toolbar__project">({project})</span>}
        {loadingPlans
          ? <span style={{ fontSize: 13, color: "#605e5c" }}>Loading plans…</span>
          : <select
              value={selectedPlanId ?? ""}
              onChange={(e) => handlePlanChange(Number(e.target.value))}
              style={{ fontSize: 14, padding: "4px 8px", minWidth: 240, border: "2px solid #0078d4", borderRadius: 3 }}
            >
              {plans.length === 0
                ? <option value="">— No plans found —</option>
                : plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)
              }
            </select>
        }
        <div className="ta-toolbar__spacer" />
        <button
          className="ta-btn"
          onClick={handleExport}
          disabled={suites.length === 0}
          title="Export visible test points as CSV"
        >
          Export CSV
        </button>
      </div>

      {/* Always-visible status bar */}
      <div style={{ padding: "6px 16px", background: "#f3f2f1", fontSize: 12, color: "#333", borderBottom: "1px solid #ddd", fontFamily: "monospace" }}>
        project="{project}" | loadingPlans={String(loadingPlans)} | plans={plans.length} | selectedPlanId={String(selectedPlanId)} | suites={suites.length} | error={error ?? "none"}
      </div>

      {/* Plan info bar */}
      <PlanInfoBar info={planInfo} project={project} />

      {/* Error banner */}
      {error && <div className="ta-error">⚠ {error}</div>}

      {/* Tab bar */}
      <div className="ta-tabs">
        {(
          [
            { id: "graphs", label: "Graphs" },
            { id: "table", label: "Suite Table" },
            { id: "tree", label: "Test Tree" },
          ] as { id: TabId; label: string }[]
        ).map((tab) => (
          <div
            key={tab.id}
            className={`ta-tab${activeTab === tab.id ? " ta-tab--active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </div>
        ))}
      </div>

      {/* Tab content */}
      <div className="ta-content">
        {activeTab === "graphs" && (
          <GraphsView suites={suites} loading={loadingData} />
        )}
        {activeTab === "table" && (
          <SuiteTable suites={suites} loading={loadingData} />
        )}
        {activeTab === "tree" && (
          <SuiteTreeView suites={suites} loading={loadingData} />
        )}
      </div>
      <div style={{ position: "fixed", bottom: 8, right: 12, fontSize: 11, color: "rgba(0,0,0,0.25)", pointerEvents: "none", userSelect: "none", fontStyle: "italic", zIndex: 9999 }}>
        Test Analysis Powered by Avi Hadad
      </div>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById("root"));
