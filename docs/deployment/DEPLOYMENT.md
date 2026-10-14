# StationNAS-Docs 部署指南

> 本文档描述 `StationPC/StationNAS-Docs` 帮助中心的自动化部署流程。
> 线上站点：`https://docs.stationpc.com`（域名 DNS 由阿里云/腾讯云管理）

## 架构总览

```
GitHub（公开仓库 StationPC/StationNAS-Docs）
  └── GitHub Actions
       ├── CI  quality.yml（typecheck + build）
       └── CD  deploy.yml（push main 触发）
            ├─ 构建 Docker 镜像（tag = commit sha）
            ├─ 推送 GHCR（ghcr.io/stationpc/stationnas-docs）
            └─ SSH 部署到公司服务器

公司服务器（海外机房，已有 Docker）
  ├─ app 容器：Next.js standalone，监听 127.0.0.1:3000
  └─ 宿主机 nginx：反代 3000 + HTTPS（Let's Encrypt 自动续期）
```

- **部署形态必须是 Node.js 服务端**：站点依赖 `/api/search`、动态 OG 图、`llms.txt`、语言中间件（`proxy.ts`），不能纯静态托管。
- **海外机房 + 海外用户为主**，直连即可，无需 CDN。

## 日常发布流程

| 变更 | 操作 | 效果 |
|---|---|---|
| 中文内容 | 编辑 `content/docs/zh/**` | — |
| 7 种译文 | 编辑 zh 后执行 `/translate-docs`（LLM 翻译流程，见 `docs/writing-workflow.md`）→ 中文与译文一起 push `main` | 自动构建发布 |
| 应急重新部署 | Actions → Deploy → Run workflow | 手动触发 |

## 前置条件

- 服务器：海外机房，已安装 Docker
- 域名 `docs.stationpc.com` 的 DNS 已可管理

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

### 4. 配置 GitHub Secrets / 变量

仓库 **Settings → Secrets and variables → Actions**：

| 名称 | 类型 | 值 |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | 变量（Variable） | `https://docs.stationpc.com` |
| `DEPLOY_HOST` | Secret | 服务器公网 IP 或域名 |
| `DEPLOY_USER` | Secret | SSH 登录用户名 |
| `DEPLOY_KEY` | Secret | SSH 私钥；对应公钥需放入服务器该用户的 `~/.ssh/authorized_keys` |

> `NEXT_PUBLIC_SITE_URL` 是**构建时内联**变量，改值后需触发一次部署才生效。

### 5. GHCR 镜像访问

服务器执行 `docker pull ghcr.io/...` 需要认证，二选一：

- **方式 A（推荐）**：GitHub 包页面将 `stationnas-docs` 包设为 **public**（内容本就公开，服务器拉取无需认证）。
- **方式 B**：服务器登录一次：
  ```bash
  echo "$PAT" | docker login ghcr.io -u <github用户名> --password-stdin
  ```
  PAT 需 `read:packages` 权限。

## 触发部署

- **自动**：推送 `main`（含翻译 PR 合并）即自动部署。
- **手动**：仓库 Actions 页 → **Deploy** → **Run workflow**。

`deploy.yml` 中服务器端执行的等价命令：

```bash
docker pull ghcr.io/stationpc/stationnas-docs:<sha>
docker rm -f stationnas-docs || true
docker run -d --name stationnas-docs \
  --restart unless-stopped \
  -p 127.0.0.1:3000:3000 \
  ghcr.io/stationpc/stationnas-docs:<sha>
```

每次部署后自动清理旧镜像，只保留最近 5 个 sha 镜像（`latest` 指向最新，不受影响）：

```bash
docker image ls ghcr.io/stationpc/stationnas-docs \
  --format '{{.CreatedAt}}|{{.ID}}|{{.Tag}}' \
  | grep -v '|latest$' \
  | sort -r \
  | tail -n +6 \
  | cut -d'|' -f3 \
  | sed 's#^#ghcr.io/stationpc/stationnas-docs:#' \
  | xargs -r -n1 docker rmi
```

## 部署后验证

```bash
curl -I https://docs.stationpc.com/            # 200
curl -I https://docs.stationpc.com/docs        # 200（英文，默认语言）
curl -I https://docs.stationpc.com/zh/docs     # 200（中文）
curl -s https://docs.stationpc.com/api/search   # 返回 JSON，搜索可用
curl -I https://docs.stationpc.com/llms.txt    # 200
curl -s https://docs.stationpc.com/ | grep -o 'https://docs.stationpc.com' | head -1  # canonical 为 https
```

## 回滚

镜像 tag 即 commit sha，回滚 = 部署旧 sha。服务器本地只保留最近 5 个镜像（部署时自动清理），**更旧的镜像已从本地删除**，但 GHCR 上仍完整保留，可直接重新拉取：

```bash
# 查看本地保留的历史镜像
docker images ghcr.io/stationpc/stationnas-docs

# 回滚到本地已有的旧 sha
docker rm -f stationnas-docs
docker run -d --name stationnas-docs \
  --restart unless-stopped \
  -p 127.0.0.1:3000:3000 \
  ghcr.io/stationpc/stationnas-docs:<旧 sha>

# 回滚到本地已清理的更旧版本（先 pull，再按上面的方式 run）
docker pull ghcr.io/stationpc/stationnas-docs:<更旧 sha>
```

## 常见问题

- **端口冲突**：容器只绑 `127.0.0.1:3000`，如需改端口需同步 nginx 配置。
- **NEXT_PUBLIC_SITE_URL 不生效**：它是构建时内联的，改 GitHub 变量后需触发一次部署。
- **证书续期失败**：确认 80 端口 `/.well-known/acme-challenge/` 可达、certbot 的 systemd timer 已启用。
- **部署后页面异常**：先在服务器 `docker logs -f stationnas-docs` 看容器日志。

## 备选方案：容器内 nginx 一体化

不想维护宿主机 nginx 时，可将反代一并放入 Docker（配置见 `docker-compose.nginx.yml.example` + `nginx-container.conf`）：

```bash
cp docs/deployment/docker-compose.nginx.yml.example docker-compose.yml
cp docs/deployment/nginx-container.conf nginx.conf
docker compose up -d
```

证书仍由宿主机 certbot 签发，挂载 `/etc/letsencrypt` 给 nginx 容器只读。应用镜像与构建流程完全不变，两方案可随时切换。
