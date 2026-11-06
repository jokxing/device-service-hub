import { createContext, useContext } from "react";
import type { PublicUser } from "@device-service-hub/contracts";
export interface NativeSession {
  status: "loading" | "anonymous" | "authenticated" | "unavailable";
  user: PublicUser | null;
  restore: () => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  request: <T>(route: string, signal?: AbortSignal) => Promise<T>;
}
export const SessionContext = createContext<NativeSession | null>(null);
export function useNativeSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("Native session provider is missing");
  return value;
}
