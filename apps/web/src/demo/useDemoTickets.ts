import { useMemo } from "react";
import { App } from "antd";
import { devices } from "./fixtures";
import { DEMO_TECHNICIANS } from "./accounts";
import { useDemoContext } from "./demoContext";
import { useDemoSession } from "./useDemoSession";
import {
  canReportDevice,
  canViewDevice,
} from "../features/devices/deviceRules";
import { canTransition, canViewTicket } from "../features/tickets/ticketRules";
import { STATUS_META, TICKET_LIMITS } from "../features/tickets/constants";
import type {
  CreateTicketValues,
  Status,
  Ticket,
} from "../features/tickets/types";
import { formatDateTime } from "../shared/utils/date";

/** Adapter for in-memory data only; pages do not import fixtures or mutate state directly. */
export function useDemoTickets() {
  const { tickets, setTickets } = useDemoContext();
  const { actor, role } = useDemoSession();
  const { message } = App.useApp();
  const visibleTickets = useMemo(
    () => tickets.filter((ticket) => canViewTicket(ticket, actor)),
    [tickets, actor],
  );
  const visibleDevices = useMemo(
    () =>
      devices.filter((device) => canViewDevice(device, actor, visibleTickets)),
    [actor, visibleTickets],
  );
  const reportableDevices = visibleDevices.filter((device) =>
    canReportDevice(device, actor),
  );

  function transition(
    ticketId: string,
    next: Status,
    detail: string,
    assignee?: string,
  ): boolean {
    const ticket = visibleTickets.find((item) => item.id === ticketId);
    if (!ticket || !canTransition(ticket, next, actor)) {
      message.error("当前角色不能执行此操作");
      return false;
    }
    if (!detail.trim() || detail.length > TICKET_LIMITS.description) {
      message.warning("请填写有效的处理说明");
      return false;
    }
    if (
      next === "assigned" &&
      (!assignee || !DEMO_TECHNICIANS.includes(assignee))
    ) {
      message.warning("请选择有效的维修人员");
      return false;
    }
    const event = {
      title: STATUS_META[next].label,
      time: formatDateTime(),
      detail: detail.trim(),
    };
    setTickets((previous) =>
      previous.map((current) =>
        current.id === ticketId && canTransition(current, next, actor)
          ? {
              ...current,
              status: next,
              assignee:
                next === "pending"
                  ? undefined
                  : next === "assigned"
                    ? assignee
                    : current.assignee,
              events: [...current.events, event],
            }
          : current,
      ),
    );
    message.success("演示操作已更新，刷新页面后恢复样例数据");
    return true;
  }

  function createTicket(
    values: CreateTicketValues,
    attachments: string[],
  ): boolean {
    if (!reportableDevices.some((device) => device.id === values.deviceId)) {
      message.error("请使用报修用户及已授权设备提交");
      return false;
    }
    const title = values.title.trim();
    const description = values.description.trim();
    if (
      !title ||
      title.length > TICKET_LIMITS.title ||
      !description ||
      description.length > TICKET_LIMITS.description ||
      attachments.length > TICKET_LIMITS.attachments
    ) {
      message.warning("请检查报修内容和附件数量");
      return false;
    }
    const created = formatDateTime();
    const ticket: Ticket = {
      ...values,
      title,
      description,
      id: `WO-DEMO-${crypto.randomUUID().slice(0, 8)}`,
      reporter: actor.name,
      status: "pending",
      created,
      attachments,
      events: [
        {
          title: "提交报修",
          time: created,
          detail: `${actor.name}提交了设备报修`,
        },
      ],
    };
    setTickets((previous) => [ticket, ...previous]);
    message.success("演示工单已创建；图片仅展示文件名，未上传");
    return true;
  }

  return {
    role,
    actor,
    visibleTickets,
    visibleDevices,
    reportableDevices,
    transition,
    createTicket,
  };
}
