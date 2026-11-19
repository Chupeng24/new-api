# ModelFlow 阿里云部署记录

验证日期：2026-11-15（北京时间）。

## 当前运维方式

2026-11-16 用户确认采用：**本机 Codex 开发和执行任务，通过 Workbench CLI 操作杭州服务器**。

- 本机工作目录：`D:\Develop\new api\platform`。
- 远程项目目录：`/opt/modelflow/source`；部署文件与数据位于 `/opt/modelflow`。
- 使用已有 Workbench 配置连接目标实例，执行状态检查、部署、日志查看和必要的文件传输。
- 不以服务器上的 Codex 联网调用作为开发或发布的前提，不新增服务器。
- 服务器上已安装的 Codex 和登录缓存保留；后续不自动重试其模型请求。

网络排查结果：系统 DNS 解析 `chatgpt.com` 为 `128.242.240.117`，IPv4 连接超时；IPv6 无可用路由。`auth.openai.com` 的 TCP/TLS 能连接，但返回 HTTP 403；npm 官方仓库 HTTPS 正常。`hosts` 没有 OpenAI 相关覆盖，公共 DNS 对照请求也未成功，因此没有擅自修改 DNS 或硬编码地址。中国大陆不在当前 ChatGPT 官方支持地区列表中：https://help.openai.com/zh-hans-cn/articles/7947663-chatgpt-supported-countries

## 访问与版本

- 访问地址：https://47.97.245.4
- 管理员用户名：`admin`
- 初始密码保存在本机 `D:\Develop\new api\.tools\modelflow-private\admin-credentials.txt`，不写入 Git；首次登录后请自行修改。
- 服务版本：`modelflow-02a2cda`
- 应用源码提交：`02a2cda36b9e733fbcad6dc576e904bc8609b256`
- 仓库：https://github.com/Chupeng24/new-api.git
- 分支：`feat/industry-llm-platform`

域名尚未注册或绑定。当前使用公网 IP 和受信任的 Let's Encrypt IP 证书，可直接通过 HTTPS 访问。

## 服务器与目录

- 实例：`i-bp17f6mw166rt7lo6yrm`
- 地域：`cn-hangzhou`（华东 1，杭州）
- 系统：Alibaba Cloud Linux 4.0.6，x86_64
- 源码：`/opt/modelflow/source`
- 发布文件与镜像构建文件：`/opt/modelflow/releases`
- 持久化数据库：`/opt/modelflow/data/modelflow.db`（SQLite）
- 环境配置：`/opt/modelflow/runtime.env`，权限 0600，含随机会话密钥
- Nginx 配置：`/opt/modelflow/nginx/default.conf`
- HTTPS 证书：`/opt/modelflow/letsencrypt/live/47.97.245.4/`
- 服务器初始账号文件：`/opt/modelflow/admin-credentials.txt`，权限 0600

连接使用 `alibabacloud-workbench-cli` Skill 和本机已有 Workbench 配置。示例（PowerShell）：

```powershell
& 'D:\Develop\new api\.tools\workbench\workbench-windows-amd64\workbench.exe' exec `
  -i i-bp17f6mw166rt7lo6yrm -r cn-hangzhou -u root `
  -c 'docker ps --filter name=modelflow' -o json
```

每次 `exec` 都是独立 Shell，目录切换不会保留到下次调用。不要输出 Workbench 配置中的密钥。

## Xshell 连接（2026-11-20 已验证）

服务器当前关闭密码认证，root 密码处于锁定状态，允许公钥认证。网站的 `admin` 账号不能用于 SSH。

已为用户配置独立 RSA-4096 SSH 密钥，并通过严格校验服务器主机公钥的直接 SSH 连接验证成功；原有三把授权公钥保留，没有重启服务或修改密码。

在 Xshell 新建 SSH 会话：

1. 主机 `47.97.245.4`，端口 `22`。
2. 用户名 `root`，认证方法选择 `Public Key`。
3. 在“设置 → 用户密钥 → 浏览/导入”中选择本机私钥 `D:\Develop\new api\.tools\modelflow-private\modelflow-xshell-root-rsa.pem`。
4. 选择导入的密钥，密钥密码（Passphrase）留空，保存并连接。

该私钥未设置口令，文件位于限制了 Windows 访问权限的目录中，不应提交到 Git 或分享给他人。公钥注释为 `modelflow-xshell-user`，授权位置为服务器 `/root/.ssh/authorized_keys`。原授权文件备份为 `/root/.ssh/authorized_keys.before-modelflow-xshell-1795115429430040240`。

