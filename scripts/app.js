define(["require", "exports", "TFS/TestManagement/RestClient", "VSS/Controls", "VSS/Controls/Grids"], function (require, exports, TestRestClient, Controls, Grids) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var TestGrid = (function () {
        function TestGrid() {
        }
        return TestGrid;
    }());
    function getProjectTestPlanes() {
        var selectPlane = $("#selectPlan");
        selectPlane.hide();
        $("#loading").show();
        var planList = [];
        planList.push("1. fake");
        var opt = $("#selectPlan").append("<option />");
        opt.text("1. fake");
        var projectName = VSS.getWebContext().project.name;
        var client = TestRestClient.getClient();
        client._setInitializationPromise(client.authTokenManager.getAuthToken());
        client.getPlans(projectName).then(function (plans) {
            plans.forEach(function (plan) {
                planList.push(plan.id + ". " + plan.name);
                var option = $("#selectPlan").append("<option />");
                option.text(plan.id + ". " + plan.name);
            });
        });
        selectPlane.show();
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
