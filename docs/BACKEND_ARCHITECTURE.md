# 后端结构与维护约定

后端使用 NestJS 11 + Prisma 7 + PostgreSQL，采用业务模块内分层的单体结构。当前已贯通登录、授权设备查询、文字报修、首次分派、接单、处理结果及用户确认完成。运行方式见 [API_SETUP.md](API_SETUP.md)，业务规则见 [TEXT_REPAIR.md](TEXT_REPAIR.md)、[ADMIN_ASSIGNMENT.md](ADMIN_ASSIGNMENT.md)、[TECHNICIAN_TASKS.md](TECHNICIAN_TASKS.md)、[TASK_RESULTS.md](TASK_RESULTS.md)、[TICKET_CONFIRMATION.md](TICKET_CONFIRMATION.md)。AI 协作入口为根目录 [AGENTS.md](../AGENTS.md)。

## 目录职责

```text
apps/api/
├─ prisma/
│  ├─ schema.prisma
│  └─ migrations/
├─ prisma.config.ts
└─ src/
   ├─ main.ts
   ├─ app.module.ts
   ├─ config/
   │  └─ env.config.ts
   ├─ common/
   │  ├─ decorators/current-user.decorator.ts
   │  ├─ middleware/response-headers.middleware.ts
   │  └─ types/authenticated-request.type.ts
   ├─ database/
   │  ├─ database.module.ts
   │  ├─ database.service.ts
   │  └─ seed.ts
   ├─ modules/
   │  ├─ auth/
   │  │  ├─ auth.module.ts
   │  │  ├─ auth.controller.ts
   │  │  ├─ auth.service.ts
   │  │  ├─ auth.select.ts
   │  │  ├─ dto/login.dto.ts
   │  │  ├─ guards/
   │  │  ├─ constants/
   │  │  ├─ types/
   │  │  └─ utils/
   │  ├─ tickets/（Controller、Service、DTO、投影、常量与纯工具）
   │  └─ devices/
   │     ├─ devices.module.ts
   │     ├─ devices.controller.ts
   │     ├─ devices.service.ts
   │     ├─ devices.select.ts
   │     ├─ native-devices.controller.ts
   │     └─ dto/resolve-device.dto.ts
   └─ generated/prisma/
```

目录对应现有职责，不预建支付或空的 Filter、Interceptor、Repository。

| 层或机制 | 职责与边界 |
| --- | --- |
| `main.ts` | 启动、注册解析器/中间件/全局校验、监听端口；不写内联业务逻辑 |
| `app.module.ts`、业务 Module | 组织依赖注入、注册控制器和 Provider、显式导出跨模块能力 |
| Controller | 路由、入参、HTTP 状态和 Cookie；调用服务，不查询数据库或计算授权条件 |
| Service | 用例、数据归属、业务约束、事务边界；不接收 Express Request/Response |
| DTO | 请求的运行时校验；前后端共享接口不能代替 DTO 校验 |
| Guard | Origin 与会话访问检查；在控制器方法执行前拦截请求 |
| Middleware | 通用请求/响应处理；当前包括框架解析器和独立响应头函数 |
| 参数装饰器 | 从已认证请求读取用户，不从客户端字段推断身份 |
| DatabaseService | Prisma 连接及生命周期；不承载具体业务权限 |
| `.select.ts` | 所属模块的数据库字段白名单；复用查询投影，控制敏感字段输出 |
| `config` | 环境配置读取和校验，不在业务文件里重复解析环境变量 |
| `common` | 跨模块的通用能力，不依赖具体业务模块 |

业务常量、内部类型和工具归所属模块。会话 Cookie 名称和时长在 `auth/constants`，令牌与 Cookie 操作在 `auth/utils`，查询字段在 `auth.select.ts`，不再混放在一个类型文件内。

## 请求处理链

受保护设备请求的主要路径：

```text
JSON/Cookie 解析、响应头中间件
  → OriginGuard
  → SessionGuard（读取 Cookie、校验数据库会话、设置 actor）
  → 参数解析与适用的 Pipe / CurrentUser
  → DevicesController
  → DevicesService（构造当前用户的数据范围）
  → Prisma → PostgreSQL
```

登录请求通过 DTO 校验后进入 AuthService；它不要求已有会话。Controller 只负责把内部创建结果转换为公开响应并设置 HttpOnly Cookie。

- `@CurrentUser()` 只读取 Guard 写入的 actor，缺少 actor 时拒绝请求，不能代替 `SessionGuard`。
- Controller 不使用客户端的角色或用户 ID 决定身份。
- 设备列表和详情使用同一个数据范围函数；授权条件进入数据库查询，不先读取所有数据再在前端过滤。
- 不存在和未授权设备维持相同的 404 行为。
- Cookie 创建与清理复用相同路径和安全选项，令牌摘要方法也复用统一定义。

NestJS 的 Interceptor 用于调用前后处理，Exception Filter 用于异常响应处理。目前沿用框架异常机制；出现明确需求后再加入对应实现，不把所有横切逻辑塞进 Middleware。

