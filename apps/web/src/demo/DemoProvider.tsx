import { useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import type { Role } from "../shared/types/session";
import { initialTickets } from "./fixtures";
import { DemoContext } from "./demoContext";

/** In-memory demo state; survives route changes, intentionally resets on browser refresh. */
export default function DemoProvider({ children }: PropsWithChildren) {
  const [role, setRole] = useState<Role>("admin");
  const [tickets, setTickets] = useState(initialTickets);
  const value = useMemo(
    () => ({ role, setRole, tickets, setTickets }),
    [role, tickets],
  );
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}
