# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

StationOS Pro 帮助中心（StationPC NAS 设备操作系统的官方文档站），线上地址 https://docs.stationpc.com。基于 **Next.js 16 + React 19 + Fumadocs** 构建的**中英双语**文档站点，**必须以 Node.js 服务端形式部署**（依赖 `/api/search`、动态 OG 图、`llms.txt` 和语言中间件，不能纯静态托管）。

## 常用命令

```bash
npm run dev            # 本地开发服务器 http://localhost:3000
npm run check:content  # 内容一致性校验（结构对齐/meta.json/翻译过期/死链）
npm run types:check    # 重新生成 MDX/类型 + 严格 TypeScript 检查（不产出文件）
npm run build          # 生产构建（能暴露路由/渲染问题）
npm start              # 运行生产构建
```

- 包管理器用 **npm**（lockfile 为 `package-lock.json`）。
- **没有自动化测试框架**。提交前必须运行 `npm run types:check` 和 `npm run build` 作为验证。
- 内容/导航改动后，还需在浏览器中人工验证 `/docs`（英文）、`/zh/docs`（中文）、搜索功能、内部链接和移动端布局。

## 架构要点

### 多语言内容与 i18n（最重要的约定）

- **`content/docs/zh/` 是唯一人工编写的文档源**（源语言为简体中文，见 `src/lib/i18n.ts` 的 `sourceLanguage`）。
- **其余 7 种语言（zh-Hant/en/ja/ko/de/fr/es）由 LLM 翻译流程生成**（`/translate-docs` skill，规范在 `.claude/skills/translate-docs/`），不要直接手改译文。
- 所有语言的目录结构和文件名**必须与 zh 完全一致**；`meta.json` 的 `pages` 数组跨语言一致，仅 `title` 本地化。
- **翻译过期检测**：每篇译文 frontmatter 有 `sourceHash`（中文源 sha256 前 12 位），中文修改后 hash 不匹配即报错，需重跑 `/translate-docs`。相关脚本：`scripts/check-content.mjs`（校验）、`scripts/update-sourcehash.mjs`（同步 hash）。
- 术语表与分语言风格注意点在 `.claude/skills/translate-docs/glossary.json`（品牌名永不翻译、各语言固定译法）。
- **图片引用**：`zh/` 源直引 `/images/common/...`；译文统一引用 `/images/<语言>/...`，本地化图不存在时由 `next.config.mjs` 的 afterFiles rewrite 自动回退到 `common`——本地化一张图只需把文件放进 `public/images/<语言>/`，无需改 MDX。图片不做构建期静态导入（`source.config.ts` 的 `remarkImageOptions`），且已从 `src/proxy.ts` 的 middleware matcher 中排除（图片不做语言协商）。
- 默认语言 `en` 的 URL **不带前缀**：`/docs` 内部 rewrite 到 `/en/docs`，`/en/docs` 会 301 到 `/docs`，`/zh/docs` 等保持原样（`hideLocale: 'default-locale'`）。
- 内容检查：`npm run check:content`（结构对齐 + meta.json + 过期检测 + 死链），CI 中在 types:check 之前运行。
- 新增语言：修改 `src/lib/i18n.ts`、`scripts/check-content.mjs`、`scripts/update-sourcehash.mjs` 的语言列表，补充 glossary.json，再跑 `/translate-docs`。

### 路由与中间件

- `src/proxy.ts`：Next.js 16 将 `middleware.ts` 改名为 `proxy.ts`。**它必须在 `src/` 目录下**（使用 src 目录结构时），否则中间件被静默忽略（曾导致 `/docs` 404）。它按顺序处理：① `.md` 后缀 / markdown 协商请求 rewrite 到 `llms.mdx` 内容路由（供 LLM 爬虫）→ ② i18n 语言协商。
- `src/app/[lang]/`：所有本地化路由在此之下；`(home)/` 是首页，`docs/[[...slug]]` 是文档页，另有 OG 图和 llms.mdx 路由。
- `src/lib/i18n.ts` 语言配置；`src/lib/source.ts` Fumadocs loader（含 lucide 图标插件）；`source.config.ts` Fumadocs 集合与 MDX 配置（启用 lastModified 插件和 processed markdown）。

### API 与环境变量

- `/api/search`：站内搜索（中文用 CJK 分词，见 `src/lib/search-tokenizers.ts`）。
- `/api/feedback`：文档反馈转发到外部 API（`src/lib/feedback.ts`）。
- `llms.txt` / `llms-full.txt`：LLM 友好的全站文本。
- 环境变量见 `.env.example`：`NEXT_PUBLIC_SITE_URL`（**构建时内联**，改值后需重新构建部署才生效）、`NEXT_PUBLIC_POSTHOG_KEY/HOST`（PostHog 分析）、`FEEDBACK_API_URL/TOKEN`。

### 生成目录

`.next/` 和 `.source/` 是生成目录，**不要手动编辑**。

## 文档编写约定

- 文件名用小写 kebab-case（如 `quick-start/install.mdx`）；更新日志文件名用日期（如 `changelog/2026.09.04.mdx`）并在该目录 `meta.json` 的 `pages` 中登记。
- MDX 可用组件参考 `docs/fumadocs-components.md`。
- 代码风格：两空格缩进、单引号、分号；组件 PascalCase、函数/变量 camelCase、路由目录小写；`src/` 内导入用 `@/*` 别名；默认使用 server component，仅在需要浏览器状态/副作用时才加 client boundary。

## 部署

详见 `docs/deployment/DEPLOYMENT.md`。要点：推送 `main` 自动触发 GitHub Actions 构建 Docker 镜像 → 推送 GHCR → SSH 部署到公司服务器（Next.js standalone，监听 `127.0.0.1:3000`，宿主机 nginx 反代 + HTTPS）。回滚 = 用旧 commit sha 的镜像重新部署（GHCR 上完整保留历史镜像）。
