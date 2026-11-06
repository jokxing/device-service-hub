const formatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  dateStyle: "medium",
  timeStyle: "short",
});
export function formatDate(value: string) {
  return formatter.format(new Date(value));
}
