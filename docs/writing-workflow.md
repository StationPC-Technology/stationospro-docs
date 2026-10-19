# 文档编写与发布工作流

> 覆盖从编写中文文档到推送上线的完整流程。翻译机制部分整合并替代了原「多语言文档维护工作流」。

## 项目概览

StationOS Pro 帮助中心（https://docs.stationpc.com）基于 **Next.js 16 + React 19 + Fumadocs** 构建，共 8 种语言（zh / zh-Hant / en / ja / ko / de / fr / es），**必须以 Node.js 服务端形式部署**（依赖 `/api/search`、动态 OG 图、`llms.txt` 和语言中间件，不能纯静态托管）。

## 核心原则

- `content/docs/zh/` 是唯一人工编写的文档源（源语言：简体中文）。
- 其余 7 种语言均由 LLM 翻译流程生成，**不要直接手改译文**（修改会被下次翻译覆盖）：

  | 语言 id | 目录 | 语言 |
  |---|---|---|
  | `zh-Hant` | `content/docs/zh-Hant/` | 繁體中文 |
  | `en` | `content/docs/en/` | English（默认语言，URL 无前缀） |
  | `ja` | `content/docs/ja/` | 日本語 |
  | `ko` | `content/docs/ko/` | 한국어 |
  | `de` | `content/docs/de/` | Deutsch |
  | `fr` | `content/docs/fr/` | Français |
  | `es` | `content/docs/es/` | Español |

- 所有语言的目录结构和文件名必须与 `zh/` 完全一致。
- 每篇译文的 frontmatter 记录 `sourceHash`（中文源内容的 sha256 前 12 位）。中文源一旦修改，hash 不再匹配，`check:content` 会判定该译文**过期**并报错——这是防止译文悄悄烂掉的核心机制。所以**改中文和同步翻译是同一个流程里的两步**，缺一不可。
- 语言配置集中在 `src/lib/i18n.ts`（`localeConfigs` / `languages` / `sourceLanguage`）。

## 一、编写中文文档

**1. 新建/编辑文件** `content/docs/zh/<栏目>/<文件名>.mdx`

- 栏目：`quick-start/`、`app-guide/`、`faq/`、`explore/`、`changelog/`
- 文件名用小写 kebab-case（如 `da400-install.mdx`）；**更新日志例外**：文件名用日期（如 `changelog/2026.09.04.mdx`），并在该目录 `meta.json` 的 `pages` 中登记
- frontmatter 只需 `title` 和 `description`（schema 为 Fumadocs 标准 `pageSchema`）
- MDX 可用组件查 [Fumadocs 常用内置组件编写指南](./fumadocs-components.md)
- 代码风格：两空格缩进、单引号、分号

**2. 放图片**

- 中文源图片放 `public/images/common/...`，MDX 里写 `![alt](/images/common/...)`
- 不需要为译文准备图片：译文自动引用 `/images/<语言>/...`，缺失时由 `next.config.mjs` 的 rewrite 回退到 `common`。想本地化某张图，只需把文件放进 `public/images/<语言>/`，**不用改任何 MDX**

**3. 登记导航**：新文件必须加入所在目录 `meta.json` 的 `pages` 数组（改中文那份即可，译文侧的 meta.json 由翻译流程同步，仅 `title` 本地化）

**4. 本地预览**：`npm run dev` → http://localhost:3000，中文看 `/zh/docs/...`

## 二、本地质量校验（提交前三连）

```bash
npm run check:content   # 结构对齐 / meta.json 一致性 / 翻译过期 / 死链
npm run types:check     # MDX 重新生成 + 严格 TS 检查
npm run build           # 生产构建，暴露路由/渲染问题
```

项目没有自动化测试框架，这三个命令就是验证手段（CI 中同样跑这三项）。中文/导航改动后，还应在浏览器中人工检查 `/docs`（英文）、`/zh/docs`（中文）、搜索功能、内部链接和移动端布局。

## 三、同步翻译

写完中文后，执行翻译 skill：

