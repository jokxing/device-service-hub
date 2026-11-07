import http from "node:http";
import { randomUUID } from "node:crypto";
export function photoRequest(
  route,
  { token, method = "GET", data, headers = {} } = {},
) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      "http://127.0.0.1:3001/api" + route,
      {
        method,
        headers: {
          Connection: "close",
          ...(token ? { Authorization: "Bearer " + token } : {}),
          ...(data ? { "Content-Length": data.length } : {}),
          ...headers,
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const buffer = Buffer.concat(chunks);
          try {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              buffer,
              value: res.headers["content-type"]?.includes("application/json")
                ? JSON.parse(buffer.toString())
                : undefined,
            });
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    req.on("error", () => reject(new Error("Photo API connection failed")));
    req.setTimeout(15000, () => req.destroy());
    req.end(data);
  });
}
export function uploadPhoto(
  token,
  ticketId,
  id,
  buffer,
  mime = "image/png",
  headers = {},
) {
  const boundary = "dsh-" + randomUUID();
  const data = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="photo.png"\r\nContent-Type: ${mime}\r\n\r\n`,
    ),
    buffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return photoRequest(`/mobile/tickets/${ticketId}/photos/${id}`, {
    token,
    method: "POST",
    data,
    headers: {
      "Content-Type": "multipart/form-data; boundary=" + boundary,
      ...headers,
    },
  });
}
