# AI 协作与工程规范

适用于本仓库。修改前阅读本文、[结构与维护约定](docs/ARCHITECTURE.md)和目标模块。当前用户明确指令优先；已授权步骤内正常推进，不反复请求确认。

后端任务同时阅读 [后端结构与维护约定](docs/BACKEND_ARCHITECTURE.md)，运行环境见 [API_SETUP.md](docs/API_SETUP.md)。

## 范围与技术栈

- 阶段顺序遵循 [ROADMAP.md](docs/ROADMAP.md)：React 后台业务闭环 → Next.js 用户门户 → RN 客户端 → 微前端。保留现有 React 后台和 NestJS 后端；新应用到对应阶段经确认再创建，不同时铺开。
- 每次只完成当前确认的一步。范围外的问题先说明，不顺带扩建系统。
- 沿用 React、TypeScript、Vite、React Router、Ant Design、Tailwind CSS、CSS Modules、npm workspaces 和根锁文件。
- 未获当前任务明确授权，不更换技术栈、重组目录、添加状态库或组件库、批量升级依赖。
- 当前包含 Web 完整流程演示，以及 NestJS + PostgreSQL 的最小文字业务闭环。RN 已接入原生登录、SecureStore 会话恢复、授权设备查询、文字报修、本人记录、确认完成及维修任务查询/接单、文字处理结果；RN 已支持待分派工单补充现场照片；微前端已接入 React 工单后台、Vue 设备台账与最小导航通信；Web 上传与门户附件界面、改派、退回/再次提交和支付尚未实现，不提前扩展范围。
- Git 提交、推送、部署和仓库可见性修改需要明确授权。
- `apps/portal` 已交付登录、授权设备查询、文字报修、本人记录与完成确认，修改前阅读 [PORTAL.md](docs/PORTAL.md)。使用 App Router；Server Components 负责设备/本人记录查询，Client Components 承担表单与确认交互。图片上传、RN 与微前端仍需按步确认。
- 不读取无关项目或私有业务资料，不复制来源或授权不明确的代码与素材。
- 移动端任务阅读 [MOBILE.md](docs/MOBILE.md)。使用 Expo SDK 57 兼容依赖与 Expo Router；src/app 只组装路由，业务页面留 features，原生颜色/字号/间距留 shared/theme。保留现有 Web React 版本，不全局替换 React 或把 Web 组件/CSS/存储直接搬入 RN。
- RN 业务接口路径和传输类型集中在对应 `features/<业务>/api.ts`；页面使用业务 Hook，Hook 保持读取取消与账号切换清理。共享请求只负责传输，不认识设备或工单。会话 Provider 提供统一鉴权读取与写入入口，业务 API 通过参数使用它，不自行读取或保存凭据。
- RN 角色名称使用 `shared/constants/roles.ts`，页面专属说明留在业务模块；可复用视觉变量使用 `shared/theme.ts`。模块较小时平铺，文件增多后按实际职责细分，不预建空目录、万能工具文件或跨端 UI 抽象。

## 目录与复用边界

- `App.tsx` 只组装路由和 Provider；`layouts` 负责外壳；`pages` 负责页面组合与页面级交互。
- `features/<业务>/` 保存该业务的组件、类型、常量、Hook 和纯规则。按职责拆分，不把多个页面和弹窗重新塞入一个组件，也不机械拆每个标签。
- `shared` 只放跨业务通用内容，不能反向依赖页面、布局、业务模块或演示数据。
- 状态标签、优先级、字段长度、附件限制使用统一定义；修改前先搜索已有常量、组件和方法。
- 通用方法按日期、文件、CSV 等职责分别存放，不建立混杂的大 `common.ts` 或 `utils.ts`。工单迁移留在 `ticketRules.ts`，设备授权留在 `deviceRules.ts`。
- 公共函数使用显式参数，不依赖可变全局变量、隐藏页面状态或演示账号。
- 真实写操作复用 useApiMutation 与 MutationModal；业务提交编号、参数与校验留在各操作组件。共享 Hook 不自动重试写请求，取消请求不等于数据库回滚。
- 分页工单列表复用 ResponsiveRecordList；列定义、卡片字段与角色动作留在业务组件。工单摘要和状态筛选属于 features/tickets，不移入 shared。
- 类型导入使用 `import type`，保持 TypeScript strict，不用 `any`、忽略检查或放宽配置掩盖问题。
- `demo` 隔离账号、fixtures、内存状态与演示适配；组件不直接修改 fixtures。
- `apps/api` 按业务模块组织控制器、服务与鉴权，数据库迁移在 Prisma 目录；`packages/contracts` 根入口仅输出传输类型；`device-tags` 子入口提供 Web/RN 共用的纯设备标签协议，不暴露 ORM 实体、密码或内部会话记录。真实设备入口不使用演示角色作为身份来源。
- Web 的公共目录不等于跨端包；DOM、下载、导航、存储与设备能力分别实现，有实际共享需求再提取契约或纯规则。
- 门户不跨应用导入后台页面或 Hook；共用 contracts。门户内部请求与 Cookie 配置留在 server-only 模块；不直接访问数据库，不复制 NestJS 授权和业务事务。

