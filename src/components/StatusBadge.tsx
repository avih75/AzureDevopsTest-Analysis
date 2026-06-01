import React from "react";
import { TestOutcome } from "../types";

interface Props {
  outcome: TestOutcome;
}

const STYLES: Record<
  TestOutcome,
  { bg: string; color: string; label: string }
> = {
  Passed: {
    bg: "var(--status-success-background, #dff6dd)",
    color: "var(--status-success, #107c10)",
    label: "Passed",
  },
  Failed: {
    bg: "var(--status-error-background, #fde7e9)",
    color: "var(--status-error, #a4262c)",
    label: "Failed",
  },
  NotRun: {
    bg: "var(--palette-neutral-4, #f9f8f7)",
    color: "var(--palette-neutral-60, #797775)",
    label: "Not Run",
  },
  InProgress: {
    bg: "var(--palette-primary-tint-30, #cce0ff)",
    color: "var(--palette-primary-shade-20, #0062cc)",
    label: "In Progress",
  },
  Blocked: {
    bg: "var(--status-warning-background, #fff4ce)",
    color: "var(--status-warning, #7a7100)",
    label: "Blocked",
  },
  Paused: {
    bg: "var(--palette-neutral-4, #f9f8f7)",
    color: "var(--palette-neutral-60, #797775)",
    label: "Paused",
  },
  NotApplicable: {
    bg: "var(--palette-neutral-4, #f9f8f7)",
    color: "var(--palette-neutral-40, #b3b0ad)",
    label: "N/A",
  },
};

export const StatusBadge: React.FC<Props> = ({ outcome }) => {
  const s = STYLES[outcome] ?? STYLES.NotRun;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 3,
        fontSize: 12,
        fontWeight: 600,
        background: s.bg,
        color: s.color,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
};
