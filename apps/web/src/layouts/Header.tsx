import layoutStyles from "./layout.module.css";
import { Avatar, Button, Popover } from "antd";
import { BellOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../app/routes";
import { useDemoSession } from "../demo/useDemoSession";
interface Props {
  title: string;
  counts: { pending: number };
}
export default function Header({ title, counts }: Props) {
  const { actor } = useDemoSession();
  const navigate = useNavigate();
  return (
    <header className={layoutStyles["topbar"]}>
      <div className={layoutStyles["breadcrumb"]}>
        服务运营<span>/</span>
        <strong>{title}</strong>
      </div>
      <div className={layoutStyles["topbar-right"]}>
        <span className={layoutStyles["demo-badge"]}>
          <i />
          界面预览
        </span>
        <Popover
          trigger="click"
          placement="bottomRight"
          title="演示通知"
          content={
            <div className={layoutStyles["notification"]}>
              <strong>{counts.pending} 条工单等待分派</strong>
              <p>当前展示样例数据，尚未接入消息服务。</p>
              <Button
                size="small"
                onClick={() => {
                  navigate(ROUTES.tickets + "?tab=pending");
                }}
              >
                查看待分派工单
              </Button>
            </div>
          }
        >
          <button className={layoutStyles["bell"]} aria-label="通知">
            <BellOutlined />
            <i />
          </button>
        </Popover>
        <span className={layoutStyles["header-separator"]} />
        <Avatar
          size={29}
          style={{ background: "#e9effa", color: "#557098", fontSize: 11 }}
        >
          {actor.name.slice(-2)}
        </Avatar>
      </div>
    </header>
  );
}
