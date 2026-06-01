import * as SDK from "azure-devops-extension-sdk";

const EXT_DATA_SERVICE = "ms.vss-features.extension-data-service";

async function getManager(): Promise<any> {
  const svc = await SDK.getService<any>(EXT_DATA_SERVICE);
  return svc.getExtensionDataManager(
    SDK.getExtensionContext().id,
    await SDK.getAccessToken()
  );
}

// Wrap with a timeout so storage never blocks the main load flow
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export async function getLastSelectedPlan(key: string): Promise<number> {
  return withTimeout(
    (async () => {
      const mgr = await getManager();
      const val = await (mgr.getValue(key) as Promise<number | undefined>);
      return val || 0;
    })(),
    3000,
    0
  ).catch(() => 0);
}

export async function setLastSelectedPlan(
  key: string,
  planId: number
): Promise<void> {
  withTimeout(
    (async () => {
      const mgr = await getManager();
      await mgr.setValue(key, planId);
    })(),
    3000,
    undefined
  ).catch(() => { /* ignore storage errors */ });
}
