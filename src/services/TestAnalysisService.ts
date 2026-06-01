import * as SDK from "azure-devops-extension-sdk";
import {
  TestPlanSummary,
  TestPlanInfo,
  SuiteStats,
  TestPointDetail,
  TestOutcome,
} from "../types";

// ── Base URL ──────────────────────────────────────────────────────────────────

let _baseUrl: string | null = null;

async function getBaseUrl(): Promise<string> {
  if (_baseUrl) return _baseUrl;
  await SDK.ready();
  const ctx = SDK.getWebContext();
  const host = SDK.getHost();

  // Strategy 1: SDK collection URI — correct for both cloud and on-prem (includes /tfs/ prefix)
  const sdkUri: string = ((ctx as any)?.collection?.uri ?? (ctx as any)?.account?.uri ?? "").replace(/\/$/, "");

  // Strategy 2: Parse referrer — split at /_apps/ and strip the trailing project segment
  let referrerBase = "";
  const referrer = document.referrer || "";
  if (referrer) {
    try {
      const appsIdx = referrer.indexOf("/_apps/");
      if (appsIdx > 0) {
        const beforeApps = referrer.substring(0, appsIdx);
        const lastSlash  = beforeApps.lastIndexOf("/");
        referrerBase = beforeApps.substring(0, lastSlash);
      }
    } catch { /* ignore */ }
  }

  // Strategy 3: origin + host.name (fails when TFS has a virtual dir prefix like /tfs/)
  const hostBase = host?.name ? `${window.location.origin}/${host.name}` : "";

  _baseUrl = sdkUri || referrerBase || hostBase;
  return _baseUrl;
}

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`);
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
  const base = await getBaseUrl();
  const url = `${base}/${encodeURIComponent(project)}/_apis/testplan/plans?api-version=5.0`;
  const data = await apiFetch<{ value: any[] }>(url);
  return (data.value || []).map((p: any) => ({ id: p.id, name: p.name }));
}

export async function loadPlanInfo(
  project: string,
  planId: number
): Promise<TestPlanInfo> {
  const base = await getBaseUrl();
  const url = `${base}/${encodeURIComponent(project)}/_apis/testplan/plans/${planId}?api-version=5.0`;
  const p = await apiFetch<any>(url);
  return {
    id: p.id,
    name: p.name,
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
  const base = await getBaseUrl();
  const enc  = encodeURIComponent(project);

  // Step 1: fetch all suites
  const suitesUrl = `${base}/${enc}/_apis/testplan/Plans/${planId}/suites?api-version=5.2-preview.1`;
  const suitesData = await apiFetch<{ value: any[] }>(suitesUrl);
  const suites: any[] = suitesData.value || [];
  console.log(`[TestAnalysis] ${suites.length} suite(s) for plan ${planId}`);

  // Step 2: fetch points for each suite in parallel
  const suitePointsPairs = await Promise.all(
    suites.map(async (suite: any) => {
      let allPoints: any[] = [];
      let continuationToken: string | null = null;
      do {
        const tokenParam: string = continuationToken ? `&continuationToken=${continuationToken}` : "";
        const ptUrl: string = `${base}/${enc}/_apis/testplan/Plans/${planId}/Suites/${suite.id}/TestPoint?returnIdentityRef=true&includePointDetails=true&api-version=5.2-preview.2${tokenParam}`;
        const res: Response = await fetch(ptUrl, { credentials: "include", headers: { Accept: "application/json" } });
        if (!res.ok) break;
        continuationToken = res.headers.get("x-ms-continuationtoken");
        const data = await res.json() as { value: any[] };
        allPoints = allPoints.concat(data.value || []);
      } while (continuationToken);
      console.log(`  suite "${suite.name}" (${suite.id}): ${allPoints.length} point(s)`);
      return { suite, points: allPoints };
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
        const wiUrl = `${base}/${enc}/_apis/wit/workitems?ids=${ids.join(",")}&fields=System.Title&api-version=5.0`;
        const wiData = await apiFetch<{ value: any[] }>(wiUrl);
        (wiData.value || []).forEach((wi: any) => {
          if (wi?.id) wiMap.set(wi.id, wi.fields?.["System.Title"] || "");
        });
      }
    } catch { /* non-critical */ }
  }

  // Step 4: fetch failed step details for Failed/Blocked points
  const failedStepMap = new Map<number, string>(); // keyed by point id
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