## React 与业务状态

- 新页面注册真实路由，不在 `App.tsx` 中通过条件分支模拟页面。
- 状态靠近使用位置，真正跨页面共享的数据再提升；不保存可直接计算的筛选结果、统计或动作状态。
- 现有筛选与分页使用 URL，保留直达、刷新和前进后退。
- 表单字段、图片选择和处理说明归弹窗管理；关闭、换对象、离页或切换角色时清理，避免上一账号内容残留。
- 使用明确 props 与回调，不大量透传 setter，不用无类型事件总线连接组件。
- Effect 用于外部同步，管理依赖和清理，不替代普通计算与用户事件。
- UI 动作与操作入口复用同一份纯业务规则，不各写一套状态判断。
- 前端角色切换和规则仅为演示；真实后端必须独立执行鉴权、数据归属、状态校验、事务、幂等和并发控制。

## UI 与样式

- 真实服务页面共用 ServicePageHeader；页面横向边距由 ServiceLayout 统一负责。全局不能为 main、nav、h1 添加特定页面的响应式规则，避免嵌套缩进和其他应用受影响。
- 业务控件优先复用 Ant Design；主题在 `app/theme.ts`，公共字号和文字色在 `styles/tokens.css`。
- 正文以 14px 为基准，辅助说明优先 13px，次要元数据 12px；不能把业务说明缩回 8～10px。装饰性品牌字和图标单独处理。
- Tailwind 处理适合的布局和间距，复杂局部样式用 CSS Modules。全局样式只保留基础约定，不堆具体页面选择器。
- 第三方组件优先使用 Token/属性调整，必要的局部第三方类引用使用显式 `:global`；不做广泛内部样式覆盖。
- 保留不启用 Preflight 的配置。字号变化同时检查换行、对比度、对齐和窄屏，不缩字掩盖布局问题。

## 后端分层

- 业务模块放在 `apps/api/src/modules`；Controller 负责 HTTP，Service 负责用例、授权范围与事务，DatabaseService 只管理 Prisma 连接。
- `common` 放通用装饰器、中间件和请求类型，不反向依赖业务模块；模块内部常量、工具、DTO、Guard 和查询投影分别组织。
- 参数用 DTO 做运行时校验；`@CurrentUser()` 读取 SessionGuard 校验后的用户，不能把装饰器当成认证或信任客户端角色。
- 类型文件不混放常量与可执行函数；相同数据库字段白名单、令牌摘要及 Cookie 选项统一复用。
- NestJS 依赖运行时反射的 DTO 和可注入类保留值导入，不能机械使用 `import type` 导致校验或注入失效。
- Repository 按实际复杂度提取，事务边界由业务用例确定，不增加只转发 Prisma 的通用基础层。
- 文件移动同步调整种子脚本和所有导入，并清理本项目旧编译产物；无明确授权不改变接口契约、数据库结构或迁移历史。

## 环境、验证与交付

