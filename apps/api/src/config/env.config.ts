function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing configuration: ${name}`);
  return value;
}

export function getConfig() {
  const port = Number(process.env.API_PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error("Invalid API_PORT");
  return {
    port,
    databaseUrl: required("DATABASE_URL"),
    webOrigins: (
      process.env.WEB_ORIGINS ??
      "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:3000"
    )
      .split(",")
      .map((origin) => origin.trim()),
    secureCookies: process.env.NODE_ENV === "production",
  };
}
