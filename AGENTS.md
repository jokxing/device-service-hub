# AI 协作与工程规范

适用于本仓库。修改前阅读本文、[结构与维护约定](docs/ARCHITECTURE.md)和目标模块。当前用户明确指令优先；已授权步骤内正常推进，不反复请求确认。

后端任务同时阅读 [后端结构与维护约定](docs/BACKEND_ARCHITECTURE.md)，运行环境见 [API_SETUP.md](docs/API_SETUP.md)。

## 范围与技术栈

- 阶段顺序遵循 [ROADMAP.md](docs/ROADMAP.md)：React 后台业务闭环 → Next.js 用户门户 → RN 客户端 → 微前端。保留现有 React 后台和 NestJS 后端；新应用到对应阶段经确认再创建，不同时铺开。
- 每次只完成当前确认的一步。范围外的问题先说明，不顺带扩建系统。
- 沿用 React、TypeScript、Vite、React Router、Ant Design、Tailwind CSS、CSS Modules、npm workspaces 和根锁文件。
- 未获当前任务明确授权，不更换技术栈、重组目录、添加状态库或组件库、批量升级依赖。
- 当前包含 Web 完整流程演示，以及 NestJS + PostgreSQL 的登录、设备查询、文字报修、本人记录、首次分派、任务/接单、文字结果与报修用户确认完成。真实图片上传、改派、退回/再次提交、RN、微前端和支付尚未实现，不提前扩展范围。
- Git 提交、推送、部署和仓库可见性修改需要明确授权。
- 不读取无关项目或私有业务资料，不复制来源或授权不明确的代码与素材。

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
- `apps/api` 按业务模块组织控制器、服务与鉴权，数据库迁移在 Prisma 目录；`packages/contracts` 仅输出前后端共用的传输类型，不暴露 ORM 实体、密码或会话。真实设备入口不使用演示角色作为身份来源。
- Web 的公共目录不等于跨端包；DOM、下载、导航、存储与设备能力分别实现，有实际共享需求再提取契约或纯规则。

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
- 不提交 `.local`、`node_modules`、构建产物、真实 `.env`、凭据或个人操作记录。公开文档不包含个人绝对路径或对话过程。
- 公开文档采用产品与工程交付表述，突出业务建模、架构取舍、数据权限、并发一致性、可维护性及验证证据，不加入学习任务、练习安排或教程式要求。十余年前端经历不等同于十余年 React/RN 经历；不虚构生产规模、客户案例或性能指标。
- 如实标明演示数据、未实现能力以及 Mock、模拟器、真机和安装包各自验证范围，不包装为商业生产经验。
- 完成时说明修改、实际检查结果与未验证范围；结构变化同步维护文档，不能声称未执行的检查已通过。
