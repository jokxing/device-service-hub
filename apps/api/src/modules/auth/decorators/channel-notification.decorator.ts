import { SetMetadata } from "@nestjs/common";

/** Only signature-authenticated server notifications may use this transport. */
export const CHANNEL_NOTIFICATION = "auth:channel-notification";
export const ChannelNotification = () =>
  SetMetadata(CHANNEL_NOTIFICATION, true);
