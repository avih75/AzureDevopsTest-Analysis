import TestRestClient = require("TFS/TestManagement/RestClient");
import Controls = require("VSS/Controls");
import Grids = require("VSS/Controls/Grids");
import { TestPlan } from "TFS/TestManagement/Contracts";
import { async } from "q";
let client: TestRestClient.TestHttpClient4_1;
class TestPointModel {
    state: string;
    lastTestRun: string;
    outCome: string;
    assignedTo: string;
    comment: string;
    failureType: string;
}
class TestCaseModel {
    testPoint: TestPointModel;
    testCaseName: string;
    testCaseId: string;
    testCaseType: string;
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
        .then((selectedPlane) => GetTestPlaneInfo2(selectedPlane, testPlaneId, planInfo, projectName))
        .then((palneFullInfo) => CreateTableView(palneFullInfo));

}
function GetTestPlaneInfo2(selectedPlane: TestPlan, testPlaneId: string, planInfo: JQuery, projectName: string) {
    planInfo.append($("<h4 />").text("project: " + projectName +
        "    Plane: " + testPlaneId +
        "    Root Suite: " + selectedPlane.rootSuite.name +
        "    Iteration: " + selectedPlane.iteration +
        "    Start Date: " + selectedPlane.startDate +
        "    State: " + selectedPlane.state));
    let palneFullInfo: Array<TestSuiteModel> = new Array<TestSuiteModel>();
    client.getTestSuitesForPlan(projectName, +testPlaneId).then((suites) => {
        if (suites.length > 0) {
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
                newSuite.testCaseList = await TestCaseInfos2(projectName, testPlaneId, suiteId);
            });
        }
    })
    return ReArangeSuiteList(palneFullInfo);

}
const TestCaseInfos2 = async (projectName: string, testPlaneId: string, suiteId: string) => {
    let TestCaseList = new Array<TestCaseModel>();
    client.getTestCases(projectName, +testPlaneId, +suiteId).then((testCases) => {
        if (testCases.length > 0) {
            testCases.forEach(async testCase => {
                let newTestCase: TestCaseModel = new TestCaseModel();
                newTestCase.testCaseType = testCase.testCase.type;
                newTestCase.testCaseId = testCase.testCase.id;
                newTestCase.testCaseName = testCase.testCase.name;
                newTestCase.testPoint = await GetPointByID2(projectName, testPlaneId, suiteId, newTestCase.testCaseId)
                TestCaseList.push(newTestCase);
            })
        }
    })
    return TestCaseList;
};
const GetPointByID2 = async (projectName: string, testPlaneId: string, suiteId: number, testCaseId: string) => {
    let newTestPoint: TestPointModel = new TestPointModel();
    try {
        client.getPoints(projectName, testPlaneId, suiteId).then((testPoints) => {
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
        })
        return newTestPoint;
    }
    catch{
        return newTestPoint;
    }
}
function GetTestPlaneInfo(selectedPlane: TestPlan, testPlaneId: string, planInfo: JQuery, projectName: string) {
    planInfo.append($("<h4 />").text("project: " + projectName +
        "    Plane: " + testPlaneId +
        "    Root Suite: " + selectedPlane.rootSuite.name +
        "    Iteration: " + selectedPlane.iteration +
        "    Start Date: " + selectedPlane.startDate +
        "    State: " + selectedPlane.state));
    let palneFullInfo: Array<TestSuiteModel> = new Array<TestSuiteModel>();
    let promiseCascade: PromiseLike<void>;
    client.getTestSuitesForPlan(projectName, +testPlaneId).then((suites) => {
        if (suites.length > 0) {
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
                if (promiseCascade == undefined)
                    promiseCascade = (TestCaseInfos(projectName, testPlaneId, suite.id.toString(), newSuite, palneFullInfo));
                else
                    promiseCascade = (promiseCascade.then(() => (TestCaseInfos(projectName, testPlaneId, suite.id.toString(), newSuite, palneFullInfo))))
            });
        }
    }).then(() => {
        (promiseCascade.then(() => ReArangeSuiteList(palneFullInfo))).then((palneFullInfo) => CreateTableView(palneFullInfo));
    })
}
function TestCaseInfos(projectName: string, testPlaneId: string, suiteId: string, newSuite: TestSuiteModel, palneFullInfo: Array<TestSuiteModel>) {
    let promiseCascade: PromiseLike<void>;
    return client.getTestCases(projectName, +testPlaneId, +suiteId).then((testCases) => {
        if (testCases.length > 0) {
            let TestCaseList = new Array<TestCaseModel>();
            testCases.forEach(testCase => {
                let pointTesterName: string;
                let pointConfigurationName: string;
                testCase.pointAssignments.forEach(point => {
                    pointTesterName = point.tester.uniqueName;
                    pointConfigurationName = point.configuration.id;
                });
                let newTestCase: TestCaseModel = {
                    lastTestPoint: new TestPointModel,
                    testCaseName: testCase.testCase.name,
                    pointTesterName: pointTesterName,
                    pointConfigurationName: pointConfigurationName
                }
                if (promiseCascade == undefined)
                    promiseCascade = (GetPointByID(projectName, testPlaneId, suiteId, pointConfigurationName, newTestCase))
                else
                    promiseCascade = promiseCascade.then(() => GetPointByID(projectName, testPlaneId, suiteId, pointConfigurationName, newTestCase))
            });
            promiseCascade = promiseCascade.then(() => {
                newSuite.testCaseList = TestCaseList;
            });
        }
    }).then(() => {
        return promiseCascade;
    })
};
function GetPointByID(projectName: string, testPlaneId: string, suiteId: string, pointId: string, newTestCase: TestCaseModel) {
    try {
        return client.getPoint(projectName, +testPlaneId, +suiteId, +pointId).then((point) => {
            newTestCase.lastTestPoint = {
                suite: point.suite.name,
                testCase: point.testCase.name,
                state: point.lastResultState,
                outCome: point.outcome,
                lastTestRun: point.lastTestRun.name,
                assignedTo: point.assignedTo.displayName,
                comment: point.comment,
                failureType: point.failureType,
            }
        });
    }
    catch{
    }
}
function ReArangeSuiteList(palneFullInfo: Array<TestSuiteModel>) {
    return palneFullInfo;
}
function CreateTableView(palneFullInfo: Array<TestSuiteModel>) {
    {
        let container = $("#grid-container");
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