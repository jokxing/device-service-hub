/** Transport types only. Never export database entities, password hashes or sessions. */
export type Role = "admin" | "reporter" | "technician";
export interface PublicUser {
  id: string;
  username: string;
  name: string;
  role: Role;
}
export interface LoginInput {
  username: string;
  password: string;
}
export interface LoginResponse {
  user: PublicUser;
  expiresAt: string;
}
export interface SessionResponse {
  user: PublicUser;
}
export interface DeviceSummary {
  id: string;
  code: string;
  name: string;
  category: string;
  location: string;
  model: string;
  enabled: boolean;
}
