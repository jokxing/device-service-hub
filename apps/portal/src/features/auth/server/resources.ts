import "server-only";
import { notFound, redirect } from "next/navigation";
import { requireReporter } from "./session";
import { BackendError, backendGet } from "../../../shared/server/api";

export async function reporterGet<T>(route: string): Promise<T> {
  await requireReporter();
  try {
    return await backendGet<T>(route);
  } catch (error) {
    if (error instanceof BackendError && error.status === 401)
      redirect("/login");
    if (error instanceof BackendError && error.status === 404) notFound();
    throw error;
  }
}
