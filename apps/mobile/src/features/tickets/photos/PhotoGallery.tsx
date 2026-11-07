import { useCallback } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import type { TicketPhoto } from "@device-service-hub/contracts";
import { useNativeSession } from "../../auth/sessionContext";
import { useApiResource } from "../../../shared/hooks/useApiResource";
import ContentCard from "../../../shared/components/ContentCard";
import ActionButton from "../../../shared/components/ActionButton";
import LoadFeedback from "../../../shared/components/LoadFeedback";
import { typography } from "../../../shared/styles/typography";
import { spacing, radii } from "../../../shared/theme";
import { listPhotos, photoPath } from "./api";
import PhotoAction from "./PhotoAction";
import { PHOTO_LIMITS } from "./constants";

function Photo({ ticketId, photo }: { ticketId: string; photo: TicketPhoto }) {
  const { image } = useNativeSession();
  const load = useCallback(
    (signal: AbortSignal) => image(photoPath(ticketId, photo.id), signal),
    [image, ticketId, photo.id],
  );
  const { data, error, loading, reload } = useApiResource(load);
  return (
    <View style={styles.photo}>
      <LoadFeedback loading={loading} error={error} />
      {data && (
        <Image
          accessibilityLabel="已上传现场照片"
          source={{ uri: data }}
          style={styles.image}
          resizeMode="contain"
        />
      )}
      {!!error && (
        <ActionButton title="重试读取图片" secondary onPress={reload} />
      )}
    </View>
  );
}
export default function PhotoGallery({
  ticketId,
  canUpload = false,
}: {
  ticketId: string;
  canUpload?: boolean;
}) {
  const { request } = useNativeSession();
  const load = useCallback(
    (signal: AbortSignal) => listPhotos(request, ticketId, signal),
    [request, ticketId],
  );
  const { data, error, loading, reload } = useApiResource(load);
  return (
    <ContentCard title="现场照片">
      <LoadFeedback loading={loading} error={error} />
      {data && (
        <>
          <Text style={typography.muted}>
            {data.length} / {PHOTO_LIMITS.count} 张；单张最多 5MB，支持
            JPG、PNG、WebP。
          </Text>
          {data.map((photo) => (
            <Photo key={photo.id} photo={photo} ticketId={ticketId} />
          ))}
          {!data.length && <Text style={typography.muted}>暂无现场照片</Text>}
          {canUpload && data.length < PHOTO_LIMITS.count && (
            <PhotoAction ticketId={ticketId} reload={reload} />
          )}
          {!canUpload && (
            <Text style={typography.muted}>
              照片仅在待分派阶段由报修人追加。
            </Text>
          )}
        </>
      )}
      <ActionButton
        title="刷新现场照片"
        secondary
        disabled={loading}
        onPress={reload}
      />
    </ContentCard>
  );
}
const styles = StyleSheet.create({
  photo: { gap: spacing.sm },
  image: { width: "100%", height: 220, borderRadius: radii.card },
});
