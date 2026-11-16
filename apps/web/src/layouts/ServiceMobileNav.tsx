import { Avatar, Drawer } from "antd";
import { ToolOutlined } from "@ant-design/icons";
import { Link, NavLink } from "react-router-dom";
import type { PublicUser } from "@device-service-hub/contracts";
import { ROUTES } from "../app/routes";
import { ROLE_LABELS } from "../shared/constants/roles";
import { serviceNavItemsForRole } from "./serviceNav";
import styles from "./service.module.css";

interface Props {
  open: boolean;
  user: PublicUser;
  onClose: () => void;
}

export default function ServiceMobileNav({ open, user, onClose }: Props) {
  const items = serviceNavItemsForRole(user.role);
  return (
    <Drawer
      id="service-mobile-nav"
      open={open}
      onClose={onClose}
      placement="left"
      width={280}
      closable
      title="服务导航"
      classNames={{ body: styles.drawerBody }}
      destroyOnHidden
    >
      <Link
        className={styles.drawerBrand}
        to={ROUTES.serviceDevices}
        onClick={onClose}
      >
        <span className={styles.drawerBrandSymbol} aria-hidden="true">
          <ToolOutlined />
        </span>
        <span>
          <strong>设备服务平台</strong>
          <small>DEVICE SERVICE HUB</small>
        </span>
      </Link>
      <nav className={styles.drawerNav} aria-label="设备服务导航">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              isActive
                ? [styles.drawerItem, styles.drawerItemActive].join(" ")
                : styles.drawerItem
            }
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className={styles.drawerProfile}>
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
      </div>
    </Drawer>
  );
}
