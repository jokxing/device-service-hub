import * as SecureStore from "expo-secure-store";
const KEY = "device-service-hub.session";
export const readCredential = () => SecureStore.getItemAsync(KEY);
export const saveCredential = (token: string) =>
  SecureStore.setItemAsync(KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
export const deleteCredential = () => SecureStore.deleteItemAsync(KEY);
