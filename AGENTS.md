# StationOS Pro 帮助中心：代理工作指南

本文件适用于整个仓库。面向用户的帮助中心地址为 `https://docs.stationpc.com`，内容介绍 StationPC NAS 设备及 StationOS Pro 的安装、使用、故障排查与更新。与维护者交流默认使用简体中文。

## 技术栈与运行方式

- Next.js 16 App Router、React 19、TypeScript 严格模式、Fumadocs、Tailwind CSS 4。具体版本以 `package.json` 和 `package-lock.json` 为准。
- 使用 **Node.js 22 + npm**，与 CI、Docker 保持一致；不要引入其他包管理器的锁文件。
- 站点需要 Node.js 服务端，包含搜索、反馈 API、语言协商等功能。保留 `next.config.mjs` 的 `output: 'standalone'`，不要改成纯静态导出。
- `.next/`、`.source/`、`next-env.d.ts`、`*.tsbuildinfo` 是生成产物，不要手动编辑或提交。

## 代码与内容入口

| 路径 | 职责 |
| --- | --- |
| `content/docs/zh/` | 唯一人工编写的文档源，包含 MDX 页面和导航 `meta.json` |
| `content/docs/{zh-Hant,en,ja,ko,de,fr,es}/` | 翻译流程生成的七种译文，与中文树保持一致 |
| `public/images/common/`、`public/images/<lang>/` | 公共图片与对应语言的本地化图片 |
| `locales.json` | 源语言、默认语言、语言清单的唯一数据源 |
| `src/lib/i18n.ts` | Fumadocs i18n 配置、语言显示名、HTML 语言标签和搜索分词配置 |
| `source.config.ts` | MDX 集合、frontmatter schema、processed markdown 和最后更新时间插件 |
| `src/lib/source.ts` | Fumadocs loader、页面查询、Markdown 文本与 OG 图片 URL 辅助函数 |
| `src/lib/shared.ts`、`src/lib/layout.shared.tsx` | 站点地址、GitHub 信息、路由常量与共享布局选项 |
| `src/app/[lang]/` | 本地化根布局、`(home)/` 首页、`docs/[[...slug]]/` 文档页 |
| `src/proxy.ts` | Markdown 请求重写和语言协商 |
| `src/app/api/search/route.ts`、`src/lib/search-tokenizers.ts` | 多语言搜索与 CJK 分词 |
| `src/app/api/feedback/route.ts`、`src/lib/feedback.ts` | 校验并转发文档反馈到外部 API |
| `src/app/llms.txt/`、`src/app/llms-full.txt/` | 全站 LLM 文本入口 |
| `src/app/[lang]/llms.mdx/`、`src/app/[lang]/og/` | 单页 Markdown 和 Open Graph 图片路由 |
| `src/components/mdx.tsx` | 全局 MDX 组件注册，默认图片使用 ImageZoom |
| `src/components/feedback/`、`src/components/feedback-adapter.tsx` | 反馈交互、数据结构和站点适配 |
| `src/components/analytics.tsx` | PostHog 初始化、浏览记录与交互事件 |
| `src/app/global.css` | Tailwind/Fumadocs 主题导入与全局样式 |
| `scripts/` | 内容一致性检查与译文 `sourceHash` 更新 |
| `docs/` | 项目内部编写、翻译、部署指南，不进入帮助中心导航 |
| `.github/workflows/`、`Dockerfile` | CI 检查与生产镜像构建部署 |

## 文档编写与翻译

