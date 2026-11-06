# Web 结构与维护约定

本说明描述 Web 组织方式。完整工单流程保留内存演示；真实服务入口已连接 NestJS、PostgreSQL，实现登录、设备查询、文字报修和本人记录，运行方式见 [API_SETUP.md](API_SETUP.md)、[TEXT_REPAIR.md](TEXT_REPAIR.md)。RN 尚未实施。

本文件解释现有结构与设计取舍；AI 协作执行规则见根目录 [AGENTS.md](../AGENTS.md)，避免重复维护多套规范。

管理员真实列表与首次分派使用 `/service/admin/tickets`，详情字段复用 TicketRecordDetails，列表/分派/详情弹窗分别组织。服务端权限和事务规则见 [ADMIN_ASSIGNMENT.md](ADMIN_ASSIGNMENT.md)，演示身份不参与管理接口授权。

后续按 [产品与架构演进路线](ROADMAP.md)依次推进 React 后台业务闭环、Next.js 用户门户、RN 和微前端。保留现有 Web 后台与 NestJS，门户和移动端到阶段才创建；不将全部 Web 迁移到 Next.js。

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

## 状态与数据流

```text
App → DemoProvider → AppLayout → 页面 → 业务组件
                    ↓          ↓
               演示账号      useDemoTickets → 纯业务规则 → 更新内存数据
```

- DemoProvider 保存演示角色和工单，跨页面导航保留，浏览器刷新后恢复样例。
- `useDemoTickets` 是演示数据适配入口，页面不直接修改 fixtures。将来接真实 API 时替换数据入口，纯规则和呈现组件尽量保留。
- 过滤后的工单、统计和可见设备根据当前数据计算，不另外存一份可变状态。
- 工单筛选和分页通过 URL 参数管理，支持前进后退；无效状态、页码会回退。输入关键词替换当前历史项，避免每个字符都产生一条历史记录。
- 表单字段、附件选择、处理说明归弹窗本地管理；关闭后销毁，重新打开不残留输入。
- 详情、分派对象归对应页面管理。页面路径或角色变化时卸载页面内容，清除原页面弹窗。设备详情也使用受控组件，避免全局弹窗跨页残留。
- 展示动作和演示操作均调用 `canTransition`，避免多处维护不同的迁移规则。

演示角色和工单归属依赖虚构账号姓名，仅用于 UI 演示。真实设备入口使用独立的 SessionProvider、Cookie 会话、数据库用户 ID 和授权关系，不读取演示账号。前端规则不构成授权保障；未来工单接口仍需服务端状态约束、事务、幂等和并发校验。

## 真实设备服务入口

- `/login` 和 `/service/devices` 由独立会话 Provider 管理，登录后加载真实设备列表及详情；Effect 使用 AbortController 清理请求，账号变化后清除旧数据。
- `features/auth` 负责会话与登录 API，`features/devices/api.ts` 负责设备请求，`shared/api/http.ts` 统一处理传输和错误。
- 设备表格与详情组件复用展示结构，演示数据和真实响应在类型上分开，不伪造尚未实现的维修记录。
- 前后端实际共用的传输类型位于 `packages/contracts`；包只包含类型声明，不依赖数据库或浏览器运行时。
- ServiceLayout 管理真实身份和服务导航，增加 `/service/tickets` 及本人详情路由；字段组件在演示/真实表单之间复用，提交逻辑保持独立。通用读取请求通过 `shared/hooks/useApiResource.ts` 取消过期请求，401 处理由调用方传入。
- ServiceLayout 统一真实服务页面的横向边距与区块间距；ServicePageHeader 共用标题、说明和可选返回链接。布局响应式样式留在 CSS Modules，不能用全局 main/nav 规则造成重复内边距。
- 设备列表和本人报修列表在 Ant Design `md` 断点以下（小于 768px）改用卡片；桌面保留表格，同一时间只渲染一种布局。CompactRecordCard 共用信息层级、字段排版和操作区域，业务数据和回调仍留在所属模块；本人分页继续由 URL 和服务端控制。

## 路由与样式

- `/tickets`：工单工作台；`/devices`：设备台账；`/records`：维修记录。
- 根地址和未知路由重定向到 `/tickets`。`?create=1` 表示打开报修入口，但只有演示报修用户可以显示该表单。
- 页面标题、说明和导航标签使用应用路由配置，避免散落多份。
- Ant Design 主题在 `app/theme.ts`；通知和弹窗通过 Ant Design App 上下文调用。
- 布局和业务自定义样式使用 CSS Modules；第三方类通过显式 `:global` 引用。组件内部样式优先用 Ant Design Token/属性调整。
- Tailwind 继续提供布局和间距工具类，未启用 Preflight；全局样式不承载具体业务页面结构。
- 部署时需要为三个前端路由配置 HTML 回退；当前仅验证 Vite 本地服务，未部署。

## 新增功能的顺序

1. 先确认业务范围、角色数据范围、状态变化与验收方式。
2. 类型和规则放所属业务模块；已有通用方法直接复用。
3. 页面组合组件，输入状态留在最近的使用位置；只有真实的跨页面需求才提升状态。
4. 新的公共组件应有清楚职责；不为了减少行数拆每个标签，也不提前建设通用配置引擎。
5. 只回归受影响的关键规则和实际交互，更新验证记录。

## 验证方式

- `npm run build`：TypeScript 和生产构建。
- `npm run test:business`：5 项关键规则测试，使用 Node.js 24 执行可擦除 TypeScript，无额外测试编译器。
- `npm run verify:ui`：覆盖工单闭环、角色范围、路由刷新/前进后退、跨页数据保留、表单清理、设备详情离页清理和窄屏。脚本默认使用 Windows 已安装的 Edge，其他环境需调整浏览器配置。
- 缓存与浏览器临时数据保存在项目内 `.local` 目录，目录已配置忽略。

Web 演示阶段的构建、5 项关键规则及浏览器回归已通过；新增真实 API 链路的实际验证范围单独记录在 `API_SETUP.md`，不混用验证结论。尚未进行 RN 或实体业务设备验证。
