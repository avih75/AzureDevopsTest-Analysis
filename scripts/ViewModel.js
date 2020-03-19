define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ViewModel = (function () {
        function ViewModel(TestPlanes) {
            this._init();
        }
        ViewModel.prototype._init = function () {
            $(".container").remove();
            var canvas = $("<canvas />");
            $("body").append(canvas);
        };
        return ViewModel;
    }());
    exports.ViewModel = ViewModel;
});
