import layoutStyles from "./layout.module.css";
import { useState } from "react";
import { Button, Select, Tooltip } from "antd";
import {
  ArrowRightOutlined,
  InfoCircleOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  Outlet,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { getPageMeta, ROUTES } from "../app/routes";
import { DEMO_ROLE_OPTIONS } from "../demo/accounts";
import type { Role } from "../shared/types/session";
import { useDemoSession } from "../demo/useDemoSession";
import { useDemoTickets } from "../demo/useDemoTickets";
import HelpModal from "../demo/HelpModal";
import TicketStats from "../features/tickets/components/TicketStats";
import CreateTicketModal from "../features/tickets/components/CreateTicketModal";
import {
  getTicketCounts,
  isTerminalStatus,
} from "../features/tickets/ticketRules";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ServiceOverview from "./ServiceOverview";

export default function AppLayout() {
  const { role, setRole } = useDemoSession();
  const { visibleTickets, visibleDevices } = useDemoTickets();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [helpOpen, setHelpOpen] = useState(false);
  const meta = getPageMeta(pathname);
  const counts = getTicketCounts(visibleTickets);
  function changeRole(next: Role) {
    setRole(next);
    setHelpOpen(false);
    navigate(ROUTES.tickets);
  }
  function openCreate() {
    if (role !== "reporter") {
      setRole("reporter");
      navigate(ROUTES.tickets + "?create=1");
    } else {
      const next = new URLSearchParams(params);
      next.set("create", "1");
      setParams(next);
    }
  }
  function closeCreate() {
    const next = new URLSearchParams(params);
    next.delete("create");
    setParams(next, { replace: true });
  }
  return (
    <div className={layoutStyles["app-shell"]}>
      <Sidebar
        activeTicketCount={
          visibleTickets.filter((ticket) => !isTerminalStatus(ticket.status))
            .length
        }
        onHelp={() => setHelpOpen(true)}
      />
      <div className={layoutStyles["main-shell"]}>
        <Header title={meta.title} counts={counts} />
        <main className={layoutStyles.content}>
          <div className={layoutStyles["page-heading"]}>
            <div>
              <div className={layoutStyles["eyebrow"]}>SERVICE OPERATIONS</div>
              <h1>
                {meta.title}
                <span className={layoutStyles["heading-dot"]}>.</span>
              </h1>
              <p>{meta.description}</p>
            </div>
            <div className={layoutStyles["heading-actions"]}>
              <Select
                aria-label="演示角色"
                value={role}
                onChange={changeRole}
                options={DEMO_ROLE_OPTIONS}
                style={{ width: 150 }}
              />
              {role === "reporter" ? (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={openCreate}
                >
                  新建报修
                </Button>
              ) : (
                <Tooltip title="切换为报修用户体验报修入口">
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={openCreate}
                  >
                    体验报修
                  </Button>
                </Tooltip>
              )}
            </div>
          </div>
          <div className={layoutStyles["preview-notice"]}>
            <InfoCircleOutlined />
            <span>
              本地界面演示 · 虚构设备与工单，未连接真实
              API；操作仅在当前页面生效，刷新后重置。
            </span>
            <button onClick={() => setHelpOpen(true)}>
              查看范围 <ArrowRightOutlined />
            </button>
          </div>
          <TicketStats
            counts={counts}
            onSelect={(tab) =>
              navigate(ROUTES.tickets + (tab === "all" ? "" : "?tab=" + tab))
            }
          />
          <Outlet key={role + ":" + pathname} />
          <ServiceOverview visibleDevices={visibleDevices} />
          <footer>
            <span>
              DEVICE SERVICE HUB <i>/</i> 设备服务与售后工单平台
            </span>
            <span>
              <span className={layoutStyles["footer-dot"]} />
              个人项目 · Web 界面预览
            </span>
          </footer>
        </main>
      </div>
      {role === "reporter" && params.get("create") === "1" && (
        <CreateTicketModal
          key={role + ":" + pathname}
          onClose={closeCreate}
          onCreated={() => navigate(ROUTES.tickets, { replace: true })}
        />
      )}
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
    </div>
  );
}
