/// <reference types="vss-web-extension-sdk" />

export async function GetLastTimeValue(key: string) {
    let dataService: any = await VSS.getService(VSS.ServiceIds.ExtensionData);
    let result: string = await dataService.getValue(key);
    return +result;
}
export async function SetValue(key: string, value: number) {
    var deferred = $.Deferred();
    let dataService: any = await VSS.getService(VSS.ServiceIds.ExtensionData);
    let result = await dataService.setValue(key, value);
    deferred.resolve();
    return deferred;
}