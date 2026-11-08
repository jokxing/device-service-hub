import { useEffect, useRef, useState } from "react";
import { loadMicroApp } from "qiankun";
import { TICKETS_APP } from "./tickets";

// React effect cleanup cannot await. Serialize all mount/unmount work, including StrictMode.
let lifecycleQueue: Promise<unknown> = Promise.resolve();
function schedule(task: () => Promise<void>) {
  const result = lifecycleQueue.then(task);
  lifecycleQueue = result.catch(() => {});
  return result;
}

export function useTicketsApp() {
  const container = useRef<HTMLDivElement>(null);
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
          ...TICKETS_APP,
          container: slot,
          props: { basePath: TICKETS_APP.basePath },
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
              throw new Error("Ticket application asset unavailable");
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
      }).catch(() => console.error("工单子应用卸载失败"));
    };
  }, []);
  // qiankun 2 caches failed HTML/lifecycle promises; reload also clears that cache.
  return { container, phase, retry: () => window.location.reload() };
}
