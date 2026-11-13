"use client";

import { useRef } from "react";
import Link from "next/link";
import { Alert, Button, Form, Input, Select } from "antd";
import type {
  CreateTicketInput,
  DeviceSummary,
} from "@device-service-hub/contracts";
import { createTicket } from "../api";
import { useAuthenticatedMutation } from "../../auth/useAuthenticatedMutation";
import { PRIORITY_LABELS, TICKET_LIMITS } from "../constants";
import styles from "../tickets.module.css";

type Values = Pick<CreateTicketInput, "title" | "description" | "priority">;
export default function RepairForm({ device }: { device: DeviceSummary }) {
  const { submitting, error, run } = useAuthenticatedMutation(
    "尚未确认提交结果，请重试相同内容或查看我的报修",
  );
  const intent = useRef<{ fingerprint: string; requestId: string } | null>(
    null,
  );
  function submit(values: Values) {
    const payload = {
      ...values,
      deviceId: device.id,
      title: values.title.trim(),
      description: values.description.trim(),
    };
    const fingerprint = JSON.stringify(payload);
    return run(
      (signal) => {
        if (intent.current?.fingerprint !== fingerprint)
          intent.current = { fingerprint, requestId: crypto.randomUUID() };
        return createTicket(
          { ...payload, requestId: intent.current.requestId },
          signal,
        );
      },
      (ticket) =>
        window.location.replace("/tickets/" + encodeURIComponent(ticket.id)),
    );
  }
  return (
    <>
      {error && (
        <Alert
          type="error"
          showIcon
          title={error}
          className={styles.feedback}
        />
      )}
      <Form<Values>
        autoComplete="off"
        name="portal-repair"
        layout="vertical"
        initialValues={{ priority: "normal" }}
        onFinish={submit}
        disabled={submitting}
      >
        <Form.Item label="报修设备">
          <Input
            autoComplete="off"
            aria-label="报修设备"
            readOnly
            value={`${device.code} · ${device.name}`}
          />
        </Form.Item>
        <Form.Item
          name="title"
          label="问题标题"
          rules={[
            { required: true, whitespace: true, message: "请填写问题标题" },
            { max: TICKET_LIMITS.title },
          ]}
        >
          <Input
            autoComplete="off"
            aria-label="问题标题"
            maxLength={TICKET_LIMITS.title}
            showCount
            placeholder="例如：空调不制冷"
          />
        </Form.Item>
        <Form.Item
          name="description"
          label="问题描述"
          rules={[
            { required: true, whitespace: true, message: "请填写问题描述" },
            { max: TICKET_LIMITS.description },
          ]}
        >
          <Input.TextArea
            autoComplete="off"
            aria-label="问题描述"
            rows={5}
            maxLength={TICKET_LIMITS.description}
            showCount
            placeholder="请描述故障现象、发生时间和影响范围"
          />
        </Form.Item>
        <Form.Item name="priority" label="优先级" rules={[{ required: true }]}>
          <Select
            aria-label="优先级"
            options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </Form.Item>
        <div className={styles.actions}>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            disabled={submitting}
            aria-label="提交报修"
          >
            提交报修
          </Button>
          <Link href="/tickets" prefetch={false}>
            查看我的报修
          </Link>
        </div>
      </Form>
      <p className={styles.hint}>
        当前支持文字报修，提交后等待管理员分派。图片上传尚未开放；结果不明时请先查看本人记录，避免刷新后重复报修。
      </p>
    </>
  );
}
