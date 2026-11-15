# ModelFlow 阿里云部署记录

验证日期：2026-11-15（北京时间）。

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
- Codex CLI 0.169.0 已安装，但 `codex login --device-auth` 返回 `403 Forbidden`，`codex login status` 显示未登录。ChatGPT 认证尚未完成，未改用 API Key。
- 当前 Workbench 凭据无法查询安全组（`Forbidden.RAM`）；443 入站规则由用户在控制台放行，之后公网验证通过。

品牌更换方法见 `PLATFORM_BRANDING.md`，功能规划见 `PLATFORM_PLAN.md`。
