import TestRestClient = require("TFS/TestManagement/RestClient");
import Controls = require("VSS/Controls");
import Grids = require("VSS/Controls/Grids");
import { TestPlan, TestSuite } from "TFS/TestManagement/Contracts";
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
    //testpoints: Array<TestPointModel>;
}
function Init_Page(): void {
    client = TestRestClient.getClient();
    let selectPlan = $("#selectPlan");
    $("#graph-container").hide();
    $("#grid-container").hide();
    $("#PlanInfos").hide();
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
        }
        else if (this.value == 'Graphs') {
            $("#grid-container").hide();
            $("#PlanInfos").hide();
            $("#graph-container").show();
        }
    });
}
function BuildSelect(projectName: string, selectPlan: JQuery) {
    selectPlan.change(function () {
        let selectedPlane = $(this).children("option:selected").val();
        BuildTableTestGrid2(projectName, selectedPlane);
        BuildGraph(selectedPlane);
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
async function BuildTableTestGrid2(projectName: string, testPlaneId: number): Promise<void> {
    let container = $("#grid-container");
    let planInfo = $("#PlanInfos");
    container.empty();
    planInfo.empty();
    let selectedPlane = await client.getPlanById(projectName, testPlaneId);
    let palneFullInfo: Array<TestSuiteModel> = await GetTestPlaneInfo(selectedPlane, testPlaneId, planInfo, projectName)
    //GetTestPlaneInfo2(selectedPlane, testPlaneId, planInfo, projectName).then((palneFullInfo) => {
    let rootTestCase: TestSuiteModel = ReArangeSuiteList(palneFullInfo);
    CreateTableView(rootTestCase);
    BuildGraph(palneFullInfo)
}
async function GetTestPlaneInfo(selectedPlane: TestPlan, testPlaneId: number, planInfo: JQuery, projectName: string) {
    planInfo.append($("<h4 />").text("project: " + projectName +
        "    Plane: " + testPlaneId +
        "    Root Suite: " + selectedPlane.rootSuite.name +
        "    Iteration: " + selectedPlane.iteration +
        "    Start Date: " + selectedPlane.startDate +
        "    State: " + selectedPlane.state));
    let suites = await client.getTestSuitesForPlan(projectName, testPlaneId);
    if (suites.length > 0) {
        return await GetTestSuites(suites, projectName, testPlaneId);
    }
    else {
        return new Array<TestSuiteModel>();;
    }
}
async function GetTestSuites(suites: TestSuite[], projectName: string, testPlaneId: number) {
    let planeFullInfo: Array<TestSuiteModel> = new Array<TestSuiteModel>();
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
        newSuite.suiteState = suite.state;
        newSuite.childrenSuites = Array<TestSuiteModel>();
        newSuite.testCaseList = await TestCaseInfos(projectName, testPlaneId, suite.id);
        planeFullInfo.push(newSuite);
    }
    return planeFullInfo;
}
async function TestCaseInfos(projectName: string, testPlaneId: number, suiteId: number) {
    let TestCaseList = new Array<TestCaseModel>();
    let testCases = await client.getTestCases(projectName, testPlaneId, suiteId);
    for (const testCase of testCases) {
        let newTestCase: TestCaseModel = new TestCaseModel();
        newTestCase.testCaseType = testCase.testCase.type;
        newTestCase.testCaseId = testCase.testCase.id;
        newTestCase.testCaseName = testCase.testCase.name;
        let testPoint = await GetPointByID(projectName, testPlaneId, suiteId, newTestCase.testCaseId)
        newTestCase.state = testPoint.state;
        newTestCase.outCome = testPoint.outCome;
        newTestCase.lastTestRun = testPoint.lastTestRun;
        newTestCase.assignedTo = testPoint.assignedTo;
        newTestCase.comment = testPoint.comment;
        newTestCase.failureType = testPoint.failureType;
        TestCaseList.push(newTestCase);
    }
    return TestCaseList;
};
async function GetPointByID(projectName: string, testPlaneId: number, suiteId: number, testCaseId: string) {
    let newTestPoint: TestPointModel = new TestPointModel();
    try {
        let testPoints = await client.getPoints(projectName, testPlaneId, suiteId);
        if (testPoints.length > 0) {
            testPoints.forEach(testPoint => {
                if (testPoint.testCase.id == testCaseId) {
                    newTestPoint.lastTestRun = testPoint.lastTestRun.id;
                    newTestPoint.assignedTo = testPoint.assignedTo.displayName;
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
    let container: JQuery = CreateSuiteView(rootTestCase);
    MasterDiv.append(container);
}
function CreateSuiteView(rootTestCase: TestSuiteModel) {
    let container = $("<div />");
    let SuiteDiv = $("<div />");
    let ChildrenDiv = $("<div />");
    let TestPointDiv: JQuery;
    var gridTestSuiteOptions: Grids.IGridOptions = {
        height: "40",
        width: "10000",
        source: [rootTestCase],
        header: false,
        columns: [
            { text: "Suite ID", width: 50, index: "suiteId" },
            { text: "State", width: 100, index: "suiteState" },
            { text: "Suite Name", width: 200, index: "suiteName" }
        ]
    };
    var target = Controls.create(Grids.Grid, SuiteDiv, gridTestSuiteOptions);
    target.setDataSource([TestSuiteModel]);
    if (rootTestCase.childrenSuites != undefined && rootTestCase.childrenSuites.length > 0) {
        rootTestCase.childrenSuites.forEach(child => {
            let childDiv: JQuery = CreateSuiteView(child);
            ChildrenDiv.append(childDiv);
        });
    }
    if (rootTestCase.testCaseList != undefined && rootTestCase.testCaseList.length > 0) {
        TestPointDiv = CreateTestCasesView(rootTestCase.testCaseList)
    }
    container.append(SuiteDiv);
    container.append($("<br />"));
    container.append(ChildrenDiv);
    container.append($("<br />"));
    container.append(TestPointDiv);
    return container;
}
function CreateTestCasesView(pointList: TestPointModel[]) {
    {
        let container: JQuery = $("<div />");
        var gridTestCaseOptions: Grids.IGridOptions = {
            height: (40 * pointList.length).toString(),
            width: "10000",
            source: pointList,
            extendViewportBy: pointList.length,
            header: false,
            columns: [
                { text: "Test Case ID", width: 100, index: "testCaseId" },
                { text: "Test Case Name", width: 100, index: "testCaseName" },
                { text: "Test Case Type", width: 100, index: "testCaseType" },
                { text: "State", width: 100, index: "state" },
                { text: "OutCome", width: 100, index: "outCome" },
                { text: "Last Test Run", width: 200, index: "lastTestRun" },
                { text: "Assigned To", width: 200, index: "assignedTo" },
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