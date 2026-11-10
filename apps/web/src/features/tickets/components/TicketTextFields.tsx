import { Form, Input, Select } from "antd";
import { PRIORITY_OPTIONS, TICKET_LIMITS } from "../constants";

/** Shared presentation fields; real submission and demo state remain independent. */
export default function TicketTextFields() {
  return (
    <>
      <Form.Item
        name="title"
        label="问题标题"
        rules={[
          { required: true, whitespace: true, message: "请简要描述问题" },
          { max: TICKET_LIMITS.title },
        ]}
      >
        <Input
          autoComplete="off"
          maxLength={TICKET_LIMITS.title}
          placeholder="例如：空调运行但不制冷"
        />
      </Form.Item>
      <Form.Item
        name="description"
        label="问题描述"
        rules={[
          { required: true, whitespace: true, message: "请填写问题详情" },
          { max: TICKET_LIMITS.description },
        ]}
      >
        <Input.TextArea
          autoComplete="off"
          rows={4}
          maxLength={TICKET_LIMITS.description}
          showCount
          placeholder="请描述故障现象、出现时间及已尝试的操作"
        />
      </Form.Item>
      <Form.Item
        name="priority"
        label="优先级"
        rules={[{ required: true, message: "请选择优先级" }]}
      >
        <Select options={PRIORITY_OPTIONS} />
      </Form.Item>
    </>
  );
}
