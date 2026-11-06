// Web preview never persists or authenticates a native credential.
export async function readCredential(): Promise<string | null> {
  return null;
}
export async function saveCredential(_token: string): Promise<void> {
  throw new Error("请在 Android 客户端登录");
}
export async function deleteCredential(): Promise<void> {}
