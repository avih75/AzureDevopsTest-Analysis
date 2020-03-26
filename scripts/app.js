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
            BuildTableTestGrid2(projectName, selectedPlane);
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
            BuildTableTestGrid2(projectName, lastPlan);
            BuildGraph(lastPlan);
        });
    }
    function BuildTableTestGrid2(projectName, testPlaneId) {
        return __awaiter(this, void 0, void 0, function* () {
            let container = $("#grid-container");
            let planInfo = $("#PlanInfos");
            container.empty();
            planInfo.empty();
            let selectedPlane = yield client.getPlanById(projectName, testPlaneId);
            let palneFullInfo = yield GetTestPlaneInfo(selectedPlane, testPlaneId, planInfo, projectName);
            let rootTestCase = ReArangeSuiteList(palneFullInfo);
            CreateTableView(rootTestCase);
            BuildGraph(palneFullInfo);
        });
    }
    function GetTestPlaneInfo(selectedPlane, testPlaneId, planInfo, projectName) {
        return __awaiter(this, void 0, void 0, function* () {
            planInfo.append($("<h4 />").text("project: " + projectName +
                "    Plane: " + testPlaneId +
                "    Root Suite: " + selectedPlane.rootSuite.name +
                "    Iteration: " + selectedPlane.iteration +
                "    Area: " + selectedPlane.area +
                "    Start Date: " + selectedPlane.startDate +
                "    State: " + selectedPlane.state));
            let suites = yield client.getTestSuitesForPlan(projectName, testPlaneId);
            if (suites.length > 0) {
                return yield GetTestSuites(suites, projectName, testPlaneId);
            }
            else {
                return new Array();
                ;
            }
        });
    }
    function GetTestSuites(suites, projectName, testPlaneId) {
        return __awaiter(this, void 0, void 0, function* () {
            let planeFullInfo = new Array();
            for (const suite of suites) {
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
                newSuite.suiteType = suite.suiteType;
                newSuite.testCaseCount = suite.testCaseCount;
                newSuite.suiteState = suite.state;
                newSuite.childrenSuites = Array();
                newSuite.testCaseList = yield TestCaseInfos(projectName, testPlaneId, suite.id);
                planeFullInfo.push(newSuite);
            }
            return planeFullInfo;
        });
    }
    function TestCaseInfos(projectName, testPlaneId, suiteId) {
        return __awaiter(this, void 0, void 0, function* () {
            let TestCaseList = new Array();
            let testCases = yield client.getTestCases(projectName, testPlaneId, suiteId);
            for (const halfTestCase of testCases) {
                let testCase = yield client.getTestCaseById(projectName, testPlaneId, suiteId, +halfTestCase.testCase.id);
                let newTestCase = new TestCaseModel();
                newTestCase.testCaseType = testCase.testCase.type;
                newTestCase.testCaseId = testCase.testCase.id;
                newTestCase.testCaseName = testCase.testCase.name;
                let testPoint = yield GetPointByID(projectName, testPlaneId, suiteId, newTestCase.testCaseId);
                newTestCase.state = testPoint.state;
                newTestCase.outCome = testPoint.outCome;
                newTestCase.lastTestRun = testPoint.lastTestRun;
                newTestCase.assignedTo = testCase.pointAssignments[testCase.pointAssignments.length - 1].tester.displayName;
                newTestCase.comment = testPoint.comment;
                newTestCase.failureType = testPoint.failureType;
                TestCaseList.push(newTestCase);
            }
            return TestCaseList;
        });
    }
    ;
    function GetPointByID(projectName, testPlaneId, suiteId, testCaseId) {
        return __awaiter(this, void 0, void 0, function* () {
            let newTestPoint = new TestPointModel();
            try {
                let testPoints = yield client.getPoints(projectName, testPlaneId, suiteId);
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
            catch (_a) {
                return newTestPoint;
            }
        });
    }
    function ReArangeSuiteList(palneFullInfo) {
        let rootSuite;
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
    function CreateTableView(rootTestCase) {
        let MasterDiv = $("#grid-container");
        let container = CreateSuiteView(rootTestCase, 0);
        MasterDiv.append(container);
    }
    function CreateSuiteView(rootTestCase, place) {
        let container = $("<div />");
        let SuiteDiv = $("<div />");
        let ChildrenDiv = $("<div />");
        let TestPointDiv;
        var gridTestSuiteOptions = {
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
                let childDiv = CreateSuiteView(child, place + 1);
                ChildrenDiv.append(childDiv);
            });
        }
        if (rootTestCase.testCaseList != undefined && rootTestCase.testCaseList.length > 0) {
            TestPointDiv = CreateTestCasesView(rootTestCase.testCaseList, place + 1);
        }
        container.append(SuiteDiv);
        container.css('background-color', 'beige');
        container.append(ChildrenDiv);
        container.append(TestPointDiv);
        return container;
    }
    function CreateTestCasesView(pointList, place) {
        {
            let container = $("<div />");
            container.css('background-color', 'ivory');
            var gridTestCaseOptions = {
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
    function BuildGraph(palneFullInfo) {
        var container = $("#graph-container");
        container.empty();
    }
    var id = VSS.getContribution().id;
    VSS.register(id, Init_Page);
    VSS.resize();
    Init_Page();
});