1. 用户文档先编辑 `content/docs/zh/`。不要独立手改其他语言来修正文案；译文通过 `translate-docs` 技能生成，唯一源是 `.agents/skills/translate-docs/SKILL.md`（Claude Code 通过 `.claude/skills/translate-docs` 符号链接读取同一份），术语表是同目录的 `glossary.json`。Claude Code 用 `/translate-docs [--full] [语言...]`；Codex 用 `$translate-docs`，参数写在同一消息里，如 `$translate-docs --full en ja`。当用户要求“翻译文档/同步译文/更新译文”，或 `npm run check:content` 报 `[翻译]`/`[结构]` 错误且原因确实是 zh 有改动时，使用该技能。技能被显式调用或按 `description` 自动匹配后，必须先读取 SKILL.md 再执行，不要凭记忆套流程。
2. 普通页面文件名使用小写 kebab-case，例如 `quick-start/da400-install.mdx`；更新日志沿用 `changelog/YYYY.MM.DD.mdx`。frontmatter 提供 `title` 和 `description`，正文按实际设备和系统行为编写，不臆造功能、界面入口或型号支持范围。
3. 新增、删除、重命名或重排页面时，同步相邻 `meta.json` 和相关内部链接。所有语言的目录、文件名及 `meta.json` 的 `pages` 数组必须与中文一致；导航 `title` 按语言翻译，`pages` 条目不翻译。
4. 翻译正文、标题和描述时，保留代码、行内代码、URL、邮箱及 MDX 标签结构；品牌、型号和固定术语遵循术语表。繁体中文也需按术语表调整词汇。
5. 每篇译文的 `sourceHash` 是中文源文件完整内容的 SHA-256 前 12 位；中文源不添加此字段。完成对应译文更新后再运行 `npm run sync:sourcehash`，也可传入语言，如 `npm run sync:sourcehash -- en ja`（等价于 `node scripts/update-sourcehash.mjs en ja`）。
6. **不要仅更新 hash 来消除过期错误。** 上述脚本会重写所选语言的全部译文 hash；执行前确认这些语言中所有过期页面均已翻译，避免把旧译文标记成最新。
7. MDX 组件用法参考 `docs/fumadocs-components.md`，实际全局注册以 `src/components/mdx.tsx` 为准。未注册的组件在 frontmatter 后导入；大量页面共用的组件可统一注册。

`.translate-sync-commit` 是团队共享的增量水位线：开始翻译前先 `git pull --ff-only`；只有 `npm run check:content` 0 错误时，才能用 `git rev-parse HEAD > .translate-sync-commit` 推进，并与译文一起提交。禁止手动写入比实际同步进度更晚的 commit，也不要为了消除过期报错而只更新 sourceHash。多人同时翻译时：pull 或合并后若该文件被远端更新或发生冲突，以远端水位线为起点；在合并后的工作区重新执行增量翻译与终检，全绿后再写入新的 HEAD。若本地已翻译但未提交时 pull 到新的 zh 改动，必须把这些改动一并同步后才能推进。

新增语言时，更新 `locales.json`、`src/lib/i18n.ts` 的 `localeConfigs`、术语表和翻译流程中的语言说明，再生成完整译文树。检查脚本和图片回退配置已读取 `locales.json`，不要再维护独立语言清单。需要 CJK 搜索的新语言还应检查 `src/lib/search-tokenizers.ts` 的 Segmenter 映射。

部分内部指南保留早期的语言配置或英文直接编写示例；遇到冲突，以本指南、`locales.json` 和当前实现为准。

## 图片、路由与语言约定

- 中文源使用 `/images/common/...`；译文使用 `/images/<lang>/...`。新增公共图片放到 `public/images/common/`，本地化图片放到相同相对路径的 `public/images/<lang>/`，无需改动译文 MDX。
- `next.config.mjs` 的 `afterFiles` rewrite 保证本地化图片优先，缺失时回退到公共图片。保留 `source.config.ts` 的 `remarkImageOptions: { useImport: false, onError: 'ignore' }`，不要强制构建时导入尚未存在的译文图片。
- 默认语言是 **en**，公开 URL 不带语言前缀：`/docs` 内部重写至 `/en/docs`；`/en/docs` 重定向至 `/docs`；`/zh/docs` 等其他语言路径保留前缀。新增链接遵循此规则；保持已有相对链接和 `createRelativeLink` 的解析能力。
- `src/proxy.ts` 必须留在 `src/` 下。先处理 `.md` 后缀及 Markdown 内容协商，再处理 i18n；修改顺序会影响 Markdown 入口。
- proxy matcher 排除 `/api/`、`/images/`、Next 静态资源和全站 LLM 文本入口。文档 `.md` 请求必须仍进入 matcher，图片不能进入语言协商。
- 搜索使用 `localeConfigs` 配置；中文、繁中、日语和韩语由 `Intl.Segmenter` 及 CJK 子词分词器处理。调整搜索时检查各语言结果。
- 文档页负责 canonical、hreflang、OG 元数据、Markdown 查看/复制及反馈。修改布局或 URL 时保持这些功能一致。

## 代码风格与环境变量

