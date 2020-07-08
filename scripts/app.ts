import Grids = require("VSS/Controls/Grids");
import Controls = require("VSS/Controls");
import Services = require("Charts/Services");
import TestRestClient = require("TFS/TestManagement/RestClient");
import WorkItemManagment = require("TFS/WorkItemTracking/RestClient");
import { TestPlan, TestSuite, TestPoint, ResultDetails } from "TFS/TestManagement/Contracts";
import { CommonChartOptions, ChartTypesConstants, ClickEvent, LegendOptions, TooltipOptions } from "Charts/Contracts";
import { CsvDataService } from "./CsvHelper";
import { GetLastTimeValue, SetValue } from "./storageHelper";
import { WorkItemExpand } from "TFS/WorkItemTracking/Contracts";
let testClient = TestRestClient.getClient();
let WIClient: WorkItemManagment.WorkItemTrackingHttpClient4_1 = WorkItemManagment.getClient();
let SumSuitesforExecell: Array<SumeSuite>;
let palnInfoExcell: Array<TestSuiteModel>;
const csvFileName: string = "Export.csv";
let selectedId: number = 0;
class TestPointModel {
    id: string;
    FaildStep: string;
    outCome: string;
    lastTestRun: string;
    assignedTo: string;
    comment: string;
    failureType: string;
    configuration: string;
    testCaseId: string;
    testCaseName: string;
    testCaseType: string;
    incompliteTests: number;
    notApplicableTests: number;
    passedTests: number;
    totalTests: number;
    postProcessState: string;
}
class TestCaseModel {
    testCaseId: string;
    testCaseName: string;
    testCaseType: string;
    state: string;
    outCome: string;
    lastTestRun: string;
    assignedTo: string;
    comment: string;
    failureType: string;
}
class TestSuiteModel {
    suiteId: number;
    perentId: string;
    suiteName: string;
    suiteState: string;
    childrenSuites: Array<TestSuiteModel>;
    testCaseList: Array<TestCaseModel>;
    testPointList: Array<TestPointModel>;
    suiteType: string;
    testCaseCount: number;
    allTestCases: number;
    testSuiteLevel: number;
} class SumeSuite {
    SuiteName: string;
    Passed: number;
    Failed: number;
    NotRun: number;
    totalPoints: number;
    NotApplicable: number;
    InProgress: number;
    Paused: number;
    Blocked: number;
    suiteLevel: number;
}
async function Init_Page(): Promise<void> {
    let webContext = VSS.getWebContext();
    try {
        selectedId = await GetLastTimeValue(webContext.user.name + "_" + webContext.project.name);
    }
    catch{

    }
    VSS.resize();
    VSS.applyTheme("Dark");
    buildView();
    // start with graph view
    $("#Graphs").prop("checked", true);
    $("#graph-container").show();
    $("#level").val(0);
    let $excellButton = $("#excellButton");
    $excellButton.click(() => {
        CsvDataService.exportToCsv(csvFileName, SumSuitesforExecell);
    });
    $("#graph-container").on("click", "#refresh", function () {
        let selectedPlan = $("#selectPlan").children("option:selected").val();
        let projectName = VSS.getWebContext().project.name;
        let selectPlan = $("#selectPlan");
        BuildTableTestGrid(projectName, selectedPlan, selectPlan);
        BuildTestsSum(projectName, selectedPlan);
    }
    );
    $("#graph-container").on("change", "#deep", function () {
        let deep = $('#deep').is(":checked");
        if (deep == true) {
            $("#level").hide();
            $("#levelText").hide();
        }
        else {
            $("#level").show();
            $("#levelText").show();
        }
    }
    );
}
function buildView() {
    let selectPlan = $("#selectPlan");
    $("#PlanInfos").hide();
    $("#grid-container").hide();
    $("#table-container").hide();
    $("#graph-container").hide();
    $("#level").hide();
    $("#levelText").hide();
    selectPlan.hide();
    let projectName = VSS.getWebContext().project.name;
    BuildRadioButton()
    BuildSelect(projectName, selectPlan);
}
function BuildRadioButton() {
    let $excellButton = $("#excellButton");
    $('input[type=radio][name=view]').change(function () {
        if (this.value == 'Suite Table') {
            $excellButton.click(() => {
                CsvDataService.exportToCsv(csvFileName, palnInfoExcell);
            });
            $("#PlanInfos").show();
            $("#grid-container").show();
            $("#table-container").hide();
            $("#graph-container").hide();
        }
        else if (this.value == 'Test Table') {
            $excellButton.click(() => {
                CsvDataService.exportToCsv(csvFileName, SumSuitesforExecell);
            });
            $("#grid-container").hide();
            $("#PlanInfos").hide();
            $("#table-container").show();
            $("#graph-container").hide();
        }
        else if (this.value == 'Test Graphs') {
            $excellButton.click(() => {
                CsvDataService.exportToCsv(csvFileName, SumSuitesforExecell)
            });
            $("#grid-container").hide();
            $("#PlanInfos").hide();
            $("#table-container").hide();
            $("#graph-container").show();
        }
    });
}
async function BuildSelect(projectName: string, selectPlan: JQuery) {
    let webContext = VSS.getWebContext();
    selectPlan.attr("disabled", "true");
    selectPlan.change(async function () {
        selectPlan.attr("disabled", "true");
        let selectedPlan = $(this).children("option:selected").val();
        SetValue(webContext.user.name + "_" + webContext.project.name, selectedPlan);
        await BuildTableTestGrid(projectName, selectedPlan, selectPlan);
        await BuildTestsSum(projectName, selectedPlan);
        selectPlan.removeAttr("disabled");
    });
    testClient._setInitializationPromise(testClient.authTokenManager.getAuthToken());
    WIClient._setInitializationPromise(testClient.authTokenManager.getAuthToken());
    let plans: TestPlan[] = await testClient.getPlans(projectName);
    /////////
    // testClient.getPlans(projectName).then(async (plans) => {
    //let firstPlan: number = 0;
    let flag: boolean = false;
    let firstPlan = 0;
    plans.forEach(plan => {
        selectPlan.append(new Option(plan.name, plan.id.toString()));
        if (plan.id == selectedId)
            flag = true;
        if (firstPlan == 0)
            firstPlan = plan.id;
    });
    if (flag) {
        firstPlan = selectedId;
    }
    else {
        SetValue(webContext.user.name + "_" + webContext.project.name, firstPlan);
    }
    $("#loading").hide();
    selectPlan.val(firstPlan);
    selectPlan.show();
    await BuildTableTestGrid(projectName, firstPlan, selectPlan);
    await BuildTestsSum(projectName, firstPlan);
    // })
    selectPlan.removeAttr("disabled");
}
async function BuildTableTestGrid(projectName: string, testPlanId: number, selectPlan: JQuery): Promise<void> {
    // turn off all view
    $("#mainFunction").attr("disabled", "true");
    selectPlan.attr("disabled", "true");
    $("#analyzingGif").show();
    // turn on gif waiting
    let container = $("#grid-container");
    let planInfo = $("#PlanInfos");
    container.empty();
    planInfo.empty();
    let selectedPlan = await testClient.getPlanById(projectName, testPlanId);
    ShowPlaneInfos(selectedPlan, testPlanId, planInfo, projectName);
    let palneFullInfo: Array<TestSuiteModel> = await GetTestPlanSuites(selectedPlan, testPlanId, planInfo, projectName);
    palnInfoExcell = palneFullInfo;
    let rootTestCase: TestSuiteModel = ReArangeSuiteList(palneFullInfo);
    BuildTreeView(rootTestCase);
    $("#mainFunction").removeAttr("disabled");
    selectPlan.removeAttr("disabled");
    $("#analyzingGif").hide();
}
function ShowPlaneInfos(selectedPlan: TestPlan, testPlanId: number, planInfo: JQuery, projectName: string) {
    let table = $("<table />");
    let tr = $("<tr />");
    tr.append(TextView("Project:", 5));
    tr.append(TextView(projectName, 6));
    tr.append(TextView("Plan:", 5));
    tr.append(TextView(testPlanId, 6));
    tr.append(TextView("Root Suite:", 5));
    tr.append(TextView(selectedPlan.rootSuite.name, 6));
    tr.append(TextView("Iteration:", 5));
    tr.append(TextView(selectedPlan.iteration, 6));
    tr.append(TextView("Area:", 5));
    tr.append(TextView(selectedPlan.area, 6));
    tr.append(TextView("State:", 5));
    tr.append(TextView(selectedPlan.state, 6));
    table.append(tr);
    planInfo.append(table);
}
async function GetTestPlanSuites(selectedPlan: TestPlan, testPlanId: number, planInfo: JQuery, projectName: string) {
    let suites = await testClient.getTestSuitesForPlan(projectName, testPlanId);
    if (suites.length > 0) {
        return await GetTestSuites(suites, projectName, testPlanId);
    }
    else {
        return new Array<TestSuiteModel>();;
    }
}
async function GetTestSuites(suites: TestSuite[], projectName: string, testPlanId: number) {
    let planFullInfo: Array<TestSuiteModel> = new Array<TestSuiteModel>();
    for (const suite of suites) {
        let newSuite: TestSuiteModel = new TestSuiteModel();
        newSuite.suiteId = suite.id;
        try {
            newSuite.perentId = suite.parent.id;
            newSuite.testSuiteLevel = -1;
        }
        catch {
            newSuite.perentId = "0";
            newSuite.testSuiteLevel = 0;
        };
        newSuite.allTestCases = suite.testCaseCount;
        newSuite.suiteName = suite.name;
        newSuite.suiteType = suite.suiteType;
        newSuite.testCaseCount = suite.testCaseCount;
        newSuite.suiteState = suite.state;
        newSuite.childrenSuites = Array<TestSuiteModel>();
        newSuite.testPointList = await GetTestPoints(projectName, testPlanId, suite.id)
        planFullInfo.push(newSuite);
    }
    return planFullInfo;
}
async function GetTestPoints(projectName: string, testPlanId: number, suiteId: number) {
    let TestPointList = new Array<TestPointModel>();
    let testPoints = await testClient.getPoints(projectName, testPlanId, suiteId);
    for (const testPoint of testPoints) {
        let testPointModel: TestPointModel = await GetTestRunsResults(projectName, testPoint, testPlanId, suiteId);
        TestPointList.push(testPointModel);
    }
    return TestPointList;
}
async function GetTestRunsResults(projectName: string, testPoint: TestPoint, testPlanId: number, suiteId: number) {
    let incomplite: number = 0;
    let notApplicable: number = 0;
    let passed: number = 0;
    let total: number = 0;
    let postProcess: string = "";
    let stepFaild: string = "";
    let outcome: string = testPoint.outcome;
    let TestCaseWI = await WIClient.getWorkItem(+testPoint.testCase.id, null, null, WorkItemExpand.All);
    let testName = TestCaseWI.fields["System.Title"].toString();
    if (testPoint.lastTestRun.id != "0") {
        let run = await testClient.getTestRunById(projectName, +testPoint.lastTestRun.id);
        let testResult2 = await testClient.getTestIterations(projectName, run.id, +testPoint.lastResult.id, true);
        testResult2.forEach(result => {
            if (result.outcome == undefined) {
                outcome = "In Progress";
            }
            let actionResolt = result.actionResults.pop();
            if (actionResolt != undefined && actionResolt.outcome == "Failed") {
                let steps: Element = $.parseXML(TestCaseWI.fields["Microsoft.VSTS.TCM.Steps"]).children[0];
                let xx: string;
                if (steps != null && steps != undefined) {
                    for (var i = 0; i < steps.childNodes.length; i++) {
                        let y = +actionResolt.actionPath
                        let x = +steps.children[i].id;
                        if (x == y) {
                            xx = steps.children[i].textContent;
                        }
                    }
                }
                stepFaild = (+actionResolt.actionPath) + ";" + xx + ";" + actionResolt.comment + ";" + actionResolt.errorMessage
            }
        })
        incomplite = run.incompleteTests;
        notApplicable = run.notApplicableTests;
        passed = run.passedTests;
        total = run.totalTests;
        postProcess = run.postProcessState;
    }
    if (outcome == "Unspecified") {
        outcome = "Not Run";
    }
    let assingTo: string = "None";
    if (testPoint.assignedTo.displayName != null) {
        assingTo = testPoint.assignedTo.displayName.split(' <')[0];
    }
    let testPointModel: TestPointModel = {
        incompliteTests: incomplite,
        notApplicableTests: notApplicable,
        passedTests: passed,
        postProcessState: postProcess,
        totalTests: total,
        id: testPoint.id.toString(),
        assignedTo: assingTo,
        comment: testPoint.comment,
        outCome: outcome,
        lastTestRun: testPoint.lastTestRun.name,
        failureType: testPoint.failureType,
        testCaseId: testPoint.testCase.id,
        FaildStep: stepFaild,
        testCaseName: testName,
        testCaseType: testPoint.testCase.type,
        configuration: testPoint.configuration.name
    }
    return testPointModel;
}
function ReArangeSuiteList(palneFullInfo: Array<TestSuiteModel>) {
    let rootSuite: TestSuiteModel;
    palneFullInfo.forEach(TestSuiteChilde => {
        if (+TestSuiteChilde.perentId > 0) {
            palneFullInfo.forEach(TestSiuteFather => {
                if (+TestSuiteChilde.perentId == TestSiuteFather.suiteId) {
                    TestSiuteFather.childrenSuites.push(TestSuiteChilde);
                }
            });
        }
        else {
            rootSuite = TestSuiteChilde;
        }
    });
    palneFullInfo.forEach(suite => {
        if (suite.childrenSuites.length > 0) {
            suite.childrenSuites.forEach(child => {
                child.testSuiteLevel = suite.testSuiteLevel + 1;
            });
        }
    });
    return rootSuite;
}
function BuildTreeView(rootTestCase: TestSuiteModel) {
    let MasterDiv = $("#grid-container");
    let mainUl = $("<ul />");
    mainUl.addClass("myUL");
    mainUl.append(BuildTreeSuiteView(rootTestCase));
    MasterDiv.append(mainUl);
}
function BuildTreeSuiteView(rootTestCase: TestSuiteModel) {
    let tr = $("<tr />");
    tr.append(TextView("Suite:", 3));
    tr.append(TextView(rootTestCase.suiteName, 4));
    tr.append(TextView("Type:", 3));
    tr.append(TextView(rootTestCase.suiteType, 4));
    tr.append(TextView("State:", 3));
    tr.append(TextView(rootTestCase.suiteState, 4));
    tr.append(TextView("Local Count:", 3));
    tr.append(TextView(rootTestCase.testCaseCount, 4));
    let span = $("<span />");
    span.addClass("caret");
    span.append(tr);
    let li = $("<dt />");
    li.append(span);
    let ul = $("<ul />");
    ul.addClass("nested")
    span.click(() => {
        ul.toggleClass("active");
        span.toggleClass("caret-down");
    });
    rootTestCase.childrenSuites.forEach(suite => {
        ul.append(BuildTreeSuiteView(suite));
        rootTestCase.allTestCases = rootTestCase.allTestCases + suite.allTestCases;
    });
    rootTestCase.testPointList.forEach(point => {
        ul.append(BuildTreeTestView(point));
    });
    tr.append(TextView("Total Count:", 3));
    tr.append(TextView(rootTestCase.allTestCases, 4));
    li.append(ul);
    return li;
}
function BuildTreeTestView(point: TestPointModel) {
    let tr = $("<tr />");
    tr.addClass("testClass");
    tr.append(TextView("Test:", 1));
    tr.append(TextView(point.testCaseName, 2));
    tr.append(TextView("Outcome:", 1));
    tr.append(TextView(point.outCome, 2));
    tr.append(TextView("Failed step:", 1));
    tr.append(TextView(point.FaildStep, 2));
    tr.append(TextView("Assigned To:", 1));
    tr.append(TextView(point.assignedTo, 2));
    tr.append(TextView("Configuration:", 1));
    tr.append(TextView(point.configuration, 2));
    tr.append(TextView("Failure Type:", 1));
    tr.append(TextView(point.failureType, 2));
    // tr.append(TextView("Passed:", 1));
    // tr.append(TextView(point.passedTests, 2));
    // tr.append(TextView("Incomplit:", 1));
    // tr.append(TextView(point.incompliteTests, 2));
    // tr.append(TextView("Not Applicable:", 1));
    // tr.append(TextView(point.notApplicableTests, 2));
    // tr.append(TextView("Total:", 1));
    // tr.append(TextView(point.totalTests, 2));
    tr.append(TextView("Type:", 1));
    tr.append(TextView(point.testCaseType, 2));
    tr.append(TextView("Comment:", 1));
    tr.append(TextView(point.comment ? point.comment : "", 2));
    return tr;
}
function TextView(lable: any, size: number) {
    // 1-testLableInfo  2-testInfo  3-suitLable  4-suitInfo  5-planeLable  6-planeInfo
    let textSpan = $("<td />");
    textSpan.text(lable);
    switch (size) {
        case 1: {
            textSpan.addClass("testLableInfo");
            break;
        }
        case 2: {
            textSpan.addClass("testInfo");
            break;
        }
        case 3: {
            textSpan.addClass("suitLable");
            break;
        }
        case 4: {
            textSpan.addClass("suitInfo");
            break;
        }
        case 5: {
            textSpan.addClass("planeLable");
            break;
        }
        case 6: {
            textSpan.addClass("planeInfo");
            break;
        }
    }
    return textSpan;
}
async function BuildTestsSum(projectName: string, selectedPlane: number) {
    let planInfo = $("#PlanInfos");
    planInfo.empty();
    let totalTests: SumeSuite = {
        SuiteName: "Total",
        Blocked: 0,
        Failed: 0,
        InProgress: 0,
        NotApplicable: 0,
        NotRun: 0,
        Passed: 0,
        Paused: 0,
        totalPoints: 0,
        suiteLevel: 0
    }
    let SumSuites: Array<SumeSuite> = new Array<SumeSuite>();
    let suites = await testClient.getTestSuitesForPlan(projectName, selectedPlane);
    let rootName: string = "";
    for (const suite of suites) {
        if (rootName == "" && suite.parent == undefined) {
            rootName = suite.name;
        }
        let newSuite: SumeSuite = await GetSuiteSum(suite, rootName);
        totalTests.Blocked += newSuite.Blocked;
        totalTests.Failed += newSuite.Failed;
        totalTests.InProgress += newSuite.InProgress;
        totalTests.NotApplicable += newSuite.NotApplicable;
        totalTests.NotRun += newSuite.NotRun;
        totalTests.Passed += newSuite.Passed;
        totalTests.Paused += newSuite.Paused;
        totalTests.totalPoints += newSuite.totalPoints;
        SumSuites.push(newSuite);
    };
    SumSuites.sort((a: SumeSuite, b: SumeSuite) => b.totalPoints - a.totalPoints);
    SumSuites.push(totalTests);
    SumSuitesforExecell = SumSuites;
    BuildTestsView(SumSuites);
    BuildGraphs(SumSuites);
}
async function GetSuiteSum(suite: TestSuite, rootName: string) {
    let suiteSum: SumeSuite = new SumeSuite();
    palnInfoExcell.forEach(element => {
        if (element.suiteName == suite.name)
            suiteSum.suiteLevel = element.testSuiteLevel;
    });
    suiteSum.SuiteName = suite.name;
    suiteSum.Blocked = 0
    suiteSum.Paused = 0
    suiteSum.Passed = 0
    suiteSum.Failed = 0
    suiteSum.NotRun = 0
    suiteSum.NotApplicable = 0
    suiteSum.InProgress = 0
    suiteSum.totalPoints = suite.testCaseCount
    let points = await testClient.getPoints(suite.project.name, +suite.plan.id, suite.id);
    for (const point of points) {
        switch (point.outcome) {
            case "None": {
                suiteSum.InProgress += 1;
                break;
            }
            case "NotApplicable": {
                suiteSum.NotApplicable += 1;
                break;
            }
            case "Blocked": {
                suiteSum.Blocked += 1;
                break;
            }
            case "Paused": {
                suiteSum.Paused += 1;
                break;
            }
            case "Passed": {
                suiteSum.Passed += 1;
                break;
            }
            case "Failed": {
                suiteSum.Failed += 1;
                break;
            }
            case "Unspecified": {
                suiteSum.NotRun += 1;
                break;
            }
        }
    };
    return suiteSum;
}
function BuildTestsView(SumSuites: Array<SumeSuite>) {
    var graphContainer = $("#table-container");
    graphContainer.empty();
    let container: JQuery = $("<div />")
    container.addClass("TestSuit");
    var gridTestSuiteOptions: Grids.IGridOptions = {
        height: (30 * (SumSuites.length + 1)).toString(),
        source: SumSuites,
        header: true,
        columns: [
            { text: "Suite Name", width: 100, index: "SuiteName" },
            { text: "Total", width: 80, index: "totalPoints" },
            { text: "Passed", width: 80, index: "Passed" },
            { text: "Failed", width: 80, index: "Failed" },
            { text: "Not Run", width: 80, index: "NotRun" },
            { text: "Not Applicable", width: 80, index: "NotApplicable" },
            { text: "In Progress", width: 80, index: "InProgress" },
            { text: "Paused", width: 80, index: "Paused" },
            { text: "Blocked", width: 80, index: "Blocked" }
        ]
    };
    var target = Controls.create(Grids.Grid, container, gridTestSuiteOptions);
    target.setDataSource(SumSuites);
    graphContainer.append(container);
}
function BuildGraphs(SumSuites: Array<SumeSuite>) {
    let $container = $('#graph-container');
    let $table = $("<table />");
    let $radioButtons = $("#DeepRadioButton");
    $container.empty();
    $container.css("width", "100%");
    $container.append($radioButtons);
    let $firstLine = $("<div />");
    let $secondLine = $("<tr />");
    let $therdLine = $("<tr />");

    let $spanMainChart = $("<span />");
    $firstLine.append($spanMainChart);

    let $selectedPieLabell = $("<td />");
    $selectedPieLabell.text("Selected Suite");
    $selectedPieLabell.addClass("graphLabels");
    let $totalLabell = $("<td />");
    $totalLabell.text("Total Suites");
    $totalLabell.addClass("graphLabels");
    let $emptySuiteLabell = $("<td />");
    $emptySuiteLabell.text("Empty Suites");
    $emptySuiteLabell.addClass("graphLabels");
    let $selectedChart = $("<td />");
    //$selectedChart.text("Selectd Suite Chart");
    $selectedChart.addClass("graphLabels");
    $secondLine.append($totalLabell);
    $secondLine.append($selectedPieLabell);
    $secondLine.append($emptySuiteLabell);
    $secondLine.append($selectedChart);

    let $spanTotalPie = $("<span />");
    let $spanDynamiclPie = $("<span />");
    let $spanEmptySuites = $("<span />");
    let $spanSelectedChart = $("<span />");
    let $totalSuitesPie = $("<td />");
    let $selectedSuitePie = $("<td />");
    let $selectedSuiteChart = $("<td />");
    let $emptySuitt = $("<td />");
    $emptySuitt.css("vertical-align", "text-top");
    //$totalSuitesPie.css("vertical-align", "text-top");
    //$selectedSuitePie.css("vertical-align", "text-top");
    //$selectedSuiteChart.css("vertical-align", "text-top");
    $totalSuitesPie.append($spanTotalPie);
    $selectedSuitePie.append($spanDynamiclPie);
    $emptySuitt.append($spanEmptySuites);
    $selectedSuiteChart.append($spanSelectedChart)
    $therdLine.append($totalSuitesPie);
    $therdLine.append($selectedSuitePie);
    $therdLine.append($emptySuitt);
    $therdLine.append($selectedSuiteChart)

    $container.append($firstLine);
    $table.append($secondLine);
    $table.append($therdLine);
    $container.append($table);

    let cakeGraphId = SumSuites.length - 1;
    BuildStackedColumnChart(SumSuites, $spanMainChart, $spanDynamiclPie, $spanEmptySuites, $selectedSuiteChart);
    BuildPieChart(SumSuites[0], $spanDynamiclPie, "Total Suits");
    BuildPieChart(SumSuites[cakeGraphId], $spanTotalPie, "Selected Suits");
}
function BuildStackedColumnChart(SumSuites: Array<SumeSuite>, $graphSpan: JQuery, $dinamicPieSpan: JQuery, $emptySuite: JQuery, $selectedChart: JQuery) {
    let deep = $('#deep').is(":checked");
    let howDeep = $("#level").val();
    let Paused = [];
    let Blocked = [];
    let Passed = [];
    let Failed = [];
    let NotRun = [];
    let NotApplicable = [];
    let InProgress = [];
    let labels = [];
    let emptySuites = [];
    for (let i = 0; i < SumSuites.length - 1; i++) {
        if (deep == true || SumSuites[i].suiteLevel <= howDeep) {
            if (SumSuites[i].totalPoints > 0) {
                labels.push(SumSuites[i].SuiteName);
                Passed.push([i, SumSuites[i].Passed]);
                Failed.push([i, SumSuites[i].Failed]);
                NotRun.push([i, SumSuites[i].NotRun]);
                InProgress.push([i, SumSuites[i].InProgress]);
                NotApplicable.push([i, SumSuites[i].NotApplicable]);
                Paused.push([i, SumSuites[i].Paused]);
                Blocked.push([i, SumSuites[i].Blocked]);
            }
            else {
                emptySuites.push(SumSuites[i].SuiteName);
            }
        }
    }
    let series = [];
    series.push({
        name: "Paused",
        data: Paused
    });
    series.push({
        name: "Blocked",
        data: Blocked
    });
    series.push({
        name: "Not Applicable",
        data: NotApplicable
    });
    series.push({
        name: "Passed",
        data: Passed
    });
    series.push({
        name: "Failed",
        data: Failed
    });
    series.push({
        name: "In Progress",
        data: InProgress
    }); InProgress
    series.push({
        name: "Not Run",
        data: NotRun
    });
    let toolTipOption: TooltipOptions = {
        onlyShowFocusedSeries: true,
    }
    let chartStackedColumnOptions: CommonChartOptions = {
        "tooltip": toolTipOption,
        "chartType": ChartTypesConstants.StackedColumn,
        "xAxis": {
            canZoom: true,
            suppressLabelTruncation: true,
            labelValues: labels
        },
        "yAxis": {
            renderToEdges: true
        },
        "series": series,
        "click": (clickeEvent: ClickEvent) => {
            $dinamicPieSpan.empty();
            BuildPieChart(SumSuites[clickeEvent.seriesDataIndex], $dinamicPieSpan, "Selected suits");
        },
    }
    BuildEmptyStuiteList(emptySuites, $emptySuite);
    Services.ChartsService.getService().then((chartService) => {
        chartService.createChart($graphSpan, chartStackedColumnOptions);
    });
}
function BuildEmptyStuiteList(emptySuiteList: Array<string>, $emptySuite: JQuery) {
    let $mainContainer = $("<div />");
    $mainContainer.css("vertical-align", "text-top");
    let $container = $("<ul />")
    $container.css("vertical-align", "text-top");
    if (emptySuiteList.length > 0) {
        emptySuiteList.forEach(Suite => {
            let $liSuite = $("<li />");
            $liSuite.text(Suite);
            $liSuite.css("font-size", "large");
            $liSuite.css("vertical-align", "text-top");
            $container.append($liSuite)
        });
        $container.css("overflow", "scroll");
        $container.css("border", "1px solid black");
        $mainContainer.append($container);
        $emptySuite.append($mainContainer);
    }
}
function BuildPieChart(selectedSuite: SumeSuite, $rightGraph: JQuery, title: string) {
    let legend: LegendOptions = {
        enabled: false
    }
    let chartPieOptions: CommonChartOptions = {
        "title": title,
        "suppressMargin": true,
        "legend": legend,
        suppressAnimation: true,
        hostOptions: { height: 300, width: 300 },
        "chartType": ChartTypesConstants.Pie,
        "xAxis": {
            title: title,
            canZoom: true,
            labelsEnabled: false,
            // suppressLabelTruncation: true,
            labelValues: ["Paused", "Blocked", "Not Applicable", "Passed", "Failed", "In Progress", "Not Run"]
        },
        "series": [{
            "data": [
                selectedSuite.Paused,
                selectedSuite.Blocked,
                selectedSuite.NotApplicable,
                selectedSuite.Passed,
                selectedSuite.Failed,
                selectedSuite.InProgress,
                selectedSuite.NotRun
            ]
        }],
        "specializedOptions": {
            showLabels: true,
            size: "80%"
        },
    }
    Services.ChartsService.getService().then((chartService) => {
        chartService.createChart($rightGraph, chartPieOptions);
    });
}

var id = VSS.getContribution().id;
VSS.register(id, Init_Page);
Init_Page();

// GET http://elitebooki7:9090/tfs/DefaultCollection/Avi%20Test/_apis/test/Runs/12/results?detailsToInclude=WorkItems,Iterations&$top=100&api-version=5.1
// GET http://elitebooki7:9090/tfs/DefaultCollection/Avi%20Test/_apis/test/Runs/5/Results/1/Iterations/1/ActionResults
// http://elitebooki7:9090/tfs/DefaultCollection/A/_apis/test/Runs/33/Results/100000/Iterations/1/ActionResults

// need to add 
// include sub suite/not

// $(document).ready(function() {
//     //set initial state.
//     $('#textbox1').val(this.checked);

//     $('#checkbox1').change(function() {
//         if(this.checked) {
//             var returnVal = confirm("Are you sure?");
//             $(this).prop("checked", returnVal);
//         }
//         $('#textbox1').val(this.checked);        
//     });
// });
// style="border:1px solid black;overflow:scroll;"
// Tsabar,26296,26794
// point 6412
