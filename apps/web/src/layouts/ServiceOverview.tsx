import layoutStyles from "./layout.module.css";
import {
  ArrowRightOutlined,
  CheckOutlined,
  DesktopOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../app/routes";
import type { Device } from "../features/devices/types";
interface Props {
  visibleDevices: readonly Device[];
}
export default function ServiceOverview({ visibleDevices }: Props) {
  const navigate = useNavigate();
  const activeDevices = visibleDevices.filter(
    (device) => device.enabled,
  ).length;
  return (
    <section className={layoutStyles["bottom-grid"]}>
      <div className={layoutStyles["flow-card"]}>
        <div className={layoutStyles["small-card-title"]}>
          <h3>服务处理流程</h3>
          <span>从报修到完成，形成闭环</span>
        </div>
        <div className={layoutStyles["flow-steps"]}>
          {["用户报修", "管理员分派", "维修处理", "用户确认"].map(
            (label, i) => (
              <div className={layoutStyles["flow-step"]} key={label}>
                <span
                  className={
                    i === 0
                      ? [
                          layoutStyles["step-number"],
                          layoutStyles["first"],
                        ].join(" ")
                      : layoutStyles["step-number"]
                  }
                >
                  {i === 3 ? <CheckOutlined /> : `0${i + 1}`}
                </span>
                <span>{label}</span>
                {i < 3 && (
                  <ArrowRightOutlined className={layoutStyles["step-arrow"]} />
                )}
              </div>
            ),
          )}
        </div>
      </div>
      <div className={layoutStyles["device-overview"]}>
        <div className={layoutStyles["small-card-title"]}>
          <h3>设备概况</h3>
          <button onClick={() => navigate(ROUTES.devices)}>
            查看台账 <ArrowRightOutlined />
          </button>
        </div>
        <div className={layoutStyles["device-overview-body"]}>
          <span className={layoutStyles["overview-icon"]}>
            <DesktopOutlined />
          </span>
          <div>
            <strong>
              {visibleDevices.length}
              <small>台可见设备</small>
            </strong>
            <p>
              <i />
              {activeDevices} 台启用<span>·</span>
              {visibleDevices.length - activeDevices} 台停用
            </p>
          </div>
          <div className={layoutStyles["mini-bars"]} aria-hidden="true">
            {[28, 43, 33, 52, 44, 62, 49].map((h, i) => (
              <span key={i} style={{ height: h }} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
