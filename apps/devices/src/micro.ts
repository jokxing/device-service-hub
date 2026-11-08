import { createApplication } from "./app/createApplication";
import type { ServiceNavigation } from "./app/bridge";
interface Props {
  container: HTMLElement | ShadowRoot;
  basePath: string;
  onNavigate: ServiceNavigation;
}
const instances = new WeakMap<HTMLElement, () => void>();
export async function bootstrap(): Promise<void> {}
export async function mount({
  container,
  basePath,
  onNavigate,
}: Props): Promise<void> {
  if (basePath !== "/devices" || typeof onNavigate !== "function")
    throw new Error("Invalid device application bridge");
  const root = container.querySelector<HTMLElement>("[data-devices-root]");
  if (!root || instances.has(root))
    throw new Error("Invalid device application container");
  instances.set(root, await createApplication(root, basePath, onNavigate));
}
export async function unmount({ container }: Props): Promise<void> {
  const root = container.querySelector<HTMLElement>("[data-devices-root]");
  if (!root) return;
  instances.get(root)?.();
  instances.delete(root);
}
