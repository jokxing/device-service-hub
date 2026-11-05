import test from "node:test";
import assert from "node:assert/strict";
import {
  canTransition,
  canViewTicket,
} from "../apps/web/src/features/tickets/ticketRules.ts";
import {
  canReportDevice,
  canViewDevice,
} from "../apps/web/src/features/devices/deviceRules.ts";
import { serializeCsv } from "../apps/web/src/shared/utils/csv.ts";

// Minimal fixtures are independent of demo names and UI components.
const reporter = { role: "reporter", name: "报修甲" };
const otherReporter = { role: "reporter", name: "报修乙" };
const technician = { role: "technician", name: "维修甲" };
const otherTechnician = { role: "technician", name: "维修乙" };
const admin = { role: "admin", name: "管理员" };
const ticket = {
  id: "T-1",
  title: "设备异常",
  deviceId: "D-1",
  reporter: reporter.name,
  assignee: technician.name,
  status: "assigned",
  priority: "normal",
  created: "",
  description: "",
  events: [],
};

test("报修人只操作本人记录，待确认可以确认或退回，终结状态不可重开", () => {
  const confirming = { ...ticket, status: "confirming" };
  assert.equal(canTransition(confirming, "completed", reporter), true);
  assert.equal(canTransition(confirming, "processing", reporter), true);
  assert.equal(canViewTicket(confirming, otherReporter), false);
  assert.equal(canTransition(confirming, "completed", otherReporter), false);
  assert.equal(
    canTransition({ ...ticket, status: "completed" }, "processing", reporter),
    false,
  );
  assert.equal(
    canTransition({ ...ticket, status: "processing" }, "cancelled", reporter),
    false,
  );
});

test("维修人员只操作当前分派给自己的任务，不能代替用户确认", () => {
  assert.equal(canTransition(ticket, "processing", technician), true);
  assert.equal(canTransition(ticket, "pending", technician), true);
  assert.equal(canTransition(ticket, "processing", otherTechnician), false);
  assert.equal(
    canTransition({ ...ticket, assignee: undefined }, "processing", technician),
    false,
  );
  assert.equal(
    canTransition(
      { ...ticket, status: "processing" },
      "confirming",
      technician,
    ),
    true,
  );
  assert.equal(
    canTransition({ ...ticket, status: "confirming" }, "completed", technician),
    false,
  );
});

test("管理员允许处理中改派，但不能修改终结工单或代用户确认", () => {
  assert.equal(
    canTransition({ ...ticket, status: "processing" }, "assigned", admin),
    true,
  );
  assert.equal(
    canTransition({ ...ticket, status: "completed" }, "assigned", admin),
    false,
  );
  assert.equal(
    canTransition({ ...ticket, status: "cancelled" }, "assigned", admin),
    false,
  );
  assert.equal(
    canTransition({ ...ticket, status: "confirming" }, "completed", admin),
    false,
  );
});

test("设备授权、停用和维修人员任务关系分别控制访问与报修", () => {
  const device = {
    id: "D-1",
    name: "测试设备",
    category: "",
    location: "",
    model: "",
    enabled: true,
    users: [reporter.name],
  };
  assert.equal(canReportDevice(device, reporter), true);
  assert.equal(canViewDevice(device, otherReporter, []), false);
  assert.equal(canReportDevice({ ...device, enabled: false }, reporter), false);
  assert.equal(canViewDevice(device, technician, [ticket]), true);
  assert.equal(canViewDevice(device, technician, []), false);
  assert.equal(canReportDevice(device, technician), false);
});

test("公共 CSV 方法处理引号、逗号及用户输入中的公式", () => {
  assert.equal(serializeCsv([['a,"b', "=1+1"]]), '\uFEFF"a,""b","\'=1+1"');
});
