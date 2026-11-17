import { useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router";
export function useRefreshOnFocus(reload: () => void) {
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) firstFocus.current = false;
      else reload();
    }, [reload]),
  );
}
