# 维修报价

## 当前交付范围

React 真实业务支持管理员在首次分派时选择服务方式，当前维修人员接单后提交首版多条目报价，并在最新报价被拒绝后编制新版；维修人员与管理员可刷新查看当前版及历史版。金额由 NestJS 计算并保存至 PostgreSQL，报价与工单版本在同一事务写入。

Next.js 门户已支持本人查看报价、确认指定版本并生成唯一服务订单，在同一报修详情中回看条目与金额快照。订单独立显示待开工、维修中、待用户确认、已完成或已取消，支付显示未接入支付；确认报价不代表付款。

门户支持本人拒绝待确认报价，并在维修员修订后决定最新版本；React 后台与门户保留历史条目、金额及拒绝审计。本人可取消待开工订单，同时结束关联工单；三角色可按数据范围读取取消记录。React 当前维修人员已可开工，三角色可读取开工人与时间；已开工订单支持当前维修员提交处理结果，由本人确认完成；React 后台与门户已提供独立订单列表及只读详情，支持状态筛选和分页；写操作保留在关联工单，支付尚未交付。未开工的报价型任务不能提交维修结果；直接处理工单保留原接单、结果与用户确认闭环。RN 暂未新增报价或订单页面，既有 RN 结果接口同样受服务端限制。

## 服务方式与权限

- 首次分派请求可传 `serviceMode: direct | quoted`，省略时默认为 `direct`。旧工单和旧分派审计均为直接处理；重复分派意图也核对服务方式。
- 本步仅在首次分派确定方式，不提供接单后改方式或通用状态修改接口。
- 管理员可查看当前平台工单报价；仅当前 `assigneeId` 对应的维修人员可提交，必须为 `processing`、`quoted`、工单版本一致且无结果及订单。首次提交要求没有报价；修订要求指定的来源报价是最新已拒绝版本且存在拒绝审计。
- 报修用户仅可读取本人报价和订单，只有工单报修人可确认或拒绝报价、取消待开工订单；管理员不能代确认、拒绝或取消；当前维修人员可执行订单开工及已开工任务的结果提交。报价与订单查询复用 `ticketReadScope`，不存在及无权访问统一 404。报修人的历史归属与维修人员的当前分派范围分别校验，不因撤销设备查询授权而删除历史报修读取权。
- 提交成功后工单状态仍为 `processing`，版本递增一次；报价状态为 `pending`，显示待用户确认。该状态不代表订单成立、付款或允许开工。

## 金额与版本

一份报价包含 1～20 条项目。名称去首尾空白后为 1～60 字符；数量为 1～999 的整数；备注为去首尾空白后最多 200 字符的字符串，可为空。

单价以整数分传输，范围为 0～10,000,000 分；总额必须为 1～100,000,000 分。允许部分条目为零价，总额为零则使用直接处理流程。第一轮仅人民币，不处理税率、折扣、小数数量或库存。

前端从十进制文本精确转换整数分，拒绝超过两位小数、科学计数法及负数。后端 DTO 仍独立校验整数、范围和嵌套字段，通过纯规则重新计算每条 `quantity × unitPriceCents` 及总额；客户端传入总额或条目小计会被拒绝。数据库增加金额范围及条目乘积约束。

`TicketQuote` 保存工单、提交人、业务版次、金额、时间及内部提交意图；`QuoteItem` 保存条目顺序、名称、数量、单价、小计和备注。首次生成第 1 版，修订新增下一版记录，不覆盖旧版；状态可由 pending 更新为 accepted 或 rejected，不修改已发布条目或金额。业务版次与工单并发版本分别管理，用户决定须指向明确报价 ID 和版次。

## 请求与一致性

