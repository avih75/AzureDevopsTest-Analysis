var __awaiter = (this && this.__awaiter) || function(thisArg, _arguments, P, generator) {
    return new(P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }

        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }

        function step(result) { result.done ? resolve(result.value) : new P(function(resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

define(["require", "exports", "Charts/Services", "TFS/TestManagement/RestClient", "Charts/Contracts", "./CsvHelper", "./storageHelper", "TFS/WorkItemTracking/Contracts", "TFS/WorkItemTracking/RestClient"], function(require, exports, Services, TestRestClient, Contracts_1, CsvHelper_1, storageHelper_1, Contracts_2, WorkItemManagment) {

    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    let WIClient = WorkItemManagment.getClient();
    let testClient = TestRestClient.getClient();
    let SumSuitesforExecell;
    let palnInfoExcell = new Array();
    const csvFileName = "Export.csv";
    let selectedId = 0;
    class TestPointModel {}
    class TestCaseModel {}
    class TestSuiteModel {}
    class SumeSuite {}

    function CreateCalculateImgDiv(image) {
        let $calculateDiv = $("<div />");
        let $calculateImg = $("<img />");
        if (image == "Graph")
            $calculateImg.attr("src", "images/Calculating.gif");
        else if (image == "table")
            $calculateImg.attr("src", "images/tableing.gif");
        else
            $calculateImg.attr("src", "images/analyzing.gif");
        $calculateDiv.append($calculateImg);
        return $calculateDiv;
    }

    function Init_Page() {
        return __awaiter(this, void 0, void 0, function*() {
            let webContext = VSS.getWebContext();
            try {
                selectedId = yield storageHelper_1.GetLastTimeValue(webContext.user.name + "_" + webContext.project.name);
            } catch (_a) {}
            VSS.resize();
            buildView();
            $("#Graphs").prop("checked", true);
            $("#graph-container").show();
            $("#PlanInfos").show();
            $("#graph-container").css("overflow-x", 'auto');
            $("#graph-container").addClass("scroller");
            $("#level").val(0);
            let $excellButton = $("#excellButton");
            $excellButton.click(() => {
                CsvHelper_1.CsvDataService.exportToCsv(csvFileName, SumSuitesforExecell);
            });
            $("#graph-container").on("click", "#refresh", function() {
                let selectedPlan = $("#selectPlan").children("option:selected").val();
                let projectName = VSS.getWebContext().project.name;
                let selectPlan = $("#selectPlan");
                RunBuilds(projectName, selectedPlan, selectPlan);
            });
            $("#graph-container").on("change", "#deep", function() {
                let deep = $('#deep').is(":checked");
                if (deep == true) {
                    $("#level").hide();
                    $("#levelText").hide();
                } else {
                    $("#level").show();
                    $("#levelText").show();
                }
            });
        });
    }

    function buildView() {
        let selectPlan = $("#selectPlan");
        $("#PlanInfos").hide();
        $("#grid-container").hide();
        $("#table-container").hide();
        $("#graph-container").hide();
        $("#level").hide();
        $("#levelText").hide();
        selectPlan.hide();
        let projectName = VSS.getWebContext().project.name;
        BuildRadioButton();
        BuildSelect(projectName, selectPlan);
    }

    function BuildRadioButton() {
        let $excellButton = $("#excellButton");
        $('input[type=radio][name=view]').change(function() {
            if (this.value == 'Suite Table') {
                $excellButton.click(() => {
                    CsvHelper_1.CsvDataService.exportToCsv(csvFileName, palnInfoExcell);
                });
                $("#PlanInfos").show();
                $("#grid-container").show();
                $("#table-container").hide();
                $("#graph-container").hide();
            } else if (this.value == 'Test Table') {
                $excellButton.click(() => {
                    CsvHelper_1.CsvDataService.exportToCsv(csvFileName, SumSuitesforExecell);
                });
                $("#PlanInfos").show();
                $("#grid-container").hide();
                $("#table-container").show();
                $("#graph-container").hide();
            } else if (this.value == 'Test Graphs') {
                $excellButton.click(() => {
                    CsvHelper_1.CsvDataService.exportToCsv(csvFileName, SumSuitesforExecell);
                });
                $("#PlanInfos").show();
                $("#grid-container").hide();
                $("#table-container").hide();
                $("#graph-container").show();
            }
        });
    }

    function BuildSelect(projectName, selectPlan) {
        let webContext = VSS.getWebContext();
        selectPlan.attr("disabled", "true");
        selectPlan.change(function() {
            return __awaiter(this, void 0, void 0, function*() {
                selectPlan.attr("disabled", "true");
                let selectedPlan = $(this).children("option:selected").val();
                storageHelper_1.SetValue(webContext.user.name + "_" + webContext.project.name, selectedPlan);
                RunBuilds(projectName, selectedPlan, selectPlan);
            });
        });
        testClient._setInitializationPromise(testClient.authTokenManager.getAuthToken());
        WIClient._setInitializationPromise(testClient.authTokenManager.getAuthToken());
        testClient.getPlans(projectName).then((plans) => {
            let flag = false;
            let firstPlan = 0;
            plans.forEach(plan => {
                selectPlan.append(new Option(plan.name, plan.id.toString()));
                if (plan.id == selectedId)
                    flag = true;
                if (firstPlan == 0)
                    firstPlan = plan.id;
            });
            if (flag) {
                firstPlan = selectedId;
            } else {
                storageHelper_1.SetValue(webContext.user.name + "_" + webContext.project.name, firstPlan);
            }
            $("#loading").hide();
            selectPlan.val(firstPlan);
            selectPlan.show();
            let selectedPlan = $("#selectPlan").children("option:selected").val();
            RunBuilds(projectName, selectedPlan, selectPlan);
        });
    }

    function RunBuilds(projectName, selectedPlan, selectPlan) {
        $("#grid-container").append(CreateCalculateImgDiv("Grid"));
        $("#table-container").append(CreateCalculateImgDiv("Table"));
        $("#graph-container").append(CreateCalculateImgDiv("Graph"));
        testClient.getTestSuitesForPlan(projectName, +selectedPlan).then((suites) => __awaiter(this, void 0, void 0, function*() {
            ShowInfos(projectName, +selectedPlan, selectPlan);
            yield BuildTestsSum(suites);
            BuildTableTestGrid(projectName, +selectedPlan, selectPlan, suites);
        }));
    }

    function ShowInfos(projectName, testPlanId, selectPlan) {
        $("#mainFunction").attr("disabled", "true");
        selectPlan.attr("disabled", "true");
        let planInfo = $("#PlanInfos");
        planInfo.empty();
        testClient.getPlanById(projectName, testPlanId).then((selectedPlan) => {
            ShowPlaneInfos(selectedPlan, testPlanId, planInfo, projectName);
            selectPlan.removeAttr("disabled");
        });
    }

    function ShowPlaneInfos(selectedPlan, testPlanId, planInfo, projectName) {
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
    }

    function BuildTableTestGrid(projectName, testPlanId, selectPlan, suites) {
        if (suites.length > 0) {
            GetTestSuites(suites, projectName, testPlanId).then((palneFullInfo) => {
                palnInfoExcell = palneFullInfo;
                let rootTestCase = ReArangeSuiteList(palneFullInfo);
                BuildTreeView(rootTestCase);
                $("#mainFunction").removeAttr("disabled");
                selectPlan.removeAttr("disabled");
            });
        }
    }

    function GetTestSuites(suites, projectName, testPlanId) {
        return __awaiter(this, void 0, void 0, function*() {
            let planFullInfo = new Array();
            for (const suite of suites) {
                let newSuite = new TestSuiteModel();
                newSuite.suiteId = suite.id;
                try {
                    newSuite.perentId = suite.parent.id;
                    newSuite.testSuiteLevel = -1;
                } catch (_a) {
                    newSuite.perentId = "0";
                    newSuite.testSuiteLevel = 0;
                };
                newSuite.allTestCases = suite.testCaseCount;
                newSuite.suiteName = suite.name;
                newSuite.suiteType = suite.suiteType;
                newSuite.testCaseCount = suite.testCaseCount;
                newSuite.suiteState = suite.state;
                newSuite.childrenSuites = Array();
                newSuite.testPointList = yield GetTestPointsV2(projectName, testPlanId, suite.id);
                planFullInfo.push(newSuite);
            }
            return planFullInfo;
        });
    }

    function GetTestPointsV2(projectName, testPlanId, suiteId) {
        return __awaiter(this, void 0, void 0, function*() {
            let testPoints = yield testClient.getPoints(projectName, testPlanId, suiteId);
            return GetAllTestRunsResults(projectName, testPoints);
        });
    }

    function GetAllTestRunsResults(projectName, testPoints) {
        return __awaiter(this, void 0, void 0, function*() {
            let testPointsModel = new Array();
            let testPointsIDs = new Array();
            testPoints.forEach(testPoint => {
                testPointsIDs.push(+testPoint.testCase.id);
            });
            let TestCaseWIs = new Array();
            if (testPoints.length > 0) {
                TestCaseWIs = yield WIClient.getWorkItems(testPointsIDs, null, null, Contracts_2.WorkItemExpand.All);
            }
            let TestRuns = yield testClient.getTestRuns(projectName);
            for (const testPoint of testPoints) {
                let testName = "";
                let incomplite = 0;
                let notApplicable = 0;
                let passed = 0;
                let total = 0;
                let postProcess = "";
                let stepFaild = "";
                let outcome = testPoint.outcome;
                let assingTo = "None";
                TestCaseWIs.forEach(TestCaseWI => {
                    if (TestCaseWI.id == +testPoint.testCase.id) {
                        testName = TestCaseWI.fields["System.Title"].toString();
                    }
                });
                if (testPoint.lastTestRun.id != "0") {
                    for (const run of TestRuns) {
                        if (run.id == +testPoint.lastTestRun.id) {
                            incomplite = run.incompleteTests;
                            notApplicable = run.notApplicableTests;
                            passed = run.passedTests;
                            total = run.totalTests;
                            postProcess = run.postProcessState;
                            let testResult2 = yield testClient.getTestIterations(projectName, run.id, +testPoint.lastResult.id, true);
                            testResult2.forEach(result => {
                                if (result.outcome == undefined) {
                                    outcome = "In Progress";
                                }
                                let actionResolt = result.actionResults.pop();
                                if (actionResolt != undefined && actionResolt.outcome == "Failed") {
                                    TestCaseWIs.forEach(TestCaseWI => {
                                        if (TestCaseWI.id == +testPoint.testCase.id) {
                                            let steps = $.parseXML(TestCaseWI.fields["Microsoft.VSTS.TCM.Steps"]).children[0];
                                            if (steps != null && steps != undefined) {
                                                for (var i = 0; i < steps.childNodes.length; i++) {
                                                    if (+steps.children[i].id == +actionResolt.actionPath) {
                                                        stepFaild = steps.children[i].textContent; +
                                                        " ; " + actionResolt.comment + " ; " +
                                                            actionResolt.errorMessage;
                                                    }
                                                }
                                            } else {
                                                stepFaild = actionResolt.comment + " ; " + actionResolt.errorMessage;
                                            }
                                        }
                                    });
                                }
                            });
                        }
                    }
                }
                if (outcome == "Unspecified") {
                    outcome = "Not Run";
                }
                if (testPoint.assignedTo.displayName != null) {
                    assingTo = testPoint.assignedTo.displayName.split(' <')[0];
                }
                let testPointModel = {
                    incompliteTests: incomplite,
                    notApplicableTests: notApplicable,
                    passedTests: passed,
                    postProcessState: postProcess,
                    totalTests: total,
                    id: testPoint.id.toString(),
                    assignedTo: assingTo,
                    comment: testPoint.comment,
                    outCome: outcome,
                    lastTestRun: testPoint.lastTestRun.name,
                    failureType: testPoint.failureType,
                    testCaseId: testPoint.testCase.id,
                    FaildStep: stepFaild,
                    testCaseName: testName,
                    testCaseType: testPoint.testCase.type,
                    configuration: testPoint.configuration.name
                };
                testPointsModel.push(testPointModel);
            }
            return testPointsModel;
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
            } else {
                rootSuite = TestSuiteChilde;
            }
        });
        palneFullInfo.forEach(suite => {
            if (suite.childrenSuites.length > 0) {
                suite.childrenSuites.forEach(child => {
                    child.testSuiteLevel = suite.testSuiteLevel + 1;
                });
            }
        });
        return rootSuite;
    }

    function BuildTreeView(rootTestCase) {
        let MasterDiv = $("#grid-container");
        MasterDiv.empty();
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
        tr.append(TextView("Failed step:", 1));
        if (point.FaildStep) {
            var doc = $($.parseHTML(point.FaildStep));
            tr.append(doc);
        } else {
            tr.append(TextView(point.FaildStep, 2));
        }
        tr.append(TextView("Assigned To:", 1));
        tr.append(TextView(point.assignedTo, 2));
        tr.append(TextView("Configuration:", 1));
        tr.append(TextView(point.configuration, 2));
        tr.append(TextView("Failure Type:", 1));
        tr.append(TextView(point.failureType, 2));
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
            case 1:
                {
                    textSpan.addClass("testLableInfo");
                    break;
                }
            case 2:
                {
                    textSpan.addClass("testInfo");
                    break;
                }
            case 3:
                {
                    textSpan.addClass("suitLable");
                    break;
                }
            case 4:
                {
                    textSpan.addClass("suitInfo");
                    break;
                }
            case 5:
                {
                    textSpan.addClass("planeLable");
                    break;
                }
            case 6:
                {
                    textSpan.addClass("planeInfo");
                    break;
                }
        }
        return textSpan;
    }

    function BuildTestsSum(suites) {
        return __awaiter(this, void 0, void 0, function*() {
            let totalTests = new SumeSuite();
            totalTests.SuiteName = "Total";
            totalTests.Blocked = 0;
            totalTests.Failed = 0;
            totalTests.InProgress = 0;
            totalTests.NotApplicable = 0;
            totalTests.NotRun = 0;
            totalTests.Passed = 0;
            totalTests.Paused = 0;
            totalTests.totalPoints = 0;
            totalTests.suiteLevel = 0;
            let SumSuites = new Array();
            let promisss = new Array();
            suites.forEach(suite => {
                promisss.push(GetSuiteSum(suite).then((newSuite) => {
                    totalTests.Blocked += newSuite.Blocked;
                    totalTests.Failed += newSuite.Failed;
                    totalTests.InProgress += newSuite.InProgress;
                    totalTests.NotApplicable += newSuite.NotApplicable;
                    totalTests.NotRun += newSuite.NotRun;
                    totalTests.Passed += newSuite.Passed;
                    totalTests.Paused += newSuite.Paused;
                    totalTests.totalPoints += newSuite.totalPoints;
                    SumSuites.push(newSuite);
                }));
            });
            let x = Promise.all(promisss).then(() => __awaiter(this, void 0, void 0, function*() {
                SumSuites.sort((a, b) => b.totalPoints - a.totalPoints);
                SumSuites.push(totalTests);
                SumSuitesforExecell = SumSuites;
                yield BuildGraphs(SumSuites);
                BuildTestsView(SumSuites);
            }));
        });
    }

    function GetSuiteSum(suite) {
        return __awaiter(this, void 0, void 0, function*() {
            let suiteSum = new SumeSuite();
            palnInfoExcell.forEach(element => {
                if (element.suiteName == suite.name)
                    suiteSum.suiteLevel = element.testSuiteLevel;
            });
            suiteSum.SuiteName = suite.name;
            suiteSum.Blocked = 0;
            suiteSum.Paused = 0;
            suiteSum.Passed = 0;
            suiteSum.Failed = 0;
            suiteSum.NotRun = 0;
            suiteSum.NotApplicable = 0;
            suiteSum.InProgress = 0;
            suiteSum.totalPoints = suite.testCaseCount;
            let points = yield testClient.getPoints(suite.project.name, +suite.plan.id, suite.id);
            for (const point of points) {
                switch (point.outcome) {
                    case "None":
                        {
                            suiteSum.InProgress += 1;
                            break;
                        }
                    case "NotApplicable":
                        {
                            suiteSum.NotApplicable += 1;
                            break;
                        }
                    case "Blocked":
                        {
                            suiteSum.Blocked += 1;
                            break;
                        }
                    case "Paused":
                        {
                            suiteSum.Paused += 1;
                            break;
                        }
                    case "Passed":
                        {
                            suiteSum.Passed += 1;
                            break;
                        }
                    case "Failed":
                        {
                            suiteSum.Failed += 1;
                            break;
                        }
                    case "Unspecified":
                        {
                            suiteSum.NotRun += 1;
                            break;
                        }
                }
            };
            return suiteSum;
        });
    }

    function BuildTestsView(SumSuites) {
        let tableContainer = $("#table-container").addClass("tableTest");
        let container = $("<table />");
        let trH = $("<tr />").addClass("tableTR");
        trH.append($("<th />").text("Suite Name").addClass("tableTH"));
        trH.append($("<th />").text("Total").addClass("tableTH"));
        trH.append($("<th />").text("Passed").addClass("tableTH"));
        trH.append($("<th />").text("Failed").addClass("tableTH"));
        trH.append($("<th />").text("Not Run").addClass("tableTH"));
        trH.append($("<th />").text("Not Applicable").addClass("tableTH"));
        trH.append($("<th />").text("In Progress").addClass("tableTH"));
        trH.append($("<th />").text("Paused").addClass("tableTH"));
        trH.append($("<th />").text("Blocked").addClass("tableTH"));
        container.append(trH);
        let trClass = "tableTR";
        let count = 0;
        SumSuites.forEach(suite => {
            count++;
            let trD = $("<tr />").addClass(trClass + (count % 2));
            trD.append($("<td />").text(suite.SuiteName).addClass("leftTableTD"));
            trD.append($("<td />").text(suite.totalPoints).addClass("tableTD"));
            trD.append($("<td />").text(suite.Passed).addClass("tableTD"));
            trD.append($("<td />").text(suite.Failed).addClass("tableTD"));
            trD.append($("<td />").text(suite.NotRun).addClass("tableTD"));
            trD.append($("<td />").text(suite.NotApplicable).addClass("tableTD"));
            trD.append($("<td />").text(suite.InProgress).addClass("tableTD"));
            trD.append($("<td />").text(suite.Paused).addClass("tableTD"));
            trD.append($("<td />").text(suite.Blocked).addClass("tableTD"));
            tableContainer.empty();
            container.append(trD);
        });
        tableContainer.append(container);
    }

    function BuildGraphs(SumSuites) {
        let $container = $('#graph-container');
        let $radioButtons = $("#DeepRadioButton");
        $container.addClass("scroller");
        $container.css("width", "100%");
        $container.css("height", "100%");
        $container.empty();
        $container.append($radioButtons);
        let $spanMainChart = $("<span />");
        let $firstLine = $("<div />");
        $firstLine.append($spanMainChart);
        $container.append($firstLine);
        let $table = $("<table />");
        $table.addClass("scroller");
        $table.css("height", "80%");
        let $secondLine = $("<tr />");
        $secondLine.css("vertical-align", "bottom");
        let $therdLine = $("<tr />");
        $therdLine.css("height", "90%");
        $therdLine.addClass("scroller");
        $therdLine.css("vertical-align", "top");
        let $selectedPieLabell = $("<td />");
        $selectedPieLabell.text("Selected Suite");
        $selectedPieLabell.addClass("graphLabels");
        let $totalLabell = $("<td />");
        $totalLabell.text("Total Suites");
        $totalLabell.addClass("graphLabels");
        let $emptySuiteLabell = $("<td />");
        $emptySuiteLabell.text("Empty Suites");
        $emptySuiteLabell.addClass("graphLabels");
        let $selectedChart = $("<td />");
        $selectedChart.addClass("graphLabels");
        $secondLine.append($totalLabell);
        $secondLine.append($selectedPieLabell);
        $secondLine.append($emptySuiteLabell);
        $secondLine.append($selectedChart);
        let $spanTotalPie = $("<span />");
        let $spanDynamiclPie = $("<span />");
        let $spanEmptySuites = $("<span />");
        let $spanSelectedChart = $("<span />");
        let $totalSuitesPie = $("<td />");
        let $selectedSuitePie = $("<td />");
        let $selectedSuiteChart = $("<td />");
        let $emptySuitt = $("<td />");
        $totalSuitesPie.append($spanTotalPie);
        $selectedSuitePie.append($spanDynamiclPie);
        $emptySuitt.append($spanEmptySuites);
        $selectedSuiteChart.append($spanSelectedChart);
        $therdLine.append($totalSuitesPie);
        $therdLine.append($selectedSuitePie);
        $therdLine.append($emptySuitt);
        $therdLine.append($selectedSuiteChart);
        let $secDev = $("<div />");
        $table.append($secondLine);
        $table.append($therdLine);
        $secDev.append($table);
        $container.append($secDev);
        let cakeGraphId = SumSuites.length - 1;
        BuildStackedColumnChart(SumSuites, $spanMainChart, $spanDynamiclPie, $spanEmptySuites, Colorize());
        BuildPieChart(SumSuites[0], $spanDynamiclPie, "Total Suits", Colorize());
        BuildPieChart(SumSuites[cakeGraphId], $spanTotalPie, "Selected Suits", Colorize());
    }

    function Colorize() {
        let colorPass = {
            backgroundColor: 'Green',
            value: 'Passed'
        };
        let colorFailed = {
            backgroundColor: 'Red',
            value: 'Failed'
        };
        let colorNotRun = {
            backgroundColor: 'Gray',
            value: 'Not Run'
        };
        let colorInProgress = {
            backgroundColor: 'Blue',
            value: 'In Progress'
        };
        let colorInNotApplicable = {
            backgroundColor: 'White',
            value: 'Not Applicable'
        };
        let colors = new Array();
        colors.push(colorPass);
        colors.push(colorFailed);
        colors.push(colorNotRun);
        colors.push(colorInProgress);
        colors.push(colorInNotApplicable);
        let colorize = {
            customColors: colors
        };
        return colorize;
    }

    function BuildStackedColumnChart(SumSuites, $graphSpan, $dinamicPieSpan, $emptySuite, colorize) {
        let deep = $('#deep').is(":checked");
        let howDeep = $("#level").val();
        let Paused = [];
        let Blocked = [];
        let Passed = [];
        let Failed = [];
        let NotRun = [];
        let NotApplicable = [];
        let InProgress = [];
        let labels = [];
        let emptySuites = [];
        for (let i = 0; i < SumSuites.length - 1; i++) {
            if (deep == true || SumSuites[i].suiteLevel <= howDeep) {
                if (SumSuites[i].totalPoints > 0) {
                    labels.push(SumSuites[i].SuiteName);
                    Passed.push([i, SumSuites[i].Passed]);
                    Failed.push([i, SumSuites[i].Failed]);
                    NotRun.push([i, SumSuites[i].NotRun]);
                    InProgress.push([i, SumSuites[i].InProgress]);
                    NotApplicable.push([i, SumSuites[i].NotApplicable]);
                    Paused.push([i, SumSuites[i].Paused]);
                    Blocked.push([i, SumSuites[i].Blocked]);
                } else {
                    emptySuites.push(SumSuites[i].SuiteName);
                }
            }
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
            name: "In Progress",
            data: InProgress
        });
        InProgress;
        series.push({
            name: "Not Run",
            data: NotRun
        });
        let toolTipOption = {
            onlyShowFocusedSeries: true,
        };
        let chartStackedColumnOptions = {
            "tooltip": toolTipOption,
            "chartType": Contracts_1.ChartTypesConstants.StackedColumn,
            colorCustomizationOptions: colorize,
            "xAxis": {
                canZoom: true,
                suppressLabelTruncation: true,
                labelValues: labels
            },
            "yAxis": {
                renderToEdges: true
            },
            "series": series,
            "click": (clickeEvent) => {
                $dinamicPieSpan.empty();
                BuildPieChart(SumSuites[clickeEvent.seriesDataIndex], $dinamicPieSpan, "Selected suits", colorize);
            },
        };
        BuildEmptyStuiteList(emptySuites, $emptySuite);
        Services.ChartsService.getService().then((chartService) => {
            chartService.createChart($graphSpan, chartStackedColumnOptions);
        });
    }

    function BuildEmptyStuiteList(emptySuiteList, $emptySuite) {
        let $mainContainer = $("<div />");
        $mainContainer.css("vertical-align", "text-top");
        let $container = $("<ul />");
        $container.css("vertical-align", "text-top");
        if (emptySuiteList.length > 0) {
            emptySuiteList.forEach(Suite => {
                let $liSuite = $("<li />");
                $liSuite.text(Suite);
                $liSuite.css("font-size", "large");
                $liSuite.css("vertical-align", "text-top");
                $container.append($liSuite);
            });
            $container.css("overflow", "scroll");
            $container.css("border", "1px solid black");
            $mainContainer.append($container);
            $emptySuite.append($mainContainer);
        }
    }

    function BuildPieChart(selectedSuite, $rightGraph, title, colorize) {
        let legend = {
            enabled: false
        };
        let chartPieOptions = {
            "title": title,
            "suppressMargin": true,
            "legend": legend,
            suppressAnimation: true,
            hostOptions: { height: 250, width: 250 },
            "chartType": Contracts_1.ChartTypesConstants.Pie,
            colorCustomizationOptions: colorize,
            "xAxis": {
                title: title,
                canZoom: true,
                labelsEnabled: false,
                labelValues: ["Paused", "Blocked", "Not Applicable", "Passed", "Failed", "In Progress", "Not Run"]
            },
            "series": [{
                "data": [
                    selectedSuite.Paused,
                    selectedSuite.Blocked,
                    selectedSuite.NotApplicable,
                    selectedSuite.Passed,
                    selectedSuite.Failed,
                    selectedSuite.InProgress,
                    selectedSuite.NotRun
                ]
            }],
            "specializedOptions": {
                showLabels: true,
                size: "80%"
            },
        };
        Services.ChartsService.getService().then((chartService) => {
            chartService.createChart($rightGraph, chartPieOptions);
        });
    }
    var id = VSS.getContribution().id;
    VSS.register(id, Init_Page);
    Init_Page();
});