# 本地登录与设备查询

真实链路包括：浏览器登录 → NestJS → PostgreSQL 会话与设备授权 → 设备查询 → 文字报修 → 首次分派 → 接单 → 文字处理结果 → 报修用户确认完成。退回与再次提交仍保留独立内存演示。规则见 [TEXT_REPAIR.md](TEXT_REPAIR.md)、[ADMIN_ASSIGNMENT.md](ADMIN_ASSIGNMENT.md)、[TECHNICIAN_TASKS.md](TECHNICIAN_TASKS.md)、[TASK_RESULTS.md](TASK_RESULTS.md)、[TICKET_CONFIRMATION.md](TICKET_CONFIRMATION.md)。

后端目录、Controller/Service/Guard 等职责，以及新增功能的放置约定见 [BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md)。

## 运行环境

- Node.js 24、npm 11。
- NestJS 11、Prisma 7 稳定版和 PostgreSQL 17。未使用 Prisma 8 预发布版本。
- PostgreSQL 程序、数据库文件、日志及测试账号说明保存在被忽略的 `.local`；不注册 Windows 服务。
- API 仅监听 `127.0.0.1:3001`，本项目数据库仅监听 `127.0.0.1:55432`；Vite 将 `/api` 代理到后端。
- Next.js 门户监听 `127.0.0.1:3000`，目前复用登录与设备查询。启用前在根 `WEB_ORIGINS` 中保留原来源并加入 `http://127.0.0.1:3000`，重启 API；门户独立 Cookie 和服务端转发规则见 [PORTAL.md](PORTAL.md)。

## 首次启动

