# StationOS Pro 帮助中心部署指南

> 本文档描述 `StationPC-Technology/stationospro-docs` 帮助中心的自动化部署流程。
> 线上站点：`https://docs.stationpc.com`（域名 DNS 由阿里云/腾讯云管理）

## 架构总览

```
GitHub（公开仓库 StationPC-Technology/stationospro-docs）
  └── GitHub Actions
       ├── CI  quality.yml（typecheck + build）
       └── CD  deploy.yml（push main 触发）
            ├─ 构建 Docker 镜像（tag = commit sha）
            ├─ 推送 GHCR（ghcr.io/stationpc-technology/stationospro-docs）
            └─ GitHub OIDC → 阿里云 STS 临时凭证 → 云助手 RunCommand
                                                     ↓
阿里云 ECS（海外机房，已有 Docker；无需公网 SSH）
  ├─ 云助手 Agent（出站连接，执行 scripts/deploy-remote.sh）
  ├─ app 容器：Next.js standalone，监听 127.0.0.1:3000
  └─ 宿主机 nginx：反代 3000 + HTTPS（Let's Encrypt 自动续期）
```

- **部署形态必须是 Node.js 服务端**：站点依赖 `/api/search`、动态 OG 图、`llms.txt`、语言中间件（`proxy.ts`），不能纯静态托管。
- **海外机房 + 海外用户为主**，直连即可，无需 CDN。
- **部署链路不需要服务器开放入站 22**：GitHub Actions 用 OIDC 换取阿里云 STS 临时凭证，通过云助手 `RunCommand` 在 ECS 上执行部署脚本。

## 日常发布流程

| 变更 | 操作 | 效果 |
|---|---|---|
| 中文内容 | 编辑 `content/docs/zh/**` | — |
| 7 种译文 | 编辑 zh 后执行 `/translate-docs`（LLM 翻译流程，见 `docs/writing-workflow.md`）→ 中文与译文一起 push `main` | 自动构建发布 |
| 应急重新部署 | Actions → Deploy → Run workflow | 手动触发 |

## 前置条件

- 服务器：阿里云 ECS，海外机房，已安装 Docker。
- 云助手 Agent 在线（公共镜像默认安装），且 `SupportSessionManager = true`（会话管理兜底）。
- 阿里云 RAM 已创建 OIDC 身份提供商与部署角色。
- 域名 `docs.stationpc.com` 的 DNS 已可管理。

## 一次性配置

### 1. DNS

在阿里云/腾讯云为 `docs.stationpc.com` 添加 **A 记录**，指向服务器公网 IP。

### 2. 服务器准备（首次）

```bash
# 安装 nginx 与 certbot（Docker 已有则跳过安装步骤）
sudo apt update && sudo apt install -y nginx certbot

# 证书签发 webroot
sudo mkdir -p /var/www/certbot

# 安装 nginx 站点配置（配置文件见 nginx-host.example.conf）
sudo cp docs/deployment/nginx-host.example.conf /etc/nginx/sites-available/docs.stationpc.com
sudo ln -sf /etc/nginx/sites-available/docs.stationpc.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 3. 签发并续期证书

```bash
# 首次签发（需 DNS 已生效、80 端口公网可达）
sudo certbot certonly --webroot -w /var/www/certbot -d docs.stationpc.com

# 验证自动续期已就绪
sudo systemctl list-timers | grep certbot
```

### 4. 阿里云云助手 + OIDC + RAM

> 以下 `<account-id>`、`<region-id>`、`<instance-id>` 需要替换为实际值。
> 账号 ID 可在阿里云控制台右上角或 `aliyun sts GetCallerIdentity` 获取；地域 ID 形如 `cn-hongkong`；实例 ID 形如 `i-xxxxxxxx`。

#### 4.1 预检云助手

```bash
aliyun ecs DescribeCloudAssistantStatus \
  --RegionId "<region-id>" \
  --InstanceId.1 "<instance-id>"
```

确认 `CloudAssistantStatus` 为 `true`。如果 Agent 不在线，先在 ECS 控制台检查云助手，或在实例内确认 `systemctl status aliyun`（不同镜像服务名可能略有差异）。

#### 4.2 创建 OIDC 身份提供商

RAM 访问控制 → 集成管理 → OIDC 身份提供商 → 创建：

| 配置项 | 值 |
|---|---|
| 提供商名称 | `github-actions` |
| 提供商 URL / Issuer | `https://token.actions.githubusercontent.com` |
| Client ID / Audience | `sts.aliyuncs.com` |
| 描述 | GitHub Actions OIDC for stationospro-docs deploy |

