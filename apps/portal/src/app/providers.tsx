"use client";

import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import type { PropsWithChildren } from "react";

export default function Providers({ children }: PropsWithChildren) {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        components: {
          Menu: {
            itemBg: "transparent",
            itemColor: "#64748b",
            horizontalItemSelectedColor: "#2563eb",
            horizontalItemHoverColor: "#2563eb",
            horizontalItemBorderRadius: 0,
            horizontalLineHeight: "46px",
            itemPaddingInline: 2,
            activeBarHeight: 2,
          },
        },
        token: {
          colorPrimary: "#2563eb",
          fontSize: 15,
          fontSizeSM: 13,
          colorText: "#263247",
          colorTextSecondary: "#64748b",
          borderRadius: 8,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif',
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
