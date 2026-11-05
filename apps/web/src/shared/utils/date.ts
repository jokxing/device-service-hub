/** Keep preview timestamps in the project's business timezone, regardless of browser location. */
export function formatDateTime(value: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(value);
}

export function formatShortDateTime(value: string): string {
  return value.replace(/^\d{4}-/, "");
}
