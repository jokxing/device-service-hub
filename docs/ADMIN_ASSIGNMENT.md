# 管理员工单列表与首次分派

管理员工单列表、详情与首次分派基于现有 React 和 NestJS 实现。维修人员接单及文字处理结果通过独立任务接口提供，见 [TECHNICIAN_TASKS.md](TECHNICIAN_TASKS.md)、[TASK_RESULTS.md](TASK_RESULTS.md)。用户确认由报修人本人执行，管理员只读完成记录，见 [TICKET_CONFIRMATION.md](TICKET_CONFIRMATION.md)。改派与退回尚未实现。

## 入口与权限

| 入口 | 行为 |
| --- | --- |
| `/service/admin/tickets` | 管理员列表，状态筛选和分页存入 URL；窄屏卡片、桌面表格 |
| GET `/api/admin/tickets` | 管理员查询当前单平台全部工单；page/pageSize/status 参数校验 |
| GET `/api/admin/tickets/technicians` | 只返回启用中的维修人员 ID 与姓名 |
| GET `/api/admin/tickets/:id` | 管理员详情，包含报修人和首次分派操作记录 |
| POST `/api/admin/tickets/:id/assign` | 管理员首次分派，成功或同意图重放均返回 201 |

未登录返回 401，报修用户和维修人员访问上述接口返回 403。管理员的全部范围仅适用于当前单平台，不代表未来多租户跨组织权限。原 `/api/tickets/mine` 与 `/api/tickets/:id` 仍仅供报修人读取本人数据，管理员通过独立入口操作。

报修用户在本人列表、详情查看已分派维修人员与接单进度；不会获得管理员操作接口或他人工单。维修人员通过独立任务接口读取当前分派工单，不能通过管理员接口读取任务。

## 状态和异常

唯一新增迁移为 `pending → assigned`，必须同时满足版本匹配且尚无维修人员。请求为 `{ requestId, assigneeId, expectedVersion }`，其中 requestId 是 UUID v4；操作人来自会话。

首次分派现可附带 `serviceMode: direct | quoted`，省略时为直接处理，审计记录保存方式并参与重放核对。需报价任务接单后提交首版报价，见 [QUOTES.md](QUOTES.md)；本步不提供分派后改方式。

- 维修人员不存在、非维修角色或已停用：409，不修改工单。
- 工单不存在：404；参数不合法或夹带角色/状态等字段：400。
- 过期版本、已分派或其他非待分派状态：409，提示关闭弹窗并刷新核对。
- 设备后来停用不阻止管理员安排已存在工单；设备启用检查仍用于新增报修。
- 暂无启用维修人员时显示说明并禁用提交；下拉列表加载后人员被停用，服务端仍会拦截。
- 管理员分派入口不开放改派、取消、接单或任意状态设置。接单仅由当前维修人员执行。

## 事务与重试

Ticket 新增 assigneeId、assignedAt 和 version，已有记录保留并默认版本 0。TicketAssignment 保存首次分派的工单、操作人、维修人员、时间、提交编号及原版本；ticketId 唯一，操作人加提交编号唯一。

1. 已存在同一操作人/提交编号时，核对工单、维修人员与原版本。相同返回原工单，不同返回 409。
2. 新分派在一个事务内校验工单、锁定启用维修人员记录、按 `id + pending + version + assigneeId=null` 条件更新并递增版本，再写分派记录。
3. 条件更新或唯一约束的竞争失败方核对已提交意图；同意图返回原单，其他竞争返回 409。事务失败不留下部分更新。
4. 弹窗内相同选择重试沿用提交编号，换人或重新打开生成新意图。网络超时/响应丢失时允许重试；关闭重开后结果不明应先刷新列表。

历史记录不随维修人员停用或列表刷新消失。首次分派表目前只保存一条记录；未来支持改派前需先扩展模型和规则，不绕过唯一约束。

## 工程结构与设计取舍

- 后端 `modules/tickets/admin-tickets.controller.ts` 负责 HTTP，`admin-tickets.service.ts` 负责管理员用例、授权与事务；DTO、查询投影、传输类型分别维护。
- Web 页面组合 AdminTicketsList、AssignConnectedTicketModal、AdminTicketDetail；详情字段复用 TicketRecordDetails，窄屏复用 CompactRecordCard，分页参数解析复用 readPage。
- 迁移前在被忽略的 `.local/backups` 备份本项目数据库。新增迁移不 reset、不改旧迁移，不覆盖原账号和报修记录。

请求链路为“分派弹窗 → admin-api → Controller → Service → 条件更新与操作记录”。前端 loading 和请求取消控制交互与资源生命周期；数据库唯一约束、版本校验及事务负责请求重放和并发一致性，两者各自承担明确职责。

## 验证命令与数据范围

```sh
npm run verify:assignment
npm run verify:assignment-ui
```

Windows 通过 `.\scripts\npm-local.ps1 run <脚本名>` 执行。需先启动本地数据库、API 与 Web。

API 检查覆盖角色、筛选分页、目标人员状态、参数、非待分派状态、版本冲突、同意图八路并发和两管理员竞争。浏览器检查覆盖表单关闭清理、加载后人员停用、响应丢失后重试、刷新、桌面/窄屏、操作记录和跨角色访问。

只允许使用本项目独立本地数据库；测试工单按本轮随机 requestId 和已知报修人清理，分派记录随之级联删除；临时账号只按本轮生成 ID 删除，不按标题/角色批量清理人工数据。截图可包含自动验收临时记录，测试结束后清理。

本步仅本地浏览器与真实数据库验证，不代表生产部署、RN、真机或安装包验证。

### 实际验证记录（2026-11-06）

Web/API 构建、现有 5 项演示规则测试、登录与设备 API、本人报修 API、原有三个浏览器回归及本步分派 API/浏览器检查均通过。查看了管理员桌面表格、390px 卡片和窄屏详情截图。

实际重启 PostgreSQL 并由编译触发 API 重启后，临时已分派工单的维修人员、操作人、时间、版本与幂等重放均保留，只有一条分派记录。原有会话及文字报修持久化复核也通过；随后撤销测试会话并清理全部持久化检查点和对应临时工单，保留人工数据。
