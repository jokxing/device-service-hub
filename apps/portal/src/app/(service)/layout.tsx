import type { ReactNode } from "react";
import PortalServiceChrome from "../../shared/components/PortalServiceChrome";
import { requireReporter } from "../../features/auth/server/session";

export const dynamic = "force-dynamic";
export default async function ServiceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireReporter();
  return <PortalServiceChrome user={user}>{children}</PortalServiceChrome>;
}