| 入口 | 行为 |
| --- | --- |
| React `/service/tasks/:id` | 需报价任务接单后编制、提交及刷新回看 |
| React 管理员工单详情 | 只读查看同一报价 |
| GET `/api/tickets/:id/quote` | 返回 `{ quote: null }` 或报价公开字段，不包含内部摘要及请求编号 |
| GET `/api/tickets/:id/quote/history` | 按当前数据范围返回 `{ quotes: [] }` 或按版次倒序排列的全部公开报价，第一条为当前版 |
| POST `/api/tickets/:id/quote` | 接受 `requestId`、`expectedVersion` 与条目；首次和同意图重放返回 201 |
| POST `/api/tickets/:id/quote/revisions` | 接受原工单版本、UUID、`baseQuoteId`、`baseQuoteRevision` 和新版条目；版次由服务端递增，首次及同意图重放返回 201 |
| POST `/api/tickets/:id/quote/accept` | 本人确认指定报价 ID/版次，原子生成订单；首次与同意图重放返回 201 |
| POST `/api/tickets/:id/quote/reject` | 本人拒绝指定报价 ID/版次并记录原因；首次与同意图重放返回 201，不生成订单 |
| GET `/api/orders` | 当前数据范围内分页查询订单摘要，支持订单状态筛选 |
| GET `/api/orders/:id` | 返回范围内订单快照及关联工单公开记录；未知及越权统一 404 |
| GET `/api/orders/by-ticket/:id` | 当前账号数据范围内返回 `{ order: null }` 或订单快照 |
| POST `/api/orders/:id/start` | 当前维修人员开工，输入原工单版本与 UUID；首次及同意图重放返回 201 |
| POST `/api/orders/:id/cancel` | 本人取消待开工订单，输入原工单版本、UUID 和原因；首次及同意图重放返回 201 |

服务端先检查角色和当前归属，再读取幂等记录。规范化条目按确定顺序计算摘要；相同操作者与 UUID 重放需核对工单、原版本和摘要，不同内容返回 409。重放仍重新检查当前归属。

新报价事务先条件更新工单版本，取得工单行锁，再插入报价及条目；`ticketId + revision` 和 `actorId + requestId` 的唯一约束防止重复首版和重复意图。相同意图并发返回同一记录，不同意图竞争只允许一个成功。失败不留下部分条目或单独递增版本。

结果提交服务在 Web 与原生入口共用。报价型任务必须具有已开工且未取消的订单，事务内更新工单、订单和结果记录；直接处理工单保留原闭环。入口显示不能代替服务端校验。

前端复用 `useApiMutation` 与 `MutationModal`；相同规范化内容结果不明时保留原 UUID 和原版本，编辑内容才生成新意图。关闭窗口重新读取实际记录，离页取消不等于数据库回滚。长表单通过公共弹窗的可选 `scrollBody` 控制内容滚动，默认弹窗布局保持原行为。

## 报价确认与订单快照

确认输入为 `requestId`、`expectedVersion`、`quoteId`、`quoteRevision`。身份来自会话；客户端不得指定确认人、订单状态、金额或快照条目。仅本人、需报价、处理中、尚无结果及订单且报价仍为最新待确认版本时允许确认。

`OrdersService` 先校验当前归属，再核对幂等记录。在同一事务内条件更新工单版本、标记报价已接受、写入 `ServiceOrder` 与 `ServiceOrderItem`。订单条目、单价、小计、备注、总额、币种与报价版次取自服务端记录；确认时再次核对金额。工单仍为 processing，订单为 awaiting_start，两者不混作支付状态。

订单保存确认人、时间、原工单版本和内部提交 UUID，形成确认审计。`ticketId`、`quoteId` 各自唯一，`actorId + requestId` 也唯一：相同 UUID 必须核对工单、报价、版次和原版本，一致则返回既有订单；不同 UUID 的竞争返回 409，不能生成第二单。重放也重新校验当前归属。任何一步失败均回滚报价状态、工单版本及订单条目。

订单快照独立存储，读取时不从报价实时拼装金额。报价确认是唯一创建入口，状态变化只通过受限业务命令；当前无独立创建、改价、删除或通用状态修改接口。订单编号使用 `SO-` 序号，回滚或并发可能产生间隔，不能当作订单总数或付款凭据。

门户以 Server Components 读取本人报价与订单，个人数据 no-store；确认操作使用本应用 MutationModal/useApiMutation。窗口内固定原 UUID、工单版本、报价 ID 和版次；成功或关闭后重新读取实际记录。服务端 `reporterPost` 复用原来源、会话、JSON、错误及状态转发，不替换意图、不自动重试、不将后端凭据传入 HTML 或客户端存储。

## 报价拒绝

