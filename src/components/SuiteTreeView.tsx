import React, { useState } from "react";
import { SuiteStats, TestPointDetail } from "../types";
import { StatusBadge } from "./StatusBadge";

interface Props {
  suites: SuiteStats[];
  loading: boolean;
}

// ADO-style chevron SVG
const Chevron: React.FC<{ open: boolean }> = ({ open }) => (
  <svg
    width="12" height="12" viewBox="0 0 12 12"
    style={{ flexShrink: 0, transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.1s" }}
    fill="none"
  >
    <path d="M4 2l4 4-4 4" stroke="var(--palette-neutral-60, #605e5c)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Small colored count pill (only shown when > 0)
const CountPill: React.FC<{ n: number; color: string; title?: string }> = ({ n, color, title }) => {
  if (n === 0) return null;
  return (
    <span
      title={title}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        minWidth: 20, height: 18, padding: "0 5px",
        background: color + "22",
        color,
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {n}
    </span>
  );
};

export const SuiteTreeView: React.FC<Props> = ({ suites, loading }) => {
  if (loading) {
    return (
      <div style={{ padding: "24px 16px", opacity: 0.5, fontSize: 13 }}>
        Loading test tree…
      </div>
    );
  }

  const map = new Map(suites.map((s) => [s.suiteId, s]));
  const roots = suites.filter(
    (s) => s.parentId === null || !map.has(s.parentId)
  );

  return (
    <div style={{ fontFamily: "'Segoe UI', Tahoma, sans-serif", fontSize: 13, color: "#323130" }}>
      {roots.map((r) => (
        <SuiteNode key={r.suiteId} suite={r} depth={0} />
      ))}
    </div>
  );
};

// ── Suite node ────────────────────────────────────────────────────────────────

const SuiteNode: React.FC<{ suite: SuiteStats; depth: number }> = ({ suite, depth }) => {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const hasContent = suite.children.length > 0 || suite.points.length > 0;

  return (
    <div>
      {/* Suite row */}
      <div
        onClick={() => hasContent && setExpanded((v) => !v)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          paddingLeft: 8 + depth * 20,
          paddingRight: 12,
          height: 36,
          cursor: hasContent ? "pointer" : "default",
          userSelect: "none",
          borderBottom: "1px solid var(--palette-neutral-8, #edebe9)",
          background: hovered ? "#deecf9" : undefined,
          transition: "background 0.08s ease",
        }}
      >
        {/* Chevron or spacer */}
        <span style={{ width: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {hasContent ? <Chevron open={expanded} /> : null}
        </span>

        {/* Folder icon */}
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginRight: 4 }}>
          <path d="M1 3a1 1 0 011-1h4l2 2h6a1 1 0 011 1v7a1 1 0 01-1 1H2a1 1 0 01-1-1V3z"
            fill={expanded ? "#0078d4" : "#605e5c"} opacity={expanded ? 1 : 0.7} />
        </svg>

        {/* Suite name */}
        <span style={{ fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--palette-neutral-100, #323130)" }}>
          {suite.suiteName}
        </span>

        {/* Suite type badge */}
        {suite.suiteType && suite.suiteType !== "StaticTestSuite" && (
          <span style={{
            fontSize: 10, padding: "1px 6px", borderRadius: 2,
            background: "var(--palette-neutral-8, #edebe9)",
            color: "var(--palette-neutral-60, #605e5c)",
            whiteSpace: "nowrap", flexShrink: 0,
          }}>
            {suite.suiteType.replace(/TestSuite$/, "")}
          </span>
        )}

        {/* Count pills */}
        <span style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
          <CountPill n={suite.passed}   color="#107c10" title="Passed" />
          <CountPill n={suite.failed}   color="#a4262c" title="Failed" />
          <CountPill n={suite.blocked}  color="#7a7100" title="Blocked" />
          <CountPill n={suite.inProgress} color="#0078d4" title="In Progress" />
          {suite.notRun > 0 && (
            <span style={{ fontSize: 11, color: "#a19f9d", fontWeight: 500, whiteSpace: "nowrap" }}>
              {suite.notRun} not run
            </span>
          )}
          <span style={{ fontSize: 11, color: "#605e5c", fontWeight: 500, marginLeft: 2, whiteSpace: "nowrap" }}>
            / {suite.totalPoints}
          </span>
        </span>
      </div>

      {/* Children */}
      {expanded && (
        <div>
          {suite.children.map((c) => (
            <SuiteNode key={c.suiteId} suite={c} depth={depth + 1} />
          ))}
          {suite.points.map((p) => (
            <PointRow key={p.id} point={p} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Test point row ────────────────────────────────────────────────────────────

const PointRow: React.FC<{ point: TestPointDetail; depth: number }> = ({ point, depth }) => {
  const [showDetail, setShowDetail] = useState(false);
  const [hovered, setHovered] = useState(false);
  const hasDetail = !!point.failedStep || !!point.failureType || !!point.comment;

  return (
    <div>
      <div
        onClick={() => hasDetail && setShowDetail((v) => !v)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          paddingLeft: 8 + depth * 20 + 20,
          paddingRight: 12,
          height: 32,
          cursor: hasDetail ? "pointer" : "default",
          borderBottom: "1px solid var(--palette-neutral-4, #f3f2f1)",
          fontSize: 13,
          background: hovered ? "#deecf9" : undefined,
          transition: "background 0.08s ease",
        }}
      >
        <StatusBadge outcome={point.outcome} />
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#323130" }}>
          {point.testCaseName}
        </span>
        {point.assignedTo && (
          <span style={{ fontSize: 12, color: "#605e5c", whiteSpace: "nowrap", flexShrink: 0 }}>
            {point.assignedTo}
          </span>
        )}
        {point.configuration && (
          <span style={{
            fontSize: 11, padding: "1px 6px", borderRadius: 2,
            background: "var(--palette-neutral-8, #edebe9)",
            color: "#605e5c",
            whiteSpace: "nowrap", flexShrink: 0,
          }}>
            {point.configuration}
          </span>
        )}
        {hasDetail && (
          <Chevron open={showDetail} />
        )}
      </div>

      {showDetail && (
        <div style={{
          paddingLeft: 8 + depth * 20 + 44,
          paddingRight: 12,
          paddingTop: 6,
          paddingBottom: 8,
          background: "var(--palette-neutral-2, #faf9f8)",
          borderBottom: "1px solid var(--palette-neutral-8, #edebe9)",
          borderLeft: "3px solid #a4262c",
          marginLeft: 8 + depth * 20 + 20,
          fontSize: 12,
          color: "#323130",
        }}>
          {point.failedStep && (
            <div style={{ marginBottom: 4 }}>
              <strong style={{ color: "#605e5c" }}>Failed Step: </strong>{point.failedStep}
            </div>
          )}
          {point.failureType && (
            <div style={{ marginBottom: 4 }}>
              <strong style={{ color: "#605e5c" }}>Failure Type: </strong>{point.failureType}
            </div>
          )}
          {point.comment && (
            <div>
              <strong style={{ color: "#605e5c" }}>Comment: </strong>{point.comment}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
