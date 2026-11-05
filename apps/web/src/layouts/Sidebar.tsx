import layoutStyles from "./layout.module.css";
import { Avatar, Tooltip } from "antd";
import {
  AppstoreOutlined,
  ArrowRightOutlined,
  CustomerServiceOutlined,
  DesktopOutlined,
  FileTextOutlined,
  LogoutOutlined,
  QuestionCircleOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import { Link, NavLink } from "react-router-dom";
import { PAGE_META, ROUTES } from "../app/routes";
import { ROLE_LABELS } from "../shared/constants/roles";
import { useDemoSession } from "../demo/useDemoSession";
interface Props {
  activeTicketCount: number;
  onHelp: () => void;
}
const navigation = [
  {
    to: ROUTES.tickets,
    label: PAGE_META[ROUTES.tickets].title,
    icon: <AppstoreOutlined />,
  },
  {
    to: ROUTES.devices,
    label: PAGE_META[ROUTES.devices].title,
    icon: <DesktopOutlined />,
  },
  {
    to: ROUTES.records,
    label: PAGE_META[ROUTES.records].title,
    icon: <FileTextOutlined />,
  },
];
export default function Sidebar({ activeTicketCount, onHelp }: Props) {
  const { role, actor } = useDemoSession();
  return (
    <aside className={layoutStyles["sidebar"]}>
      <Link className={layoutStyles["brand"]} to={ROUTES.tickets}>
        <span className={layoutStyles["brand-symbol"]}>
          <ToolOutlined />
        </span>
        <span>
          <strong>设备服务平台</strong>
          <small>DEVICE SERVICE HUB</small>
        </span>
      </Link>
      <div className={layoutStyles["workspace-label"]}>
        工作空间 <span>个人实践</span>
      </div>
      <nav className={layoutStyles.navigation} aria-label="主导航">
        {navigation.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive
                ? [layoutStyles["nav-item"], layoutStyles["active"]].join(" ")
                : layoutStyles["nav-item"]
            }
          >
            {item.icon}
            {item.label}
            {item.to === ROUTES.tickets && (
              <span className={layoutStyles["nav-count"]}>
                {activeTicketCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className={layoutStyles["sidebar-note"]}>
        <span className={layoutStyles["note-icon"]}>
          <CustomerServiceOutlined />
        </span>
        <strong>让每一次报修都有回音</strong>
        <p>
          从发现问题到恢复运行，
          <br />
          清晰跟进每一个处理环节。
        </p>
        <button onClick={onHelp}>
          了解业务流程 <ArrowRightOutlined />
        </button>
      </div>
      <div className={layoutStyles["sidebar-bottom"]}>
        <button className={layoutStyles["help-link"]} onClick={onHelp}>
          <QuestionCircleOutlined />
          使用说明<span>↗</span>
        </button>
        <div className={layoutStyles["environment"]}>
          <i />
          本地开发环境<span>v0.1</span>
        </div>
        <div className={layoutStyles["profile"]}>
          <Avatar
            shape="square"
            style={{ background: "#e7efff", color: "#2563eb" }}
          >
            {actor.name.slice(-2)}
          </Avatar>
          <div>
            <strong>{actor.name}</strong>
            <small>{ROLE_LABELS[role]} · 演示账号</small>
          </div>
          <Tooltip title="查看演示账号说明">
            <button onClick={onHelp} aria-label="账号说明">
              <LogoutOutlined />
            </button>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}