仅工单报修人可拒绝本人需报价、处理中、无结果及订单的最新 pending 报价。输入包含原 `requestId`、`expectedVersion`、`quoteId`、`quoteRevision` 和原因；原因去首尾空白后为 1～500 字符，长度限制复用 `QUOTE_LIMITS.rejectionReason`。不接受客户端指定操作人、状态或金额。

`QuoteRejectionsService` 在同一事务内条件更新工单版本、设置报价 rejected、创建唯一 `QuoteRejection` 审计。审计保存具体报价、操作人、原因、时间及内部提交意图。公开结果仅包含原因、公开操作人和时间。工单仍为 processing，拒绝不代表工单取消或维修完成；本版不能再确认，不生成服务订单。当前维修员可通过独立修订命令发布新版，不把拒绝操作本身视为重新报价。

确认与拒绝都以同一工单行及原版本作为竞争条件，只能一个成功。相同操作者与 UUID 重放须核对工单、具体报价/版次、原因和原版本，并重新检查当前归属；返回原报价决定，不生成重复审计。不同原因或 UUID 的旧版本请求返回 409。报价状态、版本与审计写入任一步失败全部回滚。

门户拒绝表单复用本应用 MutationModal/useApiMutation，关闭或换对象销毁字段；相同规范化原因重试保留原 UUID 与版本，修改原因才生成新意图。关闭后重新读取报价，取消请求不等于撤销服务端决定。React 管理员和当前维修员只读同一拒绝记录，无代拒绝或修改入口。

## 被拒绝后重新报价

React 修订入口与首次提交共用 `SubmitQuoteModal` 和 `QuoteItemsFields`。旧版条目转换为新的表单对象，只用于预填；取消不修改原记录，重新打开恢复服务器内容。提交时固定来源报价 ID/版次和工单原版本，同一规范化内容重试保留 UUID，内容变化才产生新意图。刷新报价同步刷新任务版本，避免用新报价配旧工单版本提交。

`QuotesService` 的发布用例共用金额计算、事务与幂等处理。修订摘要额外绑定来源 ID/版次；工单条件更新校验当前维修员、处理中需报价、无结果/订单、指定最新已拒绝来源及原版本，锁住工单行后新增 `baseQuoteRevision + 1` 版报价及条目。不同意图竞争只允许一个成功，失败回滚版本和条目；不接受客户端指定新版版次或总额。待确认、已确认、非最新来源均不可修订。

发布请求重放返回该 UUID 原先创建的具体报价，重新检查当前分派权限；后续存在新版也不能把最新报价冒充原提交结果。拒绝重放同样返回原报价决定。用户仅能决定当前最新 pending 版；旧页面的原工单版本与报价 ID 校验失败返回 409，关闭后读取实际最新版。订单继续保存已确认具体版次的独立快照。

Web 与门户分别使用各自的历史折叠组件，复用本应用只读报价展示；历史内容不提供确认或拒绝按钮。历史读取按管理员、本人、当前维修员的数据范围执行，不共享跨端 UI。

本增量复用既有多版本表、唯一约束和拒绝审计，没有修改数据库 Schema 或迁移历史，也不重写旧业务数据。

## 待开工订单取消

仅工单报修人可取消本人 `awaiting_start` 订单；关联工单须为 `quoted/processing`、无结果及完成确认，源报价为 accepted。管理员和当前维修人员仅按原数据范围查看，不提供代取消。原因去首尾空白后 1～500 字符，限制共用 `order-rules` 子入口的 `ORDER_LIMITS`；客户端不能指定操作人、状态或金额。

`OrderCancellationsService` 使用原工单 `expectedVersion` 条件更新并锁定工单行，在同一事务内将工单及订单设为 cancelled、递增工单版本、写入唯一取消审计。审计保存订单、原因、操作者、时间与内部意图；公开字段不包含 UUID 或原版本。任一步失败全部回滚，不能出现订单取消但工单仍可维修的中间结果。

同操作者和 UUID 须核对订单、规范化原因及原版本，一致返回既有订单；不同意图并发只有一个成功，其余返回 409。重放重新校验当前归属。取消保留 accepted 报价、所有版本与原订单金额快照；原确认意图重放返回这个已取消订单，不再创建第二单。取消为终态，不支持恢复、继续维修、重新报价或同工单再次下单。

