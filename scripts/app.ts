import { TestAnalisysHubController } from "./TestAnalisysHubController";
import { } from "TFS/TestManagement/Contracts";
import { VssHttpClient } from "VSS/WebApi/RestClient";

var control: TestAnalisysHubController;

var provider = () => {
    return {
        onloaded: (Args: any = "") => {
            control = new TestAnalisysHubController();
        },
        onFieldChange: (fieldChangedArgs: any = "") => {
            //var changedValue = fieldChangedArgs.changedFields[control.getFieldName()];
            if (fieldChangedArgs !== undefined) {
            }
        }
    }
}

VSS.register(VSS.getContribution().id, provider);
