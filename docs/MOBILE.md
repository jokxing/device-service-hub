# React Native 移动端

## 当前交付范围

`apps/mobile` 是独立 Expo / React Native 工作区。首步交付服务首页、报修须知、原生 Stack 导航、主题、安全区与滚动布局，完成浏览器预览及 Android 模拟器运行验证。

已接通真实登录、会话恢复、退出及授权设备列表/详情。报修、维修任务、相机和上传尚未接入。设备来自同一 NestJS/PostgreSQL，范围由服务端决定；现有 Web 与门户继续保留。

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
   ├─ features/auth/     # 会话生命周期、SecureStore 与登录
   ├─ features/devices/  # 授权列表、详情与请求清理
   ├─ features/service/
   │  ├─ HomeScreen.tsx
   │  ├─ GuideScreen.tsx
   │  └─ content.ts       # 流程与角色说明
   └─ shared/
      ├─ theme.ts         # 颜色、字号、间距
      ├─ api/             # 地址、Bearer 传输、超时与错误
      └─ components/      # Screen、ContentCard
```

路由文件只组装或导出页面。公共组件不依赖业务内容；后续身份、设备与工单按实际功能增加模块，不预建空页面和按钮。

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

## 缓存与磁盘约束

- npm、TEMP/TMP、浏览器配置、Expo 用户设置、ADB 用户目录和 Gradle 用户缓存均通过启动脚本指向 `.local`，不安装全局 CLI。
- Expo CLI 57 的用户目录使用进程级 `__UNSAFE_EXPO_HOME_DIRECTORY` 覆盖；该设置只由启动脚本传入，不放入项目 `.env` 或客户端变量。
- RN DevTools 的 DotSlash 在 Windows 使用系统 Known Folder 路径，需要单独设置 `DOTSLASH_CACHE`。本地脚本已将其指向 `.local/dotslash`；说明见 [DotSlash 缓存配置](https://github.com/facebook/dotslash/blob/main/website/docs/flags.md)。
- 当前步骤曾发现调试器生成的系统盘缓存，已停止进程、核对本轮新建条目并清理，再验证底层工具报告的缓存路径为项目目录。没有删除既有用户文件或安装目录。

## 验证记录与边界

2026-11-06：

| 验证项 | 当前结果 |
| --- | --- |
| TypeScript、Expo 依赖检查、native 依赖树 | 通过，SDK 57 native 库一致 |
| Android JS/Hermes bundle 导出 | 通过 |
| React Native Web 导出与 390px 浏览器预览 | 通过，包含路由、刷新、返回和无运行错误检查 |
| MuMu Android 15 + Expo Go | 通过原生首页/须知，以及真实登录、设备详情、冷启动恢复、退出撤销、账号隔离与 401 清理 |
| 实体 Android 手机、iPhone | 未验证 |
| 本项目独立 APK/AAB、原生开发构建 | 未生成 |
| 原生鉴权与授权设备 API | 已接入，接口边界与账号归属验证通过 |
| 扫码拍照、上传、移动端报修与任务 | 未接入 |

截图：[原生登录](screenshots/mobile-android-login.png)、[授权设备](screenshots/mobile-android-devices.png)、[设备详情](screenshots/mobile-android-device-detail.png)、[模拟器首页](screenshots/mobile-android-home.png)、[模拟器须知](screenshots/mobile-android-guide.png)、[浏览器预览](screenshots/mobile-web-home.png)。模拟器结果与浏览器结果分别记录，不表示硬件设备通信或商业生产交付。

## 下一增量

下一增量为授权设备发起文字报修及本人记录，需确认后实施。共用 NestJS 幂等、状态与归属规则，随后逐步增加任务、完成确认，再安排扫码与拍照上传。
