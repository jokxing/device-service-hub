import http from "node:http";
import https from "node:https";

/** Raw transport: Node fetch adds browser-style Sec-Fetch headers. */
export function nativeHttp(
  url,
  { method = "GET", headers = {}, body, signal } = {},
) {
  return new Promise((resolve, reject) => {
    const transport = new URL(url).protocol === "https:" ? https : http;
    const request = transport.request(
      url,
      { method, headers, signal },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("error", reject);
        response.on("end", () => {
          const data = Buffer.concat(chunks);
          resolve({
            status: response.statusCode,
            headers: new Headers(
              Object.entries(response.headers)
                .filter(([, value]) => value !== undefined)
                .map(([key, value]) => [
                  key,
                  Array.isArray(value) ? value.join(", ") : value,
                ]),
            ),
            arrayBuffer: async () => data,
            json: async () => JSON.parse(data.toString("utf8")),
          });
        });
      },
    );
    request.setTimeout(20000, () =>
      request.destroy(new Error("Native upstream timeout")),
    );
    request.on("error", reject);
    request.end(body);
  });
}