- 两空格缩进、单引号、分号、具名导入；React 组件 PascalCase，函数和变量 camelCase，路由目录小写。`src/` 内优先使用 `@/*` 导入别名。
- 默认使用 Server Components，仅浏览器状态、事件或副作用所需的组件添加 `'use client'`。路由 `params` 沿用当前异步读取方式和 Next 生成的类型。
- 优先复用 Fumadocs 组件、既有 UI 组件与样式；共享 MDX 渲染改动集中在 `src/components/mdx.tsx`。
- 环境变量模板为 `.env.example`。本地值放在已忽略的 `.env.local`，不要提交密钥。
- `NEXT_PUBLIC_SITE_URL` 用于公开站点元数据；`NEXT_PUBLIC_POSTHOG_KEY`、`NEXT_PUBLIC_POSTHOG_HOST` 用于统计。`NEXT_PUBLIC_*` 在构建时内联，修改后需重新构建。未配置 PostHog key 时统计不初始化。
- `FEEDBACK_API_URL`、`FEEDBACK_API_TOKEN` 是服务端运行时变量；token 不得放入客户端或改为 `NEXT_PUBLIC_*`。缺少反馈地址时提交会失败，验证成功提交需配置可用的反馈服务。

## 开发与验证

```bash
npm ci                 # 按锁文件安装；postinstall 生成 Fumadocs 元数据
npm run dev            # 本地开发：http://localhost:3000
npm run check:content  # 内容结构、meta、翻译过期、文档链接与图片检查
npm run types:check    # fumadocs-mdx + next typegen + tsc --noEmit
npm run build          # 生产构建
```

需要更新依赖时使用 `npm install` 并同步 `package-lock.json`。当前没有独立测试框架，也没有 `npm test` 或 lint 脚本，不要声称运行了不存在的检查。

提交变更前依次运行 `npm run check:content`、`npm run types:check` 和 `npm run build`，与 `.github/workflows/quality.yml` 一致。类型生成和构建会写入生成目录，不要并行执行。报告真实检查结果；发现既有问题时说明来源，不为通过检查而随意修改无关内容。

内容检查脚本不能代替人工验证：当前不会强制比较跨语言 `pages` 数组，也不能覆盖所有相对链接、锚点和 JSX 图片；未登记的页面仅产生警告。内容或导航变化后，在浏览器检查 `/docs`、`/zh/docs`、语言切换、搜索、内部链接、图片和移动端布局。显式 `/en/docs` 应验证重定向行为。

路由或配置变化后，额外验证 `.md` 文档请求、`Accept: text/markdown`、`/llms.txt`、`/llms-full.txt`、OG 图片及 canonical/hreflang。反馈变化验证输入错误与外部服务失败，并在已配置的测试服务上验证成功提交。

本项目使用 standalone 输出，生产预览使用生成的服务器；运行前补齐静态资源：

```bash
mkdir -p .next/standalone/.next/static .next/standalone/public
cp -r .next/static/. .next/standalone/.next/static/
cp -r public/. .next/standalone/public/
PORT=3458 node .next/standalone/server.js
```

`npm start` 对应 `next start`，当前 standalone 配置应优先使用上述方式。若本机代理影响本地 HTTP 检查，使用 `curl --noproxy '*' http://localhost:3458/docs`。

## 部署与交付

- 生产部署参考 `docs/deployment/DEPLOYMENT.md`，实际流程以 `.github/workflows/deploy.yml` 和 `Dockerfile` 为准。
- 推送 `main` 自动构建并推送 GHCR 镜像，再通过 SSH 部署到服务器；应用端口映射至宿主机 `127.0.0.1:3000`，由 nginx 提供 HTTPS。不要将推送 `main` 当作普通验证步骤。
- Docker 构建需要先复制源码再运行 `npm ci`，因为 postinstall 依赖 `source.config.ts` 和内容文件；运行镜像需包含 standalone、`.next/static` 和 `public`。
- 提交保持单一主题，使用简短祈使句，可沿用历史中的 `docs:`、`feat:`、`fix:`、`refactor:` 前缀。保留用户已有改动，只暂存本次任务相关文件。
- PR 说明具体变更与验证结果；视觉调整附截图，新增路由、配置变化、翻译缺口需明确说明。完成报告简洁说明修改内容及任何未完成的验证。
