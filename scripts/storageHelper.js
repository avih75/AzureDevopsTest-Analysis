var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function GetLastTimeValue(key) {
        return __awaiter(this, void 0, void 0, function* () {
            let dataService = yield VSS.getService(VSS.ServiceIds.ExtensionData);
            let result = yield dataService.getValue(key);
            return +result;
        });
    }
    exports.GetLastTimeValue = GetLastTimeValue;
    function SetValue(key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            var deferred = $.Deferred();
            let dataService = yield VSS.getService(VSS.ServiceIds.ExtensionData);
            let result = yield dataService.setValue(key, value);
            deferred.resolve();
            return deferred;
        });
    }
    exports.SetValue = SetValue;
});
