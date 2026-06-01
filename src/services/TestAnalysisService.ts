import * as SDK from "azure-devops-extension-sdk";
import { getClient } from "azure-devops-extension-api";
import { TestPlanRestClient } from "azure-devops-extension-api/TestPlan/TestPlanClient";
import { WorkItemTrackingRestClient } from "azure-devops-extension-api/WorkItemTracking/WorkItemTrackingClient";
import { TestPlanSummary, TestPlanInfo, SuiteStats, TestPointDetail, TestOutcome } from "../types";

// ── Base URL ──────────────────────────────────────────────────────────────────

let _baseUrl: string | null = null;

async function getTestPlanClient(): Promise<TestPlanRestClient> {
  await SDK.ready();
  return getClient(TestPlanRestClient);
}

async function getWorkItemTrackingClient(): Promise<WorkItemTrackingRestClient> {
  await SDK.ready();
  return getClient(WorkItemTrackingRestClient);
}

async function getAccessToken(): Promise<string> {
  await SDK.ready();
  const token = await SDK.getAccessToken();
  console.log(`[TestAnalysis] getAccessToken() tokenLength=${token?.length}`);
  return token;
}

async function getBaseUrl(): Promise<string> {
  if (_baseUrl) return _baseUrl;
  await SDK.ready();
  const host = SDK.getHost();
  const ref = document.referrer || "";
  const origin = window.location.origin;
  const pathname = window.location.pathname;

  console.log(
    `[TestAnalysis] getBaseUrl() host=`,
    host,
    `origin=${origin}`,
    `pathname=${pathname}`,
    `referrer=${ref}`
  );

  // Prefer host info for Azure DevOps Services.
  if (host?.isHosted && host.name) {
    _baseUrl = `https://dev.azure.com/${host.name}`;
    console.log(`[TestAnalysis] getBaseUrl() using hosted host: ${_baseUrl}`);
    return _baseUrl!;
  }

  // If the extension is loaded from the marketplace CDN, the referrer will
  // point back to the Azure DevOps portal. Prefer extracting org from referrer.
  if (ref) {
    try {
      const devMatch = ref.match(/^https?:\/\/dev\.azure\.com\/([^\/]+)/i);
      if (devMatch) {
        _baseUrl = `https://dev.azure.com/${devMatch[1]}`;
        console.log(`[TestAnalysis] getBaseUrl() using referrer dev.azure.com: ${_baseUrl}`);
        return _baseUrl!;
      }
      const vsMatch = ref.match(/^https?:\/\/([^\.]+)\.visualstudio\.com/i);
      if (vsMatch) {
        _baseUrl = `https://${vsMatch[1]}.visualstudio.com`;
        console.log(`[TestAnalysis] getBaseUrl() using referrer visualstudio.com: ${_baseUrl}`);
        return _baseUrl!;
      }

      const appsIdx = ref.indexOf("/_apps/");
      if (appsIdx > 0) {
        const beforeApps = ref.substring(0, appsIdx);
        const lastSlash = beforeApps.lastIndexOf("/");
        if (lastSlash > 8) {
          _baseUrl = beforeApps.substring(0, lastSlash);
          console.log(`[TestAnalysis] getBaseUrl() using referrer /_apps/ parse: ${_baseUrl}`);
          return _baseUrl!;
        }
      }
    } catch (e) {
      console.warn("[TestAnalysis] getBaseUrl() referrer parse failed", e);
    }
  }

  // On-prem URL fallback using host name, but avoid CDN origin.
  if (host?.name) {
    if (!origin.includes("gallerycdn.vsassets.io")) {
      _baseUrl = `${origin}/${host.name}`.replace(/\/$/, "");
      console.log(`[TestAnalysis] getBaseUrl() using origin + host.name: ${_baseUrl}`);
      return _baseUrl!;
    }
    console.log("[TestAnalysis] getBaseUrl() skipping origin fallback because current origin is CDN");
  }

  // As a final fallback, use the current origin.
  _baseUrl = origin;
  console.log(`[TestAnalysis] getBaseUrl() using origin fallback: ${_baseUrl}`);
  return _baseUrl!;
}

async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = await getAccessToken();
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    ...(init?.headers as Record<string, string>),
  };

  return fetch(url, {
    ...init,
    mode: "cors",
    credentials: "omit",
    headers,
  });
}

async function apiFetch<T>(url: string): Promise<T> {
  const res = await authFetch(url);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `HTTP ${res.status} ${res.statusText} — ${url}${body ? `\n${body}` : ""}`
    );
  }

  return res.json() as Promise<T>;
}

