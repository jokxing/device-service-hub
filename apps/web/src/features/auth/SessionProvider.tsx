import { useCallback, useEffect, useState } from "react";
import type { PropsWithChildren } from "react";
import type { LoginInput, PublicUser } from "@device-service-hub/contracts";
import { ApiError } from "../../shared/api/http";
import { authApi } from "./api";
import { SessionContext } from "./sessionContext";

export default function SessionProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [status, setStatus] = useState<
    "loading" | "authenticated" | "anonymous" | "unavailable"
  >("loading");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    authApi
      .me(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setUser(result.user);
          setStatus("authenticated");
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setUser(null);
          setStatus(
            error instanceof ApiError && error.status === 401
              ? "anonymous"
              : "unavailable",
          );
        }
      });
    return () => controller.abort();
  }, [attempt]);

  async function signIn(input: LoginInput) {
    const result = await authApi.login(input);
    setUser(result.user);
    setStatus("authenticated");
  }
  const clearSession = useCallback(() => {
    setUser(null);
    setStatus("anonymous");
  }, []);
  async function signOut() {
    await authApi.logout();
    clearSession();
  }
  function retry() {
    setStatus("loading");
    setAttempt((value) => value + 1);
  }
  return (
    <SessionContext.Provider
      value={{ user, status, signIn, signOut, clearSession, retry }}
    >
      {children}
    </SessionContext.Provider>
  );
}