1. 从 [PostgreSQL 官方 Windows 下载页](https://www.postgresql.org/download/windows/) 指向的 [EDB 二进制下载页](https://www.enterprisedb.com/download-postgresql-binaries)取得 PostgreSQL 17 的 Windows x64 压缩包。将其中的 `pgsql` 放在项目 `.local/postgres/runtime/` 下；运行所需 `bin`、`lib`、`share` 目录必须齐全。无需运行安装器或安装 pgAdmin。
2. 在仓库根目录安装依赖并初始化专用数据库：

   ```sh
   npm ci
   npm run db:local:setup
   npm run db:migrate
   npm run db:seed
   ```

3. 分别在两个终端启动：

   ```sh
   npm run dev:api
   npm run dev
   ```

当前 Windows 本地环境通过 `.\scripts\npm-local.ps1 run <脚本名>` 执行对应命令，保留项目内缓存与临时目录设置。

初始化脚本拒绝覆盖现有环境或未知数据目录。它生成随机数据库密码、随机种子账号密码、根 `.env` 和 `.local/private-docs/API_ACCOUNTS.md`，不会在控制台打印密码。四个本地测试账号为 `admin`、`reporter.a`、`reporter.b`、`technician`；共同测试密码见该私有说明。

`.env.example` 仅包含占位符。真实 `.env`、数据库文件和私有说明不得提交。种子脚本可以重复执行，已有用户、设备与授权记录不会被覆盖。

## 后续启动和停止

```sh
npm run db:local:start
npm run dev:api
npm run dev
```

结束开发时先停止 API，再用 `npm run db:local:stop` 停止本项目数据库；`npm run db:local:status` 查看状态。停止不删除数据。

`dev:api` 会先生成 Prisma Client 并编译，随后监听编译产物变化。修改后端源码后执行 `npm run build:api`，运行中的 API 会重新加载；当前没有额外安装全局 CLI。

## 入口与数据范围

下表描述 Vite 后台（本地 5173 端口）。Next.js 门户使用独立的 3000 端口，同名 `/devices`、`/tickets` 路径对应真实数据，入口与会话边界见 [PORTAL.md](PORTAL.md)。

| 路径 | 数据来源与用途 |
| --- | --- |
| `/login` | 真实账号登录 |
| `/service/devices` | 真实 API 和数据库设备查询，未登录跳转登录页 |
| `/service/tickets`、`/service/tickets/:id` | 本人真实报修列表与详情 |
| `/service/admin/tickets` | 管理员真实工单列表与首次分派 |
| `/service/tasks`、`/service/tasks/:id` | 当前维修人员任务与接单 |
| `/tickets`、`/devices`、`/records` | 原有工单与设备演示，保留角色切换和刷新重置 |

两种入口的身份相互独立。演示角色下拉框不能改变服务端登录身份。

- 管理员可以读取两台种子设备。
- `reporter.a` 仅授权 `AC-001`；`reporter.b` 仅授权 `WP-002`。
- 维修人员通过独立任务接口查询当前分派给自己的工单，并按状态与版本接单；任务详情提供必要设备摘要，不开放管理员或本人报修接口。独立设备台账权限本步维持原有范围，种子维修账号的设备列表仍为空。
- 服务端使用数据库用户 ID 与授权关系过滤列表及详情；未授权与不存在的设备都返回 404，避免泄漏设备是否存在。

## 接口与安全边界

| 方法 | 路径 | 行为 |
| --- | --- | --- |
| POST | `/api/auth/login` | 校验账号密码，写数据库会话，设置 HttpOnly Cookie |
| GET | `/api/auth/me` | 根据当前有效会话返回公开用户资料 |
| POST | `/api/auth/logout` | 删除当前会话，清理 Cookie |
| GET | `/api/devices` | 返回当前用户可见的设备 |
| GET | `/api/devices/:id` | 返回授权范围内的设备详情 |

密码使用独立随机盐与 scrypt；数据库只存密码哈希。会话使用随机令牌，数据库存令牌摘要和过期时间；Web 响应正文不包含令牌或密码哈希。Cookie 使用 HttpOnly、SameSite=Strict，修改请求还校验 Origin；生产环境配置启用 Secure，但当前只验证本地 HTTP。

每次查询检查会话过期时间和账号启用状态。客户端提交角色、伪造用户头或更换设备 ID 均不能扩大访问范围。公开设备响应不包含授权名单。

接口类型位于 `packages/contracts`，根入口只输出传输类型，`device-tags` 子入口包含纯设备标签协议；不导出 ORM 模型、密码、内部会话记录或 Web UI。Prisma Client 自动生成在 `apps/api/src/generated`，不提交生成产物。

### 原生客户端接口

RN 使用不透明 Bearer，凭据存 SecureStore；复用既有会话表与业务服务。原生控制器拒绝浏览器 Origin、Cookie 和 Fetch Metadata，既有 Web 继续 Cookie/Origin 策略。模拟器通过 ADB reverse 连接本机 3001，不开放局域网服务。

| 能力 | 原生接口 | 服务边界 |
| --- | --- | --- |
| 会话 | /api/mobile/auth/login、me、logout | AuthService |
| 授权设备 | GET /api/mobile/devices、/:id | DevicesService |
| 报修与本人记录 | POST /api/mobile/tickets；GET /mine、/:id | TicketsService |
| 用户确认 | POST /api/mobile/tickets/:id/confirm | TicketConfirmationsService |
| 维修任务与接单 | GET /api/mobile/tasks、/:id；POST /:id/accept | TaskTicketsService |
| 文字处理结果 | POST /api/mobile/tasks/:id/result | TaskResultsService |

相对路径均基于同一行的完整前缀，接口复用各业务现有 DTO；不增加移动端专用表。启动、原生验证命令与模拟器/真机边界集中维护于 [MOBILE.md](MOBILE.md)。

## 验证

启动数据库、API 和 Web 后：

```sh
npm run build
npm run test:business
npm run verify:api
npm run verify:connected-ui
npm run verify:ui
```

- `verify:api` 访问真实 API，并临时验证会话过期和种子账号停用；只允许针对本项目本地数据库，账号状态在 finally 中恢复。
- `verify:connected-ui` 使用现有 Edge 检查登录、详情、刷新、账号切换、四账号数据范围、退出及窄屏；支持通过 `DSH_BROWSER_PATH` 指定现有浏览器，不自动下载。
- `verify:ui` 回归原有演示流程，`test:business` 验证已有工单纯规则。
- `verify:api` 在 `.local` 保存一个待复核会话。重启 API 和数据库后执行 `npm run verify:api:restart`，检查会话及授权设备仍可读取；复核后撤销测试会话并删除临时文件。

已实现文字报修、本人查询、首次分派、维修任务/接单、文字结果和用户确认完成；RN 已接入原生鉴权、扫码入口、文字闭环与工单现场照片，见 [MOBILE.md](MOBILE.md) 和 [TICKET_PHOTOS.md](TICKET_PHOTOS.md)。尚未实现设备维护、用户管理、Web 上传与门户附件界面、改派、退回/再次提交、报价或支付。自动化检查不等于用户已完成人工验收，也不代表生产部署。

设备查询链路为“设备页面 → devicesApi → SessionGuard → DevicesService → Prisma”。数据范围进入服务端查询条件，列表与详情复用同一授权策略；前端角色展示不构成访问控制。

## 实际验证记录

2026-11-05：Web 与 API 构建通过；原有 5 项关键业务规则测试通过；真实 API 的未登录、输入校验、来源校验、跨用户读取、伪造角色、退出、过期与停用检查通过；真实入口和原有演示的浏览器回归通过。API 与 PostgreSQL 均实际停止并重新启动，重启前的会话及其授权设备仍可读取，随后测试会话已撤销。

截图为现有 Windows Edge 自动化核对结果。用户人工验收、RN、独立手机安装包和真实硬件联调尚未进行。本阶段没有部署或执行 Git 操作。
