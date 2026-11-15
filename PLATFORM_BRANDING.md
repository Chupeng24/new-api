# 平台品牌更换指南

本文件记录新增需求：将面向用户的名称、Logo、关于页面和帮助入口改为自有品牌，并使下一次更换有明确操作步骤。

当前品牌：**ModelFlow**。口号：**一个接口，连接多种 AI 能力。** 名称选自用户提供的[候选分享页](https://chatgpt.com/share/6af92ec5-0d50-83ec-9949-e62efb4405d1)。页面中的图片实际为 TaskFlow，且正文指出其方向不符；本项目按 ModelFlow 的模型连接、智能路由定位另绘蓝紫色 M 节点矢量标志。

![ModelFlow 标志](web/public/branding/modelflow.svg)

此处只确定项目使用的品牌，不代表已经核验域名或商标。实施记录见 `PLATFORM_BRANDING_PLAN.md`；验收结果见 `PLATFORM_BRANDING_VALIDATION.md`。

## 改造范围

| 项目 | 应覆盖的位置 | 验收要求 |
|---|---|---|
| 名称 | 页头、登录/注册、页脚、浏览器标题、默认站点配置 | 首次打开和刷新后均使用目标名称 |
| Logo | 导航、登录等品牌组件、页脚、浏览器图标 | 图片可加载，浅色/深色下可辨识，小尺寸仍清晰 |
| 关于我们 | `/about` 页面 | 介绍本平台服务对象、能力和联系方式；保留上游项目来源说明 |
| 帮助文档 | 顶部“文档”入口及品牌相关帮助链接 | 指向自己的用户指南，链接可访问，步骤与当前版本一致 |
| 运维说明 | 本文件 | 写清文件位置、配置优先级、发布、验证及回滚方法 |

这里只修改应用的产品品牌。保留许可证、代码版权声明、第三方模型/支付商标识，以及 New API / QuantumNous 的项目来源说明；不做全仓字符串替换，不重命名 Go module 或导入路径。

## 方式一：后台修改现有站点

使用 root 账号进入“系统设置 → 站点与品牌 → 系统信息”。对应入口是 `/system-settings/site/system-info`。

| 后台字段 | 配置键 | 填写内容 |
|---|---|---|
| 系统名称 | `SystemName` | 完整品牌显示名称 |
| Logo URL | `Logo` | 站内根路径 `/branding/modelflow.svg`，或完整 HTTP(S) 图片 URL；不接受 `//`、反斜杠、带账号密码的 URL |
| 关于 | `About` | 关于我们正文；支持 Markdown、HTML 或完整网页 URL |
| 文档链接 | `general_setting.docs_link` | 内置帮助填 `/docs`；也可填自有文档站的完整 HTTPS URL |
| 页脚（可选） | `Footer` | 真实运营主体及联系方式，不编造资质、备案或服务承诺 |

操作步骤：

1. 先保存旧的五项配置，便于回滚。
2. 把 Logo 上传到自己控制的静态资源位置，确认该 URL 在未登录状态下也能打开。不要使用需要登录或会过期的 ChatGPT 图片地址作为线上 Logo。
3. 填写新名称、图片 URL、关于正文、帮助链接，保存配置。当前保存逻辑逐项提交；若中途报错，重新打开检查哪些项目已保存后再补齐。
4. 刷新页面，检查页头、登录页、关于页、浏览器标题和图标；必要时用无痕窗口排除旧缓存。
5. 打开“文档”，确认进入自己的指南，且其中模型、充值和发票步骤与实际配置一致。

后台设置保存在数据库中，运行时优先于代码中的默认值。修改默认常量并重新构建，不会自动清除已有站点的自定义设置。

### 已有 New API 站点升级

已有数据库如果保存过旧名称、Logo、关于正文或上游文档链接，它们仍会生效。升级后在上述页面明确设置：

```text
SystemName = ModelFlow
Logo = /branding/modelflow.svg
About = 留空（使用内置关于正文），或填写自己的正文
general_setting.docs_link = /docs
Footer = 保留实际运营信息；如仍含旧品牌，手动更新
```

默认 Logo 与 favicon 为同一 SVG 源文件，随服务部署，无需依赖第三方图片地址。自定义 Logo 加载失败时前端降级到内置 Logo，下次重新获取站点状态时可重试；数据库中的 URL 不会被修改。

## 方式二：修改 fork 的默认资源与文案

以下是当前代码的真实入口。需要让“新部署”直接使用自有品牌时，应同步处理这些位置；已有站点还要检查上一节的数据库配置。

| 文件 | 作用 |
|---|---|
| `common/constants.go` | 服务端 `SystemName`、`Logo` 默认值 |
| `web/src/lib/constants.ts` | 前端首次加载/降级时的默认名称和 Logo |
| `web/index.html` | JavaScript 加载前的标题、页面描述 |
| `web/rsbuild.config.ts` | 构建时使用的 favicon 文件 |
| `web/public/` | 随前端发布的静态图片；建议将新资源放入 `branding/` 子目录 |
| `web/src/main.tsx` | 从站点状态刷新浏览器标题和图标 |
| `web/src/hooks/use-system-config.ts` | Logo 预加载及图标更新 |
| `web/src/features/about/index.tsx` | 关于正文的读取及空配置显示 |
| `PLATFORM_ABOUT.md` | 内置关于正文；后台 About 为空时使用 |
| `setting/operation_setting/general_setting.go` | `DocsLink` 默认值 |
| `web/src/hooks/use-top-nav-links.ts` | 顶部文档链接生成 |
| `web/src/components/layout/components/footer.tsx` | 品牌页脚、默认帮助链接和上游署名 |
| `PLATFORM_HELP.md` | 自有平台用户指南正文，构建时直接导入 `/docs` 页面 |
| `web/src/features/help/index.tsx`、`web/src/routes/docs/index.tsx` | 内置帮助页面和公开路由 |
| `web/src/components/brand-document.tsx` | Markdown 中的 `{{SYSTEM_NAME}}` 自动替换为当前站点名称，并作为纯文本转义 |
| `web/src/assets/logo.tsx` | 组件形式的单色品牌标志 |
| `web/src/i18n/locales/*.json` | 页脚口号的七语言文案 |

Logo 建议同时保留可编辑的 SVG 原稿和适合浏览器图标的版本。新文件采用版本化名称（例如 `logo-v2.svg`），并同步更新配置 URL，避免 CDN 或浏览器继续显示旧图。

关于页面的后台内容非空时会优先显示后台内容。若配置完整网页 URL，页面通过 iframe 展示，对方网站必须允许嵌入；若配置普通正文，则由现有富文本组件渲染。对不需要复杂布局的介绍，优先使用 Markdown。

内置 `/about` 和 `/docs` 分别直接导入 `PLATFORM_ABOUT.md`、`PLATFORM_HELP.md`；改 Markdown 后重新构建即可。两份文档中的 `{{SYSTEM_NAME}}` 在运行时替换为后台配置的名称。当前内置正文为中文，语言切换只影响界面导航；需要多语言正文时再按语言拆分内容源。

后台填写的 About 原文不会自动替换占位符，请在其中直接写最终名称。自定义网页 URL 保持现有 iframe 沙箱，HTML 保持现有隔离渲染，Markdown 保持现有富文本渲染。

## 关于我们正文示例

下面的正文可复制到后台 About；运营主体和联系方式只填写实际信息。

```markdown
# 关于 ModelFlow

我们为高校与科研机构、开发者、短剧创作者和电商团队提供统一的 AI 工作入口。

你可以从行业任务模板开始创作，选择平台已开放的模型，管理 API 密钥，并查看自己的余额和用量。企业及高校用户可申请机构身份核验；已完成的充值订单可申请发票，由工作人员审核处理。

可用模型、价格、活动规则和服务范围以站点实际展示为准。

## 联系我们

请使用站点展示的服务联系方式。不要在公开渠道发送密码、API 密钥或证件原件。

## 项目来源

本平台基于 New API 开发，感谢 QuantumNous 及开源贡献者。上游项目：https://github.com/QuantumNous/new-api 。许可证及第三方声明随代码保留。
```

## 构建、验证与回滚

1. 使用 `web/package.json` 指定的 Bun，先在 `web/` 执行 `bun install --frozen-lockfile`。
2. 对改动运行相关测试、`bun check -b` 和 lint，然后执行 `bun run build`。
3. 在仓库根执行 `go build -o modelflow .`（Windows 可用 `modelflow.exe`）。Go 服务嵌入前端资源，因此必须先完成前端构建。
4. 从本 fork 的目标提交构建和发布；官方通用镜像不会自动包含本项目的品牌改动。
5. 验证未登录/已登录、浅色/深色、桌面/窄屏，以及旧数据库配置覆盖默认值的情况。
6. 回滚时先恢复原后台配置，再切回之前的应用镜像；保留品牌源文件及历史版本。不删除用户、订单或审核记录。

验收不能只确认首页显示了新名字，还应检查：浏览器首次标题、favicon、登录与注册页、页脚、关于页、文档入口、图片 URL 失效时的降级显示。
