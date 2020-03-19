define(["require", "exports", "./TestAnalisysHubController"], function (require, exports, TestAnalisysHubController_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var control;
    var provider = function () {
        return {
            onloaded: function (Args) {
                if (Args === void 0) { Args = ""; }
                control = new TestAnalisysHubController_1.TestAnalisysHubController();
            },
            onFieldChange: function (fieldChangedArgs) {
                if (fieldChangedArgs === void 0) { fieldChangedArgs = ""; }
                if (fieldChangedArgs !== undefined) {
                }
            },
            onclick: function () {
                alert('click');
            },
            onload: function () {
                alert('load');
            },
            onScriptLoad: function (xx) {
                if (xx === void 0) { xx = ""; }
                alert('scriptload');
            }
        };
    };
    VSS.register(VSS.getContribution().id, provider);
});
