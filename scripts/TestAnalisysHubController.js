define(["require", "exports", "./ViewModel", "./TestPlaneModel"], function (require, exports, ViewModel_1, TestPlaneModel_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var TestAnalisysHubController = (function () {
        function TestAnalisysHubController() {
            this._initialize();
        }
        TestAnalisysHubController.prototype._initialize = function () {
            var xxx = VSS.getConfiguration().properties;
            var testPlaneModels = new TestPlaneModel_1.TestPlaneModels('projectName');
            this.viewModel = new ViewModel_1.ViewModel(testPlaneModels);
        };
        return TestAnalisysHubController;
    }());
    exports.TestAnalisysHubController = TestAnalisysHubController;
});
