# Web 结构与维护约定

本说明描述 Web 组织方式。完整工单流程保留内存演示；真实服务入口已连接 NestJS、PostgreSQL，实现登录、设备查询、文字报修、分派、接单、处理结果与本人确认完成。运行方式见 [API_SETUP.md](API_SETUP.md)。RN 独立工程已接通原生鉴权、会话恢复与授权设备查询，边界及验证见 [MOBILE.md](MOBILE.md)。

本文件解释现有结构与设计取舍；AI 协作执行规则见根目录 [AGENTS.md](../AGENTS.md)，避免重复维护多套规范。

本文件主体描述 `apps/web` 的 Vite 后台。`apps/portal` 使用 Next.js App Router，当前提供登录、授权设备查询、文字报修、本人记录和完成确认；Server/Client Components、Cookie、提交防重与缓存边界单独维护在 [PORTAL.md](PORTAL.md)，不将 React Router 和后台布局搬入门户。

`apps/shell` 已通过 qiankun 加载现有后台。`main.tsx` 和 `micro.ts` 共用 `app/createApplication.tsx` 的 Provider 与根节点管理；独立路由不带前缀，挂载时使用 `/tickets` basename。独立构建、沙箱/浮层、身份与卸载边界见 [MICRO_FRONTENDS.md](MICRO_FRONTENDS.md)，不向门户或 RN 引入 qiankun。

`apps/devices` 为 Vue 只读设备子应用，按 App/布局/业务模块/共享传输分层。主应用通过公共 MicroAppView/useMicroApp 管理两个子应用；Vue 的版本化导航回调由主应用映射为 React 设备详情 URL。ConnectedDevicesPage 的 `deviceId` 查询参数驱动真实详情弹窗，支持直达和刷新；设备数据仍由后端会话授权，不将 URL 或通信消息作为权限依据。

管理员真实列表与首次分派使用 `/service/admin/tickets`，详情字段复用 TicketRecordDetails，列表/分派/详情弹窗分别组织。服务端权限和事务规则见 [ADMIN_ASSIGNMENT.md](ADMIN_ASSIGNMENT.md)，演示身份不参与管理接口授权。

首次分派可选择直接处理或需报价；维修任务与管理员详情组合 `features/quotes` 的报价表单、只读摘要及历史折叠。首版与修订复用表单和条目字段，已拒绝的最新版本可预填为新表单，提交生成新版而不覆盖旧记录。金额规则通过 contracts 的 `quote-rules` 子入口复用，提交、修订与权限边界见 [维修报价](QUOTES.md)。报价型任务不显示结果提交，服务端仍独立拦截。

管理员详情组合 `features/tickets/photos/AdminTicketPhotos`，通过 Cookie 读取 RN 上传的现场照片并放大预览。图片请求复用共享传输和读取 Hook，关闭时取消读取并释放内存 URL；通用详情字段不包含请求或鉴权逻辑。边界及验证见 [TICKET_PHOTOS.md](TICKET_PHOTOS.md)。

维修人员通过 `/service/tasks` 及详情路由查询本人任务与接单，页面组合 TaskTicketsList 和 AcceptTaskModal，复用详情字段、卡片、分页参数与服务布局。规则见 [TECHNICIAN_TASKS.md](TECHNICIAN_TASKS.md)，任务身份来自数据库会话，数据范围由服务端按当前分派关系约束。

处理中任务的文字结果由 SubmitTaskResultModal 管理，入口使用统一 canSubmitTaskResult 规则；三种角色均通过 TicketRecordDetails 显示同一结果，规范与验证见 [TASK_RESULTS.md](TASK_RESULTS.md)。报修人确认由 ConfirmTicketModal 管理，入口共用 canConfirmTicket；本人详情携带当前版本，路由和账号变化清理旧弹窗。见 [TICKET_CONFIRMATION.md](TICKET_CONFIRMATION.md)，退回与再次提交尚未交付。