// ── Outcome mapping ───────────────────────────────────────────────────────────

// ADO Test Plan API returns outcome as a string in REST responses
function mapOutcome(outcome: string | number | undefined): TestOutcome {
  const s = String(outcome ?? "").toLowerCase();
  if (s === "passed"        || s === "2")  return "Passed";
  if (s === "failed"        || s === "3")  return "Failed";
  if (s === "blocked"       || s === "7")  return "Blocked";
  if (s === "paused"        || s === "12") return "Paused";
  if (s === "notapplicable" || s === "11") return "NotApplicable";
  if (s === "inprogress"    || s === "13") return "InProgress";
  return "NotRun";
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function loadPlans(project: string): Promise<TestPlanSummary[]> {
  const client = await getTestPlanClient();
  const plans = await client.getTestPlans(project, undefined, undefined, false, false);
  console.log(`[TestAnalysis] loadPlans() project=${project} count=${plans.length}`);
  return plans.map((p: any) => ({ id: p.id, name: p.name || "" }));
}

export async function loadPlanInfo(
  project: string,
  planId: number
): Promise<TestPlanInfo> {
  const client = await getTestPlanClient();
  const p = await client.getTestPlanById(project, planId);
  return {
    id: p.id,
    name: p.name || "",
    state: p.state || "",
    area: p.areaPath || "",
    iteration: p.iteration || "",
    rootSuiteName: p.rootSuite?.name || "",
  };
}

export async function loadSuiteStats(
  project: string,
  planId: number
): Promise<SuiteStats[]> {
  const testPlanClient = await getTestPlanClient();
  const workItemClient = await getWorkItemTrackingClient();
  const base = await getBaseUrl();
  const enc = encodeURIComponent(project);

  // Step 1: fetch all suites
  const suites = await testPlanClient.getTestSuitesForPlan(project, planId, undefined, undefined, false);
  console.log(`[TestAnalysis] ${suites.length} suite(s) for plan ${planId}`);

  // Step 2: fetch points for each suite in parallel
  const suitePointsPairs = await Promise.all(
    suites.map(async (suite: any) => {
      const points = await testPlanClient.getPoints(project, planId, suite.id, "", true, true);
      console.log(`  suite "${suite.name}" (${suite.id}): ${points.length} point(s)`);
      return { suite, points };
    })
  );

  // Step 3: batch-fetch work item titles
  const allTcIds = [
    ...new Set(
      suitePointsPairs
        .flatMap(({ points }) => points.map((p: any) => p.testCaseReference?.id as number))
        .filter((id) => !!id && id > 0)
    ),
  ];
  const wiMap = new Map<number, string>();
  if (allTcIds.length > 0) {
    try {
      for (let i = 0; i < allTcIds.length; i += 200) {
        const ids = allTcIds.slice(i, i + 200);
        const workItems = await workItemClient.getWorkItems(ids, project, ["System.Title"]);
        workItems.forEach((wi: any) => {
          if (wi?.id) wiMap.set(wi.id, wi.fields?.["System.Title"] || "");
        });
      }
    } catch { /* non-critical */ }
  }

  // Step 4: fetch failed step details for Failed/Blocked points
  const failedStepMap = new Map<number, string>();
  const failedPoints = suitePointsPairs
    .flatMap(({ points }) => points)
    .filter((p: any) => {
      const outcome = String(p.results?.outcome ?? "").toLowerCase();
      return (outcome === "failed" || outcome === "blocked" || outcome === "3" || outcome === "7") &&
        (p.results?.lastTestRunId ?? 0) > 0 &&
        (p.results?.lastResultId ?? 0) > 0;
    });
  await Promise.all(
    failedPoints.map(async (p: any) => {
      try {
        const itUrl = `${base}/${enc}/_apis/test/Runs/${p.results.lastTestRunId}/Results/${p.results.lastResultId}/iterations?includeActionResults=true&api-version=5.0`;
        const itData = await apiFetch<{ value: any[] }>(itUrl);
        const iters = itData.value || [];
        if (!iters.length) return;
        const last = iters[iters.length - 1];
        const iterError = last?.errorMessage || "";
        const failedAction = (last?.actionResults || []).slice().reverse()
          .find((a: any) => {
            const o = String(a.outcome ?? "").toLowerCase();
            return o === "failed" || o === "3";
          });
        const stepText = failedAction?.actionPath ? `Step ${failedAction.actionPath}` : "";
        const errorMsg = failedAction?.errorMessage || failedAction?.comment || iterError || "";
        const detail = [stepText, errorMsg].filter(Boolean).join(" — ");
        if (detail) failedStepMap.set(p.id, detail);
      } catch { /* ignore */ }
    })
  );

  // Step 5: build SuiteStats array
  const statsArray: SuiteStats[] = suitePointsPairs.map(({ suite, points }) => {
    const counts = { passed: 0, failed: 0, notRun: 0, inProgress: 0, blocked: 0, paused: 0, notApplicable: 0 };
    const pointDetails: TestPointDetail[] = points.map((p: any) => {
      const outcome = mapOutcome(p.results?.outcome);
      counts[outcomeKey(outcome)]++;
      const tcId = p.testCaseReference?.id ?? 0;
      return {
        id: p.id,
        testCaseId: tcId,
        testCaseName: wiMap.get(tcId) || p.testCaseReference?.name || `TC #${tcId}`,
        outcome,
        assignedTo:
          p.testCaseReference?.assignedTo?.displayName?.split(" <")[0] ||
          p.tester?.displayName?.split(" <")[0] ||
          "Unassigned",
        configuration: p.configuration?.name || "",
        failureType:   String(p.results?.failureType ?? ""),
        comment:       p.comment || "",
        failedStep:    failedStepMap.get(p.id) || "",
        lastRunId:     p.results?.lastTestRunId ?? 0,
        url:           p.url || "",
      };
    });
    return {
      suiteId:   suite.id,
      suiteName: suite.name,
      parentId:  suite.parentSuite?.id ?? null,
      suiteType: suite.suiteType || "",
      suiteState: suite.state || "",
      level: 0,
      assignedTo:
        suite.defaultTesters?.length > 0
          ? suite.defaultTesters[0].displayName || "Unassigned"
          : "Unassigned",
      url: suite.url || "",
      ...counts,
      totalPoints: points.length,
      totalPassed: 0, totalFailed: 0, totalNotRun: 0,
      totalInProgress: 0, totalBlocked: 0, totalPaused: 0, totalNotApplicable: 0,
      totalIncludeChildren: points.length,
      children: [],
      points: pointDetails,
    };
  });

  buildTree(statsArray);
  return statsArray;
}

// ── Tree helpers ──────────────────────────────────────────────────────────────

function outcomeKey(
  o: TestOutcome
): "passed" | "failed" | "notRun" | "inProgress" | "blocked" | "paused" | "notApplicable" {
  switch (o) {
    case "Passed":        return "passed";
    case "Failed":        return "failed";
    case "Blocked":       return "blocked";
    case "Paused":        return "paused";
    case "NotApplicable": return "notApplicable";
    case "InProgress":    return "inProgress";
    default:              return "notRun";
  }
}

function buildTree(suites: SuiteStats[]): void {
  const map = new Map<number, SuiteStats>(suites.map((s) => [s.suiteId, s]));

  suites.forEach((s) => {
    if (s.parentId !== null) {
      const parent = map.get(s.parentId);
      if (parent) parent.children.push(s);
    }
  });

  const roots = suites.filter(
    (s) => s.parentId === null || !map.has(s.parentId)
  );
  roots.forEach((r) => assignLevels(r, 0));
  roots.forEach((r) => computeAggregateTotals(r));
}

function assignLevels(suite: SuiteStats, level: number): void {
  suite.level = level;
  suite.children.forEach((c) => assignLevels(c, level + 1));
}

function computeAggregateTotals(suite: SuiteStats): void {
  suite.totalPassed        = suite.passed;
  suite.totalFailed        = suite.failed;
  suite.totalNotRun        = suite.notRun;
  suite.totalInProgress    = suite.inProgress;
  suite.totalBlocked       = suite.blocked;
  suite.totalPaused        = suite.paused;
  suite.totalNotApplicable = suite.notApplicable;

  suite.children.forEach((child) => {
    computeAggregateTotals(child);
    suite.totalPassed        += child.totalPassed;
    suite.totalFailed        += child.totalFailed;
    suite.totalNotRun        += child.totalNotRun;
    suite.totalInProgress    += child.totalInProgress;
    suite.totalBlocked       += child.totalBlocked;
    suite.totalPaused        += child.totalPaused;
    suite.totalNotApplicable += child.totalNotApplicable;
  });
  suite.totalIncludeChildren =
    suite.totalPassed + suite.totalFailed + suite.totalNotRun +
    suite.totalInProgress + suite.totalBlocked + suite.totalPaused + suite.totalNotApplicable;
}

