import path from "node:path";
import assert from "node:assert/strict";
import { openLocalBrowser } from "./lib/browser.mjs";

const { context, page, screenshots, errors } = await openLocalBrowser();
async function selectRole(label) {
  await page
    .locator(
      ".ant-drawer-content-wrapper:not(.ant-drawer-content-wrapper-hidden)",
    )
    .waitFor({ state: "hidden" });
  await page.getByRole("combobox", { name: "演示角色" }).click();
  await page
    .locator(".ant-select-dropdown:visible")
    .getByText(`演示：${label}`, { exact: true })
    .click();
}
async function assertRows(expected, message) {
  await page.waitForFunction(
    (count) =>
      document.querySelectorAll("tbody tr.ant-table-row").length === count,
    expected,
  );
  assert.equal(
    await page.locator("tbody tr.ant-table-row").count(),
    expected,
    message,
  );
}
async function openFirstTicket() {
  await page.getByRole("button", { name: /WO-202611-0012/ }).click();
  await page.getByText("工单详情", { exact: true }).waitFor();
}
try {
  const response = await page.goto("http://127.0.0.1:5173", {
    waitUntil: "networkidle",
  });
  assert.equal(response?.status(), 200);
  await page.getByRole("heading", { name: "工单工作台." }).waitFor();
  await page.waitForURL("**/tickets");
  const navigation = page.getByRole("navigation", { name: "主导航" });
  await navigation.getByRole("link", { name: /设备台账/ }).click();
  await page.waitForURL("**/devices");
  await page.getByRole("button", { name: "详情", exact: true }).first().click();
  await page.getByText("设备编号：AC-001", { exact: true }).waitFor();
  await page.goBack();
  await page.waitForURL("**/tickets");
  await page
    .getByText("设备编号：AC-001", { exact: true })
    .waitFor({ state: "hidden" });
  assert.equal(
    await page.getByText("设备编号：AC-001", { exact: true }).count(),
    0,
    "离开设备页后清理详情弹窗",
  );
  await navigation.getByRole("link", { name: /设备台账/ }).click();
  await page.waitForURL("**/devices");
  await navigation.getByRole("link", { name: /维修记录/ }).click();
  await page.waitForURL("**/records");
  await page.goBack();
  await page.waitForURL("**/devices");
  await page.getByRole("heading", { name: "设备台账." }).waitFor();
  await page.goForward();
  await page.waitForURL("**/records");
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "维修记录." }).waitFor();
  await assertRows(3, "直达并刷新维修记录路由");
  await navigation.getByRole("link", { name: /工单工作台/ }).click();
  await page.waitForURL("**/tickets");
  await assertRows(6);
  await page.getByRole("heading", { name: "服务处理流程" }).waitFor();
  await page.mouse.move(1430, 0);
  await page.screenshot({
    path: path.join(screenshots, "workbench-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: /服务进行中/ }).click();
  assert.equal(
    new URL(page.url()).searchParams.get("tab"),
    "active",
    "统计卡筛选反映在 URL 中",
  );
  await assertRows(4, "进行中包含待接单与处理中");
  await page.getByRole("tab", { name: /待分派/ }).click();
  await assertRows(3);
  await page.getByRole("textbox", { name: "搜索工单" }).fill("不存在的故障");
  await page.getByText("没有符合条件的工单").waitFor();
  await page.getByRole("textbox", { name: "搜索工单" }).fill("");
  await page.getByRole("button", { name: "分派", exact: true }).first().click();
  await page.getByRole("combobox", { name: "选择维修人员" }).click();
  await page.getByText("王志远", { exact: true }).last().click();
  await page.getByRole("button", { name: "确认分派" }).click();
  await selectRole("维修人员");
  await assertRows(5, "维修人员仅可见被分派的任务");
  await openFirstTicket();
  await page.getByRole("button", { name: "接单处理" }).click();
  await page.getByRole("button", { name: "提交处理结果" }).click();
  await page
    .getByRole("textbox", { name: "处理结果" })
    .fill("界面核对：清理滤网并检查制冷情况，等待用户确认。");
  await page.getByRole("button", { name: "提交待确认" }).click();
  await page.locator(".ant-drawer-close").click();
  await selectRole("报修用户");
  await assertRows(6, "本人记录首屏显示6条");
  assert.equal(
    await page.getByText("循环水泵运行时有明显异响", { exact: true }).count(),
    0,
    "不显示其他报修人的记录",
  );
  await openFirstTicket();
  await page.getByRole("button", { name: "确认完成" }).click();
  await page.getByText("报修用户确认设备已恢复正常", { exact: true }).waitFor();
  await page.locator(".ant-drawer-close").click();
  await page.getByRole("button", { name: "新建报修" }).click();
  await page
    .getByRole("textbox", { name: "问题标题" })
    .fill("这段未提交内容应被清理");
  await page.getByRole("button", { name: /^取\s*消$/ }).click();
  await page.getByRole("button", { name: "新建报修" }).click();
  assert.equal(
    await page.getByRole("textbox", { name: "问题标题" }).inputValue(),
    "",
    "关闭再打开表单不残留输入",
  );
  await page.getByRole("combobox", { name: "报修设备" }).click();
  await page.getByText("AC-001 · 中央空调 · 一楼大厅", { exact: true }).click();
  await page
    .getByRole("textbox", { name: "问题标题" })
    .fill("界面核对新增报修");
  await page
    .getByRole("textbox", { name: "问题描述" })
    .fill("这是一条浏览器验证产生的内存演示记录。");
  await page.getByRole("button", { name: "提交演示报修" }).click();
  await page.getByText("界面核对新增报修", { exact: true }).waitFor();
  await page
    .getByRole("navigation", { name: "主导航" })
    .getByRole("link", { name: /设备台账/ })
    .click();
  await assertRows(4, "报修用户仅可见授权设备");
  await navigation.getByRole("link", { name: /维修记录/ }).click();
  await page
    .getByText("大厅空调不制冷，出风温度偏高", { exact: true })
    .waitFor();
  await navigation.getByRole("link", { name: /工单工作台/ }).click();
  await page.getByText("界面核对新增报修", { exact: true }).waitFor();
  await selectRole("维修人员");
  assert.equal(
    await page.getByText("界面核对新增报修", { exact: true }).count(),
    0,
    "切换角色后不泄漏未分派报修",
  );
  assert.equal(
    await page.getByText("工单详情", { exact: true }).count(),
    0,
    "切换角色后无上一角色详情",
  );
  await page.goto("http://127.0.0.1:5173/devices", {
    waitUntil: "networkidle",
  });
  await page.getByRole("heading", { name: "设备台账." }).waitFor();
  await page.goto(
    "http://127.0.0.1:5173/tickets?tab=invalid&status=__proto__&page=-1",
    { waitUntil: "networkidle" },
  );
  await assertRows(6, "无效筛选参数安全回退");
  await page.goto("http://127.0.0.1:5173/tickets", {
    waitUntil: "networkidle",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: path.join(screenshots, "workbench-mobile.png"),
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
    "窄屏无页面横向溢出",
  );
  assert.deepEqual(errors, [], "无页面运行错误");
  console.log(
    JSON.stringify(
      {
        result: "passed",
        checks: [
          "HTTP 200",
          "桌面与窄屏截图",
          "状态与关键词筛选",
          "角色数据范围",
          "分派到用户确认",
          "新增报修",
          "三个页面路由、直达刷新与前进后退",
          "跨页面保留演示数据及角色隔离",
          "关闭表单后清理输入",
          "无页面运行错误",
        ],
        screenshots,
      },
      null,
      2,
    ),
  );
} finally {
  await context.close();
}
