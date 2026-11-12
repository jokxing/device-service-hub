# React Native 移动端

## 当前交付范围

`apps/mobile` 是独立 Expo / React Native 工作区，提供服务首页、报修须知、原生 Stack 导航、主题、安全区与滚动布局，已完成浏览器预览和 Android 模拟器验证。

已接通真实登录、会话恢复、退出、授权设备列表/详情、文字报修、本人分页记录/详情、确认完成及维修任务查询/接单、文字处理结果。已接入设备二维码相机入口及手动编号查询，已接入报修详情拍照/相册补充照片及维修任务只读查看；管理员分派继续使用 Web 后台。设备与工单来自同一 NestJS/PostgreSQL，范围由服务端决定；现有 Web 与门户继续保留。

当前已支持维修员首版报价/修订、本人确认/拒绝、本人订单列表与独立详情；维修员可在任务详情开工和提交结果，由本人确认完成。原生端已支持本地模拟支付创建/确认/查单与超时展示；本人可取消符合条件的待开工订单，原生端支持本人全额模拟退款申请与结果查询，真实支付和原生管理员处理未开放。

## 技术与目录

- Expo SDK 57、React Native 0.86.3、React 19.2.3、TypeScript 和 Expo Router；遵循 SDK 推荐版本组合。当前 Expo Go 设备兼容策略见 [Expo 创建项目说明](https://docs.expo.dev/get-started/create-a-project/) 与 [SDK 版本对应表](https://docs.expo.dev/versions/v57.0.0/)。
- npm workspaces 与根锁文件管理依赖。Web/门户继续使用各自的 React 版本，不全局替换 React；native 动画、Worklets 和手势依赖固定为 SDK 57 兼容组合，根 overrides 避免 transitive peer 引入其他 SDK 版本。
- Metro 使用 `expo/metro-config` 默认 monorepo 配置，启用 Expo 自动模块解析，没有手写 React 别名或旧式 watchFolders。规则见 [Expo monorepo 说明](https://docs.expo.dev/guides/monorepos/)。
- 界面使用 React Native 的 View、Text、Pressable、ScrollView 和 StyleSheet；不导入 Ant Design Web、CSS Modules、DOM 或浏览器存储。共享契约依赖 `packages/contracts`，当前服务角色说明使用共用 Role 类型。

```text
apps/mobile/
├─ app.config.ts          # 本地 APK 模式配置，默认保留 app.json
├─ plugins/               # 局部 Android 内测签名与权限插件
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
- 本人报修请求的分页大小由 `features/tickets/constants.ts` 的 `TICKET_PAGE_SIZE` 管理，任务请求沿用 `features/tasks/constants.ts` 的 `TASK_PAGE_SIZE`；当前均为 10 条。分页按钮按服务端返回的 pageSize/total 判断，不在页面重复固定每页数量，也不跨端强制共用配置。
- 认证模块的 API 负责登录、身份核对与撤销；SessionProvider 管理会话生命周期和统一鉴权读取/写入。设备 API 接收鉴权读取函数，不读取 SecureStore、不复制 401 处理，也不把凭据传给页面。
- `shared/api` 只负责地址、HTTP 与通用错误，不导入业务模块。`shared/constants/roles.ts` 保存跨页面角色名称，须知中的职责说明保留在 `features/service/content.ts`；角色文案不构成访问权限判断。
- 公共颜色、字号、行高、间距、圆角与控件尺寸统一使用 theme；页面特有尺寸保留在局部 StyleSheet。业务模块按实际规模增加 `components/`、`hooks/` 等子目录，不为后续设想预建目录。
- 新增报修、任务、账号功能分别放入对应 feature，路由放入 app；只依赖其他模块明确提供的入口。跨端继续只共享契约与适用的纯规则，不从后台或门户导入组件、存储和导航。

`Screen` 的可选 footer 用于页面末尾操作：短内容时靠底，长内容时随页面滚动，保留安全区和底部间距。设备页将退出操作置于此处，与设备查询操作分开。

## 启动与构建

异地 Android 独立安装包、局部构建工具链、专用测试账号及受限 HTTPS 入口另见 [异地移动端内测](REMOTE_MOBILE_TEST.md)。JS 静态导出与 APK 验收分别记录；默认 Expo Go 入口仍保留。

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
npm run verify:mobile-photos # 图片格式、容量、权限、状态和并发防重
npm run verify:mobile-photos-android # 原生选图、上传重试、恢复与维修人员查看
npm run test:device-tags # 标签协议、版本与外链拒绝
npm run verify:device-scan-api # 编号查询及四角色数据权限
npm run verify:device-scan-ui # Web 设备标签和窄屏布局
npm run verify:device-scan-android # 原生编号/标签输入和授权详情
npm run verify:device-camera-android # 相机预览、输入暂停和权限拒绝
```

浏览器预览地址为 `http://127.0.0.1:8081`。两个开发命令共用端口，择一启动；同一个 Metro 可以同时服务 Expo Go 与浏览器。脚本禁止自动打开系统浏览器，可手动打开预览链接。

`build:mobile` 的静态导出分别位于 `apps/mobile/dist/android` 与 `apps/mobile/dist/web`，Android 导出仅为 JS/Hermes bundle 和资源。另已交付本地签名的独立 Android 内测 APK，产物、密钥、工具链与端点配置均留在 `.local`；使用 `build:mobile:apk` 与 `verify:mobile-apk:android`，边界见 [异地移动端内测](REMOTE_MOBILE_TEST.md)。根 `npm run build` 继续覆盖 Web/API/门户；没有调用云构建或生成 AAB。

`.expo`、`node_modules`、`dist`、私有环境、下载文件及工具路径配置均配置忽略；不提交运行容器 APK、模拟器镜像或缓存。

## Android 模拟器

原 Expo Go 验证复用 MuMu Android 15 及其 ADB，通过 [Expo 官方 SDK 57 下载入口](https://expo.dev/go?sdkVersion=57&platform=android&device=false)取得运行容器。独立 APK 阶段另在项目 `.local` 配置命令行 SDK/JDK/Gradle，不安装 Android Studio、不改系统环境；MuMu 仍复用原实例，专用 ADB 服务端口可通过本地配置的 `adbServerPort` 指定。无需 Expo 账号或收费构建服务。

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
- 冷启动与回前台校验身份；已有会话在复核期间保留路由，避免系统权限弹窗返回后重建设备页。401 清除持久凭据和设备数据，切换账号重新查询；复核网络失败阻止业务访问并显示重试。请求设定超时、离页取消读取，写操作不自动重试。
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
- 缓存位置以底层工具实际报告为准；仅设置 APPDATA/TEMP 不能保证 Expo 与 DotSlash 使用项目目录。

## 验证记录与边界

2026-11-06～2026-11-08；Expo Go 与独立 APK 结果分别记录：

| 验证项 | 当前结果 |
| --- | --- |
| TypeScript、Expo 依赖检查、native 依赖树 | 通过，SDK 57 native 库一致 |
| Android JS/Hermes bundle 导出 | 通过 |
| React Native Web 导出与 390px 浏览器预览 | 通过，包含路由、刷新、返回和无运行错误检查 |
| MuMu Android 15 + Expo Go | 通过原生首页/须知，以及真实登录、设备详情、冷启动恢复、退出撤销、账号隔离与 401 清理 |
| 实体 Android 手机、iPhone | 未验证 |
| 本项目独立 APK | 已生成本地签名 release 包，MuMu Android 15 通过 HTTPS 文字闭环；相机/相册、本包光学识别与实体手机待验证 |
| AAB、原生开发构建 | 未生成，未发布商店 |
| 原生鉴权与授权设备 API | 已接入，接口边界与账号归属验证通过 |
| 原生文字报修、本人分页记录与详情 | 已接入；服务端权限与八路并发防重验证通过 |
| 原生报修异常重试与记录恢复 | MuMu + Expo Go 验证通过：网关丢弃成功响应后同意图重试只留一单，详情冷启动恢复，跨账号详情拒绝 |
| 原生确认完成 | 已接入；角色/归属、版本、八路重放及模拟器取消、异常重试、过期页面刷新通过 |
| 原生任务查询与接单 API | 已接入；本人计数/筛选、角色与归属、版本、八路防重和历史意图重放验证通过 |
| 原生任务与接单模拟器 | 通过维修角色登录、状态筛选、取消、异常重试、冷启动、过期版本与跨维修账号隔离 |
| 原生文字处理结果 API | 已接入；内容校验、归属、版本、八路防重、三角色一致性与终结状态重放验证通过 |
| 原生处理结果模拟器 | 通过空内容禁用、取消清理、多行说明、异常重试、冷启动、过期输入保留与报修用户确认闭环 |
| 设备标签与编号查询 | 已接入；协议、四角色权限、Web 二维码及模拟器手动输入验证通过 |
| 原生相机交互 | MuMu + Expo Go 通过相机就绪回调、输入暂停、拒绝权限后的手动查询；预览为灰色画面 |
| 光学识别 | 用户人工验证 MuMu 实时截屏扫码进入设备详情并完成文字闭环；实体摄像头扫码待验证 |
| 现场照片 | API 权限、格式与并发限制通过；MuMu + Expo Go 相册选择、取消、上传重试、冷启动恢复和维修人员查看通过；另验证虚拟系统相机拍摄返回及上传，实体摄像头仍待验证 |

截图：[原生登录](screenshots/mobile-android-login.png)、[授权设备](screenshots/mobile-android-devices.png)、[设备详情](screenshots/mobile-android-device-detail.png)、[模拟器首页](screenshots/mobile-android-home.png)、[模拟器须知](screenshots/mobile-android-guide.png)、[浏览器预览](screenshots/mobile-web-home.png)。模拟器结果与浏览器结果分别记录，不表示硬件设备通信或商业生产交付。

报修截图：[表单](screenshots/mobile-android-repair.png)、[本人列表](screenshots/mobile-android-my-tickets.png)、[报修详情](screenshots/mobile-android-ticket-detail.png)。图中随机标题为临时验收记录，脚本按本轮提交编号精确清理，人工记录不在清理范围内。

任务截图：[本人任务](screenshots/mobile-android-tasks.png)、[接单窗口](screenshots/mobile-android-accept-dialog.png)、[接单后详情](screenshots/mobile-android-task-accepted.png)。图中账号和工单为本轮临时验收数据，结束后精确清理。

处理结果截图：[结果表单](screenshots/mobile-android-result-form.png)、[提交后记录](screenshots/mobile-android-result-submitted.png)、[报修用户查看](screenshots/mobile-android-result-reporter.png)。图中工单和维修员为脚本生成的临时验收数据，测试后定向清理。

## 设备标签与扫码边界

- Web 真实设备详情通过 Ant Design QRCode 生成标签，格式为 `device-service-hub:v1:AC-001`；演示设备不生成真实标签。二维码只携带业务编号，不包含账号、令牌或授权；编号为 1～64 位 ASCII 字母、数字、点、下划线或短横线，首位为字母或数字。
- 纯编解码集中在 `@device-service-hub/contracts/device-tags` 子入口，Web 与 RN 共用。相机只接受明确版本的本平台标签，不打开或请求外部链接；手动输入同时接受设备编号和标签内容。
- 原生 GET `/api/mobile/devices/resolve?code=AC-001` 使用 NativeSessionGuard、DTO 和既有 DevicesService 数据范围。报修用户只能查授权设备；管理员沿用全设备范围；维修人员通过任务获取设备信息，不新增独立设备权限。不存在和无权访问统一返回 404；停用设备可读，但不提供报修入口。
- 相机由用户主动开启，仅请求相机权限；拒绝或启动失败时保留手动输入，永久拒绝提供系统设置入口。不请求麦克风，不保存或上传相机画面。`app.json` 的 camera 插件已进入独立 APK 原生构建；实体摄像头光学识别仍需真机验证。
- 识别回调同步锁定后暂停预览，再查询后端；失败需明确重新扫码。编辑编号暂停识别；离页、后台和查询期间卸载相机，读取请求在离页时取消，避免重复跳转与旧响应覆盖。
- MuMu + Expo Go 已验证编号及完整标签输入、授权查询、外链拒绝和越权提示；这些结果不表示相机实际解码成功。用户已人工验证 MuMu 实时截屏扫码 → 设备详情 → 报修及后续文字闭环；实体 Android/iPhone 摄像头扫码仍待验证。相机就绪回调、输入暂停、拒绝权限后手动查询已通过；先前自动验证相机预览为灰色；后续实时截屏扫码已通过用户人工验收，实体摄像头光学扫码仍待验证。权限验证结束后恢复 Expo Go 原有系统相机授权。

二维码截图：[Web 设备标签](screenshots/device-tag-desktop.png)、[窄屏标签](screenshots/device-tag-mobile.png)、[扫码入口](screenshots/mobile-android-device-scan.png)、[越权提示](screenshots/mobile-android-device-scan-denied.png)、[拒绝相机权限](screenshots/mobile-android-camera-denied.png)。

## 现场照片

已支持待分派工单拍照/相册补充照片，维修人员在本人任务只读查看。图片规则、磁盘与数据库边界及验证记录见 [TICKET_PHOTOS.md](TICKET_PHOTOS.md)。

## 后续验收边界

现场照片规则、原生入口及验证边界见 [TICKET_PHOTOS.md](TICKET_PHOTOS.md)。Web 管理员已支持现场照片查看，门户附件后置。微前端已集成 React 工单后台、Vue 设备台账及最小导航通信，见 [MICRO_FRONTENDS.md](MICRO_FRONTENDS.md)。RN 保持独立，独立 APK 已在 MuMu Android 15 通过 HTTPS 文字闭环验收；实体手机安装、摄像头扫码/拍照与 iOS 原生仍待验证。


## 维修员首版报价

任务详情的需报价分支已增加 features/quotes：api.ts 集中原生路径与契约，useTaskQuote 通过会话 Provider 的 request 读取，TaskQuoteSection 组合摘要与入口，SubmitQuoteAction 管理原生弹窗和动态条目，quoteForm 负责规范化与纯输入规则。未接单只读；处理中、没有报价和结果时可提交首版。已存在报价只读展示当前版与状态，拒绝后的修订继续在 Web 后台完成。

支持条目名称、整数数量、最多两位小数的元单价和备注，限制及整数分计算复用 contracts/quote-rules；预估合计不随请求提交，服务端重新计算。窗口固定原工单版本，同一规范化条目重试保留 Expo Crypto UUID，关闭/成功后重读任务与报价。会话账号、路由和刷新变化时取消读取并清理旧数据；非登录输入关闭 autofill。

GET/POST /api/mobile/tasks/:id/quote 使用 NativeSessionGuard 与 NativeClient，限定维修角色，复用 QuotesService 和 SubmitQuoteDto，当前分派范围、事务、版本、防重和重放归属校验与 Web 一致。维修员适配不开放报价决定或修订；报修用户的独立确认与订单快照适配见后文，支付未接入，不更改 Web Cookie/Origin 边界，也未扩大异地内测网关白名单。

verify:mobile-quotes 覆盖 Bearer/浏览器边界、角色/当前分派、DTO、金额、版本、同/异意图并发及归属变化后重放；test:mobile-quotes 覆盖原生表单规范化、价格精度和边界。构建导出与原生界面验收必须分别记录；本步没有数据库迁移，不把 Android bundle 当作模拟器或真机验收。

首轮无在线设备时的检查：全仓构建、check:mobile、build:mobile、verify:mobile-quotes、test:mobile-quotes、原报价规则/API、原移动鉴权/任务/结果、API/后台入口/原页面与基础 RN Web 导航回归通过。Expo 依赖校验在离线状态使用本地映射。ADB devices 未发现在线设备，因此未执行新增报价的 Android 界面验收、真机或 APK 验收；RN Web 的首页/须知回归不代表报价原生表单已验证。

### 首版报价 Android 验收（2026-11-11）

MuMu Android + Expo Go 运行 verify:mobile-quotes-android 通过：空名称、金额小数精度校验；取消重开清空；两条目合计 24101 分；本地网关仅注入一次提交成功后的错误响应，原内容重试保持 UUID/版本、数据库仅一条报价；重启应用后按当前任务回看待确认报价。已查看 mobile-quote-form-android.png 和 mobile-quote-saved-android.png。使用随机临时账号/工单，测试结束按 ID 清理并恢复原 API 端口映射。此次为模拟器 Expo Go，不是新 APK、实体真机或 iOS 结果。首轮脚本滑动落入文本框，已改为弹窗留白滚动。截图复核发现报价型任务误显示直接处理入口，已限制 canSubmitTaskResult 仅 direct 分支，并提示报价后到 Web 完成订单开工；新增 verify:mobile-quote-gate-android 确认 quoted 隐藏、direct 保留。修正后全仓与移动端构建、纯规则及独立原生入口检查通过。

## 报修用户报价确认与订单快照

本人报修详情的 quoted 分支已组合 MyQuoteSection，useMyQuote 使用会话 Provider 的 request 并行读取当前报价和该工单订单，账号/路由/刷新变化会取消旧请求。QuoteSummary 在维修员和报修用户入口复用；AcceptQuoteAction 使用原生 MutationModal/useApiMutation 与 Expo Crypto UUID，窗口固定原工单版本、报价 ID 与版次。同一窗口重试保留原意图；关闭或成功后重读报修、报价及订单，不将取消请求解释为事务回滚。

GET /api/mobile/tickets/:id/quote 与 GET /api/mobile/orders/by-ticket/:id 仅供本人读取；POST /api/mobile/tickets/:id/quote/accept 复用 OrdersService.acceptQuote 和 AcceptQuoteDto，不复制金额计算、事务或唯一订单规则。NativeClient/NativeSessionGuard 保留无浏览器来源 Cookie、仅 Bearer 的边界；管理员/维修员不能调用报修用户适配，跨用户返回 404。确认入口纯规则 canAcceptQuote 位于 contracts/quote-rules，门户与 RN 共用，不共享 UI 或存储。

订单快照通过 features/orders 的原生组件显示订单号、状态、报价版次、条目和金额。确认不代表付款或开工；本步没有 RN 报价拒绝/修订、独立订单列表、支付、取消或开工功能，也未扩展异地内测网关。无数据库迁移，无新框架或依赖。

verify:mobile-quote-confirmations 覆盖角色/本人范围、原生/浏览器边界、版次/版本校验、服务端快照、同意图并发唯一订单与归属变化后重放。原生交互验收使用 verify:mobile-quote-confirmations-android，构建和运行结果分别记录，不将 JS bundle 或 Web 首页回归记为原生确认验收。

### 本人确认 Android 验收（2026-11-11）

MuMu Android + Expo Go 的 verify:mobile-quote-confirmations-android 通过：确认弹窗展示固定版次与金额、取消不建单、成功响应丢失后同 UUID/版本/报价版次重试、数据库唯一订单、重启后回看订单快照并隐藏确认入口。已查看 mobile-quote-accept-dialog-android.png 与 mobile-quote-order-android.png。临时记录定向清理，API 端口映射已恢复。不是新 APK、真机或 iOS 验收，异地网关仍未扩展。

本人确认增量最终回归：全仓构建、RN 类型/依赖检查与 Android/Web bundle 导出、原生本人报价确认 API/Android 交互、原维修员报价 API、共享报价/原生表单规则、原订单事务、门户报价确认与鉴权、原生鉴权/完成确认、API/后台入口、原页面与基础 RN Web 导航、业务规则均通过。无数据库迁移，未新建外部资源或调用真实支付。

## 报价协商与本人订单查询（2026-11-11）

报修用户可以对待确认报价填写拒绝原因。维修员仅可从最新已拒绝且有审计记录的报价预填修订，表单共用 SubmitQuoteAction，发布生成新版、保留旧版，不覆盖用户曾决定的内容。拒绝和修订弹窗复用 MutationModal/useApiMutation，规范化内容和来源版次参与提交意图，同内容结果不明时保留 UUID，关闭重读。

原生 POST mobile/tickets/:id/quote/reject 与 POST mobile/tasks/:id/quote/revisions 分别复用 QuoteRejectionsService/RejectQuoteDto 和 QuotesService/ReviseQuoteDto，服务端维持当前归属、工单锁、版本条件更新与原事务边界。

报修用户在“我的设备”进入“我的订单”，状态和页码由路由参数管理；列表、总数与独立详情复用 OrdersService、OrdersQueryDto 和现有传输契约。features/orders 保存 API、读取 Hook、页面和状态常量；src/app 只导出路由。订单快照与关联工单处理记录只读，详情返回已有列表，不新增相同列表栈。读请求在账号/路由变化时取消并清理数据。管理员与维修员不能调用报修用户的订单适配。

本增量不含 RN 订单开工、取消、支付、异地网关扩展或新 APK；无数据库迁移。构建、接口和模拟器验证分别记录，既有真机安装包成果不覆盖本增量。

本增量验证：verify:mobile-quote-rejections 与 verify:mobile-negotiation 通过，覆盖角色和本人/当前分派范围、Origin 拒绝、原因规范化、版次与版本冲突、同意图防重、新旧报价保留、服务端金额和订单分页/详情隔离。两组对应 -android 套件通过，验证原因必填和提交回看、修订预填/第 2 版发布、订单入口/详情/返回和状态筛选；已核对 mobile-quote-reject-dialog-android.png、mobile-quote-rejected-android.png、mobile-quote-revision-dialog-android.png、mobile-quote-revised-android.png、mobile-orders-list-android.png、mobile-order-detail-android.png 和 mobile-orders-filtered-android.png。以上为 MuMu + Expo Go，不是独立 APK 或真机验证。

全仓构建、check:mobile、build:mobile 的 Android/Web bundle、报价及业务纯规则、原生首版/确认接口、原报价拒绝/修订/订单事务、鉴权及已连接 Web 页面、原页面与基础 RN Web 导航回归通过。Expo 依赖校验使用离线本地映射；没有执行新的安装包、iOS 或真实渠道验证。

基础 verify:mobile-android 同样通过，原生首页、触摸进入须知与 Android 返回正常。

## 报价型订单开工与履约

当前维修员在任务详情读取关联服务订单，待开工时通过 StartOrderAction 确认开工；已开工后复用 SubmitTaskResultAction 提交文字结果，报修用户仍用 ConfirmTicketAction 确认完成。新 TaskOrderSection 只负责读取与组合，订单与工单状态同步仍在既有 NestJS 事务中完成。直接处理任务保留原入口，未开工报价型任务不显示结果动作。Web/RN 开工与结果入口共用 contracts/order-rules 的纯规则，不共享界面或凭据。

GET mobile/tasks/:id/order 复用 OrdersService，POST mobile/orders/:id/start 复用 OrderStartsService/StartOrderDto；仅当前维修员，保留 NativeClient/NativeSessionGuard 的浏览器/原生边界。开工弹窗固定 UUID 和原工单版本，关闭重读，不自动重试写请求。取消/开工竞争、待处理退款门槛、审计和幂等沿用原服务。新增界面不引入数据库迁移或支付能力，也未扩展异地网关。

订单列表创建时间与快照中的确认/开工/取消时间共用 shared/utils/date，按设备本地时区显示 YYYY-MM-DD HH:mm:ss；ISO 中的 Z 仍表示 UTC，不能仅替换字符冒充本地时间。

本轮新增 verify:mobile-order-fulfillment 和对应 -android 套件通过：未开工结果门槛、当前维修员/本人范围、原生浏览器边界、DTO/版本、开工防重与取消竞争、订单/工单完成同步；模拟器覆盖开工关闭不写入、成功响应丢失后同 UUID/版本重试、文字结果提交、切换报修用户确认完成，以及创建时间格式。已核对 mobile-order-start-dialog-android.png、mobile-order-completed-android.png 与 mobile-order-created-time-android.png。证据为 MuMu + Expo Go；不包含新 APK、真机、iOS、真实支付或异地网关验证。

本轮全仓构建、check:mobile、Android/Web bundle 导出、test:mobile-dates、test:orders、test:mobile-quotes、test:business，以及既有 Web 开工/履约 API 与页面、原生结果/确认 API、鉴权与已连接入口、原页面和 RN Web 基础导航回归均通过。Expo 依赖校验使用离线本地映射。

既有 verify:mobile-results-android 与 verify:mobile-confirmations-android 均通过，覆盖直接处理结果表单清理、结果不明原意图重试、旧窗口冲突、重启回看和用户确认。已核对对应原生结果表单与完成记录截图。
基础 verify:mobile-android 通过：原生首页、触摸导航和 Android 返回正常。

## 本人订单取消

报修详情与独立订单详情共用 features/orders/CancelOrderAction，取消原因去首尾空白后 1～500 字符，复用 ORDER_LIMITS、MutationModal/useApiMutation 与 Expo Crypto UUID。同一规范化原因在结果不明时保持原意图，原因变化才生成新 UUID；关闭、成功或账号/对象变化时清理输入并重读。订单详情通过本人报修接口读取当前工单版本，不将只读订单摘要当成提交版本。

POST mobile/orders/:id/cancel 仅报修用户，复用 OrderCancellationsService 和 CancelOrderDto。服务端仍按本人归属、待开工状态、工单版本及支付状态校验；状态、取消审计和 pending 模拟支付关闭共用既有事务。开工后不能取消，已模拟成功时拒绝并整体回滚。RN 不读取金融记录，取消入口先按订单/工单状态判断，最终以服务端为准；页面说明已模拟成功应在门户查看退款。

canCancelOrder 从门户移到 contracts/order-rules，门户与 RN 使用相同的纯入口规则，不共享 UI 或会话。订单/工单取消记录只读回看，原报价与金额快照保持。无数据库迁移、异地网关扩展、RN 支付或新 APK。

本轮 verify:mobile-order-cancellations 与对应 -android 套件通过：原因校验/规范化、当前归属和原生浏览器边界、版本冲突、六路相同意图只写一条审计、pending 模拟单关闭、模拟成功后的取消回滚、开工竞争；Android 覆盖关闭不写入/重开清空、响应丢失原意图重试、重启回看，以及已开工旧窗口冲突、关闭重读隐藏入口。已核对 mobile-order-cancel-dialog-android.png、mobile-order-cancelled-android.png、mobile-order-cancel-conflict-android.png 与 mobile-order-cancel-after-start-android.png。类型/依赖、业务/订单纯规则和 Android/Web bundle 检查通过；证据为 MuMu + Expo Go，不代表新 APK、真机、iOS 或真实交易验收。

全仓构建、原取消 API/门户界面、报价确认/订单、开工、模拟成功及取消互斥、门户与 API 鉴权、已连接入口、原页面、RN Web 基础导航和基础 Android 导航回归均通过。临时记录定向清理，模拟器 API 映射恢复；本增量未生成新安装包。

## 本地模拟支付

报修用户在独立订单详情读取本人模拟支付记录，创建待支付单、确认本地模拟成功、刷新查单并查看超时关闭。创建与成功确认分别组织 Action 和弹窗，共用 MutationModal/useApiMutation；创建 UUID 在窗口内固定，金额不随请求提交。成功确认绑定原订单/支付单 ID，以服务端终态幂等，不能把客户端跳转或按钮反馈作为结果。关闭、成功后重读订单、工单与支付记录；结果不明不自动重试写请求。

原生 NativePaymentsController 仅提供本人 GET/POST mobile/orders/:id/payments 与 POST mobile/orders/:id/payments/:paymentId/mock-success，复用 PaymentsService 和 CreateMockPaymentDto。金额/币种来自服务端快照，取消/确认共用原工单锁，超时关闭使用数据库时钟。支付记录与维修状态分别显示，页面不依赖手机时钟决定成功或超时，不新增定时任务。创建新单必须使用新 UUID，原创建意图重放保持原记录。

features/payments 集中请求、账号绑定读取 Hook、入口规则、记录展示与动作；订单详情负责组合。读取失败仍可显示订单摘要，但不开放取消/创建/确认；报修详情同样读取本人支付状态后决定取消入口。账号/订单切换取消旧读取，不在本模块保存凭据，不向维修员开放金融接口。当前退款能力见后续“模拟退款申请与查询”章节；管理员处理仍在 Web，不开放原生处理入口。

本增量是本地模拟，不是微信/支付宝沙箱或真实交易；不集成真实支付 SDK，不调用外部支付服务。无数据库迁移、异地网关扩展、新 APK、真机或 iOS 新增验收。

verify:mobile-payments 与 verify:mobile-payments-android 已通过。原生接口覆盖本人/角色/浏览器边界、创建 DTO、金额/币种快照、同意图并发唯一记录、成功终态幂等、取消竞争、数据库时钟超时及新意图重新创建。Android 覆盖两个弹窗关闭不写入、创建 UUID 与成功支付单 ID 的响应丢失重试、冷启动回看、两处取消入口隐藏、刷新超时关闭与重新创建。超时场景仅调整本轮临时支付记录的截止时间，正常新单仍验证为 15 分钟有效期。

已核对 mobile-payment-create-dialog-android.png、mobile-payment-pending-android.png、mobile-payment-confirm-dialog-android.png、mobile-payment-succeeded-android.png、mobile-payment-ticket-gate-android.png 和 mobile-payment-expired-android.png。以上为 MuMu + Expo Go，不属于独立安装包、真机、沙箱或真实支付验证。类型/依赖检查、业务规则和 Android/Web 导出通过。

本轮全仓构建、原模拟支付 API/界面、模拟成功、模拟超时、订单取消/查询、门户与 API 鉴权、原生取消/报价确认 API、已连接入口及原页面回归通过。原生取消交互和基础 Android 导航同样通过；临时记录定向清理，模拟器 API 映射恢复。真实渠道、原生退款命令及新安装包未纳入本轮交付。

## 模拟退款申请与查询

报修用户在独立订单详情的已模拟成功支付单中申请全额模拟退款。RequestMockRefundAction 管理原因与提交意图，RefundSummary 展示待处理或模拟成功、金额、原因、申请时间及处理人/时间。申请不会立即结束订单或变更原支付事实；只有管理员通过现有 Web 操作记录模拟退款成功，订单与工单才按原事务一起结束。申请待处理期间服务端阻止开工。

POST mobile/orders/:id/payments/:paymentId/refund 复用 RefundRequestsService 和 RequestMockRefundDto；原生适配只允许本人申请，不提供管理员处理路由。GET 本人支付记录复用原查询返回退款及处理记录。金额不随请求提交，取自原支付单；规范化原因与 Expo UUID 绑定，同原因结果不明时原意图重试，原因变化才生成新 UUID。关闭、成功和账号/对象变化会清理窗口并重读实际状态，取消请求不等于回滚。

contracts/payment-rules 提供 REFUND_LIMITS.reason 与 canRequestMockRefund，供 API DTO、门户和 RN 按实际职责共用，根入口仍只有类型。仅当前订单待开工、支付已模拟成功且没有退款申请时展示入口；服务端独立校验当前归属、状态、金额和并发。确认模拟成功弹窗已增加支付单编号与金额核对提示。非登录原因输入禁用 autofill，纵向间距沿用紧凑布局和主题 Token。

本增量不修改数据库结构，不接真实退款渠道，不开放原生管理员处理，不扩展异地网关或生成新 APK。待处理与成功分别显示，不把本地模拟记录表述为真实资金退回。

2026-11-12 新增 verify:mobile-refunds 与 verify:mobile-refunds-android 通过：本人/角色/Origin/Cookie/DTO 边界、规范化原因、相同意图六路仅一条申请、全额取自服务端、版本更新和开工竞争、申请期间暂停开工，以及现有 Web 管理员处理后原生回看。Android 覆盖金额核对提示、原因必填、关闭不写入/重开清空、响应丢失后同 UUID/原因重试、待处理回看、管理员完成后刷新与冷启动状态同步。

已核对 mobile-payment-confirm-check-android.png、mobile-refund-request-dialog-android.png、mobile-refund-requested-android.png、mobile-refund-completion-record-android.png 与 mobile-refund-order-cancelled-android.png。以上为 MuMu + Expo Go；不代表真机、独立 APK、沙箱或真实退款。test:payment-rules、test:business、check:mobile 与 Android/Web bundle 导出通过。

本轮全仓构建、原模拟退款申请/管理员处理、模拟支付创建/成功/超时、开工、原生支付、门户/API 鉴权、已连接入口、原页面和 RN Web 基础导航回归通过。共享退款原因限制与入口规则保持原行为，测试临时记录按本轮编号清理，未扩大原生角色权限或异地网关范围。
