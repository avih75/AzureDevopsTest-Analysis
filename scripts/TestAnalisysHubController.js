define(["require", "exports", "./ViewModel", "./TestPlaneModel", "TFS/WorkItemTracking/Services", "q"], function (require, exports, ViewModel_1, TestPlaneModel_1, WitService, Q) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var TestAnalisysHubController = (function () {
        function TestAnalisysHubController() {
            this._initialize();
        }
        TestAnalisysHubController.prototype._initialize = function () {
            var _this = this;
            this.properties = VSS.getConfiguration().properties;
            this.id = VSS.getContribution().id;
            this.project = VSS.getWebContext().project;
            WitService.WorkItemFormService.getService().then(function (Service) {
                Q.spread([Service.getFieldValue('a')], function (a) {
                    var testPlaneModels = new TestPlaneModel_1.TestPlaneModels('projectName');
                    _this.viewModel = new ViewModel_1.ViewModel(testPlaneModels);
                });
            });
        };
        TestAnalisysHubController.prototype.getFieldName = function () {
            return "";
        };
        return TestAnalisysHubController;
    }());
    exports.TestAnalisysHubController = TestAnalisysHubController;
});
