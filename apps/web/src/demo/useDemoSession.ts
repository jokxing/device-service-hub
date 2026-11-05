import { DEMO_ACCOUNTS } from "./accounts";
import { useDemoContext } from "./demoContext";

export function useDemoSession() {
  const { role, setRole } = useDemoContext();
  return { role, setRole, actor: DEMO_ACCOUNTS[role] };
}