- 不安装全局工具或擅改系统环境；缓存、临时文件和浏览器数据放项目 `.local`，遵守用户指定的磁盘限制。
- 当前 Windows 本地命令通过 `.\scripts\npm-local.ps1` 调用 npm，保留其进程级缓存与临时目录设置。
- 源码变更执行 `run build`；规则变更执行 `run test:business`；UI/样式/路由变更执行 `run verify:ui` 并查看受影响截图。浏览器核对需先启动本地服务，使用现有 Edge，不自动安装浏览器。
- 真实 API 或认证链路变更执行 `run verify:api`，对应 Web 入口变更执行 `run verify:connected-ui`。相关操作需先启动本项目数据库/API；测试只能针对专用本地库，不得使用生产连接。搭建与命令见 `docs/API_SETUP.md`。
- 真实报修变更执行 `run verify:tickets`、`run verify:tickets-ui`，覆盖并发防重与本人数据范围。记录归属来自会话，创建状态由服务端确定；同一提交意图的防重规则见 `docs/TEXT_REPAIR.md`。测试只能按本轮随机提交编号清理临时记录，不能批量删除人工数据。
- 管理员分派变更执行 `run verify:assignment`、`run verify:assignment-ui`，检查版本条件更新、同意图重放、两管理员竞争和审计原子性，规则见 `docs/ADMIN_ASSIGNMENT.md`。临时账号只按本轮随机 ID 清理，不修改现有人工账号。
- 维修任务与接单变更执行 `run verify:tasks`、`run verify:tasks-ui`，规则见 `docs/TECHNICIAN_TASKS.md`。任务列表、计数、详情与接单都按当前 assigneeId 过滤；旧意图重放不能绕过当前归属校验。
- 文字处理结果变更执行 `run verify:results`、`run verify:results-ui`，规则见 `docs/TASK_RESULTS.md`。说明、版本与请求编号参与重放核对，状态更新和结果记录必须在同一事务。
- 用户确认变更执行 `run verify:confirmations`、`run verify:confirmations-ui`，规则见 `docs/TICKET_CONFIRMATION.md`。仅本人且有结果的待确认工单可完成，三角色读取同一确认记录；本人详情新增 version，列表契约不变。退回、再次提交和后续阶段需单独确认后实施。
- 测试聚焦关键业务和真实异常，不堆重复测试；已通过后不无故重复执行。纯文档修改不要求重跑应用测试。
- 共享提交/列表交互变更补充运行 `run verify:shared-ui`；涉及共享种子账号和总数断言的 API 套件串行执行，避免临时记录相互干扰。
- 门户变更执行 `run build:portal` 和 `run verify:portal`，检查 SSR、Origin、HttpOnly Cookie、个人数据 no-store 与跨用户隔离。内部 API 地址不得放入 NEXT_PUBLIC 环境变量，令牌不进入客户端存储或 HTML。
- 门户报修或本人记录变更执行 `run verify:portal-tickets`。转发不得重建 requestId、伪造报修人或初始状态；复用本应用的 clientPost、useApiMutation、PageHeader 和 reporterGet，不跨应用导入后台 Hook。认证套件会短暂修改种子账号状态，与使用同账号的浏览器套件串行执行。
- 门户确认变更执行 `run verify:portal-confirmations`。入口共用 canConfirmTicket，弹窗复用本应用 MutationModal；保留原 requestId/expectedVersion，成功后读取实际完成记录。取消请求不等于回滚，关闭重开前先核对不明结果；不顺带增加撤销、退回或重新打开。
- RN 变更执行 `run check:mobile`、`run build:mobile`，界面/路由执行 `run verify:mobile-ui`；有可用模拟器时执行 `run verify:mobile-android` 并核对截图。Android JS bundle、Expo Go、模拟器、真机和独立 APK 分别记录，不将 Web 预览记为 native 验证。
- RN 认证或设备接口变更执行 `run verify:mobile-api`、`run verify:mobile-auth-android`；复用 AuthService 与 DevicesService。Web 保持 Cookie/Origin，原生端只用专用 Bearer 适配，凭据存 SecureStore；RN Web 不开放原生登录。
- RN 文字报修变更执行 `run verify:mobile-tickets`、`run verify:mobile-tickets-android`；沿用 TicketsService 与 DTO，不复制幂等和归属规则。提交 UUID 由 Expo Crypto 生成，同一内容结果不明时保留编号重试，离页取消不等于回滚。设备和工单读取共用 useApiResource。
- RN 确认变更执行 `run verify:mobile-confirmations`、`run verify:mobile-confirmations-android`，复用 TicketConfirmationsService 和 ConfirmTicketDto；入口使用 canConfirmTicket，弹窗使用原生 MutationModal。窗口内保持原 requestId/expectedVersion，关闭后重新读取实际状态，提交期间禁用取消与重复操作。
- RN 任务变更执行 `run verify:mobile-tasks`、`run verify:mobile-tasks-android`，复用 TaskTicketsService、StatusTicketsQueryDto 与 AcceptTicketDto。列表、计数、详情和接单均限定当前 assigneeId；不开放全部设备。TicketCard/详情复用 tickets 的只读组件，接单动作留 tasks；MutationModal/useApiMutation 只管理公共交互，提交编号与版本留业务组件。
- RN 处理结果变更执行 `run verify:mobile-results`、`run verify:mobile-results-android`，复用 TaskResultsService 与 SubmitTicketResultDto；入口使用 canSubmitTaskResult，表单复用 MutationModal/useApiMutation。相同规范化说明重试保持原 UUID 和版本，说明变化是新意图，不能覆盖已提交结果。
- RN 扫码变更执行 `run test:device-tags`、`run verify:device-scan-api`、`run verify:device-scan-ui`、`run verify:device-scan-android`；相机交互另执行 `run verify:device-camera-android`。保留设备数据范围、拒绝外链、扫码去重和手动输入；光学识别、相机预览与输入查询分别记录，不能以手动查询冒充扫码验证。
- RN 现场照片变更阅读 [TICKET_PHOTOS.md](docs/TICKET_PHOTOS.md)，执行 `run verify:mobile-photos`、`run verify:mobile-photos-android`；保留文字建单与上传的独立意图、文件解码验证、工单行锁、当前分派权限和受保护图片读取。相机拍摄与系统相册选择分别记录。
- Web 管理员已支持工单现场照片只读查看与放大预览。照片 UI 位于 `features/tickets/photos`，详情负责组合；复用 Cookie 鉴权和附件服务，不开放静态目录。相关变更执行 `run verify:web-photos`，检查管理员范围、图片失败重试、关闭释放内存 URL、401 清理和窄屏。
- 微前端修改阅读 [MICRO_FRONTENDS.md](docs/MICRO_FRONTENDS.md)。`apps/shell` 使用稳定版 qiankun 2 加载 React 后台和 Vue 设备子应用的独立 UMD 构建，原 Vite 入口保留；Provider 共用 createApplication，卸载必须回收 React Root。保持 Shadow DOM 内的 Ant Design 样式和浮层容器、`/tickets` basename、Cookie/Origin 边界，相关变更执行 `run verify:micro`、`run verify:micro-devices` 和 `run test:micro-navigation`。`apps/devices` 按 app/layouts/features/shared 分层，Vue 根节点和 Router history 都须卸载；通信只传版本化导航意图，由主应用校验并映射固定路径，不能传凭据或信任客户端角色。不自动升级 qiankun RC、共享凭据或把 RN/门户改为子应用。
- Expo 和 DotSlash 用户缓存必须由本地启动脚本明确指向项目 .local，不能只依赖 APPDATA/TEMP。Android 工具路径与 serial 放被忽略的 .local/android-device.json，不写进公共文件；未确认前不安装完整 SDK、生成原生工程或调用 EAS 云构建。
- 微前端统一生产构建入口使用 `build:micro:unified`、`preview:micro:unified`，与 4174 原预览互斥；相关变更运行 `verify:micro-unified`。静态资源缺失必须返回 404，页面路由才可回退 HTML；API 转发保留 Origin、Cookie、方法及响应状态，不自动重试写请求或扩大后端白名单。该脚本只用于本地验证，不当作公网部署交付。
- 不提交 `.local`、`node_modules`、构建产物、真实 `.env`、凭据或个人操作记录。公开文档不包含个人绝对路径或对话过程。
- 公开文档采用产品与工程交付表述，突出业务建模、架构取舍、数据权限、并发一致性、可维护性及验证证据，不加入学习任务、练习安排或教程式要求。十余年前端经历不等同于十余年 React/RN 经历；不虚构生产规模、客户案例或性能指标。
- 如实标明演示数据、未实现能力以及 Mock、模拟器、真机和安装包各自验证范围，不包装为商业生产经验。
- 完成时说明修改、实际检查结果与未验证范围；结构变化同步维护文档，不能声称未执行的检查已通过。