门户沿用 MutationModal/useApiMutation；相同原因结果不明时保留 UUID 和原版本，原因变化才生成新意图；关闭后读取实际订单，取消网络请求不代表业务回滚。React 管理员及维修任务详情只读展示同一订单和取消记录。支付尚未接入，取消不涉及扣款、退款，也不记录模拟付款；未来接入支付须另行处理取消与支付结果竞争。

## 订单开工

当前分派的维修人员可在 React 任务详情执行开工，要求关联工单已接单、需报价、processing、无结果与完成确认，订单 awaiting_start、无取消/开工记录且源报价 accepted。管理员与报修用户只读；非当前维修人员统一 404。身份、金额、状态及时间均不能由客户端指定。

POST /api/orders/:id/start 接收原工单 expectedVersion 与 UUID。OrderStartsService 先检查角色及当前分派，再核对幂等意图；同操作者 UUID 绑定具体订单及原版本。事务条件更新同一工单版本，订单改为 in_progress，写入唯一 ServiceOrderStart 审计；工单仍为 processing。失败回滚订单、工单版本及审计，公开记录只包含开工人和时间。

开工与本人取消竞争同一工单行及原版本，只有一个成功，另一方返回 409；开工后禁止直接取消，取消后禁止开工。报价、所有版本及原订单快照保持不变；旧确认请求精确重放返回当前既有订单，不回退订单状态。开工重放仍检查当前分派，不以历史操作者身份绕过数据范围。

前端入口共用 canStartOrder；StartOrderModal 使用本应用 MutationModal/useApiMutation，窗口内固定 UUID 与原版本，关闭/成功后重读任务和订单。门户读取实际开工记录，隐藏已开工订单的取消入口。RN 开工入口仍未新增；后续履约增量已接通 Web 结果提交及门户本人完成确认，见下节；原直接处理工单的结果与完成确认继续可用。当前允许无支付能力时记录开工，不将其解释为付款成功，后续支付策略须明确付款与履约关系。

## 维修结果与完成确认

| 服务订单 | 关联工单 | 允许的下一操作 |
| --- | --- | --- |
| awaiting_start（待开工） | processing | 当前维修员开工，或本人取消 |
| in_progress（维修中） | processing | 当前维修员提交处理结果 |
| awaiting_confirmation（待用户确认） | confirming | 工单报修人确认完成 |
| completed（已完成） | completed | 只读，旧成功意图可重放 |
| cancelled（已取消） | cancelled | 只读，不可开工或继续维修 |

复用 POST /api/tasks/:id/result、POST /api/tickets/:id/confirm 及原 DTO，不新增通用订单状态接口。React 在服务订单区使用 canSubmitOrderResult 判断入口，结果弹窗仍是 SubmitTaskResultModal；直接处理入口保留原 canSubmitTaskResult。Next.js 门户继续使用本应用 TicketActions、canConfirmTicket 与 ConfirmTicketModal。

TaskResultsService 先验证当前维修员、工单版本和状态，再在一个事务内锁定工单行。对需报价任务调用 OrdersModule 导出的 OrderFulfillmentService，在同一事务客户端上核对 accepted 报价、开工记录、订单 in_progress 且未取消，将订单改为 awaiting_confirmation，工单改为 confirming 并写 TicketResult。TicketConfirmationsService 对本人有结果的待确认工单采用相同方式，将订单与工单改为 completed 并写 TicketConfirmation。订单模块不另开事务，避免工单成功而订单失败；工单用例不直接更新订单表。

结果说明、提交人、时间及用户确认继续使用原 TicketResult/TicketConfirmation 审计，并在三角色的关联工单详情回看，不重复存储第二份结果。两次命令分别以原工单版本和 UUID 控制并发；相同规范化内容重试沿用意图，旧成功请求可返回当前完成详情，不回退订单状态。重放仍检查当前维修分派或本人归属。状态和审计任一步失败全部回滚，报价、金额快照与开工记录保持不变。

本轮不提供修改结果、退回、重新提交、自动完成或完成后取消；完成维修不代表已付款。原生接口复用同一后端用例，但没有新增 RN 报价型结果入口、订单状态界面或新 APK；原生界面和真机验证须另行记录。支付仍显示未接入支付。

