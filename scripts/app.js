define(["require", "exports", "TFS/TestManagement/RestClient", "VSS/Controls", "VSS/Controls/Grids"], function (require, exports, TestRestClient, Controls, Grids) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var TestGrid = (function () {
        function TestGrid() {
        }
        return TestGrid;
    }());
    function getProjectTestPlanes() {
        $("#selectPlan").append(new Option("fake", "1"));
        var projectName = VSS.getWebContext().project.name;
        var client = TestRestClient.getClient();
        client._setInitializationPromise(client.authTokenManager.getAuthToken());
        client.getPlans(projectName).then(function (plans) {
            plans.forEach(function (plan) {
                $("#selectPlan").append(new Option(plan.name, plan.id.toString()));
            });
        });
        $("#loading").hide();
    }
    exports.getProjectTestPlanes = getProjectTestPlanes;
    function getSuiteTestPoint(source, testPlaneId, suiteId, target) {
        var container = $("#grid-container");
        var gridOptions = {
            height: "600px",
            width: "10000",
            source: source,
            columns: [
                { text: "Test run Id", width: 200, index: "id" },
                { text: "Test Name", width: 500, index: "name" },
                { text: "State", width: 300, index: "state" }
            ]
        };
        var source = new Array();
        var grid = Controls.create(Grids.Grid, container, gridOptions);
    }
    exports.getSuiteTestPoint = getSuiteTestPoint;
    var id = VSS.getContribution().id;
    VSS.register(id, getProjectTestPlanes);
    getProjectTestPlanes();
});
