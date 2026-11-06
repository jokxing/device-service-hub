/** Preserve non-string inputs so runtime validators can reject their original type. */
export function trimStringValue({ value }: { value: unknown }): unknown {
  return typeof value === "string" ? value.trim() : value;
}
