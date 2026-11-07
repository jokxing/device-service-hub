import { createContext, useContext } from "react";
import type { PublicUser } from "@device-service-hub/contracts";
import type {
  AuthenticatedRead,
  AuthenticatedPost,
} from "../../shared/api/http";
export interface NativeSession {
  status: "loading" | "anonymous" | "authenticated" | "unavailable";
  user: PublicUser | null;
  restore: () => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  request: AuthenticatedRead;
  post: AuthenticatedPost;
  image: (route: string, signal?: AbortSignal) => Promise<string>;
}
export const SessionContext = createContext<NativeSession | null>(null);
export function useNativeSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("Native session provider is missing");
  return value;
}