## 订单列表与独立详情

React 后台 /service/orders、/service/orders/:id 面向管理员和维修人员；Next.js 门户 /orders、/orders/[id] 面向报修用户。管理员读取平台订单，维修人员仅读取当前 assigneeId 关联订单，报修人仅读取本人历史订单。列表、总数和详情复用 ticketReadScope，不能通过修改 ID、状态筛选或翻页扩大范围；未知和越权详情统一 404。原 by-ticket 入口和工单内展示继续保留。

查询 DTO 对 page/pageSize/订单状态和额外字段进行运行时校验；默认每页 10 条，最多 50 条，页码范围 1～100000。列表只返回订单号、工单/设备摘要、状态、金额及确认时间，不携带条目、结果说明或内部提交意图。详情才返回金额条目、开工/取消记录和关联工单已有公开结果/确认记录，不重新拼装或改写快照。

列表及总数使用相同授权条件，在 RepeatableRead 事务内读取；按 createdAt DESC、id DESC 稳定排序，避免同时间记录分页不确定。订单查询参数构建、状态集合和分页边界在 contracts/order-rules 复用。两端筛选与页码保存在 URL，筛选变化回第一页；越界回最后一页并保留筛选。React 普通翻页追加历史，越界修正才替换历史，避免把组件额外回调参数误当作 replace 标志。

React 复用 ResponsiveRecordList 与 CompactRecordCard，桌面表格和窄屏卡片择一展示；订单与报价在 Web 内共用只读 QuoteItems。门户的报修/订单共用 RecordPagination，查询仍为 Server Components + reporterGet/no-store，仅筛选控件是 Client Component。两端分别复用本应用的订单及工单记录组件，不跨应用共享 UI。独立详情只读，操作导航到原关联任务/报修入口；管理员从工单列表处理原有业务，不新增第二套确认、取消或结果提交命令。

本增量未修改数据库 Schema、迁移历史或写业务协议，未新增 RN 订单查询界面、支付或微前端子应用。

## 工程与迁移

- `apps/web/src/features/quotes`：表单、只读摘要、请求及报价动作规则，任务和管理员详情负责组合。
- `SubmitQuoteModal` 管理表单实例、金额预估、提交意图和请求；`QuoteItemsFields` 通过父级 Form 上下文管理条目字段、增删与校验，不读取会话或发送请求。`formValues.ts` 统一空条目工厂与提交值转换，每次新增返回独立对象。
- `apps/api/src/modules/quotes`：Controller 负责 HTTP，Service 负责授权、金额计算与事务，DTO/查询投影单独组织。
- `apps/api/src/modules/orders`：报价确认与订单快照用例，DTO、查询投影和序列化各有明确职责；沿用单一 NestJS/PostgreSQL。
- 门户 `features/quotes` 负责报价与确认，`features/orders` 负责订单快照、取消表单和请求转发；React `features/orders` 负责订单只读展示。条目展示在门户内部复用，不导入 Web 后台或 RN UI。
- `packages/contracts` 根入口只输出传输类型；`quote-rules` 子入口为前后端复用的纯金额规则与限制，不包含会话、ORM 或 UI。
- `202611090001_ticket_quotes` 仅增加服务方式、报价及条目，保留旧表、旧记录与历史迁移；旧方式默认 `direct`。
- `202611090002_quote_orders` 增加 accepted 状态和订单快照表，保留原报价及工单，不自动接受旧报价或为旧工单补订单。
- `202611090003_quote_rejections` 增加 rejected 状态和拒绝审计表，保留旧工单、报价及订单，不修改既有报价决定。恢复仍采用备份验证与前向修复，不直接覆盖已有业务库。
- `202611100003_order_fulfillment` 只为订单增加 awaiting_confirmation/completed 状态，复用原结果与确认审计，不自动修改旧订单或复制历史记录。
- `202611100002_order_starts` 增加 in_progress 状态和开工审计表，不自动开工旧订单；开工审计按订单和操作者/UUID 分别唯一。
- `202611100001_order_cancellations` 增加订单 cancelled 状态及取消审计表，订单与操作者/UUID 唯一约束兜底；保留旧记录，不批量修改工单或订单状态。

