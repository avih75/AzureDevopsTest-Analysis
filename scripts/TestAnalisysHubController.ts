
import { ViewModel } from "./ViewModel";
import { TestPlaneModels } from "./TestPlaneModel";
import * as WitService from "TFS/WorkItemTracking/Services";
import { Service } from "TFS/TestManagement/Contracts";
import Q = require("q");

export class TestAnalisysHubController {
    private viewModel: ViewModel;
    private id: string;
    private properties: any;
    private project: ContextIdentifier;
    constructor() {
        this._initialize();
    }
    private _initialize(): void {
        this.properties = VSS.getConfiguration().properties;
        this.id = VSS.getContribution().id;
        this.project = VSS.getWebContext().project;

        WitService.WorkItemFormService.getService().then(
            (Service) => {
                Q.spread([Service.getFieldValue('a')],
                    (a: string) => {
                        // get the project from the ...
                        let testPlaneModels: TestPlaneModels = new TestPlaneModels('projectName');
                        this.viewModel = new ViewModel(testPlaneModels);
                    }
                )
            }
        )


    }
    public getFieldName(): string {
        return "";
    }
}