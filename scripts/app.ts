import Grids = require("VSS/Controls/Grids");
import Controls = require("VSS/Controls");
import Services = require("Charts/Services");
import TestRestClient = require("TFS/TestManagement/RestClient");
import WorkItemManagment = require("TFS/WorkItemTracking/RestClient");
import { TestPlan, TestSuite, TestPoint, ResultDetails } from "TFS/TestManagement/Contracts";
import { CommonChartOptions, ChartTypesConstants, ClickEvent, LegendOptions, TooltipOptions } from "Charts/Contracts";
import { CsvDataService } from "./CsvHelper";
let client = TestRestClient.getClient();
const WIClient: WorkItemManagment.WorkItemTrackingHttpClient4_1 = WorkItemManagment.getClient();
let SumSuitesforExecell: Array<SumeSuite>;
let palnInfoExcell: Array<TestSuiteModel>;
const csvFileName: string = "Export.csv"
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
}
function Init_Page(): void {
    buildView();
    // start with graph view
    $("#Graphs").prop("checked", true);
    $("#graph-container").show();
    //
}
function buildView() {
    let excellButton = $("#excellButton");
    let img = $("<img />");
    img.addClass("imgExcell");
    img.attr("src", "images/excell.jpg")
    img.attr("alt", "export to excell file")
    excellButton.append(img);
    let selectPlan = $("#selectPlan");
    $("#PlanInfos").hide();
    $("#grid-container").hide();
    $("#table-container").hide();
    $("#graph-container").hide();
    selectPlan.hide();
    var projectName = VSS.getWebContext().project.name;
    BuildRadioButton()
    BuildSelect(projectName, selectPlan);
}
function BuildRadioButton() {
    let excellButton = $("#excellButton")
    $('input[type=radio][name=view]').change(function () {
        if (this.value == 'Suite Table') {
            excellButton.click(() => {
                CsvDataService.exportToCsv(csvFileName, palnInfoExcell)
            });
            $("#PlanInfos").show();
            $("#grid-container").show();
            $("#table-container").hide();
            $("#graph-container").hide();
        }
        else if (this.value == 'Test Table') {
            excellButton.click(() => {
                CsvDataService.exportToCsv(csvFileName, SumSuitesforExecell)
            });
            $("#grid-container").hide();
            $("#PlanInfos").hide();
            $("#table-container").show();
            $("#graph-container").hide();
        }
        else if (this.value == 'Test Graphs') {
            excellButton.click(() => {
                CsvDataService.exportToCsv(csvFileName, SumSuitesforExecell)
            });
            $("#grid-container").hide();
            $("#PlanInfos").hide();
            $("#table-container").hide();
            $("#graph-container").show();
        }
    });
}
function BuildSelect(projectName: string, selectPlan: JQuery) {
    selectPlan.attr("disabled", "true");
    selectPlan.change(function () {
        selectPlan.attr("disabled", "true");
        let selectedPlan = $(this).children("option:selected").val();
        BuildTableTestGrid(projectName, selectedPlan);
        BuildTestsSum(projectName, selectedPlan);
        selectPlan.removeAttr("disabled");
    });
    client._setInitializationPromise(client.authTokenManager.getAuthToken());
    client.getPlans(projectName).then((plans) => {
        let firstPlan: number = 0;
        plans.forEach(plan => {
            selectPlan.append(new Option(plan.name, plan.id.toString()));
            if (firstPlan == 0)
                firstPlan = plan.id;
        });
        $("#loading").hide();
        selectPlan.show();
        BuildTableTestGrid(projectName, firstPlan);
        BuildTestsSum(projectName, firstPlan);
    })
    selectPlan.removeAttr("disabled");
}
async function BuildTableTestGrid(projectName: string, testPlanId: number): Promise<void> {
    let container = $("#grid-container");
    let planInfo = $("#PlanInfos");
    container.empty();
    planInfo.empty();
    let selectedPlan = await client.getPlanById(projectName, testPlanId);
    ShowPlaneInfos(selectedPlan, testPlanId, planInfo, projectName);
    let palneFullInfo: Array<TestSuiteModel> = await GetTestPlanSuites(selectedPlan, testPlanId, planInfo, projectName);
    //this.palnInfoExcell = palneFullInfo;
    let rootTestCase: TestSuiteModel = ReArangeSuiteList(palneFullInfo);
    BuildTreeView(rootTestCase);
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
    let suites = await client.getTestSuitesForPlan(projectName, testPlanId);
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
        }
        catch {
            newSuite.perentId = "0";
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
    let testPoints = await client.getPoints(projectName, testPlanId, suiteId);
    for (const testPoint of testPoints) {
        let testPointModel: TestPointModel = await GetTestRunsResults(projectName, testPoint);
        TestPointList.push(testPointModel);
    }
    return TestPointList;
}
async function GetTestRunsResults(projectName: string, testPoint: TestPoint) {
    let incomplite: number = 0;
    let notApplicable: number = 0;
    let passed: number = 0;
    let total: number = 0;
    let postProcess: string = "";
    let stepFaild: string = "";
    let outcome: string = testPoint.outcome;
    let TestCaseWI = await WIClient.getWorkItem(+testPoint.testCase.id);
    let testName = TestCaseWI.fields["System.Title"].toString();
    if (testPoint.lastTestRun.id != "0") {
        let run = await client.getTestRunById(projectName, +testPoint.lastTestRun.id);
        let testResult = await client.getTestResultById(projectName, run.id, +testPoint.lastResult.id, ResultDetails.Iterations)
        if (testResult.iterationDetails.length > 0) {
            // try get the action that failed the run
            try {
                let actionResults = await client.getActionResults(projectName, run.id, testResult.id, testResult.iterationDetails.pop().id)
                actionResults.forEach(action => {
                    if (action.outcome == "Failed")
                        action.actionPath
                    stepFaild += action.errorMessage;
                });
            }
            catch{

            }
        }
        incomplite = run.incompleteTests;
        notApplicable = run.notApplicableTests;
        passed = run.passedTests;
        total = run.totalTests;
        postProcess = run.postProcessState;
        if (testResult.outcome == undefined) {
            outcome = "In Progress";
        }
    }
    if (outcome == "Unspecified") {
        outcome = "Not Run";
    }
    let testPointModel: TestPointModel = {
        incompliteTests: incomplite,
        notApplicableTests: notApplicable,
        passedTests: passed,
        postProcessState: postProcess,
        totalTests: total,
        id: testPoint.id.toString(),
        assignedTo: testPoint.assignedTo.displayName.split(' <')[0],
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
    tr.append(TextView("Assigned To:", 1));
    tr.append(TextView(point.assignedTo, 2));
    tr.append(TextView("Configuration:", 1));
    tr.append(TextView(point.configuration, 2));
    tr.append(TextView("Failure Type:", 1));
    tr.append(TextView(point.failureType, 2));
    tr.append(TextView("Passed:", 1));
    tr.append(TextView(point.passedTests, 2));
    tr.append(TextView("Incomplit:", 1));
    tr.append(TextView(point.incompliteTests, 2));
    tr.append(TextView("Not Applicable:", 1));
    tr.append(TextView(point.notApplicableTests, 2));
    tr.append(TextView("Total:", 1));
    tr.append(TextView(point.totalTests, 2));
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
        totalPoints: 0
    }
    let SumSuites: Array<SumeSuite> = new Array<SumeSuite>();
    let suites = await client.getTestSuitesForPlan(projectName, selectedPlane);
    for (const suite of suites) {
        let newSuite: SumeSuite = await GetSuiteSum(suite);
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
async function GetSuiteSum(suite: TestSuite) {
    let suiteSum: SumeSuite = new SumeSuite();
    if (suite.name == undefined) {
        suiteSum.SuiteName = "Main";
    }
    else {
        suiteSum.SuiteName = suite.name;
    }
    suiteSum.Blocked = 0
    suiteSum.Paused = 0
    suiteSum.Passed = 0
    suiteSum.Failed = 0
    suiteSum.NotRun = 0
    suiteSum.NotApplicable = 0
    suiteSum.InProgress = 0
    suiteSum.totalPoints = suite.testCaseCount
    let points = await client.getPoints(suite.project.name, +suite.plan.id, suite.id);
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
    var $container = $('#graph-container');
    $container.empty();
    $container.css("width", "100%")
    let $graphLine = $("<tr />")
    $graphLine.css("width", "100%")
    //let $graphLine2 = $("<tr />")
    var $leftGraph = $("<td />")
    $leftGraph.css("width", "60%")
    var $midelGraph = $("<td />")
    var $rightGraph = $("<td />")
    //
    let $spanLeft = $("<span />")
    $spanLeft.css("width", "100%")
    let $spanRight = $("<span />")
    let $spanMidl = $("<span />")
    $leftGraph.append($spanLeft);
    //$midelGraph.append($spanMidel);
    $midelGraph.append($spanMidl);
    $rightGraph.append($spanRight);
    //
    $graphLine.append($leftGraph);
    $graphLine.append($midelGraph);
    $graphLine.append($rightGraph);
    $container.append($graphLine);
    let cakeGraphId = SumSuites.length - 1;
    BuildStackedColumnChart(SumSuites, $spanLeft, $spanRight);
    BuildPieChart(SumSuites[0], $spanRight);
    BuildPieChart(SumSuites[cakeGraphId], $spanMidl)
}
function BuildStackedColumnChart(SumSuites: Array<SumeSuite>, $graphSpan: JQuery, $dinamicPieSpan: JQuery) {
    let Paused = [];
    let Blocked = [];
    let Passed = [];
    let Failed = [];
    let NotRun = [];
    let NotApplicable = [];
    let InProgress = [];
    let labels = [];
    for (let i = 0; i < SumSuites.length - 1; i++) {
        labels.push(SumSuites[i].SuiteName);//+ " Sum: " + SumSuites[i].totalPoints
        Passed.push([i, SumSuites[i].Passed]);
        Failed.push([i, SumSuites[i].Failed]);
        NotRun.push([i, SumSuites[i].NotRun]);
        InProgress.push([i, SumSuites[i].InProgress]);
        NotApplicable.push([i, SumSuites[i].NotApplicable]);
        Paused.push([i, SumSuites[i].Paused]);
        Blocked.push([i, SumSuites[i].Blocked]);
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
        "yAxis":{
           renderToEdges:true           
        },        
        "series": series,
        "click": (clickeEvent: ClickEvent) => {
            $dinamicPieSpan.empty();
            BuildPieChart(SumSuites[clickeEvent.seriesDataIndex], $dinamicPieSpan)
        },
    }
    Services.ChartsService.getService().then((chartService) => {
        chartService.createChart($graphSpan, chartStackedColumnOptions);
    });
}
function BuildPieChart(selectedSuite: SumeSuite, $rightGraph: JQuery) {
    let legend: LegendOptions = {
        enabled: false
    }
    let chartPieOptions: CommonChartOptions = {
        "legend": legend,
        suppressAnimation: true,
        hostOptions: { height: 300, width: 300 },
        "chartType": ChartTypesConstants.Pie,
        "xAxis": {
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
            size: "200"
        },
    }
    Services.ChartsService.getService().then((chartService) => {
        chartService.createChart($rightGraph, chartPieOptions);
    });
}
var id = VSS.getContribution().id;
VSS.register(id, Init_Page);
VSS.resize();
Init_Page();


// GET http://elitebooki7:9090/tfs/DefaultCollection/Avi%20Test/_apis/test/Runs/12/results?detailsToInclude=WorkItems,Iterations&$top=100&api-version=5.1
// GET http://elitebooki7:9090/tfs/DefaultCollection/Avi%20Test/_apis/test/Runs/5/Results/1/Iterations/1/ActionResults
// http://elitebooki7:9090/tfs/DefaultCollection/A/_apis/test/Runs/33/Results/100000/Iterations/1/ActionResults