import TestRestClient = require("TFS/TestManagement/RestClient");
import WorkItemManagment = require("TFS/WorkItemTracking/RestClient");
import Controls = require("VSS/Controls");
import Grids = require("VSS/Controls/Grids");
import { TestPlan, TestSuite, SuiteTestCase } from "TFS/TestManagement/Contracts";
import { async } from "q";
let client: TestRestClient.TestHttpClient4_1;
let WIClient: WorkItemManagment.WorkItemTrackingHttpClient4_1
const indent: number = 10;
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
        BuildTableTestGrid2(projectName, selectedPlan);
        BuildGraph(selectedPlan);
    });
    client._setInitializationPromise(client.authTokenManager.getAuthToken());
    client.getPlans(projectName).then((plans) => {
        let lastPlan: any;
        plans.forEach(plan => {
            selectPlan.append(new Option(plan.name, plan.id.toString()));
            lastPlan = plan.id;
        });
        $("#loading").hide();
        selectPlan.show();
        BuildTableTestGrid2(projectName, lastPlan);
        BuildGraph(lastPlan);
    })
}
async function BuildTableTestGrid2(projectName: string, testPlanId: number): Promise<void> {
    let container = $("#grid-container");
    let planInfo = $("#PlanInfos");
    container.empty();
    planInfo.empty();
    let selectedPlan = await client.getPlanById(projectName, testPlanId);
    let palneFullInfo: Array<TestSuiteModel> = await GetTestPlanInfo(selectedPlan, testPlanId, planInfo, projectName)
    let rootTestCase: TestSuiteModel = ReArangeSuiteList(palneFullInfo);
    CreateTableView(rootTestCase);
    BuildGraph(palneFullInfo)
}
async function GetTestPlanInfo(selectedPlan: TestPlan, testPlanId: number, planInfo: JQuery, projectName: string) {
    let plainMainInfo = $("<div />");
    let ProjectName = $("<text />");
    ProjectName.addClass("PlainMainInfo");
    ProjectName.text("Project: " + projectName);
    plainMainInfo.append(ProjectName);
    let planeId = $("<text />");
    planeId.addClass("PlainMainInfo");
    planeId.text("Plan: " + testPlanId);
    plainMainInfo.append(planeId);
    let planeRootSuite = $("<text />");
    planeRootSuite.addClass("PlainMainInfo");
    planeRootSuite.text("Root Suite: " + selectedPlan.rootSuite.name);
    plainMainInfo.append(planeRootSuite);
    let planeIteration = $("<text />");
    planeIteration.addClass("PlainMainInfo");
    planeIteration.text("Iteration: " + selectedPlan.iteration);
    plainMainInfo.append(planeIteration);
    let planeArea = $("<text />");
    planeArea.addClass("PlainMainInfo");
    planeArea.text("Area: " + selectedPlan.area);
    plainMainInfo.append(planeArea);
    let planeStartDate = $("<text />");
    planeStartDate.addClass("PlainMainInfo");
    planeStartDate.text("Start Date: " + selectedPlan.startDate);
    plainMainInfo.append(planeStartDate);
    let planeState = $("<text />");
    planeState.addClass("PlainMainInfo");
    planeState.text("State: " + selectedPlan.state);
    plainMainInfo.append(planeState);
    planInfo.append(plainMainInfo);
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
        newSuite.suiteName = suite.name;
        newSuite.suiteType = suite.suiteType;
        newSuite.testCaseCount = suite.testCaseCount;
        newSuite.suiteState = suite.state;
        newSuite.childrenSuites = Array<TestSuiteModel>();
        //newSuite.testCaseList = await TestCaseInfos(projectName, testPlanId, suite.id);
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
            testCaseName: x,//testPoint.testCase.name,
            //testCaseName: testPoint.testCase.name,//testPoint.testCase.name,
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
function CreateTableView(rootTestCase: TestSuiteModel) {
    let MasterDiv = $("#grid-container");
    let container: JQuery = CreateSuiteView(rootTestCase, 1);
    MasterDiv.append(container);
}
function CreateSuiteView(rootTestCase: TestSuiteModel, place: number) {
    let container = $("<div />");
    container.addClass("TestSuit");
    let SuiteDiv = $("<div />");
    let ChildrenDiv = $("<div />");
    let TestPointDiv: JQuery;
    var gridTestSuiteOptions: Grids.IGridOptions = {
        height: "30", 
        source: [rootTestCase],
        header: false,
        columns: [
            { text: "", width: place * indent },
            { text: "ID", width: 50, index: "suiteId" },
            { text: "Suite Name", width: 100, index: "suiteName" },
            { text: "State", width: 80, index: "suiteState" },
            { text: "Suite Type", width: 100, index: "suiteType" },
            { text: "Test Case Count", width: 50, index: "testCaseCount" }
        ]
    };
    var target = Controls.create(Grids.Grid, SuiteDiv, gridTestSuiteOptions);
    target.setDataSource([rootTestCase]);
    if (rootTestCase.childrenSuites != undefined && rootTestCase.childrenSuites.length > 0) {
        rootTestCase.childrenSuites.forEach(child => {
            let childDiv: JQuery = CreateSuiteView(child, place + 1);
            ChildrenDiv.append(childDiv);
        });
    }
    if (rootTestCase.testPointList != undefined && rootTestCase.testPointList.length > 0) {
        TestPointDiv = CreateTestCasesView(rootTestCase.testPointList, place + 2)
    }
    container.append(SuiteDiv);
    container.append(ChildrenDiv);
    container.append(TestPointDiv);
    return container;
}
function CreateTestCasesView(pointList: TestPointModel[], place: number) {
    {
        let container: JQuery = $("<div />");
        container.css('background-color', 'ivory');
        var gridTestCaseOptions: Grids.IGridOptions = {
            height: (35 * pointList.length).toString(),
            source: pointList,
            header: false,
            columns: [
                { text: "", width: indent * place },
                { text: "ID", width: 30, index: "id" },
                { text: "Test Case Name", width: 100, index: "testCaseName" },
                { text: "Test Case Type", width: 100, index: "testCaseType" },
                { text: "State", width: 80, index: "state" },
                { text: "OutCome", width: 100, index: "outCome" },
                { text: "Assigned To", width: 100, index: "assignedTo" },
                { text: "Comment", width: 200, index: "comment" },
                { text: "Configuration", width: 150, index: "configuration" },
                { text: "Failure Type", width: 100, index: "failureType" },
                { text: "", width: indent * 2 },
                { text: "Passed", width: 30, index: "passedTests" },
                { text: "Incomplite Tests", width: 30, index: "incompliteTests" },
                { text: "NotApplicable Tests", width: 30, index: "notApplicableTests" },
                { text: "Total Tests", width: 30, index: "totalTests" }
            ]
        };
        var target = Controls.create(Grids.Grid, container, gridTestCaseOptions);
        target.setDataSource(pointList);
        return container;
    }
}
function BuildGraph(palneFullInfo: Array<TestSuiteModel>) {
    var container = $("#graph-container");
    container.empty();
}
var id = VSS.getContribution().id;
VSS.register(id, Init_Page);
VSS.resize();
Init_Page();

//  IPromise<Contracts.WorkItemReference[]> getBugsLinkedToTestResult(project, runId, testCaseResultId)
//  IPromise<Contracts.TestResultParameterModel[]> getResultParameters(project, runId, testCaseResultId, iterationId, paramName)
//  IPromise<Contracts.ResultRetentionSettings> getResultRetentionSettings(project)
//  IPromise<Contracts.TestCaseResult> getTestCaseResultById(project, runId, testCaseResultId, includeIterationDetails, includeAssociatedBugs)
//  IPromise<Contracts.TestCaseResult[]> getTestResultById(project, runId, testCaseResultId, detailsToInclude)

//  IPromise<Contracts.TestMessageLogDetails[]> getTestRunLogs(project, runId) 

