define(["require", "exports", "./TestAnalisysHubController"], function (require, exports, TestAnalisysHubController_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var control;
    var provider = function () {
        return {
            onloaded: function () {
                control = new TestAnalisysHubController_1.TestAnalisysHubController();
            },
            onFieldChange: function () {
            }
        };
    };
    VSS.register(VSS.getContribution().id, provider);
});
