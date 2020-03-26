import TestRestClient = require("TFS/TestManagement/RestClient");
import Controls = require("VSS/Controls");
import Grids = require("VSS/Controls/Grids");
import { TestPlan, TestSuite, SuiteTestCase } from "TFS/TestManagement/Contracts";
let client: TestRestClient.TestHttpClient4_1;
class TestPointModel {
    state: string;
    outCome: string;
    lastTestRun: string;
    assignedTo: string;
    comment: string;
    failureType: string;
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
    suiteType: string;
    testCaseCount: number;
}
function Init_Page(): void {
    client = TestRestClient.getClient();
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
    planInfo.append($("<h4 />").text("project: " + projectName +
        "    Plan: " + testPlanId +
        "    Root Suite: " + selectedPlan.rootSuite.name +
        "    Iteration: " + selectedPlan.iteration +
        "    Area: " + selectedPlan.area +
        "    Start Date: " + selectedPlan.startDate +
        "    State: " + selectedPlan.state));
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
        newSuite.testCaseList = await TestCaseInfos(projectName, testPlanId, suite.id);
        planFullInfo.push(newSuite);
    }
    return planFullInfo;
}
async function TestCaseInfos(projectName: string, testPlanId: number, suiteId: number) {
    let TestCaseList = new Array<TestCaseModel>();
    let testCases = await client.getTestCases(projectName, testPlanId, suiteId);
    for (const halfTestCase of testCases) {
        let testCase: SuiteTestCase = await client.getTestCaseById(projectName, testPlanId, suiteId, +halfTestCase.testCase.id);
        let newTestCase: TestCaseModel = new TestCaseModel();
        newTestCase.testCaseType = testCase.testCase.type;
        newTestCase.testCaseId = testCase.testCase.id;
        newTestCase.testCaseName = testCase.testCase.name;
        let testPoint = await GetPointByID(projectName, testPlanId, suiteId, newTestCase.testCaseId)
        newTestCase.state = testPoint.state;
        newTestCase.outCome = testPoint.outCome;
        newTestCase.lastTestRun = testPoint.lastTestRun;
        newTestCase.assignedTo = testCase.pointAssignments[testCase.pointAssignments.length - 1].tester.displayName;
        newTestCase.comment = testPoint.comment;
        newTestCase.failureType = testPoint.failureType;
        TestCaseList.push(newTestCase);
    }
    return TestCaseList;
};
async function GetPointByID(projectName: string, testPlanId: number, suiteId: number, testCaseId: string) {
    let newTestPoint: TestPointModel = new TestPointModel();
    try {
        let testPoints = await client.getPoints(projectName, testPlanId, suiteId);
        if (testPoints.length > 0) {
            testPoints.forEach(testPoint => {
                if (testPoint.testCase.id == testCaseId) {
                    newTestPoint.lastTestRun = testPoint.lastTestRun.id;
                    newTestPoint.assignedTo = testPoint.assignedTo.uniqueName;
                    newTestPoint.comment = testPoint.comment;
                    newTestPoint.failureType = testPoint.failureType;
                    newTestPoint.outCome = testPoint.outcome;
                    newTestPoint.state = testPoint.state;
                }
            });
        }
        return newTestPoint;
    }
    catch{
        return newTestPoint;
    }
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
    let container: JQuery = CreateSuiteView(rootTestCase, 0);
    MasterDiv.append(container);
}
function CreateSuiteView(rootTestCase: TestSuiteModel, place: number) {
    let container = $("<div />");
    let SuiteDiv = $("<div />");
    let ChildrenDiv = $("<div />");
    let TestPointDiv: JQuery;
    var gridTestSuiteOptions: Grids.IGridOptions = {
        height: "30",
        width: "10000",
        source: [rootTestCase],
        header: false,
        columns: [
            { text: "", width: 50 * place },
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
    if (rootTestCase.testCaseList != undefined && rootTestCase.testCaseList.length > 0) {
        TestPointDiv = CreateTestCasesView(rootTestCase.testCaseList, place + 1)
    }
    container.append(SuiteDiv);
    container.css('background-color', 'beige');
    container.append(ChildrenDiv);
    container.append(TestPointDiv);
    return container;
}
function CreateTestCasesView(pointList: TestPointModel[], place: number) {
    {
        let container: JQuery = $("<div />");
        container.css('background-color', 'ivory');
        var gridTestCaseOptions: Grids.IGridOptions = {
            height: (30 * pointList.length).toString(),
            width: "10000",
            source: pointList,
            extendViewportBy: pointList.length,
            header: false,
            columns: [
                { text: "", width: 50 * place + 25 },
                { text: "Test Case Name", width: 100, index: "testCaseName" },
                { text: "Test Case Type", width: 100, index: "testCaseType" },
                { text: "State", width: 80, index: "state" },
                { text: "OutCome", width: 100, index: "outCome" },
                { text: "Assigned To", width: 100, index: "assignedTo" },
                { text: "Comment", width: 200, index: "comment" },
                { text: "Failure Type", width: 200, index: "failureType" },
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