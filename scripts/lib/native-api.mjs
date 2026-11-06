import http from "node:http";
/** Raw HTTP deliberately models a native client without browser-generated Sec-Fetch headers. */
export function nativeRequest(
  route,
  { token, method = "GET", body, headers = {} } = {},
) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? undefined : JSON.stringify(body);
    const request = http.request(
      new URL("http://127.0.0.1:3001/api" + route),
      {
        method,
        headers: {
          Connection: "close",
          ...(token ? { Authorization: "Bearer " + token } : {}),
          ...(data
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(data),
              }
            : {}),
          ...headers,
        },
      },
      (response) => {
        let text = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          text += chunk;
        });
        response.on("end", () => {
          try {
            resolve({
              status: response.statusCode,
              headers: response.headers,
              value: text ? JSON.parse(text) : undefined,
            });
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    request.on("error", (error) =>
      reject(new Error(`Native ${method} ${route} failed`, { cause: error })),
    );
    request.setTimeout(12000, () =>
      request.destroy(new Error("Native API verification timed out")),
    );
    request.end(data);
  });
}
