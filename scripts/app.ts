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

export function show(divName: string, func: (target: HTMLElement) => void) {
    const elt = document.getElementById(divName)!;
    let result = func(elt);
}

export function getAvailableBuildDefinitions(target: HTMLElement): void {
    // Get an instance of the client
    let client = TestRestClient.getClient();
    client.getPlans(getTeamContext().projectname).then(plans => {
        target.innerText = JSON.stringify(plans)
    }
    );
} 

export function getAvailableReleaseDefinitions(source: Array<TestGrid>, target: Grids.Grid): void {
    // Get an instance of the client
    let client = TestRestClient.getClient();
    let planId = 1;
    let suiteId = 1;
    client.getPoints(getTeamContext().projectname, planId, suiteId).then(TestPoints => {
        TestPoints.forEach(testPoint => {
            source.push({ id: testPoint.id, name: testPoint.testCase.name, outcome: testPoint.outcome });
        }) 
        target.setDataSource(source);
    }
    );
}
 
var gridOptions: Grids.IGridOptions = {
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
var source = new Array<TestGrid>();

var grid = Controls.create(Grids.Grid, container, gridOptions);
show("Tests", getAvailableBuildDefinitions);
getAvailableReleaseDefinitions(source, grid);

