import TestRestClient = require("TFS/TestManagement/RestClient");
import WorkItemManagment = require("TFS/WorkItemTracking/RestClient");
import { TestPlan, TestSuite } from "TFS/TestManagement/Contracts";
import Grids = require("VSS/Controls/Grids");
import Controls = require("VSS/Controls");
import { lineFeed } from "VSS/Utils/String";
let client: TestRestClient.TestHttpClient4_1;
let WIClient: WorkItemManagment.WorkItemTrackingHttpClient4_1
// let SumeSuites: Array<SumeSuite> = new Array<SumeSuite>();   // need to cancle
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
    $("#graph-container").hide();
    $("#grid-container").hide();
    $("#PlanInfos").hide();
    $("#query-container").hide();
    selectPlan.hide();
    var projectName = VSS.getWebContext().project.name;
    BuildRadioButton()
    BuildSelect(projectName, selectPlan);
}
function BuildRadioButton() {
    $('input[type=radio][name=view]').change(function () {
        if (this.value == 'Table') {
            $("#PlanInfos").show();
            $("#grid-container").show();
            $("#graph-container").hide();
            $("#query-container").hide();
        }
        else if (this.value == 'Graphs') {
            $("#grid-container").hide();
            $("#PlanInfos").hide();
            $("#graph-container").show();
            $("#query-container").hide();
        }
        else if (this.value == 'Querys') {
            $("#grid-container").hide();
            $("#PlanInfos").hide();
            $("#graph-container").hide();
            $("#query-container").show();
        }
    });
}
function BuildSelect(projectName: string, selectPlan: JQuery) {
    selectPlan.change(function () {
        let selectedPlan = $(this).children("option:selected").val();
        BuildTableTestGrid(projectName, selectedPlan);
        BuildGraphInfo(projectName, selectedPlan);
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
        BuildGraphInfo(projectName, lastPlan);
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
    BuildGraphInfo(projectName, testPlanId);  // need to cancle
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
    //tr.append(span);
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
    // 1 - testLableInfo
    // 2 - testInfo
    // 3 - suitLable
    // 4 - suitInfo
    // 5 - planeLable
    // 6 - planeInfo
    //let textSpan = $("<span />");
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
async function BuildGraphInfo(projectName: string, selectedPlane: number) {
    // need to run the forech suite and create the list of the suite results
    let SumSuites: Array<SumeSuite> = new Array<SumeSuite>();
    let suites = await client.getTestSuitesForPlan(projectName, selectedPlane);
    if (suites.length > 0) {
        suites.forEach(async suite => {
            SumSuites.push(await GetSuiteSum(suite))
        });
    }
    BuildGraphView(SumSuites);
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
    points.forEach(point => {
        switch (point.state) {
            case "completed": {
                suiteSum.complateCount += 1;
                break;
            }
            case "inProgress": {
                suiteSum.inProgressCount += 1;
                break;
            }
            case "maxValue": {
                suiteSum.maxValueCount += 1;
                break;
            }
            case "none": {
                suiteSum.noneCount += 1;
                break;
            }
            case "notReady": {
                suiteSum.notReadyCount += 1;
                break;
            }
            case "ready": {
                suiteSum.readyCount += 1;
                break;
            }
        }
    });
    return suiteSum;
}
function BuildGraphView(SumSuites: Array<SumeSuite>) {
    var container = $("#graph-container");
    container.addClass("TestSuit");
    // let SuiteDiv = $("<div />");
    // let ChildrenDiv = $("<div />");
    // let TestPointDiv: JQuery;
    var gridTestSuiteOptions: Grids.IGridOptions = {
        height: "30",
        source: [SumSuites],
        header: false,
        columns: [
            { text: "Suite Name: ", width: 100, index: "SuiteName" },
            { text: "Total Tests: ", width: 80, index: "totalPoints" },
            { text: "Ready: ", width: 100, index: "readyCount" },
            { text: "Complete: ", width: 50, index: "complateCount" },
            { text: "In Progress: ", width: 100, index: "inProgressCount" },
            { text: "Max Value: ", width: 80, index: "maxValueCount" },
            { text: "None Count: ", width: 100, index: "noneCount" },
            { text: "Not Ready: ", width: 50, index: "notReadyCount" }
        ]
    };
    var target = Controls.create(Grids.Grid, container, gridTestSuiteOptions);
    target.setDataSource([SumSuites]);
}
var id = VSS.getContribution().id;
VSS.register(id, Init_Page);
VSS.resize();
Init_Page(); 