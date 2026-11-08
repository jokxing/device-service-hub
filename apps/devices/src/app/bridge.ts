import { inject } from "vue";
import type { InjectionKey } from "vue";
import type { ServiceNavigationRequest } from "@device-service-hub/contracts";

export type ServiceNavigation = (request: ServiceNavigationRequest) => void;
export const navigationKey: InjectionKey<ServiceNavigation> =
  Symbol("service-navigation");
export function useServiceNavigation() {
  const navigate = inject(navigationKey);
  if (!navigate) throw new Error("Service navigation provider missing");
  return navigate;
}
