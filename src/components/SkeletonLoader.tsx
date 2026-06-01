import React from "react";

const SHIMMER: React.CSSProperties = {
  background:
    "linear-gradient(90deg, var(--palette-neutral-4,#f3f2f1) 25%, var(--palette-neutral-8,#edebe9) 50%, var(--palette-neutral-4,#f3f2f1) 75%)",
  backgroundSize: "200% 100%",
  animation: "ta-shimmer 1.5s infinite",
  borderRadius: 3,
  height: 14,
};

const KEYFRAMES = `@keyframes ta-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`;

export const SkeletonRow: React.FC<{ cols?: number }> = ({ cols = 5 }) => (
  <tr>
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} style={{ padding: "8px 12px" }}>
        <div style={{ ...SHIMMER, width: i === 0 ? "60%" : "40%" }} />
      </td>
    ))}
  </tr>
);

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 9,
}) => (
  <>
    <style>{KEYFRAMES}</style>
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} cols={cols} />
      ))}
    </tbody>
  </>
);

export const SkeletonBlock: React.FC<{ height?: number; width?: string }> = ({
  height = 200,
  width = "100%",
}) => (
  <>
    <style>{KEYFRAMES}</style>
    <div style={{ ...SHIMMER, height, width }} />
  </>
);
