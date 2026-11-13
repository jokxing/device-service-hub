"use client";

import { Button } from "antd";
import { redirectToLogin } from "../useAuthenticatedMutation";
import { logoutAccount } from "../api";
import { useApiMutation } from "../../../shared/hooks/useApiMutation";

export default function LogoutButton() {
  const { submitting, error, run } = useApiMutation("退出未完成，请重试");
  function logout() {
    return run((signal) => logoutAccount(signal), redirectToLogin);
  }
  return (
    <div>
      <Button onClick={logout} loading={submitting} disabled={submitting}>
        退出登录
      </Button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
