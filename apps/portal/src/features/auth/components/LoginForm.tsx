"use client";

import { useRef, useState } from "react";
import { Alert, Button, Form, Input } from "antd";
import type { LoginInput } from "@device-service-hub/contracts";

export default function LoginForm() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  async function submit(values: LoginInput) {
    if (pending.current) return;
    pending.current = true;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        const data = (await response.json()) as { message: string };
        setError(data.message);
        return;
      }
      // Full navigation discards the previous account's client router cache.
      window.location.replace("/devices");
    } catch {
      setError("尚未确认登录结果，请重试");
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  }
  return (
    <>
      {error && (
        <Alert
          type="error"
          showIcon
          title={error}
          style={{ marginBottom: 20 }}
        />
      )}
      <Form<LoginInput>
        name="portal-login"
        layout="vertical"
        onFinish={submit}
        disabled={submitting}
      >
        <Form.Item
          name="username"
          label="账号"
          rules={[{ required: true, message: "请输入账号" }]}
        >
          <Input
            aria-label="账号"
            autoComplete="username"
            maxLength={40}
            size="large"
          />
        </Form.Item>
        <Form.Item
          name="password"
          label="密码"
          rules={[{ required: true, message: "请输入密码" }]}
        >
          <Input.Password
            aria-label="密码"
            autoComplete="current-password"
            maxLength={128}
            size="large"
          />
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          block
          size="large"
          loading={submitting}
          disabled={submitting}
        >
          登录
        </Button>
      </Form>
    </>
  );
}
