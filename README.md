# 设备服务与售后工单平台

当前阶段：Web 开发环境、交互预览与模块化重构。React + TypeScript + Vite + React Router + Ant Design + Tailwind CSS。

结构与后续开发约定见 [ARCHITECTURE.md](docs/ARCHITECTURE.md)：布局、页面、业务组件、演示适配和公共方法分层管理。

## 本地启动

在 PowerShell 中执行：

```powershell
Set-Location -LiteralPath 'E:\project\device-service-hub'
.\scripts\npm-local.ps1 run dev
```

打开 http://127.0.0.1:5173 ，自动进入 `/tickets`；另有 `/devices` 和 `/records`。停止服务按 Ctrl+C。

首次安装或恢复依赖：

```powershell
.\scripts\npm-local.ps1 ci
```

构建检查：

```powershell
.\scripts\npm-local.ps1 run build
```

## 磁盘位置

- 使用现有 `E:\nodejs` 中的 Node.js 和 npm，不安装全局工具。
- 依赖在本项目 `node_modules`，构建结果在 `apps/web/dist`。
- `scripts/npm-local.ps1` 将 npm 缓存、全局前缀、用户配置位置、APPDATA、LOCALAPPDATA、TEMP、TMP 定向至本项目 `.local`。变量只作用于当前脚本进程及子进程，不修改系统配置。
- 为遵守本轮磁盘约束，暂用 npm workspaces，未使用位于 C 盘的 pnpm 入口；不同时维护两套锁文件。
- Tailwind 只导入主题与工具类，不启用全局 Preflight；Ant Design 负责业务组件，业务及布局样式使用 CSS Modules，基础样式在 `styles/global.css`。
- 所有命令请通过上述脚本运行，避免其他运行方式使用默认缓存目录。

## 体验方式

1. 默认管理员，可查看工单、按状态和关键词筛选、查看详情、分派。
2. 右上角切换报修用户“张明”，可查看本人记录、授权设备并新建报修。
3. 切换维修人员“王志远”，仅见分派给他的任务，可以接单、退回分派和提交结果。
4. 切换回报修用户，可确认本人待确认工单或反馈仍有问题。
5. 设备台账与维修记录提供只读演示。

所有设备、姓名、工单为虚构样例；修改保存在 React 内存中，跨页面保留、刷新重置。图片仅选择并显示文件名，未上传。没有真实 API、数据库、登录、服务端鉴权或硬件通信。角色切换不是真实认证机制。

本轮不包含后端、RN、微前端、部署或 Git 操作。下一步须经用户确认后再实施。

## 浏览器核对

`scripts/verify-ui.mjs` 使用现有 Edge 进行本地浏览器核对，不下载浏览器；临时目录和浏览器配置位于 E 盘 `.local`，截图位于 `docs/screenshots`。需先启动开发服务：

```powershell
.\scripts\npm-local.ps1 run verify:ui
```

核对覆盖桌面/窄屏、筛选、演示角色数据范围，以及分派 → 接单 → 提交结果 → 用户确认的界面链路；并检查路由直达刷新、前进后退、跨页面数据保留和弹窗清理，不代表后端业务测试。

关键纯业务规则测试：`.\scripts\npm-local.ps1 run test:business`。

2026-11-05 验证结果：TypeScript 与生产构建通过；现有 Edge 无头浏览器核对通过，覆盖 HTTP 200、关键词/状态筛选、角色数据范围、分派到用户确认、新增报修、390px 窄屏无页面横向溢出，未捕获页面运行错误。未做 Android/iOS、实体设备或真实后端验证。

模块化重构后再次验证通过：5/5 关键规则测试、完整界面回归、路由直达刷新与前进后退、跨页数据保留、表单及设备详情弹窗清理。

桌面截图：`docs/screenshots/workbench-desktop.png`；窄屏截图：`docs/screenshots/workbench-mobile.png`。

已知限制：主 JS 包约 1.14 MB（gzip 约 365 KB），构建有包体积提示；页面拆分已完成，资源按需加载仍可后续按实际需要优化。本轮不属于生产交付。
