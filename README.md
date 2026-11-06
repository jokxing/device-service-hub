# 设备服务与售后工单平台

面向设备报修、任务分派与维修记录管理的独立开发项目，采用 React + TypeScript、NestJS 和 PostgreSQL 构建设备服务与售后工单平台。

项目设计结合十余年前端开发经验，以及 SaaS 后台、权限体系、多端交付和 Node.js 项目经验，重点体现业务建模、模块化架构、服务端数据权限与长期可维护性。

核心流程：**设备查询 → 提交报修 → 管理员分派 → 维修人员接单处理 → 报修用户确认 → 查看维修记录**。

目前包含 React Web 完整流程演示，以及连接 NestJS、PostgreSQL 的最小文字业务闭环：登录与授权设备查询 → 报修 → 首次分派 → 维修人员接单 → 提交处理结果 → 报修用户确认完成。Next.js 用户门户已接入同一报修与确认流程。RN 客户端已接入真实登录、SecureStore 会话恢复、授权设备列表/详情、文字报修、本人分页记录/详情及确认完成。

## 工程设计

- **业务与权限建模**：区分报修用户、管理员和维修人员的操作与数据范围；会话身份、设备授权和工单归属由服务端校验。
- **并发一致性**：报修通过用户与提交编号的唯一约束防重；分派采用版本条件更新，并在同一事务中写入操作记录，处理重复请求与多人竞争。
- **可维护架构**：前端按布局、页面、业务模块和公共能力分工；后端按控制器、服务、DTO、鉴权和查询投影组织，保持事务边界清晰。
- **接口契约**：npm workspaces 管理前后端和共享传输类型；共享包不暴露 ORM 实体、内部会话记录或界面实现，为后续门户与移动端保留边界。
- **交互一致性**：筛选与分页同步 URL，桌面表格与移动卡片适配同一业务数据，统一标题、间距和操作反馈。
- **质量验证**：关键链路覆盖越权、并发冲突、响应丢失重试和重启持久化；迁移前备份，临时测试数据定向清理。

## 界面预览

![工单工作台](docs/screenshots/workbench-desktop.png)

[查看窄屏预览](docs/screenshots/workbench-mobile.png)

[查看真实设备查询界面](docs/screenshots/service-devices.png) · [查看登录界面](docs/screenshots/service-login.png)

[查看本人报修列表](docs/screenshots/service-my-tickets.png) · [查看报修详情](docs/screenshots/service-ticket-detail.png)

[窄屏设备卡片](docs/screenshots/service-devices-mobile.png) · [窄屏报修卡片](docs/screenshots/service-my-tickets-mobile.png)

[管理员工单分派](docs/screenshots/service-admin-tickets.png) · [窄屏分派列表](docs/screenshots/service-admin-tickets-mobile.png)

[维修任务](docs/screenshots/service-tasks.png) · [窄屏任务卡片](docs/screenshots/service-tasks-mobile.png) · [接单详情](docs/screenshots/service-task-detail-mobile.png)

[处理结果](docs/screenshots/service-task-result.png) · [窄屏结果详情](docs/screenshots/service-task-result-mobile.png)

[完成记录](docs/screenshots/service-completed-ticket.png) · [窄屏完成详情](docs/screenshots/service-completed-ticket-mobile.png)

[Next.js 设备门户](docs/screenshots/portal-devices.png) · [门户手机详情](docs/screenshots/portal-device-detail-mobile.png)

[门户文字报修](docs/screenshots/portal-repair-mobile.png) · [门户本人记录](docs/screenshots/portal-my-tickets.png) · [门户报修详情](docs/screenshots/portal-ticket-mobile.png)

[门户确认框](docs/screenshots/portal-confirmation-dialog-mobile.png) · [门户完成详情](docs/screenshots/portal-completed-ticket-mobile.png)

[RN 确认窗口](docs/screenshots/mobile-android-confirm-dialog.png) · [RN 报修列表](docs/screenshots/mobile-android-my-tickets.png) · [RN 报修详情](docs/screenshots/mobile-android-ticket-detail.png) · [RN 设备列表](docs/screenshots/mobile-android-devices.png) · [RN 设备详情](docs/screenshots/mobile-android-device-detail.png) · [RN 模拟器首页](docs/screenshots/mobile-android-home.png) · [RN 模拟器须知](docs/screenshots/mobile-android-guide.png) · [RN 浏览器预览](docs/screenshots/mobile-web-home.png)

## 已实现

- 工单工作台：状态统计、关键词与状态筛选、分页、详情时间线及 CSV 导出。
- 报修流程：新建报修、分派与改派、接单、提交处理结果、用户确认、退回与取消。
- 设备台账与维修记录查询。
- 三种演示角色的数据范围：管理员查看全部样例；报修用户查看本人记录与授权设备；维修人员查看当前分派任务。
- 页面路由、响应式布局、CSS Modules，以及公共类型、常量和工具方法。
- NestJS 真实登录、数据库会话、退出登录，以及按用户授权查询设备列表和详情。
- 真实文字报修、本人分页列表与详情；校验设备授权和启用状态，数据库唯一约束与内容摘要处理并发重复请求。
- 管理员真实工单列表、状态筛选、详情及首次分派；版本条件更新、事务与操作记录处理重复提交和并发竞争。
- 维修人员本人任务、详情与接单；按当前分派关系过滤数据，原子更新状态和接单记录，报修用户与管理员可查看进度。
- 文字处理结果提交与待确认状态；校验归属、状态、版本及规范化内容，结果与状态原子写入，三角色详情展示一致。
- 报修用户本人确认完成；状态与确认记录原子写入，管理员和维修人员只读完成记录，终结状态不接受新的修改命令。

