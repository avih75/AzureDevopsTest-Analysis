define(["require", "exports", "TFS/TestManagement/RestClient", "VSS/Controls", "VSS/Controls/Grids"], function (require, exports, TestRestClient, Controls, Grids) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var TestGrid = (function () {
        function TestGrid() {
        }
        return TestGrid;
    }());
    function getTeamContext() {
        var webcontext = VSS.getWebContext();
        return {
            projectname: webcontext.project.name,
            teamId: webcontext.team.id
        };
    }
    exports.getTeamContext = getTeamContext;
    function show(JQElement, func) {
        JQElement.hide();
        $("#loading").show();
        var result = func(JQElement);
    }
    exports.show = show;
    function getProjectTestPlanes(target) {
        var planList = [];
        var client = TestRestClient.getClient();
        client.getPlans(getTeamContext().projectname).then(function (plans) {
            plans.forEach(function (plan) {
                planList.push(plan.id.toString() + ". " + plan.name);
            });
        });
        target.show();
        $("#loading").hide();
    }
    exports.getProjectTestPlanes = getProjectTestPlanes;
    function getSuiteTestPoint(source, testPlaneId, suiteId, target) {
        var client = TestRestClient.getClient();
        client.getPoints(getTeamContext().projectname, testPlaneId, suiteId).then(function (TestPoints) {
            TestPoints.forEach(function (testPoint) {
                source.push({ id: testPoint.id, name: testPoint.testCase.name, outcome: testPoint.outcome });
            });
            target.setDataSource(source);
        });
    }
    exports.getSuiteTestPoint = getSuiteTestPoint;
    var gridOptions = {
        height: "600px",
        width: "10000",
        source: source,
        columns: [
            { text: "ReleaseIdentifier", width: 200, index: "id" },
            { text: "ReleaseName", width: 500, index: "name" },
            { text: "ReleaseName", width: 300, index: "state" }
        ]
    };
    var container = $("#grid-container");
    var selectPlane = $("#selectPlan");
    var source = new Array();
    var grid = Controls.create(Grids.Grid, container, gridOptions);
    show(selectPlane, getProjectTestPlanes);
    getSuiteTestPoint(source, 1, 1, grid);
});