执行迁移前备份专用本地库，并检查备份归档可读取；迁移后核对旧工单与原操作记录摘要及默认方式。备份、校验摘要和恢复操作记录存放被忽略的 `.local`。

发生问题先停止相关写入。已有报价数据时不以删表回退；优先前向修复。如需备份恢复，应先在独立空库验证恢复结果，再安排切换，不能直接覆盖当前业务库。当前只验证备份归档可读取和旧数据保持，未执行整库恢复演练。

## 验证

Windows 通过 `scripts/npm-local.ps1 run <脚本名>` 执行：

- `test:quotes`：十进制金额精度、上限、零总价和两类任务的入口规则。
- `verify:quotes`：真实 API 的字段校验、金额、角色/归属、并发重放、分派方式意图、原生结果绕过和旧直接处理闭环。
- `verify:quotes-ui`：首次分派方式、多条目、金额输入、取消清理、响应丢失重试、关闭后核对、刷新持久化、管理员只读、跨账号隔离及 390px 截图。
- `verify:orders`：本人权限、指定版次、快照、八路同意图及不同意图竞争、写入失败事务回滚、归属变化后重放和结果提交限制。
- `verify:portal-quotes`：SSR、Cookie/来源、确认意图保真、取消、提交中限制、响应丢失重试与关闭核对、过期版本、换账号及过期会话；桌面/手机订单与后台已确认报价截图。
- `verify:quote-rejections`：原因校验与归属、八路重放/竞争、确认与拒绝竞争、金额不可变、审计公开字段、强制写入失败回滚及归属变化后重放。
- `verify:portal-quote-rejections`：拒绝表单、取消清理、同原因重试、原因变化新意图、关闭后核对、过期决定冲突、会话失效、跨账号隔离和后台只读拒绝记录。
- `verify:quote-revisions`：修订来源与归属、金额/DTO、同意图及不同意图并发、历史不可变、旧发布/拒绝请求精确重放、第 3 版订单快照与写入失败回滚。
- `verify:quote-revisions-ui`：条目预填/取消、表单复用、响应丢失重试、维修员过期窗口、门户旧决定冲突、历史只读、第 3 版确认与后台/手机布局。
- `test:orders`：取消及开工动作的方式、状态、关联订单及结果/确认入口规则。
- `verify:order-queries`：查询 DTO、字段白名单、同时间记录两页排序/总数、五状态筛选、三角色范围、陌生订单及当前分派变化。
- `verify:order-queries-ui`：后台与门户列表/独立详情、真实第二页、URL 前进后退/刷新、筛选重置/越界、返回链接、手机卡片、SSR/no-store 和跨账号/会话过期。
- `verify:order-fulfillment`：未开工门槛、结果/确认权限、原版本、同意图/不同意图并发、强制审计失败回滚、金额快照及终态重放。
- `verify:order-fulfillment-ui`：共用结果表单与门户完成确认、校验/清理、响应丢失重试、旧窗口冲突、说明变更新意图、关闭核对及三角色回看。
- `verify:order-starts`：角色/当前分派、DTO、八路重放及竞争、开工/取消竞争、强制审计失败回滚、原确认重放及快照保持。
- `verify:order-starts-ui`：开工窗口、关闭不写入、响应丢失重试、提交中保护、关闭重读、旧取消窗口冲突、会话过期和三角色只读回看。
- `verify:order-cancellations`：角色与归属、原因及版本校验、八路同意图/不同意图竞争、金额快照保持、强制审计失败回滚、确认旧意图重放和归属变化后重放。
- `verify:portal-order-cancellations`：原因与关闭清理、响应丢失重试、提交中保护、关闭核对、旧窗口冲突、会话失效、跨用户隔离，以及后台管理员/当前维修员只读取消记录。

原有构建、业务规则、登录、分派、任务、结果及共享弹窗按受影响范围回归；套件串行运行，临时工单按本轮随机 UUID 定向清理，不清理人工数据。

