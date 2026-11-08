import { computed, inject, ref } from "vue";
import type { InjectionKey } from "vue";
import { useApiResource } from "../../shared/composables/useApiResource";
import { sessionApi } from "./api";

export function createSession() {
  const anonymous = ref(false);
  const identity = useApiResource(sessionApi.me, () => clear());
  function clear() {
    anonymous.value = true;
    identity.clear();
  }
  return {
    user: computed(() =>
      anonymous.value ? undefined : identity.data.value?.user,
    ),
    anonymous,
    loading: identity.loading,
    error: identity.error,
    clear,
    retry: () => {
      anonymous.value = false;
      identity.refresh();
    },
  };
}
export const sessionKey: InjectionKey<ReturnType<typeof createSession>> =
  Symbol("devices-session");
export function useSession() {
  const session = inject(sessionKey);
  if (!session) throw new Error("Device session provider missing");
  return session;
}
