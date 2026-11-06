import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, 64, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${(await derive(password, salt)).toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [algorithm, salt, encoded] = storedHash.split(":");
  if (
    algorithm !== "scrypt" ||
    !salt ||
    !encoded ||
    !/^[a-f0-9]{128}$/.test(encoded)
  )
    return false;
  const actual = await derive(password, salt);
  const expected = Buffer.from(encoded, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
