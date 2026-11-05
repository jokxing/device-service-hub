export interface FilePolicy {
  allowedTypes: readonly string[];
  maxSizeBytes: number;
}

export function isAllowedFile(
  file: Pick<File, "type" | "size">,
  policy: FilePolicy,
): boolean {
  return (
    policy.allowedTypes.includes(file.type) && file.size <= policy.maxSizeBytes
  );
}
