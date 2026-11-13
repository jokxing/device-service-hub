import { text } from "express";

/** Scoped to the notification endpoint; existing JSON and multipart APIs stay unchanged. */
export const sandboxNotificationParser = text({
  type: "application/x-www-form-urlencoded",
  defaultCharset: "utf-8",
  limit: "16kb",
  inflate: false,
});