React 后台、Next.js 用户门户、RN 和微前端已按 [产品与架构演进路线](ROADMAP.md)完成当前本地交付范围。各应用保留独立入口，共用 NestJS 业务后端；后续功能按实际业务需求增量交付。

## 目录职责

| 目录或文件 | 责任 | 新增代码示例 |
| --- | --- | --- |
| `apps/web/src/App.tsx` | 组装路由与 Provider | 注册新页面，不写表单或业务规则 |
| `app/` | 应用配置 | 路由地址、页面标题、主题 Token |
| `layouts/` | 应用外壳 | 导航、顶部栏、页面框架 |
| `pages/` | 页面级组装 | 设备页选择哪台设备、工单页组合哪些组件 |
| `features/tickets/` | 工单业务 | 类型、状态常量、状态迁移、筛选、表格和操作弹窗 |
| `features/devices/` | 设备业务 | 类型、设备访问规则、表格和详情 |
| `shared/components/` | 跨业务的基础组件 | 工单和设备共用的 ContentCard |
| `shared/hooks/` | 与业务无关的请求生命周期 | useApiResource、useApiMutation |
| `shared/constants/`、`shared/types/` | 跨业务的常量和类型 | 角色标签、Actor 和 Role |
| `shared/utils/` | Web 通用工具 | 日期格式、文件策略校验、CSV 编码与下载 |
| `demo/` | 可替换的演示数据与状态适配 | 虚构账号、设备、工单、内存 Provider、演示操作 Hook |
| `styles/global.css` | 基础样式与明确的全局约定 | Tailwind 入口、基础重置、公共 muted 样式、Ant Design 统一外观 |

目录按现有职责建立；新增工作区和公共模块应由实际功能需求驱动。

## 什么可以放公共文件

- 业务含义在多个地方一致时，共用同一份常量。例如工单状态标签、优先级选项、表单长度和附件限制由工单模块统一导出。
- 与工单、设备、演示账号无关的方法才进入 `shared/utils`。工单状态迁移继续放 `ticketRules.ts`，设备授权继续放 `deviceRules.ts`。
- 公共工具不读取页面状态、不导入业务组件，也不依赖演示数据；不建立内容混杂的 `common.ts` 或大 `utils.ts`。
- `shared` 不反向依赖 `pages`、`layouts`、`features` 或 `demo`。类型只用于类型检查时使用 `import type`。
- 演示账号姓名和“演示：”选项属于 `demo`，不进入通用角色定义。
- Web 的 `shared` 仍是 Web 内部复用。CSV 下载、DOM、存储、UI 样式不能直接用于 RN。以后有第二个真实消费者时，才把适合共享的契约和纯规则迁移到独立包。

## 提交交互与列表复用

| 复用入口 | 当前使用范围 | 职责 |
| --- | --- | --- |
| `shared/hooks/useApiMutation.ts` | 登录、退出及真实业务提交 | 同步防重复进入、提交状态、15 秒超时、卸载取消、错误处理与调用方传入的可选 401 回调；登录的 401 显示账号错误 |
| `shared/components/MutationModal.tsx` | 上述五类操作弹窗 | 统一错误区域和提交按钮，提交时禁止取消、关闭图标、Esc 与遮罩关闭 |
| `shared/components/ResponsiveRecordList.tsx` | 本人报修、管理员工单、维修任务 | 桌面表格、手机卡片列表、空态及受控分页；业务方传入列、卡片与操作 |
| `features/tickets/hooks/useTicketListQuery.ts` | 管理员工单、维修任务 | URL 状态与分页解析、筛选重置页码、刷新和前进后退 |
| `features/tickets/components/TicketStatusFilter.tsx` | 上述两种列表 | 状态选项、无障碍标签和筛选栏布局 |
| `features/tickets/components/TicketActionSummary.tsx` | 分派、接单、处理结果、确认完成 | 工单编号、标题与设备位置摘要 |

