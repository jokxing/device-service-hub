import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { loadMicroApp } from "qiankun";
import type { ServiceNavigationRequest } from "@device-service-hub/contracts";

import type { MicroAppDefinition } from "./types";

// React effect cleanup cannot await. Serialize all mount/unmount work, including StrictMode.
let lifecycleQueue: Promise<unknown> = Promise.resolve();
function schedule(task: () => Promise<void>) {
  const result = lifecycleQueue.then(task);
  lifecycleQueue = result.catch(() => {});
  return result;
}

export function useMicroApp(
  definition: MicroAppDefinition,
  onNavigate?: (message: ServiceNavigationRequest) => void,
) {
  const container = useRef<HTMLDivElement>(null);
  const navigateRef = useRef(onNavigate);
  useLayoutEffect(() => {
    navigateRef.current = onNavigate;
  }, [onNavigate]);
  const [phase, setPhase] = useState<"loading" | "mounted" | "failed">(
    "loading",
  );
  useEffect(() => {
    const parent = container.current;
    if (!parent) return;
    const slot = document.createElement("div");
    parent.appendChild(slot);
    let disposed = false;
    let app: ReturnType<typeof loadMicroApp> | undefined;
    setPhase("loading");
    void schedule(async () => {
      if (disposed) return;
      app = loadMicroApp(
        {
          name: definition.name,
          entry: definition.entry,
          container: slot,
          props: {
            basePath: definition.basePath,
            onNavigate: (message: ServiceNavigationRequest) => {
              if (!disposed) navigateRef.current?.(message);
            },
          },
        },
        {
          sandbox: { strictStyleIsolation: true },
          singular: true,
          fetch: async (input, options) => {
            const response = await fetch(input, {
              ...options,
              signal: AbortSignal.timeout(15000),
            });
            if (!response.ok)
              throw new Error("Micro application asset unavailable");
            return response;
          },
        },
      );
      await app.mountPromise;
      if (!disposed) setPhase("mounted");
    }).catch(() => {
      if (!disposed) setPhase("failed");
    });
    return () => {
      disposed = true;
      void schedule(async () => {
        try {
          if (app && app.getStatus() === "MOUNTED") await app.unmount();
        } finally {
          slot.remove();
        }
      }).catch(() => console.error("子应用卸载失败：" + definition.name));
    };
  }, [definition]);
  // qiankun 2 caches failed HTML/lifecycle promises; reload also clears that cache.
  return { container, phase, retry: () => window.location.reload() };
}
