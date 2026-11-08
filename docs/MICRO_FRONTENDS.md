# Web 微前端集成

## 当前交付与边界

`apps/shell` 是设备服务协同台主应用，通过 qiankun 加载现有 `apps/web` React 后台。两者独立构建，后台继续支持原有独立入口；没有复制页面或另建业务后端。Next.js 门户与 RN 保持独立，Vue 设备子应用和跨子应用业务通信留待下一增量。

本阶段是单主应用、单 React 子应用的本地集成验证，不代表已完成完整的 React/Vue 多应用平台或生产部署。

## 技术取舍

- 使用稳定版 qiankun 2.10.16；核对时 npm `latest` 仍为 2.x，3.x 原生 ESM/Vite 支持位于 RC 通道。暂不为接入改用预发布运行时，也不替换已有 Vite。
- 后台默认入口保留 Vite ESM 和 HMR。另用 `vite.micro.config.ts` 的 Library Mode 输出 UMD 生命周期及独立 HTML/CSS，适配 qiankun 2。两种构建共用页面、Provider、路由与业务 API，只有启动方式不同。
- 子应用运行包包含自己的 React/Ant Design，首步优先保证版本与生命周期独立；暂不进行运行时依赖共享或包体积优化。兼容构建为单包，普通后台构建仍有既有包体积提示，不将其解释为性能优化已完成。
- 使用 qiankun 的 JS 沙箱及 Shadow DOM 样式隔离。此选项属于 qiankun 2，3.x 已提示将移除，未来升级需重新评估，不能只修改版本号。沙箱用于可信应用的运行隔离，不构成对不可信源码的安全边界。

