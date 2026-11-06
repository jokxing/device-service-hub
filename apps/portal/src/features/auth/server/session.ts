import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { SessionResponse } from "@device-service-hub/contracts";
import { BackendError, backendGet } from "../../../shared/server/api";

// React cache deduplicates within a server render; it is not a cross-user data cache.
export const currentUser = cache(async () => {
  try {
    return (await backendGet<SessionResponse>("/auth/me")).user;
  } catch (error) {
    if (error instanceof BackendError && error.status === 401) return null;
    throw error;
  }
});

export async function requireReporter() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "reporter") redirect("/login?reason=role");
  return user;
}
