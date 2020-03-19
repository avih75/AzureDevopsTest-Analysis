 
import { ViewModel } from "./ViewModel";
import { TestPlaneModels } from "./TestPlaneModel";


export class TestAnalisysHubController {
    private viewModel: ViewModel;
    constructor() {
        this._initialize();
    }
    private _initialize(): void {
        let xxx = VSS.getConfiguration().properties;
        
        // get the project from the ...
        let testPlaneModels:TestPlaneModels = new TestPlaneModels('projectName');
        this.viewModel = new ViewModel(testPlaneModels);
    }
}