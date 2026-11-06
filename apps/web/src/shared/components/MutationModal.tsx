import type { PropsWithChildren } from "react";
import { Alert, Modal } from "antd";

interface Props extends PropsWithChildren {
  title: string;
  okText: string;
  submitting: boolean;
  error: string;
  submitDisabled?: boolean;
  onSubmit: () => void;
  onClose: () => void;
}

export default function MutationModal({
  title,
  okText,
  submitting,
  error,
  submitDisabled = false,
  onSubmit,
  onClose,
  children,
}: Props) {
  return (
    <Modal
      open
      title={title}
      okText={okText}
      cancelText="取消"
      onOk={() => {
        if (!submitting && !submitDisabled) onSubmit();
      }}
      onCancel={() => {
        if (!submitting) onClose();
      }}
      confirmLoading={submitting}
      keyboard={!submitting}
      closable={!submitting}
      maskClosable={!submitting}
      cancelButtonProps={{ disabled: submitting }}
      okButtonProps={{
        disabled: submitting || submitDisabled,
        "aria-label": okText,
        "aria-busy": submitting,
      }}
    >
      {error && <Alert type="error" showIcon title={error} className="mb-5" />}
      {children}
    </Modal>
  );
}