首次连接时可核对服务器 ED25519 主机密钥指纹：`SHA256:gNLw0X9ujskARqHn+4SOWTbeBkj7jvGHwl418FC5iWo`。

以上是用户直接使用 Xshell 的连接方式；本机 Codex 的运维仍可使用 Workbench。

## 运行方式

- `modelflow-app`：镜像 `modelflow:02a2cda`，以 UID/GID `10001:10001` 运行。
- `modelflow-web`：Nginx，公网 80 跳转 HTTPS，443 代理应用；80 还承担证书验证。
- 应用只映射本机 `127.0.0.1:3011`，容器内部端口 3000。
- 两个容器使用独立网络 `modelflow-net`，重启策略为 `unless-stopped`。
- 日志轮转：每文件 10 MB，保留 3 个文件。
- 已启用安全 Cookie，并限定可信来源为 `https://47.97.245.4`。
- 原有 `open-new-api`（3002 端口）、Redis 和 PostgreSQL 继续运行。

服务器访问 Docker Hub 超时，因此使用本机已验证前端产物和同一源码提交交叉编译 Linux 可执行文件，通过 Workbench 上传。服务器基于已有的 Debian 运行镜像构建专用 ModelFlow 镜像，替换其中的应用程序；运行的不是上游默认程序。

Linux 可执行文件 SHA-256：

```text
162fdff1cb2486d338c482ed416e70c3bf765852063db487fa76af206964be90
```

更新时需要重新构建前端与 Linux 程序、设置新的镜像标签，并保留数据目录和环境配置。不要直接运行仓库默认 `docker-compose.yml` 代替本部署：它引用上游镜像和默认数据库配置。

## 常用检查与备份

以下命令在服务器 Shell 中执行：

```sh
docker ps --filter name=modelflow
docker logs --tail 100 modelflow-app
docker logs --tail 100 modelflow-web
curl -fsS https://47.97.245.4/api/status
systemctl list-timers modelflow-cert-renew.timer
```

数据库备份请使用 SQLite backup API 或支持在线备份的工具，避免只复制正在写入的主数据库文件而遗漏 WAL。迁移时还需安全备份 `runtime.env`、Nginx 配置及证书目录；这些文件中的秘密不应提交到 Git。

## HTTPS 自动续期

Certbot 5.10.0 安装在 `/opt/modelflow/certbot` 的独立 Python 环境。

- 定时器：`modelflow-cert-renew.timer`，每天检查两次，开机补跑。
- 服务：`modelflow-cert-renew.service`。
- 续期成功后平滑重载 `modelflow-web` 的 Nginx。
- 日志：`/opt/modelflow/certbot-logs/letsencrypt.log`。
- 续期演练：`/opt/modelflow/certbot-renew-check.log`，退出码 0，演练成功。

IP 证书期限短，应保持 80 端口和续期定时器可用。以后绑定域名时需要同步更新证书、Nginx `server_name`、跳转地址及 `SESSION_COOKIE_TRUSTED_URL`。

## 验证结果与待完成项

- 公网 HTTPS 证书校验通过。
- `/`、`/help`、`/about` 均返回 200，页面标题为 ModelFlow。
- `/api/status` 返回正确品牌和发布版本。
- 初始化已完成；公网管理员登录、`/api/user/self`、`/api/platform/home`、退出登录通过。
- 刷新 Cookie 启用 Secure、HttpOnly、SameSite=Strict。
- 应用容器健康检查通过；证书续期演练通过。
- 本次部署没有配置上游模型渠道、支付或邮件服务；其实际调用需提供相应服务配置后验证。
- Codex CLI 0.169.0 已安装。设备授权接口仍返回 `403 Forbidden`；已按 OpenAI 官方无界面服务器流程，将本机现有 ChatGPT 登录缓存加密迁移至服务器 `/root/.codex/auth.json`（权限 0600）。`codex login status` 已显示 `Logged in using ChatGPT`，未改用 API Key，一次性传输私钥及加密凭据副本已清理。
- Codex 实际模型调用尚未通过：服务器访问 `chatgpt.com:443` 连接超时，模型列表请求也超时。本次验证进程已结束；需要解决服务器到 ChatGPT 官方服务的网络可达性后再验证，不能将本地登录状态视为模型服务已可用。官方迁移流程：https://learn.chatgpt.com/docs/auth#fallback-authenticate-locally-and-copy-your-auth-cache
- 当前 Workbench 凭据无法查询安全组（`Forbidden.RAM`）；443 入站规则由用户在控制台放行，之后公网验证通过。

品牌更换方法见 `PLATFORM_BRANDING.md`，功能规划见 `PLATFORM_PLAN.md`。
