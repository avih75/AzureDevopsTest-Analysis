import React from "react";
import { TestPlanSummary } from "../types";

interface Props {
  plans: TestPlanSummary[];
  selectedId: number | null;
  loading: boolean;
  onChange: (planId: number) => void;
}

const SHIMMER_STYLE: React.CSSProperties = {
  display: "inline-block",
  width: 220,
  height: 28,
  borderRadius: 3,
  backgroundImage:
    "linear-gradient(90deg,var(--palette-neutral-4,#f3f2f1) 25%,var(--palette-neutral-8,#edebe9) 50%,var(--palette-neutral-4,#f3f2f1) 75%)",
  backgroundSize: "200% 100%",
  animation: "ta-shimmer 1.5s infinite",
};

export const PlanSelector: React.FC<Props> = ({
  plans,
  selectedId,
  loading,
  onChange,
}) => {
  if (loading) {
    return (
      <>
        <style>{`@keyframes ta-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <span style={SHIMMER_STYLE} />
      </>
    );
  }

  if (plans.length === 0) {
    return (
      <span style={{ fontSize: 13, color: "var(--palette-neutral-60,#605e5c)", padding: "4px 8px" }}>
        ⚠ No test plans found
      </span>
    );
  }

  return (
    <select
      value={selectedId ?? ""}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{
        fontSize: 14,
        padding: "4px 8px",
        background: "var(--palette-neutral-0, #fff)",
        color: "var(--palette-neutral-100, #323130)",
        border: "1px solid var(--palette-neutral-20, #c8c6c4)",
        borderRadius: 3,
        minWidth: 220,
      }}
    >
      {plans.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
};
