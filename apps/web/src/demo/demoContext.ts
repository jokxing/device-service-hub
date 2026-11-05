import { createContext, useContext } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Role } from "../shared/types/session";
import type { Ticket } from "../features/tickets/types";

interface DemoState {
  role: Role;
  setRole: Dispatch<SetStateAction<Role>>;
  tickets: Ticket[];
  setTickets: Dispatch<SetStateAction<Ticket[]>>;
}
export const DemoContext = createContext<DemoState | null>(null);

export function useDemoContext(): DemoState {
  const state = useContext(DemoContext);
  if (!state) throw new Error("Demo hooks must be used inside DemoProvider");
  return state;
}
