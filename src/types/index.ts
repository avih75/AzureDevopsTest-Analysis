// ── Shared TypeScript types for Test Analysis v2 ─────────────────────────────

export type TestOutcome =
  | "Passed"
  | "Failed"
  | "NotRun"
  | "InProgress"
  | "Blocked"
  | "Paused"
  | "NotApplicable";

export interface TestPlanSummary {
  id: number;
  name: string;
}

export interface TestPlanInfo {
  id: number;
  name: string;
  state: string;
  area: string;
  iteration: string;
  rootSuiteName: string;
}

export interface TestPointDetail {
  id: number;
  testCaseId: number;
  testCaseName: string;
  outcome: TestOutcome;
  assignedTo: string;
  configuration: string;
  failureType: string;
  comment: string;
  /** Resolved lazily — only populated for Failed/Blocked points */
  failedStep: string;
  lastRunId: number;
  url: string;
}

export interface SuiteStats {
  suiteId: number;
  suiteName: string;
  parentId: number | null;
  suiteType: string;
  suiteState: string;
  level: number;
  assignedTo: string;
  url: string;
  // isolated (own points only) counts
  passed: number;
  failed: number;
  notRun: number;
  inProgress: number;
  blocked: number;
  paused: number;
  notApplicable: number;
  totalPoints: number;
  // aggregate (including children) counts — computed client-side
  totalPassed: number;
  totalFailed: number;
  totalNotRun: number;
  totalInProgress: number;
  totalBlocked: number;
  totalPaused: number;
  totalNotApplicable: number;
  totalIncludeChildren: number;
  children: SuiteStats[];
  points: TestPointDetail[];
}