**能力边界：**设备和账号为虚构样例，无真实硬件通信。`apps/web` 的 `/tickets`、`/devices`、`/records` 为内存演示，刷新重置；其 `/login`、`/service/*` 使用真实 API、数据库会话及文字业务闭环。`apps/portal` 的 `/devices`、`/tickets` 则为真实授权设备与本人报修入口，两应用同名路径需结合各自端口区分。真实身份与演示角色独立；图片上传、改派、退回与再次提交尚未实现。

## 技术栈

前端使用 React、TypeScript、Vite、React Router、Ant Design、Tailwind CSS、CSS Modules；后端使用 NestJS 11、Prisma 7 和 PostgreSQL 17。使用 npm workspaces 管理应用。

工作区包含 `apps/web`、`apps/api`、Next.js App Router 门户 `apps/portal`、Expo/RN 客户端 `apps/mobile` 和仅提供传输类型的 `packages/contracts`。移动端使用 SDK 57、Expo Router、React Native 原生组件与 StyleSheet，按 SDK 兼容组合独立管理 React 版本。

演进顺序为 React 后台业务闭环、Next.js 用户门户、React Native 客户端与 Web 微前端集成，详见 [产品与架构演进路线](docs/ROADMAP.md)。门户文字业务已贯通至本人确认完成；RN 已接通原生鉴权、设备查询、文字报修、本人记录与确认完成，维修任务与微前端尚未实现，现有 React 后台与 Node.js 业务后端继续保留。

## 快速开始

推荐 Node.js 24、npm 11。在仓库根目录执行：

```sh
npm ci
npm run dev
```

打开 [本地预览](http://127.0.0.1:5173/)，默认进入 `/tickets`；另有 `/devices` 和 `/records`。

```sh
npm run build:web      # 仅 Web 类型检查与生产构建
npm run test:business  # 关键业务规则测试
npm run format        # 格式化源码
```

Web 构建产物输出到 `apps/web/dist`。部署前需为前端路由配置 HTML 回退。

真实设备服务需要先初始化本地数据库，再启动 API，详见 [API 启动与验证](docs/API_SETUP.md)。环境准备后，`npm run build` 检查 Web、API 和门户；API 编译产物输出到 `apps/api/dist`。

门户启动使用 `npm run dev:portal`，访问 `http://127.0.0.1:3000/login`。会话与来源配置、生产构建及验证命令见 [Next.js 门户](docs/PORTAL.md)。

RN 启动使用 `npm run dev:mobile:web`，浏览器预览为 `http://127.0.0.1:8081`；Android 模拟器可通过 ADB reverse 在 Expo Go 中运行。`npm run check:mobile` 检查依赖与类型，`npm run build:mobile` 导出 Android JS bundle 与 Web 预览。启动、缓存及验证边界见 [移动端说明](docs/MOBILE.md)。当前未生成本项目独立 APK/AAB，未验证实体手机。

报修入口、数据范围和防重复提交说明见 [文字报修与本人记录](docs/TEXT_REPAIR.md)。

管理员使用 `/service/admin/tickets` 查看和首次分派，权限、并发规则与工程实现见 [管理员首次分派](docs/ADMIN_ASSIGNMENT.md)。

维修人员使用 `/service/tasks` 查看本人任务与接单，数据范围、状态约束和重试机制见 [维修任务与接单](docs/TECHNICIAN_TASKS.md)。

处理中任务可提交文字结果并进入待确认，事务、内容防重与操作记录见 [文字处理结果](docs/TASK_RESULTS.md)。

报修人通过本人详情确认完成，角色边界、详情版本契约与完成审计见 [报修用户确认完成](docs/TICKET_CONFIRMATION.md)。

## 结构与验证

[结构与维护约定](docs/ARCHITECTURE.md)说明页面、业务模块、公共代码及演示数据的职责边界。

[后端结构与维护约定](docs/BACKEND_ARCHITECTURE.md)说明业务模块、控制层、服务层、鉴权、参数校验和数据访问的职责。

工程协作遵循 [AGENTS.md](AGENTS.md) 中的模块边界、复用、状态、样式和验证约定。

已通过类型检查、生产构建和 5 项关键规则测试；浏览器回归覆盖完整工单流程、角色数据范围、路由刷新与前进后退、跨页数据保留、弹窗清理及 390px 窄屏布局。

演示浏览器核对命令为 `npm run verify:ui`，需先启动开发服务。真实链路使用 `npm run verify:api` 和 `npm run verify:connected-ui`，需要数据库及 API。浏览器脚本默认使用 Windows 已安装的 Edge，可通过 `DSH_BROWSER_PATH` 指定其他现有浏览器。

真实链路已验证未登录、跨用户访问、伪造角色字段、退出、会话过期与账号停用，以及浏览器登录、详情、刷新和四账号数据范围；RN 登录、设备查询、文字报修和确认完成另经 Android 模拟器 + Expo Go 验证，见 [移动端说明](docs/MOBILE.md)；iOS、实体手机及业务硬件未验证。

API 与 PostgreSQL 实际重启后，原会话和授权设备仍可读取，持久化复核通过。

主 JS 包仍有构建体积提示，按需加载与资源优化留待后续处理。