- `shared` 不导入身份上下文或工单模块；业务组件传入请求、401 回调和成功回调。请求参数、表单校验、状态动作与提交编号留在业务模块，不建设通用表单配置引擎。
- 提交 Hook 不自动重试写请求。相同内容的重试沿用原业务提交编号；内容变化是否产生新编号由各业务操作决定。取消浏览器请求不代表数据库回滚，响应丢失后仍通过服务端幂等规则核对。
- `shared/api/http.ts` 对 JSON、图片及响应体读取统一设置 20 秒传输超时和 no-store；保留调用方取消原因，清理定时器与监听，不自动重试。提交 Hook 的 15 秒意图超时先于传输上限，结果不明时按业务提示核对。登录/退出 API 接收 AbortSignal，取消后不更新本地身份；退出失败保留当前会话并显示错误。
- 业务差异明确保留：三种列表拥有不同字段和权限入口；演示弹窗使用内存适配，真实弹窗使用会话 API。设备列表无分页，继续复用 CompactRecordCard，不为套用分页容器新增虚假分页。
- 后端各角色的授权、状态条件与事务边界保持独立，不能因前端组件相似而合并成通用修改接口。

## 状态与数据流

```text
App → DemoProvider → AppLayout → 页面 → 业务组件
                    ↓          ↓
               演示账号      useDemoTickets → 纯业务规则 → 更新内存数据
```

- DemoProvider 保存演示角色和工单，跨页面导航保留，浏览器刷新后恢复样例。
- `useDemoTickets` 是演示数据适配入口，页面不直接修改 fixtures。真实业务使用独立会话与 API 适配，复用适用的纯规则和呈现组件。
- 过滤后的工单、统计和可见设备根据当前数据计算，不另外存一份可变状态。
- Web 真实工单列表请求共用 `ticketListQuery` 和工单模块的 `CONNECTED_TICKET_PAGE_SIZE`（当前 10 条）；分页展示使用服务端返回的 page/pageSize/total。演示列表独立使用 `TICKET_PAGE_SIZE`（6 条），不与真实接口混用。
- 工单筛选和分页通过 URL 参数管理，支持前进后退；无效状态、页码会回退。输入关键词替换当前历史项，避免每个字符都产生一条历史记录。
- 表单字段、附件选择、处理说明归弹窗本地管理；关闭后销毁，重新打开不残留输入。
- 详情、分派对象归对应页面管理。页面路径或角色变化时卸载页面内容，清除原页面弹窗。设备详情也使用受控组件，避免全局弹窗跨页残留。
- 展示动作和演示操作均调用 `canTransition`，避免多处维护不同的迁移规则。

演示角色和工单归属依赖虚构账号姓名，仅用于 UI 演示。真实设备入口使用独立的 SessionProvider、Cookie 会话、数据库用户 ID 和授权关系，不读取演示账号。前端规则不构成授权保障；真实工单接口独立执行服务端状态约束、事务、幂等和并发校验。

## 真实设备服务入口

- `/login` 和 `/service/devices` 由独立会话 Provider 管理，登录后加载真实设备列表及详情；Effect 使用 AbortController 清理请求，账号变化后清除旧数据。
- `features/auth` 负责会话与登录 API，`features/devices/api.ts` 负责设备请求，`shared/api/http.ts` 统一处理传输和错误。
- 设备表格与详情组件复用展示结构，演示数据和真实响应在类型上分开，不伪造尚未实现的维修记录。
- 前后端实际共用的传输类型位于 `packages/contracts`；根入口只包含类型声明，`device-tags` 子入口提供 Web 与 RN 共用的纯标签编解码；不依赖数据库或浏览器运行时。
- ServiceLayout 管理真实身份和服务导航，增加 `/service/tickets` 及本人详情路由；字段组件在演示/真实表单之间复用，提交逻辑保持独立。通用读取请求通过 `shared/hooks/useApiResource.ts` 取消过期请求，401 处理由调用方传入。
- ServiceLayout 统一真实服务页面的横向边距与区块间距；ServicePageHeader 共用标题、说明和可选返回链接。布局响应式样式留在 CSS Modules，不能用全局 main/nav 规则造成重复内边距。
- 真实服务布局不展示常驻的本地数据库连接或开发能力说明横幅；能力边界记录在文档。操作结果、错误与必要业务提示保留，独立入口与微前端共用同一布局。
- 设备列表和本人报修列表在 Ant Design `md` 断点以下（小于 768px）改用卡片；桌面保留表格，同一时间只渲染一种布局。CompactRecordCard 共用信息层级、字段排版和操作区域，业务数据和回调仍留在所属模块；本人分页继续由 URL 和服务端控制。

