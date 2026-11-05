export type Role = "admin" | "reporter" | "technician";

export interface Actor {
  role: Role;
  name: string;
}
