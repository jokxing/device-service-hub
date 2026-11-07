import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Empty, Image, Space, Spin, Typography } from "antd";
import { useApiResource } from "../../../shared/hooks/useApiResource";
import { useSession } from "../../auth/sessionContext";
import { adminPhotosApi } from "./api";
import styles from "./AdminTicketPhotos.module.css";

function ProtectedPhoto({
  ticketId,
  id,
  index,
}: {
  ticketId: string;
  id: string;
  index: number;
}) {
  const { clearSession } = useSession();
  const load = useCallback(
    (signal: AbortSignal) => adminPhotosApi.content(ticketId, id, signal),
    [ticketId, id],
  );
  const { data, error, loading, refresh } = useApiResource(load, clearSession);
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!data) {
      setUrl("");
      return;
    }
    const source = URL.createObjectURL(data);
    setUrl(source);
    return () => URL.revokeObjectURL(source);
  }, [data]);
  return (
    <div className={styles.photo}>
      {error ? (
        <Space direction="vertical">
          <Typography.Text type="danger">
            现场照片 {index + 1} 加载失败
          </Typography.Text>
          <Button onClick={refresh}>重试照片 {index + 1}</Button>
        </Space>
      ) : loading || !url ? (
        <Spin />
      ) : (
        <Image
          src={url}
          alt={`现场照片 ${index + 1}`}
          width="100%"
          height={160}
          styles={{ image: { objectFit: "contain" } }}
        />
      )}
    </div>
  );
}

export default function AdminTicketPhotos({ ticketId }: { ticketId: string }) {
  const { clearSession } = useSession();
  const load = useCallback(
    (signal: AbortSignal) => adminPhotosApi.list(ticketId, signal),
    [ticketId],
  );
  const { data, loading, error, refresh } = useApiResource(load, clearSession);
  return (
    <section aria-label="现场照片" className={styles.section}>
      <div className={styles.heading}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          现场照片{data ? `（${data.length}）` : ""}
        </Typography.Title>
        <Button size="small" onClick={refresh} disabled={loading}>
          刷新照片
        </Button>
      </div>
      {error ? (
        <Alert
          type="error"
          showIcon
          title={error}
          action={<Button onClick={refresh}>重试</Button>}
        />
      ) : loading ? (
        <div className={styles.loading}>
          <Spin />
        </div>
      ) : !data?.length ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无现场照片"
        />
      ) : (
        <>
          <Typography.Paragraph type="secondary">
            报修用户提交的现场照片，点击可放大查看。
          </Typography.Paragraph>
          <Image.PreviewGroup>
            <div className={styles.grid}>
              {data.map((photo, index) => (
                <ProtectedPhoto
                  key={photo.id}
                  ticketId={ticketId}
                  id={photo.id}
                  index={index}
                />
              ))}
            </div>
          </Image.PreviewGroup>
        </>
      )}
    </section>
  );
}
