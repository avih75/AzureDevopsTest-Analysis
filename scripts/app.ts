import { TestAnalisysHubController } from "./TestAnalisysHubController";

var control: TestAnalisysHubController;

var provider = () => {
    return {
        onloaded: () =>{
            control= new TestAnalisysHubController();
        },
        onFieldChange: ()=>{

        }
    }
} 

VSS.register(VSS.getContribution().id, provider);