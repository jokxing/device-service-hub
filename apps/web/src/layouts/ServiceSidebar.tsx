import { Avatar, Tooltip } from "antd";
import { LogoutOutlined, ToolOutlined } from "@ant-design/icons";
import { Link, NavLink } from "react-router-dom";
import type { PublicUser } from "@device-service-hub/contracts";
import { ROUTES } from "../app/routes";
import { ROLE_LABELS } from "../shared/constants/roles";
import layoutStyles from "./layout.module.css";
import { serviceNavItemsForRole } from "./serviceNav";
import styles from "./service.module.css";

interface Props {
  user: PublicUser;
  loggingOut: boolean;
  onLogout: () => void;
}

export default function ServiceSidebar({ user, loggingOut, onLogout }: Props) {
  const items = serviceNavItemsForRole(user.role);
  return (
    <aside className={layoutStyles.sidebar} data-service-sidebar>
      <Link className={layoutStyles.brand} to={ROUTES.serviceDevices}>
        <span className={layoutStyles["brand-symbol"]}>
          <ToolOutlined />
        </span>
        <span>
          <strong>设备服务平台</strong>
          <small>DEVICE SERVICE HUB</small>
        </span>
      </Link>
      <div className={layoutStyles["workspace-label"]}>
        工作空间 <span>真实服务</span>
      </div>
      <nav className={layoutStyles.navigation} aria-label="设备服务导航">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive
                ? [layoutStyles["nav-item"], layoutStyles.active].join(" ")
                : layoutStyles["nav-item"]
            }
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className={layoutStyles["sidebar-bottom"]}>
        <div className={layoutStyles.environment}>
          <i />
          本地服务环境
          <span>v0.1</span>
        </div>
        <div className={layoutStyles.profile}>
          <Avatar
            shape="square"
            style={{ background: "#e7efff", color: "#2563eb" }}
          >
            {user.name.slice(-2)}
          </Avatar>
          <div>
            <strong>{user.name}</strong>
            <small>{ROLE_LABELS[user.role]}</small>
          </div>
          <Tooltip title="退出登录">
            <button
              type="button"
              aria-label="退出登录"
              className={styles.desktopLogout}
              disabled={loggingOut}
              onClick={onLogout}
            >
              <LogoutOutlined />
            </button>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}
