import TestRestClient = require("TFS/TestManagement/RestClient");
import Controls = require("VSS/Controls");
import Grids = require("VSS/Controls/Grids");
import { TestPlan } from "TFS/TestManagement/Contracts";

class TestGrid {
    id: number;
    name: string;
    outcome: string;
}

export function getTeamContext() {
    var webcontext = VSS.getWebContext();
    return {
        projectname: webcontext.project.name,
        teamId: webcontext.team.id
    };
}

export function show(JQElement: JQuery, func: (target: JQuery) => void) {
    JQElement.hide();
    $("#loading").show();
    //const elt = document.getElementById(JQElement)!;
    let result = func(JQElement);
}

export function getProjectTestPlanes(target: JQuery): void {
    let planList: string[] = [];
    let client = TestRestClient.getClient();
    client.getPlans(getTeamContext().projectname).then(plans => {
        plans.forEach(plan => {
            planList.push(plan.id.toString() + ". " + plan.name);
        });
        //target = JSON.stringify(planList)
    }
    );
    target.show();
    $("#loading").hide();
}

export function getSuiteTestPoint(source: Array<TestGrid>, testPlaneId: number, suiteId: number, target: Grids.Grid): void {
    let client = TestRestClient.getClient();
    client.getPoints(getTeamContext().projectname, testPlaneId, suiteId).then(TestPoints => {
        TestPoints.forEach(testPoint => {
            source.push({ id: testPoint.id, name: testPoint.testCase.name, outcome: testPoint.outcome });
        })
        target.setDataSource(source);
    }
    );
}

var gridOptions: Grids.IGridOptions = {
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
var source = new Array<TestGrid>();

var grid = Controls.create(Grids.Grid, container, gridOptions);
show(selectPlane, getProjectTestPlanes);
getSuiteTestPoint(source, 1, 1, grid);

