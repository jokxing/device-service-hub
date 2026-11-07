import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { randomUUID } from "expo-crypto";
import { useAction } from "../../../shared/hooks/useAction";
import ActionButton from "../../../shared/components/ActionButton";
import { typography } from "../../../shared/styles/typography";
import { spacing } from "../../../shared/theme";
import UploadPhotoModal from "./UploadPhotoModal";
import type { PhotoSelection } from "./types";
import { PHOTO_LIMITS } from "./constants";
export default function PhotoAction({
  ticketId,
  reload,
}: {
  ticketId: string;
  reload: () => void;
}) {
  const picker = useAction();
  const [selection, setSelection] = useState<PhotoSelection | null>(null);
  function choose(camera: boolean) {
    void picker.run(async () => {
      if (
        camera &&
        !(await ImagePicker.requestCameraPermissionsAsync()).granted
      )
        throw new Error("相机权限未开启，可从相册选择照片");
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        quality: 0.8,
        exif: false,
        allowsEditing: false,
      };
      const result = camera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled) return;
      const asset = result.assets[0];
      const type =
        asset.mimeType ??
        (/\.png$/i.test(asset.uri)
          ? "image/png"
          : /\.webp$/i.test(asset.uri)
            ? "image/webp"
            : "image/jpeg");
      if (!PHOTO_LIMITS.allowedTypes.some((allowed) => allowed === type))
        throw new Error("请选择 JPG、PNG 或 WebP 图片");
      if ((asset.fileSize ?? 0) > PHOTO_LIMITS.bytes)
        throw new Error("图片超过 5MB，请选择较小的照片");
      setSelection({ uri: asset.uri, id: randomUUID() });
    });
  }
  function close() {
    setSelection(null);
    reload();
  }
  return (
    <View style={styles.section}>
      <Text style={typography.muted}>
        工单已保存，可补充现场照片；图片上传失败不会重复创建工单。
      </Text>
      {!!picker.error && (
        <Text accessibilityRole="alert" style={typography.error}>
          {picker.error}
        </Text>
      )}
      <ActionButton
        title="拍照补充"
        secondary
        pending={picker.pending}
        onPress={() => choose(true)}
      />
      <ActionButton
        title="从相册选择"
        secondary
        disabled={picker.pending}
        onPress={() => choose(false)}
      />
      {selection && (
        <UploadPhotoModal
          key={selection.id}
          ticketId={ticketId}
          selection={selection}
          onClose={close}
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({ section: { gap: spacing.sm } });
