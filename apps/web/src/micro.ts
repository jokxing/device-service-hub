import { createApplication } from "./app/createApplication";

interface MicroProps {
  container: HTMLElement | ShadowRoot;
  basePath: string;
}
const instances = new WeakMap<HTMLElement, () => void>();

export async function bootstrap(): Promise<void> {}

export async function mount({
  container,
  basePath,
}: MicroProps): Promise<void> {
  if (basePath !== "/tickets")
    throw new Error("Unsupported ticket application route base");
  const root = container.querySelector<HTMLElement>(
    "[data-device-service-root]",
  );
  if (!root || instances.has(root))
    throw new Error("Invalid ticket application container");
  instances.set(root, createApplication(root, basePath));
}

export async function unmount({ container }: MicroProps): Promise<void> {
  const root = container.querySelector<HTMLElement>(
    "[data-device-service-root]",
  );
  if (!root) return;
  instances.get(root)?.();
  instances.delete(root);
}
