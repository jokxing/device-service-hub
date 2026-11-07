import { Image, StyleSheet, Text } from "react-native";
import { File } from "expo-file-system";
import { useNativeSession } from "../../auth/sessionContext";
import { useApiMutation } from "../../../shared/hooks/useApiMutation";
import MutationModal from "../../../shared/components/MutationModal";
import { typography } from "../../../shared/styles/typography";
import { radii } from "../../../shared/theme";
import { uploadPhoto } from "./api";
import { PHOTO_LIMITS } from "./constants";
import type { PhotoSelection } from "./types";
export default function UploadPhotoModal({
  ticketId,
  selection,
  onClose,
}: {
  ticketId: string;
  selection: PhotoSelection;
  onClose: () => void;
}) {
  const { post } = useNativeSession(),
    mutation = useApiMutation();
  function submit() {
    mutation.run(async (signal) => {
      const file = new File(selection.uri);
      if (file.size > PHOTO_LIMITS.bytes)
        throw new Error("图片超过 5MB，请选择较小的照片");
      const form = new FormData();
      form.append("file", file);
      return uploadPhoto(post, ticketId, selection.id, form, signal);
    }, onClose);
  }
  return (
    <MutationModal
      title="上传现场照片"
      submitText="确认上传"
      pending={mutation.pending}
      error={mutation.error}
      onSubmit={submit}
      onClose={onClose}
    >
      <Image
        source={{ uri: selection.uri }}
        accessibilityLabel="待上传现场照片"
        style={styles.image}
        resizeMode="contain"
      />
      <Text style={typography.muted}>
        响应不明时保留本照片重试；取消或离页后先刷新照片列表核对，取消请求不等于回滚。分派后不能追加。
      </Text>
    </MutationModal>
  );
}
const styles = StyleSheet.create({
  image: { width: "100%", height: 220, borderRadius: radii.card },
});
