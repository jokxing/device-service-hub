/** Escape delimiters and prevent spreadsheet formula execution for user-supplied cells. */
export function serializeCsv(rows: readonly (readonly string[])[]): string {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            const safe = /^[\s]*[=+@-]/.test(value) ? `'${value}` : value;
            return `"${safe.replaceAll('"', '""')}"`;
          })
          .join(","),
      )
      .join("\r\n")
  );
}

export function downloadCsv(
  filename: string,
  rows: readonly (readonly string[])[],
): void {
  const url = URL.createObjectURL(
    new Blob([serializeCsv(rows)], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
