define(["require", "exports", "TFS/TestManagement/RestClient", "VSS/Controls", "VSS/Controls/Grids"], function (require, exports, TestRestClient, Controls, Grids) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var TestPointModel = (function () {
        function TestPointModel() {
        }
        return TestPointModel;
    }());
    var TestCaseModel = (function () {
        function TestCaseModel() {
        }
        return TestCaseModel;
    }());
    var TestSuiteModel = (function () {
        function TestSuiteModel() {
        }
        return TestSuiteModel;
    }());
    var client;
    function Init_Page() {
        client = TestRestClient.getClient();
        var selectPlan = $("#selectPlan");
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
            var selectedPlane = $(this).children("option:selected").val();
            BuildTableTestGrid(projectName, selectedPlane);
            BuildGraph(selectedPlane);
        });
        client._setInitializationPromise(client.authTokenManager.getAuthToken());
        client.getPlans(projectName).then(function (plans) {
            var lastPlan;
            plans.forEach(function (plan) {
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
        var container = $("#grid-container");
        var planInfo = $("#PlanInfos");
        container.empty();
        planInfo.empty();
        client.getPlanById(projectName, +testPlaneId)
            .then(function (selectedPlane) { return GetTestPlaneInfo(selectedPlane, testPlaneId, planInfo, projectName); })
            .then(function (palneFullInfo) { return CreateTableView(palneFullInfo, container); });
    }
    function GetTestPlaneInfo(selectedPlane, testPlaneId, planInfo, projectName) {
        planInfo.append($("<h4 />").text("project: " + projectName +
            "    Plane: " + testPlaneId +
            "    Root Suite: " + selectedPlane.rootSuite.name +
            "    Iteration: " + selectedPlane.iteration +
            "    Start Date: " + selectedPlane.startDate +
            "    State: " + selectedPlane.state));
        return GetTestSuiteInfos(projectName, testPlaneId);
    }
    function GetTestSuiteInfos(projectName, testPlaneId) {
        var palneFullInfo = new Array();
        var promiseCascade;
        return client.getTestSuitesForPlan(projectName, +testPlaneId).then(function (suites) {
            if (suites.length > 0) {
                suites.forEach(function (suite) {
                    var newSuite = new TestSuiteModel();
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
                    if (promiseCascade == undefined)
                        promiseCascade = (TestCaseInfos(projectName, testPlaneId, suite.id.toString(), newSuite, palneFullInfo));
                    else
                        promiseCascade = (promiseCascade.then(function () { return (TestCaseInfos(projectName, testPlaneId, suite.id.toString(), newSuite, palneFullInfo)); }));
                });
            }
        }).then(function () {
            return promiseCascade.then(function () { return ReArangeSuiteList(palneFullInfo); });
        });
    }
    function TestCaseInfos(projectName, testPlaneId, suiteId, newSuite, palneFullInfo) {
        var promiseCascade;
        return client.getTestCases(projectName, +testPlaneId, +suiteId).then(function (testCases) {
            if (testCases.length > 0) {
                var TestCaseList_1 = new Array();
                testCases.forEach(function (testCase) {
                    var pointTesterName;
                    var pointConfigurationName;
                    testCase.pointAssignments.forEach(function (point) {
                        pointTesterName = point.tester.uniqueName;
                        pointConfigurationName = point.configuration.id;
                    });
                    var newTestCase = {
                        lastTestPoint: new TestPointModel,
                        testCaseName: testCase.testCase.name,
                        pointTesterName: pointTesterName,
                        pointConfigurationName: pointConfigurationName
                    };
                    if (promiseCascade == undefined)
                        promiseCascade = GetPointByID(projectName, testPlaneId, suiteId, pointConfigurationName, newTestCase);
                    else
                        promiseCascade = promiseCascade.then(function () { return GetPointByID(projectName, testPlaneId, suiteId, pointConfigurationName, newTestCase); });
                });
                promiseCascade = promiseCascade.then(function () {
                    newSuite.testCaseList = TestCaseList_1;
                });
            }
        }).then(function () {
            return promiseCascade;
        });
    }
    function GetPointByID(projectName, testPlaneId, suiteId, pointId, newTestCase) {
        try {
            return client.getPoint(projectName, +testPlaneId, +suiteId, +pointId).then(function (point) {
                newTestCase.lastTestPoint = {
                    suite: point.suite.name,
                    testCase: point.testCase.name,
                    state: point.lastResultState,
                    outCome: point.outcome,
                    lastTestRun: point.lastTestRun.name,
                    assignedTo: point.assignedTo.displayName,
                    comment: point.comment,
                    failureType: point.failureType,
                };
            });
        }
        catch (_a) {
        }
    }
    function ReArangeSuiteList(palneFullInfo) {
        return palneFullInfo;
    }
    function CreateTableView(palneFullInfo, container) {
        {
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