参考：[qiankun 2 生命周期](https://v2.qiankun.umijs.org/guide/getting-started/)、[qiankun 2 API](https://v2.qiankun.umijs.org/api/)、[Vite Library Mode](https://vite.dev/guide/build.html#library-mode)、[qiankun 版本状态](https://github.com/umijs/qiankun)。本项目使用公开 API 自行实现适配，不复制第三方业务源码或素材。

## 目录与责任

| 位置 | 责任 |
| --- | --- |
| `apps/shell/src/App.tsx` | 主应用路由，组合布局与页面 |
| `apps/shell/src/layouts`、`pages` | 主导航、总览和子应用承载页面 |
| `apps/shell/src/micro/tickets.ts` | 固定的子应用名称、资源入口、路由前缀 |
| `apps/shell/src/micro/useTicketsApp.ts` | 加载状态、资源读取超时和挂载/卸载串行协调 |
| `apps/web/src/app/createApplication.tsx` | 两种入口共用的 React 根节点与 Provider 创建/销毁 |
| `apps/web/src/main.tsx` | 原有独立后台入口 |
| `apps/web/src/micro.ts` | bootstrap/mount/unmount；只负责容器与生命周期，不实现业务 |
| `apps/web/vite.micro.config.ts` | UMD、HTML/CSS 和子应用资源 CORS |

主应用不跨工作区导入后台页面、Hook 或会话 Provider。当前 props 仅传递固定的 `basePath`，不传账号、角色授权、Cookie 或令牌；无需提前抽象跨应用状态总线。

## 路由与生命周期

- 主应用拥有 `/` 总览和 `/tickets/*` 承载区域；后台 BrowserRouter 以 `/tickets` 为 basename。原独立 `/service/admin/tickets` 在主应用中成为 `/tickets/service/admin/tickets`。
- 主导航“工单后台”按整个 `/tickets/*` 路由范围标记选中，覆盖登录、设备、工单及演示页面；点击仍进入管理员工单入口。“工作台总览”仅在主应用根路径选中，不另存导航状态。
- 筛选和分页继续使用原 URL 参数，真实页面与演示入口仍各自保留。演示角色不能改变真实服务身份。
- `mount` 只在传入容器内查询根节点，创建 React Root；`unmount` 调用 React 卸载，释放页面 Effect、请求与界面状态。既有请求 Hook 保持取消读取，取消写请求不等于事务回滚。
- 主应用将异步挂载和卸载串行执行，防止 StrictMode 或快速切换时新旧实例同时占用容器；每次进入使用独立承载节点。
- 资源加载失败显示错误与“重新加载”。qiankun 2 缓存失败的入口或生命周期 Promise，重试采用刷新当前文档，清理失败缓存后恢复原路径；不自动重试业务写请求。

## 样式与浮层

静态 CSS 位于子应用 Shadow DOM；公共变量和基础文字样式同时覆盖独立文档根与子应用根。Ant Design CSS-in-JS 使用每次挂载独立的 StyleProvider cache，写入同一 ShadowRoot。ConfigProvider 的浮层容器和 App 的消息/通知容器指向子应用根，避免弹窗、下拉菜单与图片预览逃逸到主页面 body。

主应用采用 CSS Modules，只有基础字体、背景和 body 约定留在全局。未启用 Tailwind Preflight，没有通过全局覆盖主应用解决子应用样式问题。

主布局用 ResizeObserver 测量顶部栏与导航的实际高度，通过继承的 `--micro-viewport-height` 提供剩余动态视口高度；布局卸载时断开观察。登录页按该区域居中，独立运行回退到 `100dvh`，不写死主导航高度。短屏容纳不下表单时保留内边距并自然滚动，不裁切按钮。

## 登录与后端边界

主应用 `/api` 同源代理至既有 NestJS，保留浏览器原始 Origin；只增加本地主应用 5174、4174 两个明确允许的来源，不使用 `*`，也不伪造为旧后台来源。API 仍仅监听本机，数据库结构与业务规则不变。

当前登录由 React 后台负责。页面通过服务端有效 Cookie 会话读取身份，NestJS 决定数据范围；主导航不构成授权。开发环境同 hostname 的后台和主应用会共享原 `/api` Cookie，端口本身不是 Cookie 隔离边界；重新挂载时重新查询身份。尚未实现多子应用登录广播、集中退出或跨域 SSO，不将共享 Cookie 等同于完整单点登录方案。

## 本地启动

先启动本项目数据库和 API，见 [API_SETUP.md](API_SETUP.md)。构建并在两个终端启动：

```sh
npm run build:micro
npm run preview:micro:web
```

```sh
npm run dev:shell
```

Windows 使用 `scripts/npm-local.ps1 run <脚本名>`，保留项目内缓存与临时目录设置。访问 `http://127.0.0.1:5174`。React 兼容构建资源服务为 `127.0.0.1:5175`，它只提供资源，业务入口通过主应用打开，不把该资源地址当作独立后台。

| 命令 | 用途 |
| --- | --- |
| `build:micro:web` | 构建后台兼容包至 `apps/web/dist/micro` |
| `build:shell` | 构建主应用至 `apps/shell/dist` |
| `build:micro` | 顺序构建上述两个产物 |
| `preview:micro:web` | 5175 子应用资源预览，仅允许 5174/4174 读取 |
| `dev:shell` | 5174 主应用开发服务及 API 代理 |
| `preview:shell` | 4174 主应用生产构建预览及 API 代理 |
| `verify:micro` | 已启动 4174/5174/5175 后的真实集成验证 |

根 `build` 已包含微前端两个构建。修改后台源码后需重新执行 `build:micro:web` 并刷新主应用；微前端兼容入口不承诺 HMR。原有 `dev` 仍提供 5173 独立后台 HMR。

根 `.env` 若显式配置 `WEB_ORIGINS`，保留已有项并添加 `http://127.0.0.1:5174`、`http://127.0.0.1:4174`，随后重启 API。公开 `.env.example` 仅提供来源与占位配置，不保存私有凭据。

## 验证记录

2026-11-07：`verify:micro` 首轮通过独立兼容构建的加载、真实 Cookie 登录、管理员/两名报修人范围、前端角色拦截与后端 403、筛选 URL、直达/刷新/前进后退、Shadow DOM 和 Ant Design 弹窗/下拉菜单、390px 布局。连续四次挂载/卸载保持一个 React 根，卸载后的路由监听数量稳定；资源入口不可用时显示错误，恢复后整页重载可重新进入。

验证仅创建本轮随机工单，结束后精确清理该工单及测试会话，不修改人工记录。尚未验证 Vue 子应用、跨子应用通信、其他浏览器、生产反向代理或线上发布；没有将局部监听检查描述为全局内存泄漏证明。

最终全项目构建、`verify:api`、`verify:micro`、`verify:connected-ui`、`verify:web-photos` 和 `verify:ui` 通过。独立演示回归曾捕获一次 `useContext` 运行错误，依赖树检查未发现 Web 多版本 React，单独重跑通过；该次错误根因尚未复现，不将其归因为已修复的缓存问题。门户构建首次遇到 Windows EPERM，原命令重新构建通过，未修改门户代码或放宽类型检查。

截图：[主应用总览](screenshots/micro-shell-overview.png)、[React 工单后台](screenshots/micro-tickets-desktop.png)、[窄屏](screenshots/micro-tickets-mobile.png)、[详情弹窗](screenshots/micro-ticket-detail.png)、[加载失败](screenshots/micro-load-failure.png)。
