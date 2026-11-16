import { Avatar, Button } from "antd";
import { MenuOutlined } from "@ant-design/icons";
import type { PublicUser } from "@device-service-hub/contracts";
import layoutStyles from "./layout.module.css";
import styles from "./service.module.css";

interface Props {
  title: string;
  user: PublicUser;
  loggingOut: boolean;
  menuOpen: boolean;
  onOpenMenu: () => void;
  onLogout: () => void;
}

export default function ServiceHeader({
  title,
  user,
  loggingOut,
  menuOpen,
  onOpenMenu,
  onLogout,
}: Props) {
  return (
    <header className={[layoutStyles.topbar, styles.topbar].join(" ")}>
      <div className={styles.topbarStart}>
        <Button
          type="text"
          className={styles.menuButton}
          icon={<MenuOutlined />}
          aria-label="打开服务导航"
          aria-expanded={menuOpen}
          aria-controls="service-mobile-nav"
          onClick={onOpenMenu}
        >
          <span className={styles.menuLabel}>菜单</span>
        </Button>
        <div className={[layoutStyles.breadcrumb, styles.breadcrumb].join(" ")}>
          服务运营<span>/</span>
          <strong>{title}</strong>
        </div>
      </div>
      <div className={[layoutStyles["topbar-right"], styles.topbarEnd].join(" ")}>
        <span
          className={[layoutStyles["demo-badge"], styles.envBadge].join(" ")}
        >
          <i />
          真实服务
        </span>
        <span className={layoutStyles["header-separator"]} />
        <Avatar
          size={29}
          style={{ background: "#e9effa", color: "#557098", fontSize: 11 }}
        >
          {user.name.slice(-2)}
        </Avatar>
        <div className={styles.mobileLogout}>
          <Button
            size="small"
            onClick={onLogout}
            loading={loggingOut}
            disabled={loggingOut}
          >
            退出登录
          </Button>
        </div>
      </div>
    </header>
  );
}
