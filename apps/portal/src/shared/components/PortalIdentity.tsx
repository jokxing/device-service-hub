import { Avatar } from "antd";
import { ToolOutlined } from "@ant-design/icons";
import type { PublicUser } from "@device-service-hub/contracts";
import styles from "./portal-shell.module.css";
export function PortalBrand({ drawer = false }: { drawer?: boolean }) {
  return (
    <>
      <span
        className={drawer ? styles.drawerBrandSymbol : styles.brandSymbol}
        aria-hidden="true"
      >
        <ToolOutlined />
      </span>
      <span>
        <strong>设备服务平台</strong>
        <small>DEVICE SERVICE HUB</small>
      </span>
    </>
  );
}
export function PortalIdentity({ user }: { user: PublicUser }) {
  return (
    <>
      <Avatar
        shape="square"
        style={{ background: "#e7efff", color: "#2563eb" }}
      >
        <span aria-hidden="true">{user.name.slice(-2)}</span>
      </Avatar>
      <div>
        <strong>{user.name}</strong>
        <small>报修用户</small>
      </div>
    </>
  );
}
