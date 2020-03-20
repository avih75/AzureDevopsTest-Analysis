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
    function show(divName, func) {
        var elt = document.getElementById(divName);
        var result = func(elt);
    }
    exports.show = show;
    function getAvailableBuildDefinitions(target) {
        var client = TestRestClient.getClient();
        client.getPlans(getTeamContext().projectname).then(function (plans) {
            target.innerText = JSON.stringify(plans);
        });
    }
    exports.getAvailableBuildDefinitions = getAvailableBuildDefinitions;
    function getAvailableReleaseDefinitions(source, target) {
        var client = TestRestClient.getClient();
        var planId = 1;
        var suiteId = 1;
        client.getPoints(getTeamContext().projectname, planId, suiteId).then(function (TestPoints) {
            TestPoints.forEach(function (testPoint) {
                source.push({ id: testPoint.id, name: testPoint.testCase.name, outcome: testPoint.outcome });
            });
            target.setDataSource(source);
        });
    }
    exports.getAvailableReleaseDefinitions = getAvailableReleaseDefinitions;
    var gridOptions = {
        height: "300px",
        width: "500px",
        source: source,
        columns: [
            { text: "ReleaseIdentifier", width: 200, index: "id" },
            { text: "ReleaseName", width: 300, index: "name" },
            { text: "ReleaseName", width: 200, index: "state" }
        ]
    };
    var container = $("#grid-container");
    var source = new Array();
    var grid = Controls.create(Grids.Grid, container, gridOptions);
    show("Tests", getAvailableBuildDefinitions);
    getAvailableReleaseDefinitions(source, grid);
});
