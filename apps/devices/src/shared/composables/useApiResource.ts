import { ref, shallowRef, watchEffect } from "vue";
import { ApiError } from "../api/http";
export function useApiResource<T>(
  load: (signal: AbortSignal) => Promise<T>,
  onUnauthorized: () => void,
) {
  const data = shallowRef<T>();
  const loading = ref(true),
    error = ref(""),
    revision = ref(0);
  let active: AbortController | undefined;
  watchEffect((onCleanup) => {
    void revision.value;
    const controller = new AbortController();
    active = controller;
    data.value = undefined;
    error.value = "";
    loading.value = true;
    onCleanup(() => controller.abort());
    load(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) data.value = value;
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        if (reason instanceof ApiError && reason.status === 401)
          onUnauthorized();
        else
          error.value =
            reason instanceof Error ? reason.message : "加载失败，请重试";
      })
      .finally(() => {
        if (!controller.signal.aborted) loading.value = false;
      });
  });
  const clear = () => {
    active?.abort();
    data.value = undefined;
    error.value = "";
    loading.value = false;
  };
  return {
    data,
    loading,
    error,
    clear,
    refresh: () => {
      clear();
      revision.value++;
    },
  };
}
