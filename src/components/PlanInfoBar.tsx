import React from "react";
import { TestPlanInfo } from "../types";

interface Props {
  info: TestPlanInfo | null;
  project: string;
}

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span
    style={{
      opacity: 0.6,
      fontSize: 12,
      marginRight: 4,
      textTransform: "uppercase",
      letterSpacing: "0.04em",
    }}
  >
    {children}
  </span>
);

const Value: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span
    style={{
      fontSize: 13,
      marginRight: 20,
      fontWeight: 500,
      color: "var(--palette-neutral-100, #323130)",
    }}
  >
    {children}
  </span>
);

export const PlanInfoBar: React.FC<Props> = ({ info, project }) => {
  if (!info) return null;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        padding: "8px 16px",
        background: "var(--palette-neutral-2, #f3f2f1)",
        borderBottom: "1px solid var(--palette-neutral-8, #edebe9)",
        gap: 4,
      }}
    >
      <Label>Project</Label>
      <Value>{project}</Value>
      <Label>Plan</Label>
      <Value>#{info.id} {info.name}</Value>
      <Label>Root Suite</Label>
      <Value>{info.rootSuiteName || "—"}</Value>
      <Label>Iteration</Label>
      <Value>{info.iteration || "—"}</Value>
      <Label>Area</Label>
      <Value>{info.area || "—"}</Value>
      <Label>State</Label>
      <Value>{info.state || "—"}</Value>
    </div>
  );
};
