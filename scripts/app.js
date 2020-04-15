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
            let firstPlan = 0;
            plans.forEach(plan => {
                selectPlan.append(new Option(plan.name, plan.id.toString()));
                if (firstPlan == 0)
                    firstPlan = plan.id;
            });
            $("#loading").hide();
            selectPlan.show();
            BuildTableTestGrid(projectName, firstPlan);
            BuildTestsSum(projectName, firstPlan);
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
                let testName = TestCaseWI.fields["System.Title"].toString();
                let incomplite = 0;
                let notApplicable = 0;
                let passed = 0;
                let total = 0;
                let postProcess = "";
                let stepFaild = "";
                if (testPoint.lastTestRun.id != "0") {
                    let run = yield client.getTestRunById(projectName, +testPoint.lastTestRun.id);
                    incomplite = run.incompleteTests;
                    notApplicable = run.notApplicableTests;
                    passed = run.passedTests;
                    total = run.totalTests;
                    postProcess = run.postProcessState;
                    let x = yield client.getTestResultById(projectName, run.id, +testPoint.lastResult.id);
                    stepFaild = x.resolutionState;
                }
                let testPointModel = {
                    incompliteTests: incomplite,
                    notApplicableTests: notApplicable,
                    passedTests: passed,
                    postProcessState: postProcess,
                    totalTests: total,
                    id: testPoint.id.toString(),
                    assignedTo: testPoint.assignedTo.displayName,
                    comment: testPoint.comment,
                    outCome: testPoint.outcome,
                    lastTestRun: testPoint.lastTestRun.name,
                    failureType: testPoint.failureType,
                    testCaseId: testPoint.testCase.id,
                    FaildStep: stepFaild,
                    testCaseName: testName,
                    testCaseType: testPoint.testCase.type,
                    configuration: testPoint.configuration.name
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
        let tr = $("<tr />");
        tr.addClass("testClass");
        tr.append(TextView("Test:", 1));
        tr.append(TextView(point.testCaseName, 2));
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
        tr.append(TextView("Type:", 1));
        tr.append(TextView(point.testCaseType, 2));
        tr.append(TextView("Comment:", 1));
        tr.append(TextView(point.comment ? point.comment : "", 2));
        return tr;
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
            suiteSum.Blocked = 0;
            suiteSum.Paused = 0;
            suiteSum.Passed = 0;
            suiteSum.Failed = 0;
            suiteSum.Unspecified = 0;
            suiteSum.NotApplicable = 0;
            suiteSum.totalPoints = suite.testCaseCount;
            let points = yield client.getPoints(suite.project.name, +suite.plan.id, suite.id);
            for (const point of points) {
                switch (point.outcome) {
                    case "NotApplicable": {
                        suiteSum.NotApplicable += 1;
                        break;
                    }
                    case "Blocked": {
                        suiteSum.Blocked += 1;
                        break;
                    }
                    case "Paused": {
                        suiteSum.Paused += 1;
                        break;
                    }
                    case "Passed": {
                        suiteSum.Passed += 1;
                        break;
                    }
                    case "Failed": {
                        suiteSum.Failed += 1;
                        break;
                    }
                    case "Unspecified": {
                        suiteSum.Unspecified += 1;
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
        let Paused = [];
        let Blocked = [];
        let Passed = [];
        let Failed = [];
        let Unspecified = [];
        let NotApplicable = [];
        let labels = [];
        for (let i = 0; i < SumSuites.length; i++) {
            labels.push(SumSuites[i].SuiteName + " total: " + SumSuites[i].totalPoints);
            Passed.push([i, SumSuites[i].Passed]);
            Failed.push([i, SumSuites[i].Failed]);
            Unspecified.push([i, SumSuites[i].Unspecified]);
            NotApplicable.push([i, SumSuites[i].NotApplicable]);
            Paused.push([i, SumSuites[i].Paused]);
            Blocked.push([i, SumSuites[i].Blocked]);
        }
        let series = [];
        series.push({
            name: "Paused",
            data: Paused
        });
        series.push({
            name: "Blocked",
            data: Blocked
        });
        series.push({
            name: "Not Applicable",
            data: NotApplicable
        });
        series.push({
            name: "Passed",
            data: Passed
        });
        series.push({
            name: "Failed",
            data: Failed
        });
        series.push({
            name: "Not Run",
            data: Unspecified
        });
        var $container = $('#graph-container');
        $container.empty();
        var chartOptions = {
            "hostOptions": {
                "height": 500,
                "width": 1200
            },
            "chartType": Contracts_1.ChartTypesConstants.StackedColumn,
            "xAxis": {
                canZoom: true,
                suppressLabelTruncation: true,
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
