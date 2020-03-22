import TestRestClient = require("TFS/TestManagement/RestClient");
import Controls = require("VSS/Controls");
import Grids = require("VSS/Controls/Grids");
import { TestPlan, TestSuite } from "TFS/TestManagement/Contracts";
class TestPointModel {
    state: string;
    lastTestRun: string;
    suite: string;
    outCome: string;
    assignedTo: string;
    comment: string;
    failureType: string;
    testCase: string;
}
class TestCaseModel {
    lastTestPoint: TestPointModel;
    testCaseName: string;
    pointTesterName: string;
    pointConfigurationName: string;
}
class TestSuiteModel {
    suiteId: number;
    perentId: string;
    suiteName: string;
    suiteState: string;
    childrenSuites: Array<TestSuiteModel>;
    testCaseList: Array<TestCaseModel>;
    testpoints: Array<TestPointModel>;
}
let client: TestRestClient.TestHttpClient4_1;
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
        BuildTableTestGrid(projectName, selectedPlane);
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
        BuildTableTestGrid(projectName, lastPlan);
        BuildGraph(lastPlan);
    })
}
function BuildTableTestGrid(projectName: string, testPlaneId: string): void {
    let container = $("#grid-container");
    let planInfo = $("#PlanInfos");
    container.empty();
    planInfo.empty();
    client.getPlanById(projectName, +testPlaneId)
        .then((selectedPlane) => GetTestPlaneInfo(selectedPlane, testPlaneId, planInfo, projectName))
        .then((palneFullInfo) => ReArangeSuiteList(palneFullInfo))
        .then((palneFullInfo) => CreateTableView(palneFullInfo, container));
}
function GetTestPlaneInfo(selectedPlane: TestPlan, testPlaneId: string, planInfo: JQuery, projectName: string) {
    planInfo.append($("<h4 />").text("project: " + projectName +
        "    Plane: " + testPlaneId +
        "    Root Suite: " + selectedPlane.rootSuite.name +
        "    Iteration: " + selectedPlane.iteration +
        "    Start Date: " + selectedPlane.startDate +
        "    State: " + selectedPlane.state));
    return GetTestSuiteInfos(projectName, testPlaneId)
        .then((palneFullInfo) => { return palneFullInfo; });
}
function GetTestSuiteInfos(projectName: string, testPlaneId: string) {
    let palneFullInfo: Array<TestSuiteModel> = new Array<TestSuiteModel>();
    return client.getTestSuitesForPlan(projectName, +testPlaneId).then((suites) => {
        suites.forEach(suite => {
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
            TestCaseInfos(projectName, testPlaneId, suite.id.toString())
                .then((testCases) => {
                    newSuite.testCaseList = testCases;
                })
                .then(() => {
                    return PointsInfos(projectName, testPlaneId, newSuite.suiteId.toString());
                }).then((testPointList) => {
                    newSuite.testpoints = testPointList;
                })
                .then(() => {
                    palneFullInfo.push(newSuite);
                })
        })
    }).then(() => {
        return palneFullInfo;
    })
}
function TestCaseInfos(projectName: string, testPlaneId: string, suiteId: string) {
    let TestCaseList = new Array<TestCaseModel>();
    return client.getTestCases(projectName, +testPlaneId, +suiteId).then((testCases) => {
        testCases.forEach(testCase => {
            let pointTesterName: string;
            let pointConfigurationName: string;
            testCase.pointAssignments.forEach(point => {
                pointTesterName = point.tester.uniqueName;
                pointConfigurationName = point.configuration.name;
            });
            let newTestCase: TestCaseModel = {
                lastTestPoint: new TestPointModel,
                testCaseName: testCase.testCase.name,
                pointTesterName: pointTesterName,
                pointConfigurationName: pointConfigurationName
            }
            TestCaseList.push(newTestCase);
        });
    }).then(() => {
        return TestCaseList
    })
}
function PointsInfos(projectName: string, testPlaneId: string, suiteId: string) {
    let testPointList = new Array<TestPointModel>();
    return client.getPoints(projectName, +testPlaneId, +suiteId).then((points) => {
        points.forEach(point => {
            testPointList.push({
                suite: point.suite.name,
                testCase: point.testCase.name,
                state: point.lastResultState,
                outCome: point.outcome,
                lastTestRun: point.lastTestRun.name,
                assignedTo: point.assignedTo.displayName,
                comment: point.comment,
                failureType: point.failureType,
            });
        });
    }).then(() => {
        return testPointList;
    })
}
function ReArangeSuiteList(palneFullInfo: Array<TestSuiteModel>) {
    return palneFullInfo;
}
function CreateTableView(palneFullInfo: Array<TestSuiteModel>, container: JQuery) {
    {
        // try to show the info
        var gridOptions: Grids.IGridOptions = {
            height: "600px",
            width: "17000",
            source: palneFullInfo,
            columns: [
                { text: "Suite", width: 200, index: "suite" },
                { text: "Test Case", width: 200, index: "testCase" },
                { text: "State", width: 100, index: "state" },
                { text: "Out-Come", width: 100, index: "outCome" },
                { text: "Last Test Run", width: 200, index: "lastTestRun" },
                { text: "Assigned-To", width: 200, index: "assignedTo" },
                { text: "Comment", width: 500, index: "comment" },
                { text: "Failure Type", width: 200, index: "failureType" }
            ]
        };
        var target = Controls.create(Grids.Grid, container, gridOptions);
        target.setDataSource(palneFullInfo);
    }
}
function BuildGraph(testPlaneId: string) {
    var container = $("#graph-container");
    container.empty();
}
var id = VSS.getContribution().id;
VSS.register(id, Init_Page);
VSS.resize();
Init_Page();