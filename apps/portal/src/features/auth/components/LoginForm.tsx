"use client";

import { Alert, Button, Form, Input } from "antd";
import type { LoginInput } from "@device-service-hub/contracts";
import { loginAccount } from "../api";
import { useApiMutation } from "../../../shared/hooks/useApiMutation";

export default function LoginForm() {
  const { submitting, error, run } = useApiMutation("尚未确认登录结果，请重试");
  function submit(values: LoginInput) {
    return run(
      (signal) => loginAccount(values, signal),
      () => window.location.replace("/devices"),
    );
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
