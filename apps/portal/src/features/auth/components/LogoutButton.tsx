"use client";

import { useRef, useState } from "react";
import { Button } from "antd";

export default function LogoutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const active = useRef(false);
  async function logout() {
    if (active.current) return;
    active.current = true;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error("Logout failed");
      window.location.replace("/login");
    } catch {
      setError("退出未完成，请重试");
    } finally {
      active.current = false;
      setPending(false);
    }
  }
  return (
    <div>
      <Button onClick={logout} loading={pending} disabled={pending}>
        退出登录
      </Button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