2026-11-09：金额与入口规则、报价及订单 API、React 报价和门户确认浏览器回归通过；同意图八路确认只生成一个订单，不同意图竞争只有一个成功。订单最终写入被测试约束拒绝时，报价状态及工单版本完整回滚，解除约束后原意图可重新提交；临时源报价变化不影响既有订单快照。原门户认证、文字报修和完成确认，以及既有会话、本人报修和演示界面回归通过。Web/API/门户/微前端构建通过。迁移前备份归档可读取，迁移后旧业务记录摘要一致，未执行整库恢复演练。

截图已核对：[桌面报价表单](screenshots/quote-form-desktop.png)、[窄屏表单](screenshots/quote-form-mobile.png)、[窄屏表单底部](screenshots/quote-form-mobile-bottom.png)、[报价回看](screenshots/quote-detail-desktop.png)、[窄屏报价](screenshots/quote-detail-mobile.png)、[管理员窄屏只读报价](screenshots/quote-admin-mobile.png)。图中账号与工单为临时验收数据，随后定向清理。

门户证据：[报价详情](screenshots/portal-quote-desktop.png)、[手机确认弹窗](screenshots/portal-quote-confirm-mobile.png)、[订单快照](screenshots/portal-order-desktop.png)、[手机订单](screenshots/portal-order-mobile.png)、[后台已确认报价](screenshots/service-quote-accepted.png)。确认弹窗关闭不等于订单取消；待开工订单的取消由后续独立命令提供。RN 报价与订单界面、新 APK、相关真机操作及支付能力未在本增量交付。

同日报价拒绝增量：拒绝 API 与门户浏览器检查通过，覆盖八路同意图重放、不同意图竞争、确认/拒绝竞争及强制审计写入失败回滚；原报价、订单、门户认证/报修/完成确认、API 与 React 入口回归通过，全仓库构建及 RN 共享类型兼容检查通过。迁移前备份归档可读取，迁移后及验收清理后原业务表摘要一致；未执行整库恢复演练。截图已核对：[手机拒绝表单](screenshots/portal-quote-reject-dialog-mobile.png)、[手机拒绝记录](screenshots/portal-quote-rejected-mobile.png)、[桌面拒绝记录](screenshots/portal-quote-rejected-desktop.png)、[后台只读记录](screenshots/service-quote-rejected.png)。RN 拒绝界面、原生真机及新安装包不在本增量验证范围内。

2026-11-10：修订报价 API 与浏览器验证通过，覆盖八路同意图/不同意图竞争、强制插入失败回滚、旧请求返回原具体版次、历史金额与拒绝记录保持、过期维修员窗口及门户旧版确认冲突、第 3 版确认与订单快照。原首版、拒绝、订单、门户认证/报修/完成确认及 API/React 入口回归通过，全仓库构建和 RN 共享类型兼容检查通过。无数据库 Schema 或迁移历史变更；临时记录按本轮随机编号清理。截图已核对：[手机修订表单](screenshots/quote-revision-form-mobile.png)、[后台手机历史](screenshots/quote-revision-history-mobile.png)、[门户历史](screenshots/portal-quote-revision-history.png)、[手机第 3 版订单](screenshots/portal-quote-revision-order-mobile.png)、[管理员历史记录](screenshots/service-quote-revision-history.png)。本增量未交付 RN 报价界面、新 APK、真机、支付或公网部署。

同日待开工订单取消增量：`test:orders`、取消 API 与门户浏览器检查通过，覆盖八路同意图/不同意图竞争、审计强制失败时订单/工单整体回滚、快照与 accepted 报价保持、旧确认重放返回已取消订单、跨用户与当前归属校验。门户提交中保护、响应丢失重试、关闭重读、旧窗口冲突，以及后台管理员和当前维修员只读记录通过。原报价/订单与修订链路、门户认证/报修/完成确认、API/后台入口及业务规则回归通过，全仓库构建和 RN 共享类型兼容检查通过。迁移前备份归档可读取，迁移后及临时数据清理后旧业务表摘要一致；未执行整库恢复演练。截图已核对：[手机取消弹窗](screenshots/portal-order-cancel-dialog-mobile.png)、[手机取消记录](screenshots/portal-order-cancelled-mobile.png)、[桌面取消记录](screenshots/portal-order-cancelled-desktop.png)、[后台只读取消记录](screenshots/service-order-cancelled.png)。本增量没有 RN 页面、原生真机、新 APK 或支付验证。

