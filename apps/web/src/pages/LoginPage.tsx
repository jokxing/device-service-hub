import { useState } from "react";
import { Alert, Button, Card, Form, Input } from "antd";
import { ToolOutlined } from "@ant-design/icons";
import { Link, Navigate } from "react-router-dom";
import type { LoginInput } from "@device-service-hub/contracts";
import { ROUTES } from "../app/routes";
import { useSession } from "../features/auth/sessionContext";
import SessionFeedback from "../features/auth/components/SessionFeedback";
import styles from "../features/auth/auth.module.css";

export default function LoginPage() {
  const { status, signIn } = useSession();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  if (status === "authenticated")
    return <Navigate to={ROUTES.serviceDevices} replace />;
  if (status === "loading" || status === "unavailable")
    return <SessionFeedback />;
  async function submit(values: LoginInput) {
    setSubmitting(true);
    setError("");
    try {
      await signIn(values);
    } catch (error) {
      setError(error instanceof Error ? error.message : "登录失败，请重试");
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div className={styles.login}>
      <Card className={styles.card}>
        <div className={styles.heading}>
          <span className={styles.logo}>
            <ToolOutlined />
          </span>
          <h1>登录设备服务</h1>
          <p>使用分配的账号登录，查看你有权访问的设备。</p>
        </div>
        {error && (
          <Alert type="error" showIcon title={error} className="mb-5" />
        )}
        <Form<LoginInput> layout="vertical" onFinish={submit}>
          <Form.Item
            name="username"
            label="账号"
            rules={[{ required: true, message: "请输入账号" }]}
          >
            <Input
              aria-label="账号"
              autoComplete="username"
              maxLength={40}
              placeholder="请输入账号"
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
              placeholder="请输入密码"
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={submitting}>
            登录
          </Button>
        </Form>
        <div className={styles.footer}>
          <Link to={ROUTES.tickets}>查看工单演示</Link>
        </div>
      </Card>
    </div>
  );
}
