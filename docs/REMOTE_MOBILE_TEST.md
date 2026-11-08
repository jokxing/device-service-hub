# 异地移动端内测

本方案为 Android 安装包提供短期 HTTPS 测试入口，共用现有 NestJS/PostgreSQL；不构成服务器部署、正式发布或生产环境交付。Next.js 门户、Web 管理入口与数据库端口不通过该入口开放。

## 账号、数据与请求边界

`remote:mobile:setup` 仅针对项目专用本地库运行，创建两个独立账号（报修用户、维修人员）和一台独立虚拟设备。账号密码随机生成，不修改原账号；报修用户只授权本台测试设备，维修人员只读取当前被分派的任务。管理员分派继续从本机 Web 后台执行，不创建远程管理员。

配置和凭据仅保存在被忽略的 `.local/remote-mobile/accounts.json` 与 `.local/private-docs/异地真机测试账号.md`。已有配置拒绝覆盖；设备与工单记录不自动删除。测试入口配置默认 48 小时有效，超过窗口拒绝业务访问；这不等于自动停用数据库账号。

`remote:mobile:start` 在 127.0.0.1:4301 启动受限转发：

- `/health` 仅返回入口运行标记，不包含账号、设备或业务数据，可供手机浏览器检查连通性。
- 按方法和明确路径允许原生登录、会话、设备、本人报修、任务、完成确认及现场照片接口，其他路径返回 404；没有静态文件或 Web/admin 转发。
- 登录只允许配置中的专用用户名，由原 AuthService 验证密码；成功响应再次检查 ID、用户名与角色，配置不一致则撤销所创建的会话。
- 其他请求先通过原生 `auth/me` 复核当前用户，再核对专用账号，原账号即使携带有效 Bearer 也不能穿过入口。设备归属、工单迁移、并发与幂等仍由原业务服务执行。
- 不删除 Origin、Cookie、Sec-Fetch 标头来绕过后端：出现这些浏览器标头直接拒绝。出站使用原生 HTTP 传输，避免 Node fetch 自动添加 Sec-Fetch 标头。
- 全入口业务请求每分钟最多 180 次，登录最多 12 次，最多 16 个连接；这是单进程内测预算，不依赖可伪造的转发 IP，不代表生产防护。
- 普通请求最多 8KB，照片上传请求最多 6MB；后端继续执行单图 5MB、格式解码和授权检查。转发设超时且不自动重试写操作；发生超时须核对实际业务结果。

Cloudflare Quick Tunnel 只转发该受限入口，不直连 3001 或 4174。临时域名由 Cloudflare 提供，停止或重建隧道可能导致原地址失效；进程存活也不保证临时隧道持续可用，测试前须检查实际 HTTPS 连通性。公开示例、日志和截图中不保存实际域名或密码；实际地址在 `.local/remote-mobile/endpoint.json`。

## Android APK 构建边界

`build:mobile:apk` 通过项目局部 JDK、Android SDK 和 Gradle 生成 release APK，包含 JS/Hermes bundle，运行不依赖 Expo Go、Metro 或 ADB reverse。构建架构为 arm64-v8a 与 x86_64，独立内测签名不用于商店发布。

- JDK 21 用于本地 Gradle 运行，JDK 17 满足 React Native 插件编译工具链。Android Platform 36、Build Tools 35.0.0/36.0.0、NDK 27.1.12297006、CMake 3.22.1 和 Gradle 9.3.1 均置于 `.local/android-build`；Gradle 版本按生成工程的 wrapper 核对，不擅自升级。
- Android 命令行工具与 Gradle 发行包已核对官方 SHA256；只使用官方发行来源。下载归 `.local/android-build/downloads`，Java 用户目录、临时文件和 Gradle 缓存也归 `.local`，无全局安装。
- `apps/mobile/app.config.ts` 默认保留既有 Expo 配置，仅在本地 APK 模式加入内测名称和签名插件，禁用应用备份并移除不需要的悬浮窗权限。相机与照片插件沿用既有实现，不新增麦克风授权。
- Android 原生工程由 CNG 生成在被忽略的 `apps/mobile/android`；可重复生成，不能在其中保存唯一业务实现。签名文件、密码和产物都不提交。
- Windows 上 CMake 3.22.1 附带 Ninja 1.10.2，部分 RN 头文件超过 260 字符会导致增量依赖检查失败。本地打包脚本仅清理已校验项目路径内的 `.ninja_deps` 生成日志，使原生依赖重新编译；不改注册表、系统长路径开关或依赖源码。代价是相关原生模块不能完整利用增量缓存。
- APK 编译时嵌入已验证的临时 HTTPS 地址。隧道重建换域名后，这一版本需要重新构建；当前没有运行时修改服务地址功能。

