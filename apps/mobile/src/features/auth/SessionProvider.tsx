import { useCallback, useEffect, useRef, useState } from "react";
import type { PropsWithChildren } from "react";
import { AppState } from "react-native";
import type { PublicUser } from "@device-service-hub/contracts";
import { ApiError, apiRequest } from "../../shared/api/http";
import {
  readCredential,
  saveCredential,
  deleteCredential,
} from "./credentialStore";
import { SessionContext } from "./sessionContext";
import type { NativeSession } from "./sessionContext";
import { getNativeSession, loginNative, logoutNative } from "./api";

export default function SessionProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<NativeSession["status"]>("loading");
  const [user, setUser] = useState<PublicUser | null>(null);
  const token = useRef<string | null>(null);
  const busy = useRef<number | null>(null);
  const revision = useRef(0);
  const clear = useCallback(async () => {
    revision.current++;
    token.current = null;
    setUser(null);
    setStatus("loading");
    try {
      await deleteCredential();
      setStatus("anonymous");
    } catch {
      setStatus("unavailable");
    }
  }, []);
  const restore = useCallback(async () => {
    if (busy.current) return;
    const current = ++revision.current;
    busy.current = current;
    // Foreground permission dialogs also trigger restore; keep the current route
    // while revalidating an existing credential. Failure still blocks the stack.
    if (!token.current) {
      setStatus("loading");
      setUser(null);
    }
    try {
      const stored = await readCredential();
      if (current !== revision.current) return;
      if (!stored) {
        token.current = null;
        setUser(null);
        setStatus("anonymous");
        return;
      }
      if (!/^[a-f0-9]{64}$/.test(stored)) {
        await clear();
        return;
      }
      token.current = stored;
      const data = await getNativeSession(stored);
      if (current === revision.current) {
        setUser(data.user);
        setStatus("authenticated");
      }
    } catch (error) {
      if (current !== revision.current) return;
      if (error instanceof ApiError && error.status === 401) await clear();
      else {
        setUser(null);
        setStatus("unavailable");
      }
    } finally {
      if (busy.current === current) busy.current = null;
    }
  }, [clear]);
  useEffect(() => {
    void restore();
    let previous = AppState.currentState;
    const listener = AppState.addEventListener("change", (next) => {
      if (next === "active" && previous !== "active") void restore();
      previous = next;
    });
    return () => {
      revision.current++;
      busy.current = null;
      listener.remove();
    };
  }, [restore]);
  async function signIn(username: string, password: string) {
    if (busy.current) throw new Error("正在处理，请稍后重试");
    const current = ++revision.current;
    busy.current = current;
    let issued: string | undefined;
    try {
      const result = await loginNative(username, password);
      issued = result.accessToken;
      if (!/^[a-f0-9]{64}$/.test(issued))
        throw new Error("登录响应无效，请重试");
      if (current !== revision.current) throw new Error("登录已取消");
      await saveCredential(issued);
      if (current !== revision.current) {
        await deleteCredential();
        throw new Error("登录已取消");
      }
      token.current = issued;
      setUser(result.user);
      setStatus("authenticated");
    } catch (error) {
      if (issued) await logoutNative(issued).catch(() => {});
      throw error;
    } finally {
      if (busy.current === current) busy.current = null;
    }
  }
  async function signOut() {
    if (busy.current) throw new Error("正在处理，请稍后重试");
    const current = ++revision.current;
    busy.current = current;
    try {
      if (token.current) await logoutNative(token.current);
      await clear();
    } finally {
      if (busy.current === current) busy.current = null;
    }
  }
  const authorized = useCallback(
    async <T,>(
      route: string,
      options: {
        signal?: AbortSignal;
        method?: "GET" | "POST";
        body?: unknown;
      },
    ): Promise<T> => {
      const activeToken = token.current;
      if (!activeToken) throw new ApiError(401, "请先登录");
      try {
        return await apiRequest<T>(route, { ...options, token: activeToken });
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.status === 401 &&
          token.current === activeToken
        )
          await clear();
        throw error;
      }
    },
    [clear],
  );
  const request = useCallback(
    <T,>(route: string, signal?: AbortSignal) =>
      authorized<T>(route, { signal }),
    [authorized],
  );
  const post = useCallback(
    <T,>(route: string, body: unknown, signal?: AbortSignal) =>
      authorized<T>(route, { method: "POST", body, signal }),
    [authorized],
  );
  return (
    <SessionContext.Provider
      value={{ status, user, signIn, signOut, restore, request, post }}
    >
      {children}
    </SessionContext.Provider>
  );
}
