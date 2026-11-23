# 切流清单（P5）

> 前置：P0–P4 已完成，`feat/portable-merge` 分支上 `npm run check:content`、`npm run types:check`、`npm run build` 全绿。
> 本清单里的「运维」「发布」项需要 ECS / 阿里云 / GitHub 权限，代码侧已就绪，不需要再改文档结构。

---

## 1. 合并前最后一遍自检（本地，作者可做）

```bash
npm ci
npm run check:content     # 只应剩「未登记在 meta.json」类告警
npm run types:check
npm run build             # 期望 3,735 个静态页面
```

线上化前用 standalone 跑一遍真实路径：

```bash
mkdir -p .next/standalone/.next .next/standalone/public
cp -r .next/static .next/standalone/.next/static
cp -r public/. .next/standalone/public/
PORT=3458 node .next/standalone/server.js
```

抽查（都应是 200）：

- `/`、`/zh`、`/ja/portable`、`/fr/portable`、`/es/portable`
- `/zh/portable/faq/support-max-sd`、`/zh/portable/guides/install-app`（Tabs）、`/zh/portable/video_tutorial/ap_mode`（YouTube）
- `/zh/portable/changelog`、`/zh/policies/privacy-policy`、`/zh/contact`、`/zh/desktop/app-guide/files`
- 旧站路径 308：`/docs/app-guide/files` → `/desktop/app-guide/files`、`/zh/docs/faq/support-max-sd` → `/zh/desktop/faq/support-max-sd`

---

## 2. 合并与发布（需要 GitHub 权限）

1. 推送分支并开 PR：`feat/portable-merge` → `main`。
2. PR 描述里贴：变更范围（P1–P4）、`check:content` / `types:check` / `build` 三条结果、关键截图。
3. 合并后 `main` 触发 `deploy.yml`：GHCR 镜像 → GitHub OIDC 换阿里云 STS → 云助手 RunCommand → ECS 上 `scripts/deploy-remote.sh` 起容器（`127.0.0.1:3000`）。
4. 部署完成先访问 `https://docs.stationpc.com/zh` 验收，**此时旧站仍在跑**，属于灰度状态。

---

## 3. 灰度期的配置（需要 ECS / nginx 权限）

1. nginx 增加 `/portable/*` 与 `/zh/portable/*` 等 8 语言前缀的转发（与 `/desktop/*` 同一条 upstream 即可，无需单独 server 块）。
2. 旧站两个域名保持原样，**不加 301**；只加两条软引导：
   - `<meta name="robots" content="noindex">`（可选，先不加以免影响 SEO 过渡）
   - 站点顶部公告条：「本文档已迁移到 docs.stationpc.com，本页内容将停止更新」+ 对应新页链接
3. 双跑统计 2 周：旧站 GA（`G-KN8GW9JM3K` / `G-DS9C35LTB6`）与新站 PostHog 对照，确认新站流量与旧站收敛。

---

## 4. 切流四条验收（全绿才动 301）

- [ ] 8 种语言的 `/portable/*` 全部有内容（无 404，无英文兜底）
- [ ] 站内死链 0（`npm run check:content` 通过）
- [ ] 图片全通（`/images/common/portable/**` 与回退规则生效，抽查 20 篇无裂图）
- [ ] 侧栏无孤儿页（`trouble_issue` 已并入 `troubleshooting`，`connect-issue` 已登记）

---

## 5. 301 与归档（验收后执行）

### 5.1 旧站 nginx 301

按 [merge-plan 附录 B.1](./merge-plan.md) 的规则改旧站 server 块：语言首页 exact match 6 条、`^/pocketcloud/search/?$` 特例放在通配之前、6 条 `^/pocketcloud/(.*)/?$` → `/portable/$1`。保留 `help.stationpc.cn` 与 `help.stationpc.com` 两个域名（包装盒二维码在 `help.stationpc.com` 上），至少保留 12 个月。

### 5.2 旧仓库归档

```bash
cd stationpc_nas_help
git tag -a archived-2026-11 -m "文档已并入 stationospro-docs，仓库归档"
git push origin archived-2026-11
```

README 顶部加一行：本仓库已归档，内容维护转移至 `StationPC-Technology/stationospro-docs`（`/portable/*`）。

### 5.3 镜像快照

旧站镜像 `registry.cn-beijing.aliyuncs.com/teamory/docs:latest` 打一个带日期的 tag 存档，ECS 上保留旧容器镜像 ≥12 个月，便于回滚。

---

## 6. 回滚

- **站点回滚**：GHCR 镜像按 `$sha` 保留，`scripts/deploy-remote.sh` 指定上一个 sha 重新部署即可。
- **301 回滚**：nginx 配置保留 `.bak`，`nginx -s reload` 前先 `nginx -t`；301 改回 200 只需注释掉 6 条 rewrite。
- **代码回滚**：`git revert` 合并提交；文档内容全在 `content/docs/**`，回滚不影响旧站。
