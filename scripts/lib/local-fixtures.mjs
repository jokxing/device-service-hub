import fs from "node:fs/promises";
import path from "node:path";

/** Explicit optional fixture; keep exact administrator scope assertions. */
export async function expectedLocalDeviceCodes(root) {
  const codes = ["AC-001", "WP-002"];
  try {
    const config = JSON.parse(
      await fs.readFile(
        path.join(root, ".local/remote-mobile/accounts.json"),
        "utf8",
      ),
    );
    if (
      !/^RT-[A-F0-9]{8}$/.test(config.device?.code) ||
      !config.device?.id?.startsWith("remote-test-device-")
    )
      throw new Error("Unexpected remote device fixture");
    codes.push(config.device.code);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return codes.sort();
}
