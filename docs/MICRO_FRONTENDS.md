# Web 微前端集成

## 当前交付

`apps/shell` 使用 qiankun 2.10.16 集成 React 工单后台与 Vue 设备台账。三个应用独立构建，共用既有 NestJS/PostgreSQL；React 后台原入口保留，Next.js 门户与 RN 保持独立。

Vue 子应用提供当前账号授权设备列表、详情、刷新、空态和错误处理，不增加设备编辑、删除或新的业务后端。登录与退出沿用 React 服务入口，不建设第二套认证系统或跨域 SSO。

## 应用和构建边界

| 工作区 | 独立入口 | 主应用路由 | 兼容构建资源服务 |
| --- | --- | --- | --- |
| `apps/shell` | 5174 开发 / 4174 构建预览 | `/` 总览 | 不适用 |
| `apps/web` | 5173 开发 / 4173 预览 | `/tickets/*` | 5175 |
| `apps/devices` | 5176 开发 / 4176 预览 | `/devices`、`/devices/:id` | 5177 |

- 沿用稳定版 qiankun 2；核对时 3.x 的 Vite 原生 ESM 支持仍处 RC 通道。React/Vue 独立入口保留 Vite ESM，兼容构建单独输出 UMD 生命周期和 HTML/CSS。两种入口共用本应用页面，不复制业务源码。
- Vue 使用 3.5.45、Router 4.6.4、Vite 8 和 vue-tsc；不额外安装状态库或组件库。只读页面使用原生控件和 CSS Modules，React 后台继续使用 Ant Design。
- 兼容构建包含各自运行时，暂不共享 React/Vue 依赖。独立后台仍有既有包体积提示，不宣称已完成包体优化。
- Vue UMD 导出名与注册名同为 `device-service-devices`。Vue 初始化会写入框架全局，不能只依赖 qiankun 对“最后写入全局变量”的导出推断。
- Shadow DOM 为两个子应用隔离静态样式。React 的 StyleProvider 和 Ant Design 浮层/消息容器保持在子应用内部；Vue 不向主应用注入页面样式。qiankun 2 的 strictStyleIsolation 已提示未来版本将移除，升级需重新评估。

