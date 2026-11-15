# LLM 平台验证记录

日期：2026-11-15。基线：`b388140ac`。分支：`feat/industry-llm-platform`。

## 实际环境

- Windows，Go 1.26.10，Bun 1.4.4，使用仓库锁定的依赖版本。
- SQLite 3.50.4；隔离 MySQL 8.0.46（本机 13306）；隔离 PostgreSQL 17.6（本机 15432）。没有改动系统 MySQL 服务或阿里云数据库。
- 浏览器访问本地生产构建 `/workspace`；使用独立 SQLite 数据库和虚构演示资料，没有调用真实模型、支付或发票服务。

## 自动检查

| 检查 | 实际结果 |
|---|---|
| `go test ./model` | 通过 |
| `go test ./model -run TestPlatform -v -count=1`，同时设置两个测试数据库 DSN | 通过，MySQL / PostgreSQL 子测试实际执行，未跳过；其余业务测试在真实 SQLite 上运行 |
| `go test ./controller -count=1` | 通过，95.040 秒 |
| `go test ./service/authz ./router -count=1` | 通过；最终运行分别 0.366 / 9.874 秒 |
| `go test ./middleware -run 'TestUserAuthAppliesAccessTokenRouteRules\|TestUserAuth\|TestTryUserAuth\|TestDashboardAuth' -count=1` | 通过，0.440 秒 |
| `bun run test`（集成阶段全量） | 237 个测试文件、2877 项通过；后续本地化修正使用下列定向回归，未再次重复全量 |
| `bun run test src/features/platform/__tests__`（最终改动后） | 3 个测试文件、5 项通过 |
| `bun check -b` | 1504 个文件、2 个项目，无类型错误 |
| 对新增平台目录、路由及修改的导航/钱包组件执行 Oxlint | 通过 |
| `bun run build` → 根目录 `go build -o new-api .` | 生产前端与 Go 嵌入资源构建通过；必须按此顺序执行 |

本次未运行根模块全量 `go test ./...`，不宣称整个上游仓库全部测试通过。

## 核心行为覆盖

- 身份：字段长度/类别/邮箱/明确同意校验；重复提交；拒绝自审；驳回重提；旧版本审批冲突；并发处理只有一次成功；认证不会修改用户角色或余额。
- 发票：仅本人已完成充值；从服务端复制订单金额和支付方式；拒绝他人/未支付订单；一单一申请；驳回后重提；审核说明及发票号码要求；旧版本审批冲突。
- 权限：全部 9 条新增业务路由显式 session-only；现有路由覆盖测试校验声明完整。本人记录不能通过 `user_id` / `admin` 查询参数变成全局列表。普通政府账号的独立授权可撤销，用户角色不提升。
- 报表：缺权限返回 403；已完成 UTC 自然月、24 小时入库宽限；不足五名活跃用户抑制；不输出个人身份/对话；排除当前月记录。聚合不能被描述为已经证明匿名化。
- 数据库：新增四表、唯一约束、申请/审核、授权/撤销和重复迁移。迁移前插入原有用户/订单，重复迁移后验证余额和申请仍保留。
- 前端：申请校验、同意选项、提交错误提示，以及真实 i18next 资源结构下的中文词条；后者先复现失败，再修正词条层级并验证通过。

## 浏览器验收

生产构建实际打开了工作台：余额与用量来自本地服务，活动位置显示环境变量，科研/编程/短剧/电商模板、身份/发票/运营/报表页可切换。提交虚构的“本地演示大学”资料后显示等待审核；发票页显示申请字段和空列表；运营页显示该申请及独立报表授权控件；小样本看板显示抑制提示。

新增文案完整提供简体中文和英文；其他语言文件补齐键，部分新增文案使用英文回退，繁体文件部分文案暂沿用简体。未将它们描述为完成七语种专业翻译。

## 审查与修复

按 gstack 的产品/设计/工程问题框架评审，另使用独立代码审查代理检查实现。本次没有声称运行完整 gstack autoplan 自动流水线。

审查后修复了：新增路由 PAT 策略遗漏、政府普通账号授权路径、钱包不可见的数字订单 ID、驳回重提后旧页面误审风险，以及滚动统计的时间范围和小样本披露问题。报告改为固定完整自然月，并明确展示 UTC 日期边界。

控制器全量测试暴露既有测试夹具未关闭 SQLite 连接的问题：仅在测试代码补充关闭连接的 cleanup，随后全量控制器通过；没有修改线上数据库连接生命周期。

## 已知失败与上线前未完成项

1. **Windows 上游日志测试失败**：`go test ./middleware -run '^TestAccessAndPanicLogsFollowLogRotation$' -count=1` 的行为断言执行后，临时日志文件仍打开，`TempDir RemoveAll cleanup` 报文件占用。全量 middleware 因此不是全绿。日志运行时代码不在本次修改范围。
2. **完整升级演练未完成**：三库矩阵使用当前基线模型创建代表性旧业务数据，没有使用最新发布版生成的完整数据库或现网脱敏快照。仓库要求的该项发布验证仍需补齐；因此不能宣称已完成全部数据库兼容性/生产升级验收。单独日志数据库未改动。
3. **外部业务未验收**：没有真实供应商密钥与采购区域、支付沙箱及回调域名、视频订单、税控、学籍服务和银行流水。对应接入步骤见 `PLATFORM_GUIDE.md`；不能用本地通过代替真实联调。
4. **发布尚未执行**：未配置生产活动、Credits 兑换率、优惠分组、合作方授权、备案资质；未部署或切换流量。补贴独立资金账本、自动跨模型路由和长期用户画像明确不在本次实现范围。
5. 新增 GitHub Actions 提供 MySQL / PostgreSQL 服务及业务回归命令；本文记录的是本地结果，不能当作远端 Actions 成功凭据。

## 复现三库测试

只使用专用可丢弃数据库，不要将这两个环境变量指向生产。测试会创建表、用户及订单。

```bash
export PLATFORM_TEST_MYSQL_DSN='USER:PASSWORD@tcp(127.0.0.1:3306)/platform_test?charset=utf8mb4&parseTime=True'
export PLATFORM_TEST_POSTGRES_DSN='host=127.0.0.1 port=5432 user=USER password=PASSWORD dbname=platform_test sslmode=disable'
go test ./model -run TestPlatform -v -count=1
go test ./controller -run TestPlatform -count=1
go test ./service/authz ./router -count=1
```

交付结论：代码可用于隔离试点演示，核心新增流程已有测试和浏览器证据；生产上线以上述未完成项为准。
