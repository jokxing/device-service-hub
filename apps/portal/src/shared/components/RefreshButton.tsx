"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "antd";
import { ReloadOutlined } from "@ant-design/icons";

export default function RefreshButton({ label = "刷新" }: { label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      icon={<ReloadOutlined aria-hidden />}
      loading={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {label}
    </Button>
  );
}
