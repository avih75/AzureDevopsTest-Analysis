var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
define(["require", "exports", "TFS/TestManagement/RestClient", "TFS/WorkItemTracking/RestClient", "VSS/Controls", "VSS/Controls/Grids"], function (require, exports, TestRestClient, WorkItemManagment, Controls, Grids) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    let client;
    let WIClient;
    const indent = 10;
    class TestPointModel {
    }
    class TestCaseModel {
    }
    class TestSuiteModel {
    }
    function Init_Page() {
        client = TestRestClient.getClient();
        WIClient = WorkItemManagment.getClient();
        let selectPlan = $("#selectPlan");
        $("#graph-container").hide();
        $("#grid-container").hide();
        $("#PlanInfos").hide();
        $("#query-container").hide();
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
    function BuildSelect(projectName, selectPlan) {
        selectPlan.change(function () {
            let selectedPlan = $(this).children("option:selected").val();
            BuildTableTestGrid2(projectName, selectedPlan);
            BuildGraph(selectedPlan);
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
    function BuildTableTestGrid2(projectName, testPlanId) {
        return __awaiter(this, void 0, void 0, function* () {
            let container = $("#grid-container");
            let planInfo = $("#PlanInfos");
            container.empty();
            planInfo.empty();
            let selectedPlan = yield client.getPlanById(projectName, testPlanId);
            let palneFullInfo = yield GetTestPlanInfo(selectedPlan, testPlanId, planInfo, projectName);
            let rootTestCase = ReArangeSuiteList(palneFullInfo);
            CreateTableView(rootTestCase);
            BuildGraph(palneFullInfo);
        });
    }
    function GetTestPlanInfo(selectedPlan, testPlanId, planInfo, projectName) {
        return __awaiter(this, void 0, void 0, function* () {
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
            let suites = yield client.getTestSuitesForPlan(projectName, testPlanId);
            if (suites.length > 0) {
                return yield GetTestSuites(suites, projectName, testPlanId);
            }
            else {
                return new Array();
                ;
            }
        });
    }
    function GetTestSuites(suites, projectName, testPlanId) {
        return __awaiter(this, void 0, void 0, function* () {
            let planFullInfo = new Array();
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
                newSuite.testPointList = yield GetTestPoints(projectName, testPlanId, suite.id);
                planFullInfo.push(newSuite);
            }
            return planFullInfo;
        });
    }
    function GetTestPoints(projectName, testPlanId, suiteId) {
        return __awaiter(this, void 0, void 0, function* () {
            let TestPointList = new Array();
            let testPoints = yield client.getPoints(projectName, testPlanId, suiteId);
            for (const testPoint of testPoints) {
                let TestCaseWI = yield WIClient.getWorkItem(+testPoint.testCase.id);
                let x = TestCaseWI.fields["System.Title"].toString();
                let run = yield client.getTestRunById(projectName, +testPoint.lastTestRun.id);
                let testPointModel = {
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
                };
                TestPointList.push(testPointModel);
            }
            return TestPointList;
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
        let container = CreateSuiteView(rootTestCase, 1);
        MasterDiv.append(container);
    }
    function CreateSuiteView(rootTestCase, place) {
        let container = $("<div />");
        container.addClass("TestSuit");
        let SuiteDiv = $("<div />");
        let ChildrenDiv = $("<div />");
        let TestPointDiv;
        var gridTestSuiteOptions = {
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
                let childDiv = CreateSuiteView(child, place + 1);
                ChildrenDiv.append(childDiv);
            });
        }
        if (rootTestCase.testPointList != undefined && rootTestCase.testPointList.length > 0) {
            TestPointDiv = CreateTestCasesView(rootTestCase.testPointList, place + 2);
        }
        container.append(SuiteDiv);
        container.append(ChildrenDiv);
        container.append(TestPointDiv);
        return container;
    }
    function CreateTestCasesView(pointList, place) {
        {
            let container = $("<div />");
            container.css('background-color', 'ivory');
            var gridTestCaseOptions = {
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
    function BuildGraph(palneFullInfo) {
        var container = $("#graph-container");
        container.empty();
    }
    var id = VSS.getContribution().id;
    VSS.register(id, Init_Page);
    VSS.resize();
    Init_Page();
});