产物归 `.local/artifacts/android`：APK、SHA256/地址/构建时间记录以及独立安装包验收结果分别保存，不把 JS 导出当作 APK。

## 命令与验证

Windows 通过 `scripts/npm-local.ps1 run <脚本名>` 执行。构建先准备本地工具链和 HTTPS 测试入口；启动脚本不自动创建隧道、开放端口或停用其他服务。

| 命令 | 职责 |
| --- | --- |
| `remote:mobile:setup` | 创建独立内测数据与私有凭据，拒绝覆盖 |
| `remote:mobile:start` | 本机受限入口 |
| `test:remote-mobile` | 临时回显服务验证路由、浏览器拒绝、账号白名单、Multipart 保真、限额与错误处理 |
| `verify:remote-mobile` | 本机真实 API 验证独立账号、设备归属、文字报修和退出 |
| `verify:remote-mobile:public` | 对私有配置中的临时 HTTPS 入口执行同一真实业务检查 |
| `build:mobile:apk` | 本地内测签名与 release APK |
| `verify:mobile-apk:android` | 已安装 APK 的独立原生、HTTPS 和文字闭环验收 |
| `remote:mobile:disable` | 仅停用这两个专用账号并撤销其会话，保留工单记录 |

验证只按本轮随机提交 UUID 清理临时工单；原人工数据不在清理范围。管理员设备回归显式识别新增测试设备，原两名报修用户与维修人员的范围断言保持不变。

结束内测须停止隧道与受限入口，并运行停用命令；签名密钥需要保留供同签名更新，但不得随 APK 发给测试人员。没有进行真实 Android 手机安装或实体摄像头验证前，不标记为真机通过。

## 验证记录

2026-11-08：受限入口单元检查、本机真实 API 与临时 HTTPS 实际访问通过；既有 `verify:api`、`verify:mobile-api` 和 `verify:connected-ui` 通过。Expo 严格类型/SDK 依赖检查及 Android/Web 静态导出通过。

Gradle release 组装成功，APK 约 73.3 MiB，签名验证通过；包名 `com.deviceservicehub.app`，版本 0.1.0，最低 API 24、目标 API 36，包含 arm64-v8a 与 x86_64。安装包未声明麦克风或悬浮窗权限。产物复制、构建信息和 SHA256 校验已完成，Windows PowerShell 校验与模拟器已安装包哈希一致。

MuMu Android 15 独立 APK 验收通过：冷启动、原生登录、独立设备范围、文字报修、冷启动恢复、管理员从本机 API 分派、APK 维修员接单与提交结果、APK 报修人确认完成及退出。验收过程中没有 Metro/API 的 ADB reverse，也未使用 Expo Go；本轮随机 UUID 工单已精确清理。截图已查看；此次独立 APK 尚未验证相册上传、相机交互或实际光学识别，先前 Expo Go 的相关结果不能替代本包验证。实体 Android 安装、实体摄像头与 iOS 原生未验证。

截图：[APK 登录](screenshots/mobile-apk-login.png)、[独立设备](screenshots/mobile-apk-devices.png)、[文字报修](screenshots/mobile-apk-repair.png)、[任务结果](screenshots/mobile-apk-task-result.png)、[完成确认](screenshots/mobile-apk-completed.png)。截图中的工单为本轮临时验收数据。

参考：[Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/)、[Expo 本地构建](https://docs.expo.dev/guides/local-app-production/)、[Android 命令行工具](https://developer.android.com/studio#command-line-tools-only)、[Microsoft OpenJDK](https://learn.microsoft.com/java/openjdk/download)、[Gradle 发行包校验](https://gradle.org/release-checksums/)。
