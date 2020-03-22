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
    var selectPlane = $("#selectPlan");
    selectPlane.hide();
    $("#loading").show();
    let planList: string[] = [];
    planList.push("1. fake");
    let opt = $("#selectPlan").append("<option />")
    opt.text("1. fake");
    var projectName = VSS.getWebContext().project.name;
    let client = TestRestClient.getClient();
    client._setInitializationPromise(client.authTokenManager.getAuthToken());
    // client.authTokenManager.getAuthToken().then((token) => {
    //     let x = client.authTokenManager.getAuthorizationHeader(token);        
    client.getPlans(projectName).then((plans) => {
        plans.forEach(plan => {
            planList.push(plan.id + ". " + plan.name);
            let option = $("#selectPlan").append("<option />")
            option.text(plan.id + ". " + plan.name);
        });
    })
    // })

    // VSS.require(["VSS/Service", "TFS/TestManagement/RestClient"], function (VSS_Service, TFS_test_WebApi) {
    //     // Get the REST client
    //     var testClient = VSS_Service.getCollectionClient(TFS_test_WebApi.TestHttpClient2_2);
    //     testClient.getPlans(projectName).then((plans) => {
    //         plans.forEach(plan => {
    //             planList.push(plan.id + ". " + plan.name);
    //             let option = $("#selectPlan").append("<option />")
    //             option.text(plan.id + ". " + plan.name);
    //         });
    //     })
    // });

    selectPlane.show();
    $("#loading").hide();
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