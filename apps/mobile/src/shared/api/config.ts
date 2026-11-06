const configured =
  process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:3001/api";
const url = new URL(configured);
if (
  !["http:", "https:"].includes(url.protocol) ||
  url.username ||
  url.password ||
  url.search ||
  url.hash
)
  throw new Error("Invalid public API address");
export const API_BASE_URL = configured.replace(/\/$/, "");
