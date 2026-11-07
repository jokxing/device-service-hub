# 工单现场照片

## 交付范围

报修用户先提交文字工单，再在 RN 报修详情补充现场照片。拍照或系统相册选择后预览、确认上传；文字建单与照片是独立意图，图片失败不会再次创建工单。维修人员在本人任务详情只读查看照片。

Web 管理员在真实工单详情中查看现场照片，使用 Ant Design 放大预览，辅助分派判断。Web 上传、门户附件界面、维修结果照片、删除/替换照片、云存储或后台上传队列尚未实现。

## 规则与权限

- 每单最多 3 张，每张原始文件最多 5MB；仅静态 JPG、PNG、WebP，解码上限 2400 万像素。既验证声明类型，也验证实际解码格式，拒绝伪装图片、动画和损坏文件。
- 服务端按方向校正、最长边 1600px、WebP 质量 80 重新编码，默认剥离 EXIF 等原始元数据。生成随机存储键，不使用用户提供的文件名或路径。
- 仅工单报修人在 `pending` 阶段可追加。分派或终结后拒绝新照片；不修改已有工单状态、版本、文字建单请求摘要和审计流程。
- 查看范围为报修人本人、管理员、当前被分派的维修人员；不依赖设备授权间接放开所有工单。分派关系撤销后维修人员不再能读取照片；未知与越权记录均返回 404。
- 每次上传使用客户端 UUID。相同 UUID、同工单、同上传人和相同原始内容可安全重试；同 UUID 不同内容返回 409。已经成功的意图在分派后仍可重放，但不会追加新照片。

## 接口与实现

| 接口 | 用途 |
| --- | --- |
| GET `/api/mobile/tickets/:ticketId/photos` | 读取照片元数据，不返回内部路径、内容摘要或账号信息 |
| POST `/api/mobile/tickets/:ticketId/photos/:id` | Multipart 上传；只接受一个 `file`，不接受额外表单字段 |
| GET `/api/mobile/tickets/:ticketId/photos/:id` | 鉴权后返回 `image/webp`，使用 `no-store` |
| GET `/api/admin/tickets/:id/photos` | Web 管理员读取元数据，仅接受有效 Cookie 会话 |
| GET `/api/admin/tickets/:id/photos/:photoId` | Web 管理员鉴权后读取 WebP；无静态文件入口 |

原生控制器复用 NativeSessionGuard 和既有 OriginGuard 约束，拒绝 Cookie、Origin、Fetch Metadata。控制器负责参数与 Multipart 边界，TicketPhotosService 负责归属、状态、幂等与事务，PhotoStore 负责解码和磁盘文件。不会开放静态图片目录，也不会把凭据放入图片 URL。

上传事务锁定工单行，串行核对数量和状态，与分派更新协调；UUID 唯一约束防重复。文件先写入随机候选键，事务失败或重放时清理该候选文件。数据库提交和文件写入不构成跨资源原子事务：进程被强制终止时可能留下孤立候选文件，当前不自动扫描删除，后续运维需核对数据库引用后处理。

Web 只读入口使用既有 SessionGuard；AdminTicketsService 复用管理员检查，再转交 TicketPhotosService 的归属与文件读取。非管理员即使是工单报修人或当前维修人员，也不能调用管理员入口；原生端继续使用专用 Bearer 入口。两种传输均不在 URL 中携带凭据，既有 Cookie/Origin 策略不变。

## Web 管理员交互

`features/tickets/photos` 负责业务 API 和 AdminTicketPhotos，管理员详情负责组合，不改变通用 TicketRecordDetails。元数据与图片读取复用 useApiResource，支持空状态、列表/单图错误和显式重试；读取期间禁用刷新。图片经同源 Cookie 请求转为内存 Blob URL，用于缩略图和 Ant Design 预览。关闭、切换工单或账号后取消读取并释放 Object URL；401 统一清理会话。服务端返回 `no-store`，不在客户端持久存储照片。

照片区使用自适应网格，在 390px 窄屏内保持统一边距；单图按比例完整展示。详情弹窗正文按视口限制高度并独立滚动，关闭按钮保持可见。管理员不在本步获得上传或删除入口。

