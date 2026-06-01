import React from "react";
import { SuiteStats } from "../types";

interface Props {
  suites: SuiteStats[];
}

interface SectionProps {
  title: string;
  items: string[];
  color: string;
}

const Section: React.FC<SectionProps> = ({ title, items, color }) => (
  <div style={{ flex: "1 1 180px", minWidth: 140 }}>
    <div
      style={{
        fontSize: 13,
        fontWeight: 600,
        padding: "4px 0",
        borderBottom: `2px solid ${color}`,
        marginBottom: 6,
        color,
      }}
    >
      {title} ({items.length})
    </div>
    <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: 12 }}>
      {items.length === 0 ? (
        <li style={{ opacity: 0.5 }}>—</li>
      ) : (
        items.map((s, i) => (
          <li key={i} style={{ marginBottom: 2 }}>
            {s}
          </li>
        ))
      )}
    </ul>
  </div>
);

export const SuiteListPanel: React.FC<Props> = ({ suites }) => {
  const empty: string[] = [];
  const fullPass: string[] = [];
  const opened: string[] = [];

  suites.forEach((s) => {
    const label = `${s.suiteName} : ${s.assignedTo}`;
    if (s.totalPoints === 0) {
      empty.push(label);
    } else if (
      s.totalIncludeChildren > 0 &&
      s.totalPassed === s.totalIncludeChildren
    ) {
      fullPass.push(label);
    } else if (s.totalNotRun > 0) {
      opened.push(label);
    }
  });

  return (
    <div
      style={{
        display: "flex",
        gap: 24,
        flexWrap: "wrap",
        padding: "12px 16px",
        background: "var(--palette-neutral-2, #f3f2f1)",
        borderRadius: 4,
        marginTop: 12,
        border: "1px solid var(--palette-neutral-8, #edebe9)",
      }}
    >
      <Section
        title="Empty Suites"
        items={empty}
        color="var(--palette-neutral-60, #797775)"
      />
      <Section
        title="Fully Passed"
        items={fullPass}
        color="var(--status-success, #107c10)"
      />
      <Section
        title="Still Open"
        items={opened}
        color="var(--status-warning, #7a7100)"
      />
    </div>
  );
};
