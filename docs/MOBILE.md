# React Native 移动端

## 当前交付范围

`apps/mobile` 是独立 Expo / React Native 工作区。首步交付服务首页、报修须知、原生 Stack 导航、主题、安全区与滚动布局，完成浏览器预览及 Android 模拟器运行验证。

已接通真实登录、会话恢复、退出、授权设备列表/详情、文字报修、本人分页记录/详情、确认完成及维修任务查询/接单、文字处理结果。相机和上传尚未接入；管理员分派继续使用 Web 后台。设备与工单来自同一 NestJS/PostgreSQL，范围由服务端决定；现有 Web 与门户继续保留。

## 技术与目录

- Expo SDK 57、React Native 0.86.3、React 19.2.3、TypeScript 和 Expo Router；遵循 SDK 推荐版本组合。当前 Expo Go 设备兼容策略见 [Expo 创建项目说明](https://docs.expo.dev/get-started/create-a-project/) 与 [SDK 版本对应表](https://docs.expo.dev/versions/v57.0.0/)。
- npm workspaces 与根锁文件管理依赖。Web/门户继续使用各自的 React 版本，不全局替换 React；native 动画、Worklets 和手势依赖固定为 SDK 57 兼容组合，根 overrides 避免 transitive peer 引入其他 SDK 版本。
- Metro 使用 `expo/metro-config` 默认 monorepo 配置，启用 Expo 自动模块解析，没有手写 React 别名或旧式 watchFolders。规则见 [Expo monorepo 说明](https://docs.expo.dev/guides/monorepos/)。
- 界面使用 React Native 的 View、Text、Pressable、ScrollView 和 StyleSheet；不导入 Ant Design Web、CSS Modules、DOM 或浏览器存储。共享契约依赖 `packages/contracts`，当前服务角色说明使用共用 Role 类型。

```text
apps/mobile/
├─ app.json
├─ metro.config.cjs
├─ package.json
├─ tsconfig.json
└─ src/
   ├─ app/
   │  ├─ _layout.tsx       # Provider、Stack 与状态栏
   │  ├─ index.tsx         # 服务首页路由
   │  ├─ guide.tsx         # 报修须知路由
   │  ├─ login.tsx         # 原生登录
   │  └─ (service)/       # 受保护设备路由
   ├─ features/auth/     # api.ts、会话生命周期、SecureStore 与登录
   ├─ features/devices/  # api.ts、授权列表/详情与业务 Hook
   ├─ features/tickets/  # api.ts、报修表单、本人列表/详情与只读工单组件
   ├─ features/tasks/    # api.ts、本人任务、筛选、详情、接单与结果表单
   ├─ features/service/
   │  ├─ HomeScreen.tsx
   │  ├─ GuideScreen.tsx
   │  └─ content.ts       # 流程与角色说明
   └─ shared/
      ├─ theme.ts         # 颜色、字号、行高、间距、圆角与控件尺寸
      ├─ constants/       # 跨业务角色名称等常量
      ├─ api/             # 地址、Bearer 传输、超时与错误
      ├─ hooks/           # 通用读取/写入的取消、防重复操作和清理
      ├─ styles/          # 跨业务正文、说明及错误文字样式
      └─ components/      # Screen、ContentCard、ActionButton、MutationModal
```

路由文件只组装或导出页面。公共组件不依赖业务内容；后续身份、设备与工单按实际功能增加模块，不预建空页面和按钮。

### 模块扩展约定

- 每个业务模块的 `api.ts` 集中接口路径、参数和共享传输类型；页面使用 `useDevices`、`useDevice` 等业务 Hook，不拼接 HTTP 地址。Hook 负责请求状态、取消和清理，业务 API 不保存界面状态。
- 认证模块的 API 负责登录、身份核对与撤销；SessionProvider 管理会话生命周期和统一鉴权读取/写入。设备 API 接收鉴权读取函数，不读取 SecureStore、不复制 401 处理，也不把凭据传给页面。
- `shared/api` 只负责地址、HTTP 与通用错误，不导入业务模块。`shared/constants/roles.ts` 保存跨页面角色名称，须知中的职责说明保留在 `features/service/content.ts`；角色文案不构成访问权限判断。
- 公共颜色、字号、行高、间距、圆角与控件尺寸统一使用 theme；页面特有尺寸保留在局部 StyleSheet。业务模块按实际规模增加 `components/`、`hooks/` 等子目录，不为后续设想预建目录。
- 新增报修、任务、账号功能分别放入对应 feature，路由放入 app；只依赖其他模块明确提供的入口。跨端继续只共享契约与适用的纯规则，不从后台或门户导入组件、存储和导航。

`Screen` 的可选 footer 用于页面末尾操作：短内容时靠底，长内容时随页面滚动，保留安全区和底部间距。设备页将退出操作置于此处，与设备查询操作分开。

## 启动与构建

使用根目录依赖与锁文件。当前 Windows 环境通过 `scripts/npm-local.ps1` 执行 npm，缓存与临时文件保存在项目 `.local`。

```sh
npm run dev:mobile         # 本地 Metro，8081 端口
npm run dev:mobile:web     # 同一 Metro 的浏览器预览
npm run check:mobile      # TypeScript 与 Expo 依赖版本检查
npm run build:mobile      # Android JS bundle + Web 静态导出
npm run verify:mobile-ui  # 已启动 Metro 时检查 Web 预览
npm run verify:mobile-api # 原生接口、归属、撤销与浏览器边界
npm run verify:mobile-auth-android # 模拟器真实认证与设备链路
npm run verify:mobile-tickets # 原生报修权限、分页与并发防重
npm run verify:mobile-tickets-android # 原生表单、重试和本人记录
npm run verify:mobile-confirmations # 原生确认的归属、版本和并发重放
npm run verify:mobile-confirmations-android # 原生确认框、取消、异常重试和过期页面
npm run verify:mobile-tasks # 原生任务归属、分页筛选、接单防重
npm run verify:mobile-tasks-android # 原生维修角色、任务卡片、取消与异常重试
npm run verify:mobile-results # 原生结果的内容、版本、权限与并发防重
npm run verify:mobile-results-android # 原生结果表单、重试与用户确认闭环
```

浏览器预览地址为 `http://127.0.0.1:8081`。两个开发命令共用端口，择一启动；同一个 Metro 可以同时服务 Expo Go 与浏览器。脚本禁止自动打开系统浏览器，可手动打开预览链接。

构建产物分别位于 `apps/mobile/dist/android` 与 `apps/mobile/dist/web`。Android 导出包含 JS/Hermes bundle 和资源，尚未生成本项目独立 APK/AAB，不需要 Android Studio、Gradle 编译或云构建。根 `npm run build` 继续覆盖既有 Web/API/门户，移动端单独执行 `build:mobile`。

`.expo`、`node_modules`、`dist`、私有环境、下载文件及工具路径配置均配置忽略；不提交运行容器 APK、模拟器镜像或缓存。

## Android 模拟器

当前验证复用已安装的 MuMu Android 15 与其 ADB，没有安装 Android Studio 或完整 Android SDK。通过 [Expo 官方 SDK 57 下载入口](https://expo.dev/go?sdkVersion=57&platform=android&device=false)取得 Expo Go 运行容器并安装到该模拟器。无需 Expo 账号或收费构建服务。

ADB 工具绝对路径与设备 serial 放在被忽略的 `.local/android-device.json`，键名分别为 `adbPath`、`serial`；也可通过 `DSH_ADB_PATH`、`DSH_ANDROID_SERIAL` 指定。公开文件不保存个人安装路径。

1. 启动已有模拟器，并确保 `adb devices` 可识别目标实例。
2. 安装 SDK 57 对应的 Expo Go，首次进入时完成并关闭其开发菜单提示。
3. 启动 `dev:mobile` 或 `dev:mobile:web`，再执行以下命令：

```sh
npm run open:mobile:android    # ADB reverse 转发本机 8081/3001，并打开本项目
npm run verify:mobile-android  # 原生首页、触摸导航、Android 返回与截图
```

ADB reverse 转发 Metro 8081 和 API 3001，后端仍监听本机地址；不开放 LAN/公网或放宽 Web Origin 校验。`EXPO_PUBLIC_API_URL` 仅配置公开 API 地址（默认 `http://127.0.0.1:3001/api`），不得放入密码或令牌。

## 原生身份与接口边界

- `/api/mobile/auth/login`、`me`、`logout` 使用独立原生传输适配；授权设备读取为 `/api/mobile/devices` 和 `/:id`。控制器复用 AuthService、DevicesService，不复制密码校验、会话存储或设备归属规则，不增加数据库表。
- 登录返回短期不透明 Bearer 凭据，服务端只保存摘要，沿用两小时有效期、停用检查与撤销。原生端用 [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/) 保存，不写日志、URL、普通存储或共享包常量。退出先撤销服务端会话，再清除本机身份；失败明确反馈。
- 冷启动与回前台校验身份；401 清除持久凭据和设备数据，切换账号重新查询。网络失败显示重试，不把旧身份当作已验证登录。请求设定超时、离页取消读取，写操作不自动重试。
- 原生接口拒绝 Origin、Cookie 和 Fetch Metadata 浏览器标头；既有 Web 继续 Cookie + Origin，不能用 Bearer 登录 Web 接口。此传输约束不构成设备真实性证明，身份仍依赖凭据校验。
- RN Web 仅用于公开页面预览，禁用原生账号登录；不将 Bearer 写入 localStorage，不借用 Web Origin 绕过原生接口边界。

MuMu Android 15 的 uiautomator 可能在写完 XML 后以 135/139 退出。验证适配只在输出明确写入成功、旧文件已删除且新 XML 完整时读取；其他失败仍报错，不使用旧快照通过验收。Expo Go 保留页面和滚动位置，检查脚本会恢复本项目首页后再执行导航。

## 文字报修与本人记录

- 入口为设备详情中的“发起文字报修”和设备列表中的“我的报修”；仅报修用户开放，停用设备不显示创建入口。本人列表每页 10 条，支持分页、刷新及详情直达。
- 原生接口为 POST `/api/mobile/tickets`、GET `/api/mobile/tickets/mine`、GET `/api/mobile/tickets/:id`；NativeTicketsController 复用既有 DTO 与 TicketsService。角色、设备授权、启用状态、初始状态、本人归属、分页及并发防重由服务端裁决，不新增表或迁移。
- 表单使用 SDK 57 对应的 [Expo Crypto](https://docs.expo.dev/versions/latest/sdk/crypto/) 生成 UUID v4；同一规范化内容重试沿用提交编号，不自动重试写请求。更改内容后再次提交产生新意图；离页后编号不持久化，结果不明应先核对本人记录，不视为离线同步。
- SessionProvider 统一处理鉴权读取与写入的 401 清理；业务 API 不接触凭据。设备和工单共用 `useApiResource` 的读取、取消与卸载清理，报修意图留在表单内，不放入通用请求层。
- 详情读取已有分派、接单、处理结果和确认记录。本人且有结果的待确认工单可通过原生弹窗验收；入口使用 canConfirmTicket，服务端独立验证身份、归属、状态、结果存在性与版本。

## 本人确认完成

公共 MutationModal 的正文独立滚动；错误提示、提交和取消按钮放在固定操作区，底部使用 spacing.xl 留白，避免长表单将按钮裁切在圆角边缘。接单、确认和结果表单统一沿用此布局。

- POST `/api/mobile/tickets/:id/confirm` 复用 ConfirmTicketDto 与 TicketConfirmationsService，不增加表、迁移或通用状态修改接口。请求仅带 UUID v4 requestId 与 expectedVersion；状态和确认人、时间由服务端事务写入。
- `ConfirmTicketAction` 组织入口与业务意图，公共 `MutationModal` 只处理展示、提交状态和关闭；原生 [Modal](https://reactnative.dev/docs/modal) 的 Android 返回关闭也受 pending 限制。内容可滚动，样式沿用公共主题。
- 单次窗口的 UUID 与原版本保持不变，响应不明可重试；提交期间禁止重复点击、取消或返回关闭。关闭窗口后重新读取详情，版本冲突不在本地强制修改状态。切换路由或账号会卸载弹窗并取消请求，但取消请求不等于业务回滚。
- 模拟器验收使用本地网关丢弃一条成功响应并返回 502，验证同意图重试只有一条确认记录；同时验证取消不改变状态、冷启动恢复、其他端已完成后的旧页面冲突与刷新。网关仅临时转发模拟器端口，结束后恢复转发并按本轮随机 ID 清理。
- 截图：[确认窗口](screenshots/mobile-android-confirm-dialog.png)、[完成详情](screenshots/mobile-android-confirmed.png)。图中工单及维修员是临时验收数据，不是生产案例。

## 维修任务与接单

- 维修人员登录后进入 `/tasks`，也可从设备页进入“我的任务”。列表支持本人计数、状态筛选、分页和空态；返回列表时刷新真实状态，切换筛选回到第一页。详情为 `/tasks/[id]`。
- 任务列表的退出操作固定在导航栏右上角，长列表滚动后仍可访问；失败通过原生提示反馈。主列表不展示返回箭头。详情使用 dismissTo 返回栈内已有列表，保留筛选与分页；详情直达且栈内没有列表时才替换为列表，避免重复堆叠同名页面。
- 原生接口为 GET `/api/mobile/tasks`、GET `/api/mobile/tasks/:id`、POST `/api/mobile/tasks/:id/accept`；复用 TaskTicketsService、StatusTicketsQueryDto 和 AcceptTicketDto，不增加表或迁移。列表与计数共用当前 assigneeId 条件；旧接单意图重放仍检查当前归属。
- 任务只展示必要设备摘要，不扩大独立设备台账权限。非维修角色被服务端拒绝；跨维修人员和不存在的任务统一返回 404。
- 只有待接单且未接单的任务显示接单动作。窗口内保留原 requestId/expectedVersion，取消不修改状态，关闭后重新查询；成功读取实际处理中状态与接单人、时间。处理中任务已接通文字处理结果提交。
- 任务卡片和详情使用工单模块的只读 TicketCard、TicketRecordDetails；动作和 API 留在 tasks。任务导航栏使用 SessionHeaderAction，设备页保留 SessionFooter；两者调用同一会话退出逻辑。共用文字样式、LoadFeedback、useApiResource 与 useApiMutation。公共提交 Hook 只处理防重复点击、取消和卸载清理，业务意图不进入公共层。

## 文字处理结果

- 处理中且未提交结果的本人任务显示“提交处理结果”，表单沿用 MutationModal/useApiMutation，输入归业务组件管理。说明去空白后必须非空且最多 2000 字符，保留内部换行；提交后变为待用户确认。
- POST `/api/mobile/tasks/:id/result` 仅适配原生传输，复用 SubmitTicketResultDto 与 TaskResultsService；角色、当前 assigneeId、状态、版本、规范化说明与幂等重放由既有服务校验。没有增加表、迁移或覆盖结果接口。
- 同一窗口内的相同规范化说明保持原 UUID 和 expectedVersion；说明变化后再次提交是新意图，不能覆盖已提交内容。取消或关闭重开清空输入，关闭后查询实际状态；冲突时保留输入，不能强制覆盖其他端的结果。
- 状态、处理说明、人员及时间从同一记录读取，报修用户可在原生本人详情核对并确认完成。管理员分派仍由 Web 后台负责，原生两种业务角色已贯通文字闭环。

## 缓存与磁盘约束

- npm、TEMP/TMP、浏览器配置、Expo 用户设置、ADB 用户目录和 Gradle 用户缓存均通过启动脚本指向 `.local`，不安装全局 CLI。
- Expo CLI 57 的用户目录使用进程级 `__UNSAFE_EXPO_HOME_DIRECTORY` 覆盖；该设置只由启动脚本传入，不放入项目 `.env` 或客户端变量。
- RN DevTools 的 DotSlash 在 Windows 使用系统 Known Folder 路径，需要单独设置 `DOTSLASH_CACHE`。本地脚本已将其指向 `.local/dotslash`；说明见 [DotSlash 缓存配置](https://github.com/facebook/dotslash/blob/main/website/docs/flags.md)。
- 当前步骤曾发现调试器生成的系统盘缓存，已停止进程、核对本轮新建条目并清理，再验证底层工具报告的缓存路径为项目目录。没有删除既有用户文件或安装目录。

## 验证记录与边界

2026-11-06～2026-11-07：

| 验证项 | 当前结果 |
| --- | --- |
| TypeScript、Expo 依赖检查、native 依赖树 | 通过，SDK 57 native 库一致 |
| Android JS/Hermes bundle 导出 | 通过 |
| React Native Web 导出与 390px 浏览器预览 | 通过，包含路由、刷新、返回和无运行错误检查 |
| MuMu Android 15 + Expo Go | 通过原生首页/须知，以及真实登录、设备详情、冷启动恢复、退出撤销、账号隔离与 401 清理 |
| 实体 Android 手机、iPhone | 未验证 |
| 本项目独立 APK/AAB、原生开发构建 | 未生成 |
| 原生鉴权与授权设备 API | 已接入，接口边界与账号归属验证通过 |
| 原生文字报修、本人分页记录与详情 | 已接入；服务端权限与八路并发防重验证通过 |
| 原生报修异常重试与记录恢复 | MuMu + Expo Go 验证通过：网关丢弃成功响应后同意图重试只留一单，详情冷启动恢复，跨账号详情拒绝 |
| 原生确认完成 | 已接入；角色/归属、版本、八路重放及模拟器取消、异常重试、过期页面刷新通过 |
| 原生任务查询与接单 API | 已接入；本人计数/筛选、角色与归属、版本、八路防重和历史意图重放验证通过 |
| 原生任务与接单模拟器 | 通过维修角色登录、状态筛选、取消、异常重试、冷启动、过期版本与跨维修账号隔离 |
| 原生文字处理结果 API | 已接入；内容校验、归属、版本、八路防重、三角色一致性与终结状态重放验证通过 |
| 原生处理结果模拟器 | 通过空内容禁用、取消清理、多行说明、异常重试、冷启动、过期输入保留与报修用户确认闭环 |
| 扫码拍照、上传 | 未接入 |

截图：[原生登录](screenshots/mobile-android-login.png)、[授权设备](screenshots/mobile-android-devices.png)、[设备详情](screenshots/mobile-android-device-detail.png)、[模拟器首页](screenshots/mobile-android-home.png)、[模拟器须知](screenshots/mobile-android-guide.png)、[浏览器预览](screenshots/mobile-web-home.png)。模拟器结果与浏览器结果分别记录，不表示硬件设备通信或商业生产交付。

报修截图：[表单](screenshots/mobile-android-repair.png)、[本人列表](screenshots/mobile-android-my-tickets.png)、[报修详情](screenshots/mobile-android-ticket-detail.png)。图中随机标题为临时验收记录，脚本按本轮提交编号精确清理，人工记录不在清理范围内。

任务截图：[本人任务](screenshots/mobile-android-tasks.png)、[接单窗口](screenshots/mobile-android-accept-dialog.png)、[接单后详情](screenshots/mobile-android-task-accepted.png)。图中账号和工单为本轮临时验收数据，结束后精确清理。

处理结果截图：[结果表单](screenshots/mobile-android-result-form.png)、[提交后记录](screenshots/mobile-android-result-submitted.png)、[报修用户查看](screenshots/mobile-android-result-reporter.png)。图中工单和维修员为脚本生成的临时验收数据，测试后定向清理。

## 下一增量

下一增量建议为扫码查看授权设备，需确认后实施；随后接入拍照上传。相机能力将分别记录模拟器、真机与浏览器的验证范围。
