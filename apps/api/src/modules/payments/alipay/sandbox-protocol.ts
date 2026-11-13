import { createPrivateKey, createPublicKey, sign, verify } from "node:crypto";

export function keyPem(value: string, label: string): string {
  if (value.includes("-----BEGIN")) return value;
  return `-----BEGIN ${label}-----\n${value
    .replace(/\s/g, "")
    .match(/.{1,64}/g)
    ?.join("\n")}\n-----END ${label}-----`;
}
export function signParams(
  params: Record<string, string>,
  privateKey: string,
): string {
  let parsed;
  try {
    parsed = createPrivateKey(keyPem(privateKey, "RSA PRIVATE KEY"));
  } catch {
    parsed = createPrivateKey(keyPem(privateKey, "PRIVATE KEY"));
  }
  const source = Object.keys(params)
    .filter((k) => k !== "sign" && params[k] !== "")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return sign("RSA-SHA256", Buffer.from(source), parsed).toString("base64");
}
// Verify the original JSON bytes, never a reserialized object.
export function responseObject(text: string, name: string): string {
  const match = new RegExp(`"${name}"\\s*:\\s*`).exec(text);
  if (!match) throw new Error("Missing response");
  const start = match.index + match[0].length;
  if (text[start] !== "{") throw new Error("Invalid response");
  let depth = 0,
    quoted = false,
    escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return text.slice(start, i + 1);
  }
  throw new Error("Incomplete response");
}
export function verifyResponse(
  text: string,
  name: string,
  signature: string,
  publicKey: string,
): boolean {
  return verify(
    "RSA-SHA256",
    Buffer.from(responseObject(text, name)),
    createPublicKey(keyPem(publicKey, "PUBLIC KEY")),
    Buffer.from(signature, "base64"),
  );
}
export function chinaTime(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(date);
}
export function yuanToCents(value: unknown): number {
  if (typeof value !== "string" || !/^\d{1,9}(\.\d{1,2})?$/.test(value))
    throw new Error("Invalid amount");
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