## 数据访问与事务

用户确认由 TicketConfirmationsService 承担，复用 TicketsService 的报修角色和归属读取。在同一事务内确认结果存在、版本匹配且无已有确认，再写入 completed 状态与 TicketConfirmation。本人详情使用单独投影返回当前版本，列表投影保持不变，规则见 [TICKET_CONFIRMATION.md](TICKET_CONFIRMATION.md)。

文字结果提交由 TaskResultsService 承担，复用 TaskTicketsService 的当前角色/归属查询，在一个事务中更新 processing → confirming 并创建 TicketResult。规范化说明、工单及原版本参与重放核对，规则见 [TASK_RESULTS.md](TASK_RESULTS.md)。现有接单用例保持独立，不抽象通用状态修改服务。

维修人员查询与接单由 TaskTicketsService 承担。列表、总数、详情与命令均按当前 assigneeId 过滤，接单在一个事务内完成版本条件更新及 TicketAcceptance 记录写入。接单人与时间统一来自审计关系；命令编号/版本及状态分页校验由业务 DTO 复用，不向维修人员暴露管理员响应，规则见 [TECHNICIAN_TASKS.md](TECHNICIAN_TASKS.md)。

管理员首次分派由独立 AdminTicketsService 承担，复用工单模块查询投影与序列化。一次事务完成版本条件更新、维修人员有效性锁定和 TicketAssignment 审计写入；重复提交与竞争规则见 [ADMIN_ASSIGNMENT.md](ADMIN_ASSIGNMENT.md)。不开放通用状态 PATCH 接口。

当前 Service 直接使用 Prisma，规模足够清晰，不要求每个模块机械增加 Repository。

`modules/quotes` 承担报价读取、首版提交和被拒绝后的修订，独立组织 Controller、Service、DTO 和查询投影。首次与修订复用发布用例；工单条件更新、报价及条目在同一事务写入，新版追加而不覆盖。来源版次、当前分派及工单版本决定是否可修订；发布重放返回原 UUID 的具体版次。历史读取复用现有数据范围，金额由服务端计算。TaskResultsService 限制未开工报价型任务提交结果，Web/原生适配共用约束。规则及增量迁移见 [QUOTES.md](QUOTES.md)。

`modules/orders` 承担本人报价确认、订单快照及分页列表/独立详情读取，DTO、查询投影、序列化分开组织；一次事务更新报价状态、工单版本并创建唯一订单及条目。报价与订单读取复用工单模块内的 `ticketReadScope`，不把管理员范围用于本人入口。`OrderCancellationsService` 单独管理本人待开工订单取消：原工单版本条件更新、工单/订单终态及取消审计在同一事务，重放重新校验归属，保留原报价和金额快照。OrderStartsService 负责当前维修员开工，订单 awaiting_start → in_progress、工单版本和开工审计同事务；与取消竞争同一工单行，重放重新检查当前分派。OrdersModule 导出 OrderFulfillmentService，工单结果/完成确认用例传入原事务客户端，在锁定工单行后同步订单待确认/完成；由订单模块维护订单状态规则，不另开事务或重复写审计。支付模块见下节，真实支付未接入。

`modules/quotes/quote-rejections.service.ts` 承担本人拒绝报价，独立 DTO 校验原因与指定版次，事务更新报价、工单版本和拒绝审计。与订单确认竞争同一工单行，原 UUID 重放重新校验归属并返回具体报价；不以拒绝变更工单维修状态或创建订单。

订单列表使用独立 OrdersQueryDto 与最小摘要投影，详情复用工单公开字段投影；行与总数使用相同 ticketReadScope，在 RepeatableRead 中按确认时间/ID 稳定排序。响应不输出内部 UUID 意图、原版本或 ORM 字段。

modules/payments 负责模拟支付单 DTO、最小查询投影、当前报修归属和订单金额快照；事务中先锁定工单再核对订单/意图。PaymentsModule 仅导出 PaymentLifecycleService，供取消用例传入原事务关闭待支付记录，不另开事务。管理员/本人可读，维修员不开放；没有支付 SDK、回调或外部渠道适配。

出现重复复杂查询、可独立维护的数据访问职责时，可增加模块内部 Repository。业务流程和授权决策仍属于 Service；Repository 不接受 HTTP 对象，不反向调用 Controller。

文字报修由 Service 在事务中检查设备授权和启用状态后插入工单，唯一约束保证并发防重；查询投影、摘要和序列化各有明确文件。未来涉及更多表更新时仍由一个用例确定事务边界，不能让多个 Repository 各自提交，造成部分成功。

数据库模型和迁移归 `prisma/`。接口投影归业务模块，公开传输类型归 `packages/contracts`；该包不输出 Prisma 模型、密码哈希、会话令牌或授权名单。

## TypeScript 与依赖约定

