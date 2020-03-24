var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
define(["require", "exports", "TFS/TestManagement/RestClient", "VSS/Controls", "VSS/Controls/Grids"], function (require, exports, TestRestClient, Controls, Grids) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    let client;
    class TestPointModel {
    }
    class TestCaseModel {
    }
    class TestSuiteModel {
    }
    function Init_Page() {
        client = TestRestClient.getClient();
        let selectPlan = $("#selectPlan");
        $("#graph-container").hide();
        $("#grid-container").hide();
        $("#PlanInfos").hide();
        selectPlan.hide();
        var projectName = VSS.getWebContext().project.name;
        BuildRadioButton();
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
    function BuildSelect(projectName, selectPlan) {
        selectPlan.change(function () {
            let selectedPlane = $(this).children("option:selected").val();
            BuildTableTestGrid(projectName, selectedPlane);
            BuildGraph(selectedPlane);
        });
        client._setInitializationPromise(client.authTokenManager.getAuthToken());
        client.getPlans(projectName).then((plans) => {
            let lastPlan;
            plans.forEach(plan => {
                selectPlan.append(new Option(plan.name, plan.id.toString()));
                lastPlan = plan.id;
            });
            $("#loading").hide();
            selectPlan.show();
            BuildTableTestGrid(projectName, lastPlan);
            BuildGraph(lastPlan);
        });
    }
    function BuildTableTestGrid(projectName, testPlaneId) {
        let container = $("#grid-container");
        let planInfo = $("#PlanInfos");
        container.empty();
        planInfo.empty();
        client.getPlanById(projectName, testPlaneId)
            .then((selectedPlane) => GetTestPlaneInfo2(selectedPlane, testPlaneId, planInfo, projectName))
            .then((palneFullInfo) => CreateTableView(palneFullInfo));
    }
    const GetTestPlaneInfo2 = (selectedPlane, testPlaneId, planInfo, projectName) => __awaiter(this, void 0, void 0, function* () {
        planInfo.append($("<h4 />").text("project: " + projectName +
            "    Plane: " + testPlaneId +
            "    Root Suite: " + selectedPlane.rootSuite.name +
            "    Iteration: " + selectedPlane.iteration +
            "    Start Date: " + selectedPlane.startDate +
            "    State: " + selectedPlane.state));
        let palneFullInfo = new Array();
        yield client.getTestSuitesForPlan(projectName, testPlaneId).then((suites) => {
            if (suites.length > 0) {
                suites.forEach((suite) => __awaiter(this, void 0, void 0, function* () {
                    let newSuite = new TestSuiteModel();
                    newSuite.suiteId = suite.id;
                    try {
                        newSuite.perentId = suite.parent.id;
                    }
                    catch (_a) {
                        newSuite.perentId = "0";
                    }
                    ;
                    newSuite.suiteName = suite.name;
                    newSuite.suiteState = suite.state;
                    newSuite.childrenSuites = Array();
                    newSuite.testCaseList = yield TestCaseInfos2(projectName, testPlaneId, newSuite.suiteId);
                }));
            }
        });
        return ReArangeSuiteList(palneFullInfo);
    });
    const TestCaseInfos2 = (projectName, testPlaneId, suiteId) => __awaiter(this, void 0, void 0, function* () {
        let TestCaseList = new Array();
        yield client.getTestCases(projectName, testPlaneId, suiteId).then((testCases) => {
            if (testCases.length > 0) {
                testCases.forEach((testCase) => __awaiter(this, void 0, void 0, function* () {
                    let newTestCase = new TestCaseModel();
                    newTestCase.testCaseType = testCase.testCase.type;
                    newTestCase.testCaseId = testCase.testCase.id;
                    newTestCase.testCaseName = testCase.testCase.name;
                    newTestCase.testPoint = yield GetPointByID2(projectName, testPlaneId, suiteId, newTestCase.testCaseId);
                    TestCaseList.push(newTestCase);
                }));
            }
        });
        return TestCaseList;
    });
    const GetPointByID2 = (projectName, testPlaneId, suiteId, testCaseId) => __awaiter(this, void 0, void 0, function* () {
        let newTestPoint = new TestPointModel();
        try {
            yield client.getPoints(projectName, testPlaneId, suiteId).then((testPoints) => {
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
            });
            return newTestPoint;
        }
        catch (_a) {
            return newTestPoint;
        }
    });
    function ReArangeSuiteList(palneFullInfo) {
        return palneFullInfo;
    }
    function CreateTableView(palneFullInfo) {
        {
            let container = $("#grid-container");
            var gridOptions = {
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
    function BuildGraph(testPlaneId) {
        var container = $("#graph-container");
        container.empty();
    }
    var id = VSS.getContribution().id;
    VSS.register(id, Init_Page);
    VSS.resize();
    Init_Page();
});