```
/translate-docs        # Claude Code
$translate-docs        # Codex CLI
```

参数写在同一消息中，例如 `/translate-docs --full en ja` 或 `$translate-docs --full en ja`。

skill 会自动完成：`git diff` 识别改动文件（增量模式）→ 按 `.agents/skills/translate-docs/glossary.json` 术语表翻译 → 创建/更新各语言 meta.json → 运行 `npm run sync:sourcehash` 同步 sourceHash → `npm run check:content` 终检。

### 质量防线

1. **`npm run check:content`**（CI 中运行）：各语言结构对齐、meta.json 一致性、sourceHash 过期检测、内部死链。任何一项失败都会阻塞合并。
2. **术语表**：`glossary.json` 维护了品牌名（永不翻译）、各语言固定译法、技术缩写和分语言风格注意点（如繁中的词汇改写、日语敬体、德语 Sie 称呼）。发现译法不统一时，先更新术语表再重翻。
3. **`npm run types:check` + `npm run build`**：确认 MDX 结构未被破坏。

### 译文过期（check:content 报「已过期」）怎么处理

中文源修改后未重新翻译时必然出现，是设计如此。处理方式：

```bash
git diff --name-only -- content/docs/zh   # 看哪些中文文件改过
# 然后运行 /translate-docs（Claude Code）或 $translate-docs（Codex）增量翻译
```

## 四、提交与推送

提交信息用中文，遵循 conventional commits：

```
docs(quick-start): 新增 DA400 安装指南

- 补充包装清单与接口说明
- 同步 8 语言译文

Co-Authored-By: <当前实际使用的模型名和版本> <noreply@厂商>
```

```bash
git add content/docs public/images
git commit
git push origin main
```

## 五、推送后的自动化

| 阶段 | 机制 |
|---|---|
| 质量门禁 | `.github/workflows/quality.yml` 在 push / PR 时跑 `check:content` + `types:check` + `build` |
| 自动部署 | `.github/workflows/deploy.yml`：push `main` 触发，构建 Docker 镜像（tag = commit sha）→ 推送 GHCR → SSH 部署到公司服务器 |
| 生效 | Next.js standalone 监听 `127.0.0.1:3000`，宿主机 nginx 反代 + HTTPS，约 1 个 workflow 周期后线上生效 |

部署细节见 [部署指南](./deployment/DEPLOYMENT.md)。

## 六、发布后验证

- `/docs`（英文）、`/zh/docs`（中文）页面正常
- 站内搜索、内部链接、移动端布局
- 新图片是否正常显示

## 常见问题

### 本地跑生产构建

standalone 输出不能用 `npm start`：

```bash
cp -r public/. .next/standalone/public/ && PORT=3458 node .next/standalone/server.js
```

测本地端口 curl 需加 `--noproxy '*'`（本机 shell 配置了 http_proxy，否则 502）。

### 回滚

用旧 commit sha 的镜像重新部署（GHCR 保留全部历史镜像），或在 GitHub Actions 里对 Deploy 工作流 `workflow_dispatch` 手动重发。

### 改了 `NEXT_PUBLIC_SITE_URL`

它是**构建时内联**变量，改值后必须重新构建部署才生效。

## 新增语言

1. 在 `src/lib/i18n.ts` 的 `localeConfigs` 和 `languages` 中增加对应语言；
2. 在根目录 `locales.json` 登记语言清单（站点脚本与 next.config 的单一来源），并在 `scripts/check-content.mjs` 和 `scripts/update-sourcehash.mjs` 的语言列表中增加该语言；
3. 在 `.agents/skills/translate-docs/glossary.json` 中补充该语言的 `fixed` 固定译法和 `notes` 风格注意点，并在 SKILL.md 的语言表中登记；
4. 运行 `/translate-docs`（Claude Code）或 `$translate-docs`（Codex）全量翻译生成 `content/docs/<lang>/`；
5. 无其他平台配置需求；RTL 语言需额外检查布局。
