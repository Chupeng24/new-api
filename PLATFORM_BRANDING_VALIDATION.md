# ModelFlow 品牌改造验证记录

验证日期：2026-11-15。范围：自有名称、Logo、关于页面、帮助文档及更换说明。原平台需求中尚未交付的商业接入事项仍按 `PLATFORM_GUIDE.md` 记录，本次不扩展其完成状态。

## 已交付

- 服务端默认名称 ModelFlow、Logo `/branding/modelflow.svg`、帮助地址 `/docs`。
- 前端首次加载、浏览器标题、favicon、导航、登录页、页脚的品牌统一；保留上游来源和许可证。
- 内置关于正文 `PLATFORM_ABOUT.md`；管理员保存的 About 仍优先，保留 Markdown、HTML 与 URL 模式。
- 内置帮助正文 `PLATFORM_HELP.md`，由 `/docs` 直接渲染。两份文档的站点名称随后台配置变化。
- 后台 Logo 接受站内根路径或 HTTP(S) URL；加载失败使用内置标志；站内帮助链接不另开外部页面。
- `PLATFORM_BRANDING.md` 说明后台配置、旧站点升级、源文件、构建、验证和回滚。
- Docker 前端构建显式复制两份 Markdown，`.dockerignore` 对它们放行。

## 自动验证

本机使用 Bun 1.4.4、Go 1.26.10；工具位于工作区外层 `.tools`，不作为应用代码提交。

| 验证 | 命令（工作目录） | 结果 |
|---|---|---|
| 前端相关测试 | `bun run test src/hooks/__tests__/brand-logo.test.tsx src/hooks/__tests__/brand-navigation.test.tsx src/components/__tests__/brand-document.test.tsx src/lib/__tests__/site-url.test.ts src/lib/__tests__/status-query.test.tsx src/features/platform/__tests__`（`web`） | 8 个文件、33 项通过 |
| 类型检查 | `bun check -b`（`web`） | 1,512 个文件、2 个项目，无类型错误 |
| 改动文件 lint | `bun x oxlint -c .oxlintrc.json <本次改动 TS/TSX/JSON>`（`web`） | 0 errors；5 条既有模式 warning（Image 事件赋值、管理员页脚 HTML） |
| 前端生产构建 | `bun run build`（`web`） | 通过；包含 `/docs` 与 Markdown 正文 |
| 后端相关测试 | `go test ./common ./setting/operation_setting`（仓库根） | 两个包通过 |
| 服务构建 | `go build -o <本地预览程序> .`（仓库根） | 通过，嵌入构建后的前端 |
| 差异检查 | `git diff --check` | 通过 |

新增回归覆盖：站内/外部文档链接、无效链接降级、Logo 地址校验、图片失败时 Logo/favicon 降级、名称含 Markdown 字符时作为纯文本显示、关于页保留帮助和开源来源链接。

## 本地浏览器验收

地址：`http://127.0.0.1:3010`，仅本机预览，使用原有本地测试数据库。

- `/api/status` 返回 ModelFlow、`/branding/modelflow.svg`、`/docs`。
- 首页、已登录控制台、登录页显示 ModelFlow 和新 Logo；图片加载成功，浏览器标题与 favicon 正确。
- 首页页脚显示新名称与口号，同时保留 New API 项目来源署名。
- 顶部“文档”进入站内 `/docs`；能看到开始使用、充值、认证、发票、API 与常见问题。
- 关于页默认展示自己的平台介绍。通过真实后台表单保存临时 Markdown，验证其覆盖默认正文，再清空并恢复内置介绍。
- 后台表单在 Logo 为站内路径时可以成功保存 About；已恢复测试配置。
- 帮助页在 390px 窄屏、深色模式下无水平溢出；验收后恢复默认视口与系统主题。

截图保存在本地工作区外层 `.tools/modelflow-about.jpg`、`.tools/modelflow-sign-in.jpg`、`.tools/modelflow-help-mobile.jpg`，不包含真实业务资料。

## 审查与边界

独立代码审查发现 Docker 构建阶段缺少根目录 Markdown；已补充 COPY 和忽略例外。当前机器没有 Docker，因此未执行实际镜像构建，也没有部署到云服务器。

本次没有数据库结构、计费、支付或鉴权逻辑变更，没有重跑三数据库迁移矩阵。内置正文目前为中文，界面导航和口号支持原有语言切换。现有数据库中保存的旧名称、Logo、About 或文档 URL 不会被静默覆盖，需按更换指南显式更新。
