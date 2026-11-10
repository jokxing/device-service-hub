# Next.js 设备服务门户

## 当前交付范围

`apps/portal` 使用 Next.js 16 App Router、React、TypeScript、Ant Design 和 CSS Modules。当前提供登录、授权设备列表、动态设备详情、文字报修、本人分页记录与详情、维修完成确认、退出及加载/错误/未找到页面；共用现有 NestJS API 和 PostgreSQL，不增加业务后端或数据库访问层。

门户只对报修用户开放。管理员与维修人员继续使用 React 后台；门户已贯通最小文字业务闭环，图片上传、退回和重新打开尚未接入。现有 React 用户入口保留为回归基线。设备仍为虚构样例，接口和数据库会话是真实实现，没有硬件通信。

需报价工单的本人详情支持报价查看、指定版本确认、拒绝原因提交与服务订单快照。维修员发布新版后，门户展示当前版供重新决定，并只读回看历史版及拒绝原因。决定由 NestJS 原子完成，个人数据 no-store，订单不代表付款；取消、开工和支付尚未开放，见 [维修报价与订单](QUOTES.md)。拒绝交互与状态回看执行 `verify:quote-rejections` 和 `verify:portal-quote-rejections`；新版展示、旧决定冲突和第 3 版订单验证使用 `verify:quote-revisions-ui`，不增加第二套业务后端。

新增 `features/quotes` 的服务端查询、确认交互与转发，以及 `features/orders` 的订单快照查询/展示；`app/api/tickets/[id]/quote/accept/route.ts` 只组装转发。报修、完成确认和报价确认共用 `features/auth/server/commands.ts` 的 `reporterPost`，保留调用方原 UUID 与版本，不跨应用导入后台 Hook 或绕过 NestJS。报价及订单条目展示在门户内部复用 `QuoteItems`。

相关增量执行 `verify:orders`、`verify:portal-quotes`，并回归 `verify:portal`、`verify:portal-tickets` 和 `verify:portal-confirmations`；共享种子账号套件串行运行。

## 目录职责

```text
apps/portal/
├─ next.config.ts
├─ .env.example
└─ src/
   ├─ app/
   │  ├─ layout.tsx、providers.tsx、globals.css
   │  ├─ login/page.tsx
   │  ├─ (service)/layout.tsx
   │  ├─ (service)/devices/page.tsx
   │  ├─ (service)/devices/[id]/page.tsx
   │  ├─ (service)/devices/[id]/repair/page.tsx
   │  ├─ (service)/devices/loading.tsx
   │  ├─ (service)/tickets/page.tsx、loading.tsx
   │  ├─ (service)/tickets/[id]/page.tsx
   │  ├─ api/auth/login/route.ts
   │  ├─ api/auth/logout/route.ts
   │  ├─ api/tickets/route.ts
   │  ├─ api/tickets/[id]/confirm/route.ts
   │  └─ error.tsx、not-found.tsx
   ├─ features/auth/
   │  ├─ api.ts（客户端登录与退出请求）
   │  ├─ components/（登录表单与退出按钮）
   │  └─ server/（会话读取与登录/退出适配）
   ├─ features/devices/
   │  ├─ components/（设备卡片与状态）
   │  └─ server/queries.ts
   ├─ features/tickets/
   │  ├─ api.ts（客户端报修与完成确认请求）
   │  ├─ components/（报修表单、记录卡片、详情、状态标签、确认操作与弹窗）
   │  ├─ server/（本人查询与提交适配）
   │  └─ constants.ts、types.ts、rules.ts、tickets.module.css
   ├─ features/quotes/
   │  ├─ api.ts（客户端报价确认请求）
   │  ├─ components/、server/（报价展示、确认与服务端适配）
   │  └─ types.ts、rules.ts、quotes.module.css
   ├─ features/orders/
   │  └─ components/、server/（订单快照展示与查询）
   └─ shared/
      ├─ components/（公共页头与布局样式）
      ├─ api/、hooks/（客户端请求与提交生命周期）
      ├─ utils/（日期与页码）
      └─ server/（内部请求、Cookie 配置与来源/JSON 检查）
```

