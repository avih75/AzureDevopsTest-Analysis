import TestRestClient = require("TFS/TestManagement/RestClient");
import WorkItemManagment = require("TFS/WorkItemTracking/RestClient");
import { TestPlan, TestSuite } from "TFS/TestManagement/Contracts";
import Grids = require("VSS/Controls/Grids");
import Controls = require("VSS/Controls");
import Services = require("Charts/Services");
import { CommonChartOptions, ChartTypesConstants } from "Charts/Contracts";
let client: TestRestClient.TestHttpClient4_1;
let WIClient: WorkItemManagment.WorkItemTrackingHttpClient4_1
class TestPointModel {
    id: string;
    state: string;
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
}
class SumeSuite {
    SuiteName: string;
    totalPoints: number;
    readyCount: number;
    complateCount: number;
    inProgressCount: number;
    maxValueCount: number;
    noneCount: number;
    notReadyCount: number;
}
function Init_Page(): void {
    client = TestRestClient.getClient();
    WIClient = WorkItemManagment.getClient();
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
    $('input[type=radio][name=view]').change(function () {
        if (this.value == 'Suite Table') {
            $("#PlanInfos").show();
            $("#grid-container").show();
            $("#table-container").hide();
            $("#graph-container").hide();
        }
        else if (this.value == 'Test Table') {
            $("#grid-container").hide();
            $("#PlanInfos").hide();
            $("#table-container").show();
            $("#graph-container").hide();
        }
        else if (this.value == 'Test Graphs') {
            $("#grid-container").hide();
            $("#PlanInfos").hide();
            $("#table-container").hide();
            $("#graph-container").show();
        }
    });
}
function BuildSelect(projectName: string, selectPlan: JQuery) {
    selectPlan.change(function () {
        let selectedPlan = $(this).children("option:selected").val();
        BuildTableTestGrid(projectName, selectedPlan);
        BuildTestsSum(projectName, selectedPlan);
    });
    client._setInitializationPromise(client.authTokenManager.getAuthToken());
    client.getPlans(projectName).then((plans) => {
        let lastPlan: number;
        plans.forEach(plan => {
            selectPlan.append(new Option(plan.name, plan.id.toString()));
            lastPlan = plan.id;
        });
        $("#loading").hide();
        selectPlan.show();
        BuildTableTestGrid(projectName, lastPlan);
        BuildTestsSum(projectName, lastPlan);
    })
}
async function BuildTableTestGrid(projectName: string, testPlanId: number): Promise<void> {
    let container = $("#grid-container");
    let planInfo = $("#PlanInfos");
    container.empty();
    planInfo.empty();
    let selectedPlan = await client.getPlanById(projectName, testPlanId);
    let palneFullInfo: Array<TestSuiteModel> = await GetTestPlanInfo(selectedPlan, testPlanId, planInfo, projectName)
    let rootTestCase: TestSuiteModel = ReArangeSuiteList(palneFullInfo);
    BuildTreeView(rootTestCase);
}
async function GetTestPlanInfo(selectedPlan: TestPlan, testPlanId: number, planInfo: JQuery, projectName: string) {
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
        let TestCaseWI = await WIClient.getWorkItem(+testPoint.testCase.id);
        let x = TestCaseWI.fields["System.Title"].toString();
        let run = await client.getTestRunById(projectName, +testPoint.lastTestRun.id);
        let testPointModel: TestPointModel = {
            id: testPoint.id.toString(),
            assignedTo: testPoint.assignedTo.displayName,
            comment: testPoint.comment,
            outCome: testPoint.outcome,
            lastTestRun: testPoint.lastTestRun.name,
            failureType: testPoint.failureType,
            state: testPoint.state,
            testCaseId: testPoint.testCase.id,
            testCaseName: x,
            testCaseType: testPoint.testCase.type,
            configuration: testPoint.configuration.name,
            incompliteTests: run.incompleteTests,
            notApplicableTests: run.notApplicableTests,
            passedTests: run.passedTests,
            totalTests: run.passedTests,
            postProcessState: run.postProcessState
        }
        TestPointList.push(testPointModel);
    }
    return TestPointList;
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
    let table = $("<table />");
    let tr = $("<tr />");
    tr.addClass("testClass");
    tr.append(TextView("Test:", 1));
    tr.append(TextView(point.testCaseName, 2));
    tr.append(TextView("Type:", 1));
    tr.append(TextView(point.testCaseType, 2));
    tr.append(TextView("State:", 1));
    tr.append(TextView(point.state, 2));
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
    tr.append(TextView("Comment:", 1));
    tr.append(TextView(point.comment ? point.comment : "", 2));
    table.append(tr);
    return table;
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
    let SumSuites: Array<SumeSuite> = new Array<SumeSuite>();
    let suites = await client.getTestSuitesForPlan(projectName, selectedPlane);
    for (const suite of suites) {
        SumSuites.push(await GetSuiteSum(suite))
    };
    BuildTestsView(SumSuites);
    BuildGraph(SumSuites);
}
async function GetSuiteSum(suite: TestSuite) {
    let suiteSum: SumeSuite = new SumeSuite();
    if (suite.name == undefined) {
        suiteSum.SuiteName = "Main";
    }
    else {
        suiteSum.SuiteName = suite.name;
    }
    suiteSum.complateCount = 0
    suiteSum.inProgressCount = 0
    suiteSum.maxValueCount = 0
    suiteSum.noneCount = 0
    suiteSum.notReadyCount = 0
    suiteSum.readyCount = 0
    suiteSum.totalPoints = suite.testCaseCount
    let points = await client.getPoints(suite.project.name, +suite.plan.id, suite.id);
    for (const point of points) {
        switch (point.state) {
            case "Completed": {
                suiteSum.complateCount += 1;
                break;
            }
            case "InProgress": {
                suiteSum.inProgressCount += 1;
                break;
            }
            case "MaxValue": {
                suiteSum.maxValueCount += 1;
                break;
            }
            case "None": {
                suiteSum.noneCount += 1;
                break;
            }
            case "NotReady": {
                suiteSum.notReadyCount += 1;
                break;
            }
            case "Ready": {
                suiteSum.readyCount += 1;
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
        height: (30 * SumSuites.length + 1).toString(),
        source: SumSuites,
        header: true,
        columns: [
            { text: "Suite Name", width: 100, index: "SuiteName" },
            { text: "Total", width: 80, index: "totalPoints" },
            { text: "Complete", width: 80, index: "complateCount" },
            { text: "In Progress", width: 80, index: "inProgressCount" },
            { text: "Max Value", width: 80, index: "maxValueCount" },
            { text: "Ready", width: 80, index: "readyCount" },
            { text: "Not Ready", width: 80, index: "notReadyCount" },
            { text: "None Count", width: 80, index: "noneCount" }
        ]
    };
    var target = Controls.create(Grids.Grid, container, gridTestSuiteOptions);
    target.setDataSource(SumSuites);
    graphContainer.append(container);
}
function BuildGraph(SumSuites: Array<SumeSuite>) {
    let labels = [];
    let complate = [];
    let inProgress = [];
    let maxValue = [];
    let none = [];
    let notReady = [];
    let ready = [];
    //let total = [];
    for (let i = 0; i < SumSuites.length; i++) {
        labels.push(SumSuites[i].SuiteName+" total: "+SumSuites[i].totalPoints);
        complate.push([i, SumSuites[i].complateCount]);
        inProgress.push([i, SumSuites[i].inProgressCount]);
        maxValue.push([i, SumSuites[i].maxValueCount]);
        none.push([i, SumSuites[i].noneCount]);
        notReady.push([i, SumSuites[i].notReadyCount]);
        ready.push([i, SumSuites[i].readyCount]); 
    }
    let series = [];
    series.push({
        name: "Complate",
        data: complate
    });
    series.push({
        name: "In Progress",
        data: inProgress
    });
    series.push({
        name: "Max Value",
        data: maxValue
    });
    series.push({
        name: "None",
        data: none
    });
    series.push({
        name: "Not Ready",
        data: notReady
    });
    series.push({
        name: "Ready",
        data: ready
    });
    // series.push({
    //     name: "Total",
    //     data: total
    // });
    var $container = $('#graph-container');
    var chartOptions: CommonChartOptions = {
        "hostOptions": {
            "height": 500,
            "width": 1200
        },
        "chartType": ChartTypesConstants.StackedColumn,
        "xAxis": { 
            labelValues: labels
        },
        "series": series 
    }
    Services.ChartsService.getService().then((chartService) => {
        chartService.createChart($container, chartOptions);
    })
}
var id = VSS.getContribution().id;
VSS.register(id, Init_Page);
VSS.resize();
Init_Page(); 