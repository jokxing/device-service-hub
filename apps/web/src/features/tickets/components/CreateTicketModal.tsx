import TicketTextFields from "./TicketTextFields";
import { useState } from "react";
import { App, Alert, Button, Form, Modal, Select, Upload } from "antd";
import type { UploadFile } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useDemoTickets } from "../../../demo/useDemoTickets";
import { isAllowedFile } from "../../../shared/utils/file";
import { ATTACHMENT_POLICY, TICKET_LIMITS } from "../constants";
import type { CreateTicketValues } from "../types";
export default function CreateTicketModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { actor, reportableDevices, createTicket } = useDemoTickets();
  const { message: msg } = App.useApp();
  const [form] = Form.useForm<CreateTicketValues>();
  const [files, setFiles] = useState<UploadFile[]>([]);
  function handleSubmit(values: CreateTicketValues) {
    if (
      createTicket(
        values,
        files.map((file) => file.name),
      )
    )
      onCreated();
  }
  return (
    <Modal
      title="新建报修"
      open
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="提交演示报修"
      cancelText="取消"
    >
      <Alert
        showIcon
        type="info"
        title={`报修用户：${actor.name} · 仅显示已授权且启用的设备`}
        className="mb-5"
      />
      <Form
        autoComplete="off"
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ priority: "normal" }}
      >
        <Form.Item
          name="deviceId"
          label="报修设备"
          rules={[{ required: true, message: "请选择设备" }]}
        >
          <Select
            placeholder="请选择设备"
            options={reportableDevices.map((d) => ({
              value: d.id,
              label: `${d.id} · ${d.name}`,
            }))}
          />
        </Form.Item>
        <TicketTextFields />
        <Form.Item
          label="故障照片（可选）"
          extra="最多 3 张，每张不超过 5MB；此预览仅保留文件名，不上传。"
        >
          <Upload
            accept={ATTACHMENT_POLICY.allowedTypes.join(",")}
            fileList={files}
            maxCount={TICKET_LIMITS.attachments}
            beforeUpload={(file) => {
              if (!isAllowedFile(file, ATTACHMENT_POLICY)) {
                msg.error("请选择不超过 5MB 的 JPG、PNG 或 WebP 图片");
                return Upload.LIST_IGNORE;
              }
              return false;
            }}
            onChange={({ fileList }) => setFiles(fileList)}
          >
            <Button icon={<UploadOutlined />}>选择照片</Button>
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  );
}