同日订单开工增量：`verify:order-starts` 和 `verify:order-starts-ui` 通过，覆盖角色与当前分派、原版本/额外字段校验、八路同意图及不同意图竞争、开工/取消并发、强制审计失败整体回滚、原报价确认重放和金额快照保持；窗口关闭不写入、响应丢失原编号重试、提交中保护、关闭重读、取消后的旧窗口冲突、会话失效、后台及门户记录回看通过。业务/订单入口规则、原取消/确认 API 与页面、原报价及直接处理闭环、门户认证/报修、API/后台入口回归通过，全仓库构建和 RN 共享类型兼容检查通过。迁移前备份归档可读取，迁移后及本轮清理后旧业务表摘要一致，未执行整库恢复演练。已核对[手机开工弹窗](screenshots/order-start-dialog-mobile.png)、[手机任务记录](screenshots/order-started-task-mobile.png)、[桌面任务记录](screenshots/order-started-task-desktop.png)、[管理员记录](screenshots/order-started-admin.png)、[门户手机记录](screenshots/portal-order-started-mobile.png)。上述为本地真实 API 与 Edge 浏览器验证，未交付报价型履约完成、RN 开工、原生真机、新 APK 或支付验证。

同日订单履约增量：`verify:order-fulfillment`、`verify:order-fulfillment-ui` 通过，覆盖未开工门槛、角色/当前归属、原版本与参数校验、八路同意图及不同意图竞争、结果和确认审计强制失败时订单/工单整体回滚、快照保持、终态重放及归属变化。页面覆盖共用表单的校验/清理、响应丢失原意图重试、说明变更新意图、提交中保护、关闭重读、过期窗口、会话失效和三角色完成记录。原结果/确认 API 与界面、门户确认、开工/取消、报价/订单、门户认证/报修及 API/后台入口回归通过；原生结果/确认 API 回归及 RN 类型兼容检查通过，全仓库构建通过。迁移前备份归档可读取，迁移后及本轮清理后旧业务表摘要一致，未执行整库恢复演练。已核对[手机结果表单](screenshots/order-result-dialog-mobile.png)、[任务待确认状态](screenshots/order-awaiting-confirmation-task-mobile.png)、[手机完成确认框](screenshots/order-confirm-dialog-mobile.png)、[门户已完成订单](screenshots/portal-order-completed-mobile.png)、[管理员已完成订单](screenshots/order-completed-admin.png)、[维修任务完成记录](screenshots/order-completed-task-desktop.png)。新增履约界面仅完成本地真实 API 与 Edge 验证，未新增 RN 履约入口或验证原生界面、真机、新 APK、支付及公网部署。

同日订单查询增量：`verify:order-queries`、`verify:order-queries-ui` 通过，覆盖三角色列表/总数/详情范围、五状态筛选、查询 DTO、最小字段投影、同时间记录的稳定两页排序、当前分派变化及未知/越权详情。真实浏览器覆盖桌面表格/手机卡片、第二页、直达/刷新/前进后退、跨状态历史返回、筛选重置/越界修正、列表返回链接、空态、门户 SSR/no-store、跨用户和过期会话。普通翻页与越界修正使用独立方法，响应标记当前查询，防止旧筛选结果误修正新 URL。原订单确认、履约、报价、门户认证/报修/完成确认、后台入口和共享提交/分页回归通过；全仓库构建及 RN 类型兼容检查通过。统一微前端构建、订单深链接/刷新/返回列表、原 React/Vue 挂载卸载/权限/样式隔离及导航规则检查通过，临时统一预览已关闭；未发布公网。已核对[管理员订单列表](screenshots/orders-list-admin-desktop.png)、[手机订单列表](screenshots/orders-list-technician-mobile.png)、[后台独立详情](screenshots/order-independent-admin-desktop.png)、[门户独立详情](screenshots/portal-order-independent-mobile.png)、[门户真实第二页](screenshots/portal-orders-list-mobile-page2.png)、[微前端订单深链接](screenshots/micro-order-independent.png)。本增量没有 Schema 或迁移历史变更，临时记录按本轮随机编号清理；未新增 RN 订单界面、真机验证、安装包或支付。