页面只组合业务组件。`shared/server` 使用 `server-only`，不依赖业务模块；业务权限仍由 NestJS 决定。共享接口类型来自 `packages/contracts`，不跨工作区导入 Vite 页面、React Router、DOM 工具或身份上下文。

客户端业务请求集中在对应 `features/auth/api.ts`、`features/tickets/api.ts` 和 `features/quotes/api.ts`，统一维护门户接口路径、参数及返回类型，动态 ID 在该层编码。组件调用具名业务函数，继续负责表单、提交编号、版本与导航；`shared/api/http.ts` 只处理通用传输，不生成请求编号或自动重试。服务端查询与 NestJS 转发仍留在各模块 `server/`，内部地址和 Cookie 配置不进入客户端模块。

## 渲染、会话与缓存

- 设备列表、详情和用户身份由 Server Components 读取，授权内容出现在服务端 HTML 中。登录表单、退出按钮和错误重试为 Client Components；Ant Design 通过 Registry 注入服务端首屏样式。
- 现有 API Cookie `dsh_session` 的 Path 为 `/api`。门户使用独立名称 `dsh_portal_session`、Path `/`，值对应同一套 NestJS 数据库会话机制，不创建第二套身份库；后台 Cookie 的名称和路径不变，两种入口独立登录。
- 登录 Route Handler 检查准确的门户 Origin、JSON 类型和内容大小，再调用 NestJS 登录。成功后将后端会话设置为门户 HttpOnly、SameSite=Strict Cookie；令牌不写入浏览器存储、JSON 或 HTML。HTTPS 门户设置 Secure，本地 HTTP 验证不设置 Secure。
- 服务端只将门户会话转换为 NestJS 所需 Cookie。没有任意目标 URL、通用 API 代理或把浏览器全部 Cookie 转发到内部服务的逻辑。
- NestJS 继续检查写请求 Origin。默认配置仅增加准确的本地门户来源；根环境已有 `WEB_ORIGINS` 时也需显式加入门户来源，不能使用通配或关闭 Guard。
- 个人页面使用动态渲染，内部 fetch 显式 `cache: "no-store"`，认证响应也设置 no-store。React `cache` 只在一次服务端渲染内合并用户读取，不跨请求保存用户数据。
- 登录/退出成功后整页替换导航，清除客户端 Router 状态。退出必须先撤销后端会话，再清除门户 Cookie；失败保留反馈供重试，不声称已退出。
- NestJS 校验设备授权与账号状态；未登录或会话过期跳转登录。不存在和无权访问设备共用未找到页面。App Router 流式响应可能先发出 200，再以 not-found 标记呈现错误；不能仅靠流式页面的状态码判定授权成功。
- 非报修角色登录门户被拒绝，并撤销刚创建的会话。服务端查询还会核对角色，不能只通过隐藏按钮限制入口。

## 文字报修与本人记录

链路：**设备详情 → 发起报修 → 提交 → 管理后台分派与维修处理 → 本人详情确认完成 → 本人列表回看**。

| 门户入口 | 职责 |
| --- | --- |
| `/devices/[id]/repair` | 服务端读取授权设备，停用时不展示提交表单 |
| POST `/api/tickets` | 检查来源与会话，仅转交已有 NestJS 创建接口，不生成新提交编号、不添加报修人或状态 |
| `/tickets` | 服务端本人记录与 URL 分页，桌面双列卡片、手机单列；非法页码回退、超出末页重定向 |
| `/tickets/[id]` | 服务端本人详情，展示报修内容、处理进度与已有操作记录；可直达和刷新 |
| POST `/api/tickets/[id]/confirm` | 转交既有确认命令，保留 requestId、expectedVersion 和服务端状态码 |

