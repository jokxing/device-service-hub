"use client";

import { useApiMutation } from "../../shared/hooks/useApiMutation";

/** Leave protected content after session expiry; do not retain it in back history. */
export function redirectToLogin() {
  window.location.replace("/login");
}

export function useAuthenticatedMutation(fallbackError: string) {
  return useApiMutation(fallbackError, redirectToLogin);
}
