import React, { useState } from "react";
import { SuiteStats, TestPointDetail } from "../types";
import { SkeletonTable } from "./SkeletonLoader";

interface Props {
  suites: SuiteStats[];
  loading: boolean;
}

// ADO-style chevron SVG
const Chevron: React.FC<{ open: boolean }> = ({ open }) => (
  <svg
    width="12" height="12" viewBox="0 0 12 12"
    style={{ flexShrink: 0, transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.1s", verticalAlign: "middle" }}
    fill="var(--palette-neutral-60, #605e5c)"
  >
    <path d="M4 2l4 4-4 4" stroke="var(--palette-neutral-60, #605e5c)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TH: React.FC<{ children: React.ReactNode; left?: boolean }> = ({ children, left }) => (
  <th style={{
    padding: "0 12px",
    height: 32,
    textAlign: left ? "left" : "right",
    background: "var(--palette-neutral-4, #f3f2f1)",
    borderBottom: "1px solid var(--palette-neutral-20, #c8c6c4)",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--palette-neutral-100, #323130)",
    whiteSpace: "nowrap",
    position: "sticky",
    top: 0,
    zIndex: 1,
  }}>
    {children}
  </th>
);

const TD: React.FC<{ children: React.ReactNode; left?: boolean; colSpan?: number }> = ({ children, left, colSpan }) => (
  <td colSpan={colSpan} style={{
    padding: "0 12px",
    height: 36,
    textAlign: left ? "left" : "right",
    borderBottom: "1px solid var(--palette-neutral-8, #edebe9)",
    fontSize: 13,
    verticalAlign: "middle",
    background: "inherit",
  }}>
    {children}
  </td>
);

const Num: React.FC<{ n: number; color?: string }> = ({ n, color }) => (
  <span style={{ fontWeight: n > 0 ? 600 : 400, color: n > 0 && color ? color : "var(--palette-neutral-40, #a19f9d)" }}>
    {n > 0 ? n : "—"}
  </span>
);

const OUTCOME_COLOR: Record<string, string> = {
  Failed:  "#a4262c",
  Blocked: "#7a7100",
  Passed:  "#107c10",
};

function flattenSuites(suites: SuiteStats[]): SuiteStats[] {
  const result: SuiteStats[] = [];
  const map = new Map(suites.map((s) => [s.suiteId, s]));
  const roots = suites.filter((s) => s.parentId === null || !map.has(s.parentId));
  function walk(s: SuiteStats) { result.push(s); s.children.forEach(walk); }
  roots.forEach(walk);
  return result;
}

const FailedPointsPanel: React.FC<{ points: TestPointDetail[]; colSpan: number }> = ({ points, colSpan }) => {
  const failed = points.filter((p) => p.outcome === "Failed" || p.outcome === "Blocked");
  if (!failed.length) return null;
  return (
    <tr>
      <td colSpan={colSpan} style={{ padding: 0, background: "#fffbf8", borderBottom: "1px solid #edebe9" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "var(--palette-neutral-4, #f3f2f1)" }}>
              <th style={{ padding: "4px 12px 4px 32px", textAlign: "left", fontWeight: 600, color: "#323130", width: "35%", borderBottom: "1px solid #edebe9" }}>Test Case</th>
              <th style={{ padding: "4px 8px", textAlign: "left", fontWeight: 600, color: "#323130", width: "10%", borderBottom: "1px solid #edebe9" }}>Outcome</th>
              <th style={{ padding: "4px 8px", textAlign: "left", fontWeight: 600, color: "#323130", width: "18%", borderBottom: "1px solid #edebe9" }}>Assigned To</th>
              <th style={{ padding: "4px 8px", textAlign: "left", fontWeight: 600, color: "#323130", borderBottom: "1px solid #edebe9" }}>Failed Step / Comment</th>
            </tr>
          </thead>
          <tbody>
            {failed.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid #f3f2f1" }}>
                <td style={{ padding: "5px 12px 5px 32px", color: "#323130" }}>{p.testCaseName}</td>
                <td style={{ padding: "5px 8px", color: OUTCOME_COLOR[p.outcome] || "#323130", fontWeight: 600 }}>{p.outcome}</td>
                <td style={{ padding: "5px 8px", color: "#605e5c" }}>{p.assignedTo || <span style={{ opacity: 0.4 }}>—</span>}</td>
                <td style={{ padding: "5px 8px", color: "#a4262c", fontFamily: "Consolas, monospace", fontSize: 11 }}>
                  {p.failedStep || p.comment || <span style={{ color: "#a19f9d" }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </td>
    </tr>
  );
};

export const SuiteTable: React.FC<Props> = ({ suites, loading }) => {
  const flat = flattenSuites(suites);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const toggle = (id: number) =>
    setExpanded((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  return (
    <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 200px)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, tableLayout: "auto" }}>
        <thead>
          <tr>
            <TH left>Suite Name</TH>
            <TH>Total</TH>
            <TH>Passed</TH>
            <TH>Failed</TH>
            <TH>Not Run</TH>
            <TH>In Progress</TH>
            <TH>N/A</TH>
            <TH>Paused</TH>
            <TH>Blocked</TH>
          </tr>
        </thead>
        {loading ? (
          <SkeletonTable rows={6} cols={9} />
        ) : (
          <tbody>
            {flat.map((s) => {
              const hasFailed = s.failed > 0 || s.blocked > 0;
              const isExpanded = expanded.has(s.suiteId);
              const isHovered = hoveredId === s.suiteId;
              return (
                <React.Fragment key={s.suiteId}>
                  <tr
                    onClick={() => hasFailed && toggle(s.suiteId)}
                    onMouseEnter={() => setHoveredId(s.suiteId)}
                    onMouseLeave={() => setHoveredId(null)}
                    title={hasFailed ? "Click to show/hide failed test cases" : undefined}
                    style={{ cursor: hasFailed ? "pointer" : "default", background: isHovered ? "#deecf9" : undefined }}
                  >
                    <TD left>
                      <span style={{ paddingLeft: s.level * 20, display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {hasFailed
                          ? <Chevron open={isExpanded} />
                          : <span style={{ width: 12, display: "inline-block", flexShrink: 0 }} />
                        }
                        <span style={{ color: "var(--communication-foreground, #0078d4)", fontWeight: 500 }}>
                          {s.suiteName}
                        </span>
                      </span>
                    </TD>
                    <TD>{s.totalPoints}</TD>
                    <TD><Num n={s.passed} color="#107c10" /></TD>
                    <TD><Num n={s.failed} color="#a4262c" /></TD>
                    <TD><Num n={s.notRun} /></TD>
                    <TD><Num n={s.inProgress} color="#0078d4" /></TD>
                    <TD><Num n={s.notApplicable} /></TD>
                    <TD><Num n={s.paused} /></TD>
                    <TD><Num n={s.blocked} color="#7a7100" /></TD>
                  </tr>
                  {isExpanded && <FailedPointsPanel points={s.points} colSpan={9} />}
                </React.Fragment>
              );
            })}
          </tbody>
        )}
      </table>
    </div>
  );
};