## 路由与样式

- `/tickets`：工单工作台；`/devices`：设备台账；`/records`：维修记录。
- 根地址和未知路由重定向到 `/tickets`。`?create=1` 表示打开报修入口，但只有演示报修用户可以显示该表单。
- 页面标题、说明和导航标签使用应用路由配置，避免散落多份。
- Ant Design 主题在 `app/theme.ts`；通知和弹窗通过 Ant Design App 上下文调用。
- 布局和业务自定义样式使用 CSS Modules；第三方类通过显式 `:global` 引用。组件内部样式优先用 Ant Design Token/属性调整。
- Tailwind 继续提供布局和间距工具类，未启用 Preflight；全局样式不承载具体业务页面结构。
- 微前端统一生产构建入口已提供本地静态资源、页面路由回退与 API 转发验证，见 MICRO_FRONTENDS.md；独立 Web 与门户部署仍需分别配置路由，尚未部署服务器。

## 新增功能的顺序

1. 先确认业务范围、角色数据范围、状态变化与验收方式。
2. 类型和规则放所属业务模块；已有通用方法直接复用。
3. 页面组合组件，输入状态留在最近的使用位置；只有真实的跨页面需求才提升状态。
4. 新的公共组件应有清楚职责；不为了减少行数拆每个标签，也不提前建设通用配置引擎。
5. 只回归受影响的关键规则和实际交互，更新验证记录。

## 验证方式

- `npm run build`：Web、API、门户与微前端类型检查及生产构建；RN 检查与导出单独执行。
- `npm run test:business`：5 项关键规则测试，使用 Node.js 24 执行可擦除 TypeScript，无额外测试编译器。
- `npm run verify:ui`：覆盖工单闭环、角色范围、路由刷新/前进后退、跨页数据保留、表单清理、设备详情离页清理和窄屏。脚本默认使用 Windows 已安装的 Edge，其他环境需调整浏览器配置。
- `npm run test:web-http` 验证传输及响应体超时、取消、错误状态和无自动重试；`npm run verify:web-http-ui` 验证登录错误、提交超时、离页取消、退出失败与读取超时恢复，截图见 [登录超时](screenshots/service-login-timeout.png)、[手机读取超时](screenshots/service-devices-timeout-mobile.png)。浏览器异常请求被拦截，计时使用加速时钟；真实 15 秒提交超时仍由 `verify:shared-ui` 检查。
- `npm run verify:shared-ui`：使用本地真实 API 核对五类提交弹窗的重复点击、Esc/遮罩关闭限制、401、实际超时、离页取消，以及真实第二页的 URL 筛选和手机分页。临时数据按本轮提交编号清理。
- 真实业务回归分别见 `verify:tickets[-ui]`、`verify:assignment[-ui]`、`verify:tasks[-ui]`、`verify:results[-ui]`、`verify:confirmations[-ui]`。共享种子账号的总数断言可能互相干扰，API 套件串行执行；不要通过放宽断言消除干扰。
- 缓存与浏览器临时数据保存在项目内 `.local` 目录，目录已配置忽略。

Web 演示阶段的构建、5 项关键规则及浏览器回归已通过；真实 API 验证范围记录在 `API_SETUP.md`，RN 原生认证、设备查询及公开页面浏览器验证记录在 `MOBILE.md`，不混用验证结论。尚未进行实体业务设备通信验证。