- DTO 使用 class 和验证装饰器，并可 `implements` 共享请求接口，兼顾运行时校验与编译期约束。
- 普通类型使用 `import type`；参与 NestJS 运行时反射的 DTO、注入的 Service、Module 和 Guard 必须保留值导入，不能机械改成类型导入。
- Controller 的公开结果和 Service 的关键结果使用明确的返回类型。
- 查询字段使用 `as const satisfies Prisma.<模型>Select` 检查，不重复维护相同白名单。
- `common` 可以依赖共享传输类型，不能依赖 `modules/auth` 等具体模块。业务模块通过 Module 导出能力协作，不直接修改其他模块状态。
- 不引入 BaseService、通用 Repository、微服务或事件总线来包装当前几个简单接口。

## 修改与验证

1. 新功能先明确接口、角色数据范围、状态约束及异常分支，再放入所属模块。
2. 结构移动后更新所有导入，包括种子脚本；清理旧编译产物，避免误运行旧路径代码。清理只允许本项目 `apps/api/dist`，不能触及数据库数据目录。
3. 执行 `npm run build`，然后对独立本地数据库执行 `npm run verify:api`，真实页面调用链执行 `npm run verify:connected-ui`。
4. 仅在业务规则变化时补充关键测试，不为文件搬迁堆重复测试。接口、身份来源和返回字段没有授权不得顺带更改。
5. 同步架构、启动文档和 AI 入口规范；公开文档不记录本机凭据或个人盘符。

当前 Windows 环境通过 `.\scripts\npm-local.ps1 run <脚本名>` 执行命令，继续使用项目内缓存和临时目录。

## 验证记录

2026-11-06：结构整理后，Web/API 构建、真实 API 权限与会话检查、真实设备入口浏览器回归均通过。响应头校验覆盖了提取后的中间件；浏览器检查覆盖登录、设备详情、四账号数据范围、刷新和退出。数据库 Schema、迁移历史和接口路径未修改，没有新增业务接口。

## 原生客户端传输

`/api/mobile/auth/*`、`/api/mobile/devices/*`、`/api/mobile/tickets/*` 与 `/api/mobile/tasks/*` 是 RN 的专用控制器，复用 AuthService、DevicesService、TicketsService、TicketConfirmationsService、TaskTicketsService、TaskResultsService 与现有数据表。NativeSessionGuard 读取不透明 Bearer、调用现有认证逻辑并注入 actor；服务层继续独立约束设备归属。

OriginGuard 仅对明确标注 NativeClient 的控制器使用原生传输约束，拒绝 Origin、Cookie 与 Fetch Metadata 标头；其他 Web 接口仍使用原 Cookie/Origin 策略，不接受 Bearer 替代 Cookie。原生登录返回的短期凭据仅存 SecureStore，数据库保留摘要；注销可重复调用并撤销会话，不额外创建移动端用户或业务表。原生传输不能证明设备真实性。

验证命令与模拟器范围见 [MOBILE.md](MOBILE.md)。

扫码查询使用 GET `/api/mobile/devices/resolve?code=...`，静态路由在 `:id` 前声明。Controller 只校验 DTO 并转交 DevicesService；设备编号查询复用列表/详情的角色数据范围和公开投影，不额外授予设备访问权，不增加数据库表。未知设备和越权设备统一 404，Web Cookie/Origin 约束保持不变。

现场照片使用工单模块内 `attachments/`，Controller、TicketPhotosService、PhotoStore 分工；附件表元数据与随机文件键分离，图片目录不开放静态访问。状态/数量在工单行锁内核对，幂等 UUID 与原始内容摘要绑定；文件失败清理和数据库/文件系统的崩溃边界见 [TICKET_PHOTOS.md](TICKET_PHOTOS.md)。

Web 管理员照片只读路由位于 AdminTicketsController，沿用 SessionGuard。AdminTicketsService 先执行既有管理员限制，再复用 TicketPhotosService 读取元数据与图片；不增加上传路由，不复制附件授权和文件逻辑，也不改变原生传输约束。


## 模拟支付与退款边界

modules/payments 按用例拆分 PaymentsService、PaymentLifecycleService、RefundRequestsService 和 RefundCompletionsService。创建/查单/确认负责支付意图与终态，Lifecycle 在调用方事务中处理取消联动与超时关闭；退款申请与处理使用独立记录，不覆盖原支付事实。DTO、查询白名单和序列化各自维护，内部意图与数据库实体不直接暴露。

创建由本人执行，金额来自订单快照；管理员查询并处理模拟退款，维修员无金融接口权限。本人归属、管理员角色、状态与金额均由服务端校验。订单写操作与支付/退款竞争同一工单行锁；退款完成、工单/订单结束与取消审计同事务，重复意图核对固定目标。模拟成功不是外部支付回调。

支付时间按 UTC 保存，API 新单的截止时间精确为创建后 900000ms，数据库默认值显式 UTC；超时关闭采用访问时处理，没有定时任务。规则、迁移与验证命令统一见 [QUOTES.md](QUOTES.md)，不新增微服务、渠道 SDK 或收费资源。