新增 `TicketPhoto` 迁移仅创建附件表及关联，不重置或覆盖已有数据。开发文件位于项目 `.local/uploads/ticket-photos/`，保持忽略。备份/恢复应同时包含数据库和照片目录；本地磁盘方案不代表云端可用性、生产备份或容灾已经完成。

## 原生交互

- `features/tickets/photos` 管理元数据 API、受保护图片读取、预览和上传窗口。报修/任务页面负责决定是否提供上传入口，通用工单详情组件保持只读。
- 使用 SDK 57 兼容的 ImagePicker 和 FileSystem File，通过 FormData 上传实际文件，不把 URI 对象当成标准 Blob；SDK 用法参考 [Expo 文件上传](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/) 与 [ImagePicker](https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/)。
- 相机由用户主动授权；相册使用系统选择器，不申请整个相册的常驻读取权限，不请求麦克风。取消选择不上传；新窗口清除上次错误和照片状态。
- 上传窗口复用 MutationModal 和 useApiMutation，提交中禁止取消和重复进入；结果不明时保留照片 UUID 重试。关闭或离页取消请求不等于服务器回滚，需刷新列表核对。
- 图片通过会话 Provider 的受保护读取方法加载，在内存转换为显示来源；业务页面不获取 Bearer。身份或页面切换清理读取结果，不在普通存储缓存个人照片。

## 验证

```sh
npm run verify:mobile-photos
npm run verify:mobile-photos-android
npm run verify:web-photos
```

Windows 命令继续通过项目 `scripts/npm-local.ps1` 执行。API 验证覆盖格式伪造、大小/像素限制、八路同意图重放、数量竞争、状态限制、归属与当前分派权限；临时工单和文件按本轮随机 ID 精确清理。

模拟器脚本使用生成的纯色图片验证系统相册选择、取消、实际 Multipart 上传、丢失成功响应后的同意图重试、冷启动读取和维修人员只读查看。相册上传、相机拍摄、模拟器与实体手机分别记录，不能以选择测试图片冒充真实摄像头拍摄通过。

2026-11-07：照片 API 关键检查与 MuMu + Expo Go 相册链路通过，覆盖取消、丢失成功响应后的同意图重试、冷启动恢复、分派后禁用追加及维修人员查看。Web/API/门户构建、RN 类型与 Android/Web 导出、基础鉴权、原生文字建单及 Web 界面回归通过。

截图：[上传预览](screenshots/mobile-android-photo-preview.png)、[上传后照片](screenshots/mobile-android-photo-uploaded.png)、[维修任务照片](screenshots/mobile-android-task-photo.png)。蓝色图片为生成的验收样例，不是设备实拍；图中临时工单在验证结束后精确清理。

另行验证：MuMu 系统相机快门 → 完成 → RN 上传预览 → 确认上传 → 鉴权读取通过；原始虚拟画面为灰色，服务端保存为 1200×1600 WebP。此结果验证模拟器拍摄返回与上传链路，不代表实体摄像头或真实现场照片验收。[虚拟拍照上传](screenshots/mobile-android-camera-photo-uploaded.png)。

最终回归：MuMu 原生首页/须知导航、真实登录/冷启动恢复/退出/401 清理、任务筛选/接单/多次返回/头部退出均通过。任务 API 曾出现一次本地连接重置，单独重跑通过；未向业务写请求添加自动重试。

Web 验证：`verify:web-photos` 通过真实原生上传生成的纯色样例，核对管理员 Cookie 读取、匿名/非管理员/Bearer 拒绝、错误工单与图片关联、WebP/no-store/字段白名单，以及放大预览、无图、列表/单图失败重试、关闭释放 Blob URL、401 清理和 390px 布局。脚本仅精确清理本轮随机工单及其图片；不修改人工工单及其图片。截图：[管理员照片区](screenshots/service-admin-photos.png)、[放大预览](screenshots/service-admin-photo-preview.png)、[窄屏照片区](screenshots/service-admin-photos-mobile.png)。

同期 Web/API/门户构建、`verify:api`、`verify:connected-ui` 和 `verify:ui` 通过；已检查三张横竖样例图的桌面、窄屏与放大预览截图。本步未修改 RN 源码、数据库结构或已有迁移；不将 Web 浏览器验证记为真机拍摄验证。
