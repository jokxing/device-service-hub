import type { ThemeConfig } from "antd";

export const theme: ThemeConfig = {
  token: {
    colorPrimary: "#2563eb",
    borderRadius: 7,
    fontSize: 14,
    fontSizeSM: 13,
    colorTextSecondary: "#64748b",
    colorTextDescription: "#758196",
    colorTextPlaceholder: "#8793a5",
    colorText: "#263247",
    colorBorder: "#e4e8ef",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif',
  },
  components: {
    Table: {
      headerBg: "#f8fafc",
      headerColor: "#7a8597",
      cellPaddingBlock: 17,
    },
    Button: { primaryShadow: "0 3px 8px rgba(37,99,235,.12)" },
  },
};