- `RepairForm` 只管理输入、内容归一化和当前提交意图。标题 60 字符、描述 500 字符，优先级为普通/紧急；与既有接口约束一致，后端 DTO 仍负责运行时校验。
- `clientPost` 和门户自己的 `useApiMutation` 共用于登录、退出与报修，统一提交中状态、同步防重复进入、15 秒超时、卸载取消与错误反馈。业务提交编号留在表单，不在共享 Hook 或 Route Handler 生成。
- 同一规范化内容在当前表单中保留 UUID，响应丢失后重试沿用；修改内容生成新编号。转发保留首次创建 201、重放 200 和业务错误状态。服务端继续执行用户归属、设备授权/启用校验、唯一约束和事务，见 [TEXT_REPAIR.md](TEXT_REPAIR.md)。
- 没有自动重试写请求。请求取消不代表数据库回滚；刷新或重新打开表单会丢失原提交意图，结果不明时先查看本人记录。本轮不增加持久草稿、离线同步或附件。
- 创建成功整页替换至本人详情，避免沿用提交前的 Router 数据；提交时会话失效整页转至登录。本人记录查询不依赖设备当前授权，因此撤销设备授权不影响已有本人报修回看。
- `features/auth/server/resources.ts` 组合身份与资源异常处理，供设备/工单读取使用；`shared/server/request.ts` 供登录/报修校验来源与 JSON。权限规则不移入通用传输层。
- `PageHeader` 共用标题与返回按钮，ServiceLayout 统一横向边距。返回按钮在桌面标题右侧，手机换行；不通过全局选择器给页面重复添加边距。
- `PortalNavigation` 使用 Ant Design 横向 Menu，根据当前路径控制选中项，设备详情/报修表单归属“我的设备”，本人记录/详情归属“我的报修”。保持 Next Link 导航，只有导航本身为客户端组件。
- 门户导航与设备服务导航统一为透明背景、底部分隔线、灰色未选中文字与蓝色选中指示线；不包白色圆角卡片。Menu 外观优先使用 Provider Token，局部间距由门户布局 CSS Module 管理。

## 报修用户确认完成

- 本人详情仍由 Server Components 读取。仅 `TicketActions` 和确认弹窗为客户端交互，传入确认所需的公开字段，不把整页改为客户端请求。
- `canConfirmTicket` 统一入口展示条件：待确认、有处理结果、没有已有确认记录；权限与真实状态仍由 NestJS 独立校验，不信任前端按钮。
- Ant Design 确认框展示原维修说明和验收含义；取消不提交。提交中禁止关闭图标、遮罩、Esc、取消与重复点击，使用本应用 `MutationModal` 和 `useApiMutation`。
- 当前弹窗固定一个提交编号和原版本，响应丢失后重试沿用。门户转发层不生成编号、不覆盖版本、不自动重试，首次成功及同意图重放均保留 NestJS 的 201 语义。
- 确认成功整页读取当前详情，显示已完成、确认人与时间；列表查询同一条记录。冲突时保留弹窗提示，可取消并点击“刷新进度”核对，不覆盖他人已完成的操作。
- 详情路由和版本作为动作组件的 key；换对象、刷新或账号变化会清理旧弹窗。提交时 401 返回登录页。关闭重开会产生新意图，若先前结果不明应先刷新；取消请求不代表数据库回滚。
- 服务端校验报修人归属、版本、待确认状态和结果存在性，状态与确认记录在原事务中写入。终结状态不能撤销或重开，设备授权变化也不撤销本人历史确认权。完整规则见 [TICKET_CONFIRMATION.md](TICKET_CONFIRMATION.md)。
- 本轮只增加门户适配与界面，未修改 NestJS 业务、共享契约、数据库模型或迁移。