控制台通常可以自动拉取指纹；如需手动确认：

```bash
openssl s_client -connect token.actions.githubusercontent.com:443 \
  -servername token.actions.githubusercontent.com </dev/null 2>/dev/null \
  | openssl x509 -fingerprint -sha1 -noout
```

记录 Provider ARN：

```text
acs:ram::<account-id>:oidc-provider/github-actions
```

#### 4.3 创建 RAM 角色与信任策略

RAM 访问控制 → 角色 → 创建角色 → 信任主体类型选“OIDC 身份提供商”，选择上一步的 `github-actions`。

- 角色名称：`github-actions-deploy`
- 最大会话时间：`3600` 秒（与 workflow 的 `role-session-expiration` 一致）

信任策略：

```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Principal": {
        "Federated": [
          "acs:ram::<account-id>:oidc-provider/github-actions"
        ]
      },
      "Condition": {
        "StringEquals": {
          "oidc:iss": "https://token.actions.githubusercontent.com",
          "oidc:aud": "sts.aliyuncs.com",
          "oidc:sub": "repo:StationPC-Technology@340541337/stationospro-docs@1330885082:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

注意：

- 仓库规范全名是 `StationPC-Technology/stationospro-docs`（组织 ID `340541337`；仓库 ID `1330885082`）。
- 该仓库创建于 2026-08-11，GitHub 使用含 owner ID / repo ID 的 immutable subject，因此 `sub` 必须写成上面的形式。
- `oidc:sub` 用 `StringEquals` 精确匹配 `main`，不要用 `StringLike` 放宽到所有分支。
- 如果首次 AssumeRole 报 audience/sub 不匹配，可临时在 `Configure credentials` 步骤前打印 OIDC token 的 `iss/aud/sub`（只打印 claims，不打印 token），以实际值修正信任策略；不要盲目改成通配符。
- 仓库改名后 `sub` 中的名称部分会变化，需要同步更新信任策略。

记录 Role ARN：

```text
acs:ram::<account-id>:role/github-actions-deploy
```

#### 4.4 授予最小权限

创建自定义权限策略 `EcsCloudAssistantDeploy`：

```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecs:RunCommand",
        "ecs:DescribeInvocationResults",
        "ecs:DescribeCloudAssistantStatus"
      ],
      "Resource": [
        "acs:ecs:*:*:instance/*",
        "acs:ecs:*:*:command/*"
      ]
    }
  ]
}
```

把该策略附加到 `github-actions-deploy` 角色。

注意：云助手 API 的资源级授权按阿里云文档使用 `instance/*`。不要写成具体实例 `acs:ecs:*:*:instance/<instance-id>`，实测会在 `DescribeCloudAssistantStatus` 返回 `Forbidden.RAM`。该角色仍受 OIDC 信任策略限制（只有 `main` 分支可 AssumeRole），并且所有调用都可在 ActionTrail 中审计；如需进一步收紧，可后续改用资源组或标签条件，而不是收敛到单个实例 ARN。

如果附加策略后仍返回 `Forbidden.RAM`，依次检查：策略是否真的授予给了该角色、`ALIYUN_REGION` 是否为实例所在地域、`ECS_INSTANCE_ID` 是否与实例一致。

### 5. 配置 GitHub Variables

仓库 **Settings → Secrets and variables → Actions → Variables**：

| 名称 | 值 |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://docs.stationpc.com` |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog 项目 key（可选） |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog host（可选） |
| `ALIYUN_OIDC_PROVIDER_ARN` | `acs:ram::<account-id>:oidc-provider/github-actions` |
| `ALIYUN_ROLE_ARN` | `acs:ram::<account-id>:role/github-actions-deploy` |
| `ALIYUN_REGION` | ECS 所在地域 ID，如 `cn-hongkong` |
| `ECS_INSTANCE_ID` | 目标 ECS 实例 ID |

> `NEXT_PUBLIC_*` 是**构建时内联**变量，改值后需触发一次部署才生效。

### 6. 服务器运行时环境变量

`FEEDBACK_API_URL`、`FEEDBACK_API_TOKEN` 不再放在 GitHub Secrets，也不放进云助手命令内容。它们在服务器上以 root 600 的 env 文件保存：

```bash
# 在 ECS 上执行；如果当前 SSH 用户不在 docker 组，命令前加 sudo
docker inspect stationnas-docs \
  --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep -E '^FEEDBACK_API_(URL|TOKEN)=' \
  | sudo sh -c 'umask 077; cat > /etc/stationnas-docs.env'

sudo chown root:root /etc/stationnas-docs.env
sudo chmod 600 /etc/stationnas-docs.env

# 只检查键数量，不要打印值；应为 2
sudo grep -c '^FEEDBACK_API_' /etc/stationnas-docs.env
```

格式要求：

- 每行 `KEY=VALUE`，等号两边不要加空格。
- 不要给值加引号（`docker run --env-file` 不会去掉引号）。
- 使用 LF 行尾；从 Windows 复制过可执行 `sudo dos2unix /etc/stationnas-docs.env`。
- 文件权限必须是 `600 root:root`。

如果旧容器里没有这两个变量（例如容器启动早于密钥配置），注意 GitHub Secrets 创建后无法回显，不能作为取值来源。请向反馈服务提供方重新获取，或在服务端轮换出新的 URL/TOKEN，再用编辑器写入 `/etc/stationnas-docs.env`；不要用 `echo` 把值留在 shell history。

### 7. GHCR 镜像访问

服务器执行 `docker pull ghcr.io/...` 需要认证，二选一：

- **方式 A（推荐）**：GitHub 包页面将 `stationnas-docs` 包设为 **public**（内容本就公开，服务器拉取无需认证）。
- **方式 B**：服务器登录一次：
  ```bash
  echo "$PAT" | docker login ghcr.io -u <github用户名> --password-stdin
  ```
  PAT 需 `read:packages` 权限。

### 8. 网络安全组与会话管理

1. 查当前管理出口 IP：`curl -s https://api.ipify.org`（或团队固定出口 IP/CIDR）。
2. 安全组入方向：
   - 保留 `22/TCP`，授权对象改为 `<管理IP>/32`（如有 IPv6 再加一条）。
   - **删除** `0.0.0.0/0` 和 `::/0` 的 22 规则。
   - 保留 `80/443` 对公网开放（nginx + Let's Encrypt）。
   - 出方向放行 443（云助手、GHCR 拉取）。
3. 会话管理兜底：ECS 控制台 → 实例 → 远程连接 → 会话管理。它走云助手 Agent 的出站通道，不需要入站 22。
4. 如果使用 RAM 子账号做日常运维，给该子账号最小会话管理权限（`ecs:StartSession`、`ecs:DescribeInstances`、`ecs:DescribeCloudAssistantStatus`）。
5. 最后兜底：ECS 控制台的 VNC 远程连接不依赖任何网络端口。

## 触发部署

- **自动**：推送 `main`（含翻译 PR 合并）即自动部署。
- **手动**：仓库 Actions 页 → **Deploy** → **Run workflow**（请从 `main` 运行；信任策略只允许 `refs/heads/main`）。

部署 job 的流程：

```text
GitHub OIDC → AssumeRole → aliyun ecs RunCommand
  → 云助手执行 scripts/deploy-remote.sh
```

`deploy-remote.sh` 的服务器端动作：

```bash
docker pull ghcr.io/stationpc-technology/stationospro-docs:<sha>
docker rm -f stationnas-docs || true
docker run -d --name stationnas-docs \
  --restart unless-stopped \
  -p 127.0.0.1:3000:3000 \
  --env-file /etc/stationnas-docs.env \
  --label "deploy.sha=<sha>" \
  ghcr.io/stationpc-technology/stationospro-docs:<sha>
# 健康检查 http://127.0.0.1:3000/，失败自动回滚旧镜像
# 清理旧镜像，只保留最近 5 个 sha 镜像（latest 不受影响）
```

如果需要在服务器上手动应急部署，可用 ECS 控制台的云助手“执行命令”或会话管理运行上面的命令。

## 部署后验证

在 GitHub Actions 日志中确认：

- `Configure credentials via GitHub OIDC` 成功，`aliyun sts GetCallerIdentity` 输出角色 ARN。
- `DescribeCloudAssistantStatus` 预检通过。
- `RunCommand` 返回 `InvokeId`，最终 `InvocationStatus=Success`、`ExitCode=0`。
- 云助手输出包含 `Pulling ...`、`Health check passed`、`Deploy finished: ...`。

服务器与站点：

```bash
# 云助手命令结果（需有云助手读权限）
aliyun ecs DescribeInvocationResults \
  --RegionId "<region-id>" \
  --InvokeId "<invoke-id>" \
  --InstanceId "<instance-id>" \
  --ContentEncoding PlainText

# 容器状态与标签
docker ps
docker inspect stationnas-docs --format '{{index .Config.Labels "deploy.sha"}}'

# 运行时变量键数量应为 2（不要打印值）
docker inspect stationnas-docs --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -c '^FEEDBACK_API_'

# 站点
curl -I https://docs.stationpc.com/            # 200
curl -I https://docs.stationpc.com/docs        # 200（英文，默认语言）
curl -I https://docs.stationpc.com/zh/docs     # 200（中文）
curl -s https://docs.stationpc.com/api/search   # 返回 JSON，搜索可用
curl -I https://docs.stationpc.com/llms.txt    # 200
```

- 浏览器提交一次文档反馈，确认 `FEEDBACK_API_*` 生效。
- `docker logs --tail 100 stationnas-docs` 无启动错误。
- 从管理 IP 之外执行 `nc -vz -w 5 docs.stationpc.com 22` 应超时/拒绝；管理 IP 仍可 SSH。
- ECS 控制台“会话管理”可登录，`SupportSessionManager=true`。
- ActionTrail 能看到 `AssumeRoleWithOIDC` 和 `RunCommand` 事件。

## 回滚

镜像 tag 即 commit sha，回滚 = 部署旧 sha。服务器本地只保留最近 5 个镜像（部署时自动清理），**更旧的镜像已从本地删除**，但 GHCR 上仍完整保留，可直接重新拉取。

### 应用版本回滚

用云助手控制台/会话管理在服务器执行：

```bash
IMAGE=ghcr.io/stationpc-technology/stationospro-docs:<旧-sha>
docker pull "$IMAGE"
docker rm -f stationnas-docs
docker run -d --name stationnas-docs \
  --restart unless-stopped \
  -p 127.0.0.1:3000:3000 \
  --env-file /etc/stationnas-docs.env \
  --label "deploy.sha=<旧-sha>" \
  "$IMAGE"
```

也可以 revert 对应 commit 并 push，让 workflow 重新构建/部署旧代码（会生成新的镜像 tag，不是直接复用旧镜像）。

### 部署链路回滚

如果新链路尚未稳定、22 也还没收回，直接 revert `.github/workflows/deploy.yml` 的改动并 push，旧 `appleboy/ssh-action` 流程恢复（旧 Secrets 仍在时）。建议旧 Secrets 保留 1–2 周再删。

### 连不上服务器

- 优先 ECS 控制台“会话管理”（无需 22）。
- 其次 ECS 控制台 VNC 远程连接（无需任何入站端口）。
- 最后临时把管理 IP 加入安全组 22（仅 `/32`），处理完立即收回。

## 常见问题

- **OIDC AssumeRole 失败**：先核对 `iss`、`aud`、`sub` 三处。`aud` 必须在 action、OIDC 提供商 Client ID、信任策略中一致；`sub` 使用 immutable 格式。首次排查可在 workflow 中打印 token claims。
- **云助手 Agent 离线**：控制台检查云助手状态；会话管理/VNC 可兜底。Agent 恢复在线后再部署。
- **命令内容超过 24KB**：`RunCommand` 的 Base64 命令内容上限为 24KB。当前 `deploy-remote.sh` 约 3–4KB；脚本显著变大时需拆分或改用 `InvokeCommand` 引用。
- **env 文件不生效**：确认 `/etc/stationnas-docs.env` 为 `600 root:root`、LF 行尾、值没有多余引号；`docker inspect` 中应能看到两个 `FEEDBACK_API_*` 键。
- **GHCR 拉取失败**：确认包为 public，或服务器已用只读 PAT 登录 GHCR。
- **端口冲突**：容器只绑 `127.0.0.1:3000`，如需改端口需同步 nginx 配置。
- **NEXT_PUBLIC_SITE_URL 不生效**：它是构建时内联的，改 GitHub 变量后需触发一次部署。
- **证书续期失败**：确认 80 端口 `/.well-known/acme-challenge/` 可达、certbot 的 systemd timer 已启用。
- **部署后页面异常**：先在服务器 `docker logs -f stationnas-docs` 看容器日志；脚本健康检查失败时会自动回滚旧镜像。

## 备选方案：容器内 nginx 一体化

不想维护宿主机 nginx 时，可将反代一并放入 Docker（配置见 `docker-compose.nginx.yml.example` + `nginx-container.conf`）：

```bash
cp docs/deployment/docker-compose.nginx.yml.example docker-compose.yml
cp docs/deployment/nginx-container.conf nginx.conf
docker compose up -d
```

证书仍由宿主机 certbot 签发，挂载 `/etc/letsencrypt` 给 nginx 容器只读。应用镜像与构建流程完全不变，两方案可随时切换。