参考：[qiankun 2 生命周期](https://v2.qiankun.umijs.org/guide/getting-started/)、[qiankun 2 API](https://v2.qiankun.umijs.org/api/)、[Vite Library Mode](https://vite.dev/guide/build.html#library-mode)、[Vue Application API](https://vuejs.org/api/application)、[Vue TypeScript](https://vuejs.org/guide/typescript/overview)。适配代码使用公开 API 自行实现，不复制第三方业务源码或素材。

## 目录职责与生命周期

- 主应用 `App.tsx` 组装路由，`layouts` 管理外壳和导航，`pages` 组合业务入口。`micro/apps.ts` 集中应用名称、地址与前缀，`MicroAppView` 共用加载/失败界面，`useMicroApp` 共用串行挂载与卸载。
- 切换 React/Vue 时等待旧实例卸载；StrictMode 不同时创建两个活动实例。应用内部路由变化不重新挂载；通信回调使用当前值，卸载后的回调被忽略。
- React `main.tsx` 与 `micro.ts` 共用 `app/createApplication.tsx`。卸载调用 React Root.unmount，既有 Hook 取消读取并清理表单/图片内存；取消写请求不等于事务回滚。
- Vue `App.vue` 只组装 `layouts/DevicesLayout.vue`，会话在当前应用实例内提供，设备页面归 `features/devices`。`shared` 只包含传输、读取生命周期和跨页面视觉样式。
- Vue 每次挂载创建独立 App、Router、history 和会话。卸载执行 app.unmount/history.destroy，组件读取通过 AbortController 取消；不使用模块级可变用户缓存。
- 导航选中态从 URL 推导：总览只匹配 `/`，工单匹配 `/tickets/*`，设备匹配 `/devices/*`。筛选、详情、刷新与前进后退保留真实路由。
- 子应用未知路由只显示兜底页面，不重定向到本应用首页；共享 history 下，离开子应用时也会收到主应用的路由事件，兜底重定向会抢回主应用导航。Vue 未知页面提供显式返回链接。
- 主布局通过 ResizeObserver 提供剩余视口高度 `--micro-viewport-height`；登录按剩余区域居中，独立入口回退至 100dvh。短屏自然滚动，观察器在卸载时断开。
- 资源加载失败显示错误和“重新加载”。qiankun 2 会缓存失败的入口或生命周期 Promise，重试刷新当前文档以清理失败缓存；不自动重试业务写请求。

## 最小通信协议

共享包根入口只声明 `ServiceNavigationRequest` 类型，不提供 UI、身份缓存或事件总线。Vue 通过主应用注入的回调发送两种消息：

```json
{"version":1,"action":"sign-in"}
{"version":1,"action":"open-device","deviceId":"device-ac001"}
```

主应用将输入视为 unknown，核对版本、动作及设备 ID 格式后映射到固定内部路径，不接受任意 URL。`sign-in` 转到 `/tickets/login`；`open-device` 转到 `/tickets/service/devices?deviceId=...`，React 读取真实详情并打开弹窗，刷新后仍可还原。关闭弹窗只清除该参数，保留其他查询条件。

消息不传账号、角色或令牌。Vue 和 React 各自通过服务端会话重新读取设备权限；伪造设备 ID 仍由后端返回 404。前端消息校验不构成业务授权，沙箱也不是不可信代码的安全边界。

## 会话与数据范围

Vue 只调用 GET `/api/auth/me`、`/api/devices`、`/api/devices/:id`，共用现有 HttpOnly Cookie 与后端授权。管理员读取现有设备范围，两名报修用户各自读取授权设备，维修人员没有独立设备授权时显示空态，不因进入微前端扩大权限。

新挂载先复核会话；401 清除身份和设备内容，换账号后重新请求。错误读取可显式重试，旧请求取消后不回填。当前没有跨标签页登录广播或集中退出；不能将本地共享 Cookie 等同于完整单点登录。

主应用同源 `/api` 代理保留浏览器原 Origin，后端继续只允许明确配置的来源。5174/4174 为已有允许项；Vue 只读独立服务不新增写请求来源。所有服务仅监听本机，数据库模型、迁移及权限规则未修改。

## 本地运行

先启动本项目数据库/API，再构建：

```sh
npm run build:micro
```

分别在三个终端运行：

```sh
npm run preview:micro:web
npm run preview:micro:devices
npm run dev:shell
```

Windows 通过 `scripts/npm-local.ps1 run <脚本名>` 执行，缓存与临时文件留项目 .local。访问 `http://127.0.0.1:5174`。5175/5177 只提供兼容资源，不能作为业务入口；独立开发使用 `dev` 或 `dev:devices`。

| 命令 | 用途 |
| --- | --- |
| `build:micro:web` | React 兼容构建，输出 `apps/web/dist/micro` |
| `build:devices` | Vue 类型检查与独立构建，输出 `apps/devices/dist` |
| `build:micro:devices` | Vue 兼容构建，输出 `apps/devices/dist/micro` |
| `build:shell` | 主应用独立构建 |
| `build:micro` | 顺序构建上述产物 |
| `preview:shell`、`preview:devices` | 4174/4176 的生产构建预览，用于自动化检查 |
| `test:micro-navigation` | 协议动作、版本、设备 ID 与任意 URL 拒绝 |
| `verify:micro` | React 子应用、导航与登录布局回归 |
| `verify:micro-devices` | Vue、跨框架通信与生命周期验证 |

根 build 包含上述构建。兼容入口修改后需重建并刷新，不承诺 HMR；独立入口保留各自 Vite 开发体验。根 .env 若显式配置 WEB_ORIGINS，保留旧项并包含 5174/4174 的精确来源，修改后重启 API，不公开凭据。

## 验证范围

2026-11-08：Vue 集成首轮通过独立/兼容构建、管理员/两名报修用户/维修人员四角色范围、越权详情与 React 再鉴权、401 清理、换账号、详情直达/刷新/前进后退、Vue→主应用→React 详情跳转、390px 卡片、读取失败重试和资源入口失败恢复。Vue 内部路由保持原实例；反复切换两个子应用后只有一个活动根节点，路由监听数量稳定，离页会触发未完成读取的 AbortSignal。

最终全项目 build、Vue 类型检查、test:micro-navigation、verify:api、verify:micro-devices、verify:micro、verify:connected-ui 和 verify:ui 均通过，已核对桌面/390px/详情/跨应用界面截图。开发主应用 5174 与生产预览 4174 都完成 Vue→React 详情导航，Vue 独立预览 4176 可读取同一授权数据。Vue 兜底页已明确禁止自动重定向，避免在共享 history 中抢回主应用导航；该行为已纳入未知路径和跨应用测试。

验证只创建/撤销测试会话，不修改人工设备和工单。协议检查拒绝外链、未知版本/动作及非法 ID。浏览器验证使用本地 Edge，尚未覆盖其他浏览器、生产反向代理、部署、跨域登录或复杂全局状态同步；局部监听检查不等同于全局内存泄漏证明。

首步演示回归曾出现一次 useContext 错误，单独重跑通过，根因未复现；未将其归因为已修复的缓存问题。此次 Vue 验证过程中 API 曾暂时不可用，恢复后完整重跑通过，没有向业务请求添加自动重试。

截图：[Vue 设备台账](screenshots/micro-vue-devices.png)、[设备详情](screenshots/micro-vue-device-detail.png)、[窄屏](screenshots/micro-vue-devices-mobile.png)、[跨应用详情](screenshots/micro-device-navigation.png)、[Vue 加载失败](screenshots/micro-vue-load-failure.png)、[React 后台](screenshots/micro-tickets-desktop.png)。
