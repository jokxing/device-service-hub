# Next.js 设备服务门户

## 当前交付范围

`apps/portal` 使用 Next.js 16 App Router、React、TypeScript、Ant Design 和 CSS Modules。当前提供登录、授权设备列表、动态设备详情、退出及加载/错误/未找到页面；共用现有 NestJS API 和 PostgreSQL，不增加业务后端或数据库访问层。

门户只对报修用户开放。管理员与维修人员继续使用 React 后台；门户报修、本人记录和完成确认属于后续独立增量。现有 React 用户入口保留为回归基线。设备仍为虚构样例，接口和数据库会话是真实实现，没有硬件通信。

## 目录职责

```text
apps/portal/
├─ next.config.ts
├─ .env.example
└─ src/
   ├─ app/
   │  ├─ layout.tsx、providers.tsx、globals.css
   │  ├─ login/page.tsx
   │  ├─ (service)/layout.tsx
   │  ├─ (service)/devices/page.tsx
   │  ├─ (service)/devices/[id]/page.tsx
   │  ├─ (service)/devices/loading.tsx
   │  ├─ api/auth/login/route.ts
   │  ├─ api/auth/logout/route.ts
   │  └─ error.tsx、not-found.tsx
   ├─ features/auth/
   │  ├─ components/（登录表单与退出按钮）
   │  └─ server/（会话读取与登录/退出适配）
   ├─ features/devices/
   │  ├─ components/（设备卡片与状态）
   │  └─ server/queries.ts
   └─ shared/
      ├─ components/PortalPage.module.css
      └─ server/（内部请求与 Cookie 配置）
```

页面只组合业务组件。`shared/server` 使用 `server-only`，不依赖业务模块；业务权限仍由 NestJS 决定。共享接口类型来自 `packages/contracts`，不跨工作区导入 Vite 页面、React Router、DOM 工具或身份上下文。

## 渲染、会话与缓存

- 设备列表、详情和用户身份由 Server Components 读取，授权内容出现在服务端 HTML 中。登录表单、退出按钮和错误重试为 Client Components；Ant Design 通过 Registry 注入服务端首屏样式。
- 现有 API Cookie `dsh_session` 的 Path 为 `/api`。门户使用独立名称 `dsh_portal_session`、Path `/`，值对应同一套 NestJS 数据库会话机制，不创建第二套身份库；后台 Cookie 的名称和路径不变，两种入口独立登录。
- 登录 Route Handler 检查准确的门户 Origin、JSON 类型和内容大小，再调用 NestJS 登录。成功后将后端会话设置为门户 HttpOnly、SameSite=Strict Cookie；令牌不写入浏览器存储、JSON 或 HTML。HTTPS 门户设置 Secure，本地 HTTP 验证不设置 Secure。
- 服务端只将门户会话转换为 NestJS 所需 Cookie。没有任意目标 URL、通用 API 代理或把浏览器全部 Cookie 转发到内部服务的逻辑。
- NestJS 继续检查写请求 Origin。默认配置仅增加准确的本地门户来源；根环境已有 `WEB_ORIGINS` 时也需显式加入门户来源，不能使用通配或关闭 Guard。
- 个人页面使用动态渲染，内部 fetch 显式 `cache: "no-store"`，认证响应也设置 no-store。React `cache` 只在一次服务端渲染内合并用户读取，不跨请求保存用户数据。
- 登录/退出成功后整页替换导航，清除客户端 Router 状态。退出必须先撤销后端会话，再清除门户 Cookie；失败保留反馈供重试，不声称已退出。
- NestJS 校验设备授权与账号状态；未登录或会话过期跳转登录。不存在和无权访问设备共用未找到页面。App Router 流式响应可能先发出 200，再以 not-found 标记呈现错误；不能仅靠流式页面的状态码判定授权成功。
- 非报修角色登录门户被拒绝，并撤销刚创建的会话。服务端查询还会核对角色，不能只通过隐藏按钮限制入口。

实现依据：[Next.js Cookie API](https://nextjs.org/docs/app/api-reference/functions/cookies)、[认证与授权边界](https://nextjs.org/docs/app/guides/authentication)、[fetch 缓存](https://nextjs.org/docs/app/api-reference/functions/fetch)。

## 本地运行

使用仓库根锁文件和 npm workspaces，不在门户单独生成锁文件。

1. 按 [API_SETUP.md](API_SETUP.md) 准备数据库与现有 API。保留原 `WEB_ORIGINS`，增加 `http://127.0.0.1:3000`，配置修改后重启 API。
2. 门户默认内部 API 为 `http://127.0.0.1:3001/api`，默认来源为 `http://127.0.0.1:3000`；需覆盖时参考门户 `.env.example` 创建被忽略的 `.env.local`。内部 API 地址不使用 `NEXT_PUBLIC_` 前缀。
3. 仓库根执行 `npm run dev:portal`，访问 `http://127.0.0.1:3000/login`。使用现有报修用户账号，凭据不写入公开文档。

```sh
npm run build:portal   # 门户类型检查与生产构建
npm run start:portal   # 启动已构建门户，本地 3000 端口
npm run verify:portal  # 需要门户与 API 已启动
```

开发服务与生产启动共用 3000 端口，二者择一。根 `npm run build` 覆盖 Web、API 和门户。门户产物在 `apps/portal/.next`，已配置忽略，不提交生成目录、环境凭据、缓存或 `tsbuildinfo`。

当前 Windows 环境仍通过仓库 `scripts/npm-local.ps1` 执行 npm，缓存、临时文件与浏览器资料放 `.local`，Next.js 遥测通过进程环境关闭；不安装全局工具，不下载额外浏览器或字体。

## 验证范围

`verify:portal` 检查未登录深链接、真实登录/退出、Cookie 属性、服务端 HTML、no-store、跨用户设备隔离、伪造字段与 Origin 拒绝、非报修角色、会话过期、刷新及 390px 布局。仅操作本轮会话，定向清理，不修改设备、账号授权或人工工单。

2026-11-06：Web/API/门户生产构建、门户浏览器与 SSR 核对、现有 API 权限及 React 登录入口回归通过。截图见 [设备列表](screenshots/portal-devices.png)、[手机设备详情](screenshots/portal-device-detail-mobile.png)。验证环境为本地 Windows、现有 Edge 和独立 PostgreSQL；未部署，未验证 HTTPS 生产环境、RN 或真机。