实现依据：[Next.js Cookie API](https://nextjs.org/docs/app/api-reference/functions/cookies)、[认证与授权边界](https://nextjs.org/docs/app/guides/authentication)、[fetch 缓存](https://nextjs.org/docs/app/api-reference/functions/fetch)。

## 本地运行

使用仓库根锁文件和 npm workspaces，不在门户单独生成锁文件。

1. 按 [API_SETUP.md](API_SETUP.md) 准备数据库与现有 API。保留原 `WEB_ORIGINS`，增加 `http://127.0.0.1:3000`，配置修改后重启 API。
2. 门户默认内部 API 为 `http://127.0.0.1:3001/api`，默认来源为 `http://127.0.0.1:3000`；需覆盖时参考门户 `.env.example` 创建被忽略的 `.env.local`。内部 API 地址不使用 `NEXT_PUBLIC_` 前缀。
3. 仓库根执行 `npm run dev:portal`，访问 `http://127.0.0.1:3000/login`。使用现有报修用户账号，凭据不写入公开文档。

```sh
npm run build:portal   # 门户类型检查与生产构建
npm run start:portal   # 启动已构建门户，本地 3000 端口
npm run verify:portal  # 需要门户与 API 已启动
npm run verify:portal-tickets  # 门户报修、重试、本人记录与分页
npm run verify:portal-confirmations  # 门户确认、防重、冲突与账号隔离
```

开发服务与生产启动共用 3000 端口，二者择一。根 `npm run build` 覆盖 Web、API 和门户。门户产物在 `apps/portal/.next`，已配置忽略，不提交生成目录、环境凭据、缓存或 `tsbuildinfo`。

当前 Windows 环境仍通过仓库 `scripts/npm-local.ps1` 执行 npm，缓存、临时文件与浏览器资料放 `.local`，Next.js 遥测通过进程环境关闭；不安装全局工具，不下载额外浏览器或字体。

## 验证范围

`verify:portal` 检查未登录深链接、真实登录/退出、Cookie 属性、服务端 HTML、no-store、跨用户设备隔离、伪造字段与 Origin 拒绝、非报修角色、会话过期、刷新及 390px 布局。仅操作本轮会话，定向清理，不修改设备、账号授权或人工工单。

`verify:portal-tickets` 使用本轮随机报修账号、授权和停用设备，覆盖字段校验、提交中重复点击、真实创建但响应丢失后的同意图重放、SSR 本人详情、11 条记录的第二页/刷新/前进后退、越界页码、来源与伪造字段拒绝、停用/越权设备、提交时会话失效和跨用户详情。截图包含临时验收记录，结束后按本轮用户及请求编号清理；不按标题批量删除人工数据。共享种子账号的认证异常套件与浏览器套件串行执行。

`verify:portal-confirmations` 通过真实接口生成本轮待确认工单，覆盖取消、手机弹窗、提交中关闭限制、响应丢失后的同意图重放、确认唯一记录与版本、SSR/列表/刷新、过期页面冲突、非法状态、来源、伪造字段、跨用户/跨角色和会话失效。临时工单与维修账号按随机编号清理；未使用 Mock 业务数据或修改人工工单。

2026-11-06：Web/API/门户生产构建、门户浏览器与 SSR 核对、现有 API 权限及 React 登录入口回归通过。截图见 [设备列表](screenshots/portal-devices.png)、[手机设备详情](screenshots/portal-device-detail-mobile.png)。验证环境为本地 Windows、现有 Edge 和独立 PostgreSQL；未部署，未验证 HTTPS 生产环境、RN 或真机。

同日文字报修增量：生产构建、门户报修异常与隔离回归、门户原入口回归、既有报修 API/React 报修界面和原演示界面检查通过；已核对桌面和手机截图。见 [手机报修](screenshots/portal-repair-mobile.png)、[本人记录](screenshots/portal-my-tickets.png)、[手机详情](screenshots/portal-ticket-mobile.png)。没有新增依赖、数据库迁移或 NestJS 业务接口。

同日确认增量：Web/API/门户构建、门户确认与报修回归、原确认 API/React 界面及演示界面回归通过。已检查 [手机确认框](screenshots/portal-confirmation-dialog-mobile.png) 和 [完成详情](screenshots/portal-completed-ticket-mobile.png)。这些是本地浏览器与真实 API 验证，不代表移动端真机或生产部署。
