"use client";

import type { PropsWithChildren } from "react";
import { Alert, Modal } from "antd";

interface Props extends PropsWithChildren {
  title: string;
  okText: string;
  submitting: boolean;
  error: string;
  onSubmit: () => void;
  onClose: () => void;
}
export default function MutationModal({
  title,
  okText,
  submitting,
  error,
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
        if (!submitting) onSubmit();
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
        disabled: submitting,
        "aria-label": okText,
        "aria-busy": submitting,
      }}
    >
      {error && (
        <Alert
          type="error"
          showIcon
          title={error}
          style={{ marginBottom: 20 }}
        />
      )}
      {children}
    </Modal>
  );
}
