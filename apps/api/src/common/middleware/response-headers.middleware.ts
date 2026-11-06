import type { RequestHandler } from "express";

export const responseHeaders: RequestHandler = (_request, response, next) => {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  next();
};
