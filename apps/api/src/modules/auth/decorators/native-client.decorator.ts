import { SetMetadata } from "@nestjs/common";
export const NATIVE_CLIENT = "auth:native-client";
export const NativeClient = () => SetMetadata(NATIVE_CLIENT, true);
