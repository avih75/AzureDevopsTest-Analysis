import TestRestClient = require("TFS/TestManagement/RestClient"); 
import Controls = require("VSS/Controls");
import Grids = require("VSS/Controls/Grids");
import { TestPlan } from "TFS/TestManagement/Contracts";
import { VssConnection, VssService } from "VSS/Service";

class TestGrid {
    id: number;
    name: string;
    outcome: string;
}

export function getProjectTestPlanes(): void {  
    $("#selectPlan").append(new Option("fake","1")); 
    // add on selected
    var projectName = VSS.getWebContext().project.name;
    let client = TestRestClient.getClient();
    client._setInitializationPromise(client.authTokenManager.getAuthToken());    
    client.getPlans(projectName).then((plans) => {
        plans.forEach(plan => { 
            $("#selectPlan").append(new Option(plan.name,plan.id.toString())); 
        });
    })  
    $("#loading").hide();
    // set selected plane
    // getSuiteTestPoint(source, 31, 31, grid);
}

export function getSuiteTestPoint(source: Array<TestGrid>, testPlaneId: number, suiteId: number, target: Grids.Grid): void {
    var container = $("#grid-container"); 
    var gridOptions: Grids.IGridOptions = {
        height: "600px",
        width: "10000",
        source: source,
        columns: [
            { text: "Test run Id", width: 200, index: "id" },
            { text: "Test Name", width: 500, index: "name" },
            { text: "State", width: 300, index: "state" }
        ]
    };
    var source = new Array<TestGrid>();
    var grid = Controls.create(Grids.Grid, container, gridOptions);
    // client.getPoints(getTeamContext().projectname, testPlaneId, suiteId).then(TestPoints => {
    //     TestPoints.forEach(testPoint => {
    //         source.push({ id: testPoint.id, name: testPoint.testCase.name, outcome: testPoint.outcome });
    //     })
    //     target.setDataSource(source);
    // }
    // );
}
var id = VSS.getContribution().id;
VSS.register(id, getProjectTestPlanes);

getProjectTestPlanes();