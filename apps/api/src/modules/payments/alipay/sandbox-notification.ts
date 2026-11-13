import { createPublicKey, verify } from "node:crypto";
import { keyPem } from "./sandbox-protocol";

// Decode transport once. Duplicate fields must not select different signed/used values.
export function verifyNotification(
  body: unknown,
  publicKey: string,
): Record<string, string> {
  if (typeof body !== "string" || !body || body.includes("\ufffd"))
    throw new Error("Invalid notification body");
  const fields: Record<string, string> = Object.create(null);
  const parts = body.split("&");
  if (parts.length > 80) throw new Error("Too many notification fields");
  for (const part of parts) {
    const separator = part.indexOf("=");
    if (separator < 1) throw new Error("Invalid form field");
    const name = decodeURIComponent(
      part.slice(0, separator).replace(/\+/g, " "),
    );
    const value = decodeURIComponent(
      part.slice(separator + 1).replace(/\+/g, " "),
    );
    if (!/^[a-z][a-z0-9_]{0,63}$/.test(name) || Object.hasOwn(fields, name))
      throw new Error("Invalid or duplicate field");
    fields[name] = value;
  }
  if (
    fields.sign_type !== "RSA2" ||
    fields.charset?.toLowerCase() !== "utf-8" ||
    !fields.sign ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(fields.sign)
  )
    throw new Error("Invalid signature parameters");
  // Alipay asynchronous notification rules exclude BOTH sign and sign_type.
  const source = Object.keys(fields)
    .filter(
      (name) => name !== "sign" && name !== "sign_type" && fields[name] !== "",
    )
    .sort()
    .map((name) => `${name}=${fields[name]}`)
    .join("&");
  if (
    !verify(
      "RSA-SHA256",
      Buffer.from(source),
      createPublicKey(keyPem(publicKey, "PUBLIC KEY")),
      Buffer.from(fields.sign, "base64"),
    )
  )
    throw new Error("Invalid notification signature");
  return fields;
}
