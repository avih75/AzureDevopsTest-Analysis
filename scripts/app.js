var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
define(["require", "exports", "TFS/TestManagement/RestClient", "TFS/WorkItemTracking/RestClient", "VSS/Controls/Grids", "VSS/Controls", "Charts/Services", "Charts/Contracts"], function (require, exports, TestRestClient, WorkItemManagment, Grids, Controls, Services, Contracts_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    let client;
    let WIClient;
    class TestPointModel {
    }
    class TestCaseModel {
    }
    class TestSuiteModel {
    }
    class SumeSuite {
    }
    function Init_Page() {
        client = TestRestClient.getClient();
        WIClient = WorkItemManagment.getClient();
        let selectPlan = $("#selectPlan");
        $("#PlanInfos").hide();
        $("#grid-container").hide();
        $("#table-container").hide();
        $("#graph-container").hide();
        selectPlan.hide();
        var projectName = VSS.getWebContext().project.name;
        BuildRadioButton();
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
    function BuildSelect(projectName, selectPlan) {
        selectPlan.change(function () {
            let selectedPlan = $(this).children("option:selected").val();
            BuildTableTestGrid(projectName, selectedPlan);
            BuildTestsSum(projectName, selectedPlan);
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
            BuildTestsSum(projectName, lastPlan);
        });
    }
    function BuildTableTestGrid(projectName, testPlanId) {
        return __awaiter(this, void 0, void 0, function* () {
            let container = $("#grid-container");
            let planInfo = $("#PlanInfos");
            container.empty();
            planInfo.empty();
            let selectedPlan = yield client.getPlanById(projectName, testPlanId);
            let palneFullInfo = yield GetTestPlanInfo(selectedPlan, testPlanId, planInfo, projectName);
            let rootTestCase = ReArangeSuiteList(palneFullInfo);
            BuildTreeView(rootTestCase);
        });
    }
    function GetTestPlanInfo(selectedPlan, testPlanId, planInfo, projectName) {
        return __awaiter(this, void 0, void 0, function* () {
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
                newSuite.allTestCases = suite.testCaseCount;
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
    function BuildTreeView(rootTestCase) {
        let MasterDiv = $("#grid-container");
        let mainUl = $("<ul />");
        mainUl.addClass("myUL");
        mainUl.append(BuildTreeSuiteView(rootTestCase));
        MasterDiv.append(mainUl);
    }
    function BuildTreeSuiteView(rootTestCase) {
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
        ul.addClass("nested");
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
    function BuildTreeTestView(point) {
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
    function TextView(lable, size) {
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
    function BuildTestsSum(projectName, selectedPlane) {
        return __awaiter(this, void 0, void 0, function* () {
            let planInfo = $("#PlanInfos");
            planInfo.empty();
            let SumSuites = new Array();
            let suites = yield client.getTestSuitesForPlan(projectName, selectedPlane);
            for (const suite of suites) {
                SumSuites.push(yield GetSuiteSum(suite));
            }
            ;
            BuildTestsView(SumSuites);
            BuildGraph(SumSuites);
        });
    }
    function GetSuiteSum(suite) {
        return __awaiter(this, void 0, void 0, function* () {
            let suiteSum = new SumeSuite();
            if (suite.name == undefined) {
                suiteSum.SuiteName = "Main";
            }
            else {
                suiteSum.SuiteName = suite.name;
            }
            suiteSum.complateCount = 0;
            suiteSum.inProgressCount = 0;
            suiteSum.maxValueCount = 0;
            suiteSum.noneCount = 0;
            suiteSum.notReadyCount = 0;
            suiteSum.readyCount = 0;
            suiteSum.totalPoints = suite.testCaseCount;
            let points = yield client.getPoints(suite.project.name, +suite.plan.id, suite.id);
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
            }
            ;
            return suiteSum;
        });
    }
    function BuildTestsView(SumSuites) {
        var graphContainer = $("#table-container");
        graphContainer.empty();
        let container = $("<div />");
        container.addClass("TestSuit");
        var gridTestSuiteOptions = {
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
    function BuildGraph(SumSuites) {
        let labels = [];
        let complate = [];
        let inProgress = [];
        let maxValue = [];
        let none = [];
        let notReady = [];
        let ready = [];
        for (let i = 0; i < SumSuites.length; i++) {
            labels.push(SumSuites[i].SuiteName + " total: " + SumSuites[i].totalPoints);
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
        var $container = $('#graph-container');
        var chartOptions = {
            "hostOptions": {
                "height": 500,
                "width": 1200
            },
            "chartType": Contracts_1.ChartTypesConstants.StackedColumn,
            "xAxis": {
                labelValues: labels
            },
            "series": series
        };
        Services.ChartsService.getService().then((chartService) => {
            chartService.createChart($container, chartOptions);
        });
    }
    var id = VSS.getContribution().id;
    VSS.register(id, Init_Page);
    VSS.resize();
    Init_Page();
});
