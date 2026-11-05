import ticketStyles from "../tickets.module.css";
import { useState } from "react";
import { Alert, Drawer, Tag, Timeline } from "antd";
import { useDemoTickets } from "../../../demo/useDemoTickets";
import type { Ticket, TicketNoteKind } from "../types";
import StatusTag from "./StatusTag";
import TicketActions from "./TicketActions";
import TicketNoteModal from "./TicketNoteModal";
import { PRIORITY_LABELS } from "../constants";
interface Props {
  selected: Ticket;
  onClose: () => void;
  onAssign: (id: string) => void;
}
export default function TicketDetailDrawer({
  selected,
  onClose,
  onAssign,
}: Props) {
  const { visibleDevices } = useDemoTickets();
  const [noteKind, setNoteKind] = useState<TicketNoteKind>();
  return (
    <>
      {" "}
      <Drawer
        destroyOnHidden
        open={!!selected}
        onClose={onClose}
        title="工单详情"
        size="large"
        extra={<Tag>演示数据</Tag>}
      >
        {selected && (
          <>
            <div className={ticketStyles["detail-title"]}>
              <span className={ticketStyles["ticket-number"]}>
                {selected.id}
              </span>
              <h2>{selected.title}</h2>
              <StatusTag status={selected.status} />
              <Tag color={selected.priority === "urgent" ? "red" : "default"}>
                {PRIORITY_LABELS[selected.priority]}
              </Tag>
            </div>
            <div className={ticketStyles["detail-grid"]}>
              <div>
                <small>关联设备</small>
                <strong>
                  {visibleDevices.find((d) => d.id === selected.deviceId)?.name}
                </strong>
              </div>
              <div>
                <small>设备编号</small>
                <strong>{selected.deviceId}</strong>
              </div>
              <div>
                <small>报修用户</small>
                <strong>{selected.reporter}</strong>
              </div>
              <div>
                <small>维修人员</small>
                <strong>{selected.assignee ?? "尚未分派"}</strong>
              </div>
            </div>
            <h3 className={ticketStyles["detail-subheading"]}>问题描述</h3>
            <p className={ticketStyles["description-box"]}>
              {selected.description}
            </p>
            {selected.attachments?.length ? (
              <Alert
                type="info"
                showIcon
                title="演示图片未上传"
                description={selected.attachments.join("、")}
              />
            ) : null}
            <h3 className={ticketStyles["detail-subheading"]}>处理时间线</h3>
            <Timeline
              items={selected.events.map((e, i) => ({
                color: i === selected.events.length - 1 ? "blue" : "gray",
                content: (
                  <div className={ticketStyles["timeline-event"]}>
                    <strong>{e.title}</strong>
                    <small>{e.time}</small>
                    <p>{e.detail}</p>
                  </div>
                ),
              }))}
            />
            <TicketActions
              ticket={selected}
              onAssign={onAssign}
              onNote={setNoteKind}
            />
            <p className={ticketStyles["detail-footnote"]}>
              操作权限为前端交互演示；服务端鉴权、状态校验与持久化尚未实现。
            </p>
          </>
        )}
      </Drawer>
      {noteKind && (
        <TicketNoteModal
          kind={noteKind}
          ticketId={selected.id}
          onClose={() => setNoteKind(undefined)}
        />
      )}
    </>
  );
}
