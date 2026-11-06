import { createContext, useContext } from "react";
import type { LoginInput, PublicUser } from "@device-service-hub/contracts";

interface SessionState {
  user: PublicUser | null;
  status: "loading" | "authenticated" | "anonymous" | "unavailable";
  signIn: (input: LoginInput) => Promise<void>;
  signOut: () => Promise<void>;
  clearSession: () => void;
  retry: () => void;
}
export const SessionContext = createContext<SessionState | null>(null);
export function useSession(): SessionState {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession requires SessionProvider");
  return context;
}
