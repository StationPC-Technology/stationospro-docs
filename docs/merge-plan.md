# 双站合并方案：StationOS Pro + PocketCloud

> 状态：**P0–P4 已执行完毕（2026-11-23）**，P5 切流待运维与发布窗口。
> 范围：把 `stationpc_nas_help`（VuePress，便携式 NAS «PocketCloud»）并入 `stationospro-docs`（Next.js + Fumadocs，桌面式 NAS «StationOS Pro»），最终收敛为**一个站点、两个产品域、八种语言**。
> 本文档是**执行蓝本**：每个阶段给出动作、命令、产出、验收与回滚。术语以根目录 [GLOSSARY.md](../GLOSSARY.md) 为准；关键取舍见 [docs/adr/](./adr/README.md)。

---

## 0. 一句话结论

> 一个 Fumadocs 站点，URL 用产品线名分层（`/desktop/*`、`/portable/*`，域名已含 `docs` 故路径不再重复）、站级只保留 `/`、`/policies/*`、`/contact` 与全站搜索；旧站目录结构 100% 平移、只重排 `meta.json`；旧译文当基线校准、缺的 fr/es 新翻、zh-Hant 按术语表重做；图片去重后原图入库；旧站两域名长期保留，301 押后到四条验收全绿之后。（产品段命名理由见 [ADR-0007](./adr/0007-line-based-url-slugs.md)，去 `/docs` 段见 [ADR-0006](./adr/0006-drop-docs-url-prefix.md)。）

**总量**：中文源 43 + 125 + 1（StationOS Pro 概览页）= **169 篇** × 8 语言 = **1,352 篇 mdx**。
**估工**：**13–15 人日**（不含审阅等待）：准备 0.5、平台改造 3.5（含去 `/docs` 前缀 0.5–1）、内容管道 2、中文导入 3、译文 3–5、切流 1。

### 0.1 执行进度（2026-11-23）

| 阶段 | 状态 | 落点 |
|---|---|---|
| P0 基线 | ✅ | tag `pre-merge-2026-11`，分支 `feat/portable-merge` |
| P1 平台改造 | ✅ | `src/lib/{products,product-labels,product-tree}.ts`、`src/proxy.ts`、`src/app/[lang]/[...slug]/page.tsx`、`src/components/{product-nav,video-embed,search-dialog}.tsx`、`next.config.mjs` 的 36 条 `/docs/*` 301 |
| P2 内容管道 | ✅ | `scripts/portable/{convert,clone-meta,fix-links}.mjs`、`scripts/update-sourcehash.mjs` |
| P3 中文导入 | ✅ | `content/docs/zh/portable/` 111 篇；图片 452 张 / 88MB 去重后入库 `public/images/common/portable/` |
| P4 译文 | ✅ | 8 语言 × 111 篇齐平；`glossary.json` keep 30 条 + 22 条词条 × 7 语言 |
| P5 切流 | ⏳ 待发布窗口（代码侧已备好） | [docs/cutover-checklist.md](./cutover-checklist.md)、`docs/deployment/nginx-redirect-pocketcloud.conf`（739 条旧 URL / 1,314 条精确 location，`scripts/portable/nginx-map.mjs` 生成） |

提交：`b482111`（P1–P3 + 文档）、`4771850`（P4 译文）、`3f928c0`（进度与切流清单）、`bc4dd5c`（截图）、`ffd9cb8`（应用内旧 URL 兜底 301）、`0bbc7cd`（旧站全量 301 映射）。当前 `npm run build` = **3,735 个静态页面**，`check:content` 与 `types:check` 全绿；旧 URL 端到端实测 308 → 200。


---

## 1. 现状对照

| 维度 | `stationpc_nas_help`（旧） | `stationospro-docs`（新，宿主） |
|---|---|---|
| 产品 | 便携式 NAS · PocketCloud（PA100 / PA100 Pro / PA200；Dock 是底座**配件**不是型号），客户端 **StationCloud** | 桌面式 NAS · StationOS Pro（DA400 / DA400 Air），客户端 StationNAS / StationHub |
| 技术栈 | VuePress 1.9.7 + webpack4，Node 16 | Next.js 16 App Router + React 19 + Fumadocs 16.9 + Tailwind 4，Node 22 |
| 内容 | 745 篇 md = 6 语言 × ~123；中文 125 篇、nav 83 叶 + 41 孤儿 | 344 篇 mdx = 8 语言 × 43，语言间 1:1 齐平 |
| 导航 | 6 份手写 `docs/.config/<locale>/nav.js`（键只有 `/pocketcloud/`，17 组） | 63 份 `meta.json`，一页一位置 |
| 主题/组件 | fork theme-default，≈14.6k 行 vue+js，3 个自写插件 | Fumadocs 组件 + 少量自研（`ZoomedImage`、`Feedback`、`PageLastUpdate`） |
| 搜索 | 自写 fulltext-search 插件（页面级弹层） | `createFromSource` 单索引，CJK 分词 |
| 图片 | 3,122 个文件 / 695MB（每语言各存一份） | `public/` 11MB，仅 `images/common/` 71 张 |
| 部署 | nginx 静态镜像，`help.stationpc.cn` / `.com`，预发 172.16.0.251:2107/2108 | GHCR + 阿里云 ECS 云助手，`docs.stationpc.com`，Node 服务端 |
| 仓库 | firefly GitLab，11 分支跑 Git Flow，210 commits，0 tag | GitHub，单 `main`，74 commits，0 tag |

**差距最大的三处**（计划据此排工）：

1. **主题与组件重写**（4–6 人日）：`<VideoEmbed>` 90 处 / 84 文件、`:::: tabs` 36 文件、`<LastUpdated/>` 65 文件、`<ChangelogList>` 7 文件、`<FullSearchResults>` 6 文件、未注册的 Authing 标签 12 文件。
2. **导航重建**（2–3 人日）：6 份手写 `nav.js` → `meta.json`，且要处理 41 篇孤儿页。
3. **图片处置**（1–1.5 人日）：695MB → 899 张唯一图（~130MB），313 处 `<img>` 与相对路径要改写。

**内容层脏数据**：745 篇里只有 24 篇有 frontmatter、703 篇 CRLF、228 篇含原始 HTML（313 `<img>`、24 `<br>`、38 `<li>`、20 `<td>`、1 `<table>`），29 个文件的 `<img>` 没有闭合 → 必须走脚本转换，不能手工搬。

---

## 2. 目标架构

### 2.1 URL 规则

```
/                        站首页（产品选择 + 全站搜索，唯一入口页）
/policies/<slug>         法务与隐私（两产品共用，无侧栏）
/contact                 联系我们（站级，无侧栏）
/desktop/**              桌面式 NAS · StationOS Pro · DA400 / DA400 Air
/portable/**             便携式 NAS · PocketCloud（PA100 / PA100 Pro / PA200）
```

语言前缀沿用现状（`src/lib/i18n.ts`，`hideLocale: 'default-locale'`）：

| 旧站 | 新站 | 备注 |
|---|---|---|
| `/pocketcloud/x/` | `/portable/x` | en（默认语言无前缀） |
| `/zh-CN/pocketcloud/x/` | `/zh/portable/x` | |
| `/zh-TW/pocketcloud/x/` | `/zh-Hant/portable/x` | locale id 改为 `zh-Hant` |
| `/ja-JP/…`、`/ko-KR/…`、`/de-DE/…` | `/ja/…`、`/ko/…`、`/de/…` | |
| — | `/fr/…`、`/es/…` | 旧站没有，全新翻译 |

旧站是目录页（`…/support-max-sd/README.md`），新站是单文件；映射规则只有「去掉尾斜杠 + 改语言段 + 产品段重命名（`pocketcloud` → `portable`）」，301 可脚本全量生成（附录 B）。

#### 2.1.1 去掉 `/docs` 前缀的改动面（ADR-0006）

`docsRoute` 现在是 `'/docs'`（`src/lib/shared.ts:2`），被 `src/lib/source.ts` 与 `src/proxy.ts`（4 条 pattern）引用，逐处改造：

| 位置 | 改动 |
|---|---|
| `src/lib/shared.ts:2` | `docsRoute = '/docs'` → `''` |
| `src/lib/source.ts:9` | `loader({ baseUrl: docsRoute })` 随常量生效，无需改代码 |
| `src/app/[lang]/docs/[[...slug]]/` | 上移为 `src/app/[lang]/[[...slug]]/` |
| `src/proxy.ts:22-35` | 4 条 markdown rewrite pattern 从 `/:lang/docs{/*path}` 放宽为 `/:lang{/*path}`；**必须**只在 `.md` 后缀或 `isMarkdownPreferred()` 时 rewrite，否则会把所有页面请求吞成 markdown |
| `docsContentRoute`/`docsImageRoute` | `/llms.mdx/docs` → `/llms.mdx`、`/og/docs` → `/og`，两个 route 目录同步上移 |
| 线上已有的 `/docs/*` | 加 301：`/docs` → `/`、`/docs/policies/*` → `/policies/*`、`/docs/contact` → `/contact`、其余 → `/desktop/*`（见附录 B.2，顺序敏感） |

风险全部集中在 `src/proxy.ts` 那 4 条 pattern：放宽后 `/` 根路径与 8 个语言前缀都会进入匹配，要保证 `/`、`/zh`、`/api/*`、`/llms.txt` 不被改写。验证方式：`npm run build` + 手测 `curl -H 'Accept: text/markdown' https://localhost:3000/portable/x`、`/zh`、`/policies/privacy-policy`。失败即回退到保留 `/docs` 的形态（改动集中在 6 个文件，`git revert` 干净）。

### 2.2 目标目录树（新站）

```
content/docs/zh/
├── index.mdx                      → /            站首页（产品选择 + 全站搜索）
├── contact.mdx                    → /contact
├── policies/                      → /policies/*（5 篇不动）
├── desktop/                       ← 现有 43 篇整体搬入 + 1 篇概览（共 44）
│   ├── index.mdx                  产品落地页（hero + 热门 + 快速入门 3 卡 + 核心功能 6 卡）
│   ├── overview.mdx               关于 StationOS Pro（现有 `index.mdx` 的 7 段长文原样搬入）
│   ├── quick-start/  app-guide/  compatible/  changelog/  explore/  faq/
└── portable/                      ← 新导入 125 篇（index = 旧站首页迁移）
    ├── index.mdx
    ├── video_tutorial/  hardware/  guides/  remote-access/  photos/
    ├── cinema/  file/  file-service/  backup/  backup-center/  docker/
    ├── setting/  compatible-list/  performance/  troubleshooting/  faq/
    └── changelog/
```

- 两个目录按 Q10 处置，不进 `portable/`：`contact/` 升为站级 `/contact`；`trouble_issue/connect_issue` 并入 `troubleshooting/`。

- **旧站目录结构原样保留**（Q9=A），`faq/`、`compatible-list/`、`changelog/` 等命名与旧站一致；只做三件事：`README.md` → `index.mdx`（目录首页）或 `<name>.mdx`（叶子）、`_` 与大小写归一为 kebab-case、`meta.json` 重排。
- `desktop/` 是纯搬运（`git mv`），不改任何 URL slug 的最后一段。

#### 2.2.1 产品落地页规格（两个产品必须对称）

用户路径是「顶栏切换产品 → 落到该产品落地页」，所以两个产品的落地页**结构完全一致**，只有内容不同；共用 `<ProductHero>`、`<HotSearches>`、`<CardGrid>` 三个组件，数据写在各自 `index.mdx`（8 语言各一份，`sourceHash` 照常管译文）。

| 区段 | 桌面式（`/desktop`） | 便携式（`/portable`） |
|---|---|---|
| hero 眉标 | 桌面式 NAS | 便携式 NAS |
| hero 标题 / 型号 | StationOS Pro · DA400 / DA400 Air | PocketCloud · PA100 / PA100 Pro / PA200 |
| hero 副标题 | 从开箱装盘到远程访问，DA400 系列的文档都在这里。 | 快速找到 PocketCloud 使用指南，安全连接与常见问题解答。 |
| 搜索框 | 「在本产品中搜索…」+ `scope=desktop` | 「在本产品中搜索…」+ `scope=portable` |
| 热门 3 条 | 新手安装指南 · 如何创建存储池 · Station AI 是什么 | 用户手册 · 如何初始化 PocketCloud？· M.2 SSD 兼容性列表 |
| 快速入门 3 卡 | 开箱与安装 → `quick-start/da400-install`<br>初始化与系统设置 → `app-guide/settings`<br>文件管理与客户端 → `app-guide/files` | 硬件安装 → `hardware/`（含 `ssd-install`）<br>软件安装 → `guides/install-app`<br>初始化与设置 → `guides/` 首篇 |
| 核心功能 6 卡 | 存储与磁盘 → `app-guide/settings/storage`<br>备份 → `app-guide/backup`<br>Docker → `app-guide/docker`<br>远程访问 → `app-guide/settings/remote-access`<br>Station AI → `app-guide/station-ai`<br>系统监控 → `app-guide/monitor` | 云盘备份 → `backup/`<br>SD 卡备份 → `backup/` 相关页<br>相册管理 → `photos/`<br>影视媒体 → `cinema/`<br>远程访问 → `remote-access/`<br>Docker 应用 → `docker/` |
| 底部 chips | 更新日志 · 兼容性列表 · 玩法探索 · 常见问题 | 更新日志 · 兼容性列表 · 故障排除 · 常见问题 |
| 侧栏 | 有（本产品 8 组折叠树） | 有（本产品 17 组折叠树） |
| 页脚上方 | 「了解 StationOS Pro 全貌 →」→ `overview` | 无（旧站首页没有等价物） |

- **现有「关于 StationOS Pro」长文不丢弃**：`content/docs/zh/index.mdx` 的 7 段功能导览整体搬到 `desktop/overview.mdx`，在侧栏 `quick-start/` 之前单列一项「产品概览」。理由：那 7 段是连贯的产品说明，塞进卡片会丢失逻辑；落地页要的是可点击入口，不是第二篇软文。
- 便携式 hero 标题随改名走：现在写「PocketCloud 帮助中心」，改名生效后改成「PA100 帮助中心」（只改 `portable/index.mdx` 的 8 份 `title`，URL 不动）。
- `PocketCloud Dock` 是底座**配件**不是型号（GLOSSARY §2），不进型号行，文档在 `hardware/installation/dock`。
- 旧站首页的 `sections[].type === 'video'` 段（旧站代码里已被注释掉）**不迁移**。
- 旧站首页 FAQ 5 条带 `热门`/`推荐` 标签的入口，迁移为底部 chips 的第 4 项（常见问题），不做标签样式。

### 2.3 导航（已定：A 变体）

```
顶栏 56px   [StationPC 帮助中心]  [桌面式 NAS] [便携式 NAS]        [搜索 ⌘K] [语言] [GitHub]
侧栏 274px  ┌ 便携式 · PocketCloud · PA100 / Pro
            ├ 视频教程          (折叠)
            ├ 硬件安装          (折叠)
            ├ …17 组，默认全折叠，仅展开当前页所在组
            └ 还在找桌面式 NAS？→ StationOS Pro 文档
```

- 实现：`DocsLayout` 的 `sidebar.collapsible`（默认样式，无需自研折叠逻辑）；产品切换按钮由新的 `src/lib/products.ts` 注册表驱动，`<ProductSwitcher>` 为 server component（当前产品由 `params.slug[0]` 决定，不需要 `usePathname`）。
- 产品注册表（单一事实源，8 语言文案走 `title` 字段翻译）：

```ts
// src/lib/products.ts
// 只放稳定事实：产品线、系统、型号。产品品牌名会变（PocketCloud → PA100），
// 不放进注册表——界面上的产品名取自各产品 index.mdx 的 title。
export const products = [
  { slug: 'desktop',  kind: '桌面式 NAS', system: 'StationOS Pro', models: ['DA400', 'DA400 Air'] },
  { slug: 'portable', kind: '便携式 NAS', system: 'StationOS',     models: ['PA100', 'PA100 Pro', 'PA200'] },
] as const;

export const productSlugs = products.map((p) => p.slug);
export const isProductSlug = (slug?: string) =>
  !!slug && (productSlugs as readonly string[]).includes(slug);
```

- 站级页（`/`、`/policies/*`、`/contact`）无侧栏；把 `page.tsx` 里的 `params.slug?.[0] === 'policies'` 换成 `!isProductSlug(params.slug?.[0])`：**一级段不是产品 slug 就关侧栏**。判断依据来自注册表而不是硬编码列表，以后加 PA200 / DA200 之外的新产品线不用改这里。
- 面包屑：`帮助中心 / 便携式 NAS / 常见问题`，由 `meta.json` 的 `title` 拼装；`pages` 条目不翻译。
- **更新日志 / 联系我们 不进主侧栏**：更新日志在侧栏底部以单入口出现，联系我们在页脚与 `/contact`。

### 2.4 搜索

- 现有 `src/app/api/search/route.ts`（13 行）保持**单索引**（跨产品全文索引，构建期零成本）。
- 产品域过滤放在**结果侧**：`SearchDialog` 传入 `?scope=desktop|portable`，结果按 `url` 前缀过滤；结果区固定给一条「在全部文档中搜索 “…”」入口（Q12=A）。
- 不拆两个索引的理由：拆分要跑两遍索引器，收益仅是省几个字节；URL 前缀过滤对 168 页规模完全够用。若日后内容翻倍再改 fumadocs 的 tag 机制。

### 2.5 图片

- 去重：3,122 → **899 张**（md5），总量 **~130MB**；**原图入库，不压缩、不转 WebP**（ADR-0004，Q16=A）。
- 路径：`public/images/common/portable/<section>/<page>/<name>.png|jpg`，中文源用 `/images/common/...` 绝对路径引用。
- 译文需要本地化截图时放 `public/images/<lang>/portable/...`，缺图由 `next.config.mjs` 的 `afterFiles` rewrite 回退到 `images/common/`（机制已存在，无需改造）。
- `public/` 从 11MB 涨到 ~141MB：Docker 镜像同增 130MB，构建上下文（`.dockerignore` 已排除 `node_modules`、`.next`，需确认 `public` 不被排除）；`git clone` 从 ~12MB 涨到 ~142MB，可接受。
- 313 处 `<img src=…>` 转换规则：`width="30%"` → `style={{ width: '30%' }}`；`<img>` 必须自闭合；`ZoomedImage` 需透传 `style`/`width`（P1 验收项之一）。

### 2.6 组件与语法映射

| 旧站写法 | 数量 | 新站做法 |
|---|---|---|
| `<VideoEmbed src="https://www.youtube.com/embed/ID">` | 90 处 / 84 文件 | 新建 `src/components/video-embed.tsx`（16:9 iframe、`loading="lazy"`、`allowFullScreen`、失败时给外链兜底），全局注册进 `src/components/mdx.tsx` |
| `:::: tabs` / `:::: tab` | 36 文件 | 改 `<Tabs>`/`<Tab>`；因文件多，**全局注册**到 `mdx.tsx`，避免逐文件 import |
| `<LastUpdated/>` | 65 文件 | 删除；页尾已有 `<PageLastUpdate date={page.data.lastModified} />` |
| `<ChangelogList base="/pocketcloud/changelog/" />` | 7 文件 | 新建 `ChangelogList` 组件（读 `meta.json` 里的 changelog 目录生成卡片列表），或改为手写链接列表；新 base 为 `/portable/changelog/` |
| `<FullSearchResults>` | 6 文件 | 删除；`/portable/search` 页删掉，改由顶栏搜索承担 |
| `<User>`/`<IP>`/`<App>`/`<AuthingGuard>` | ~12 文件 | 删除（Authing 遗留，见 2.7） |
| `::: img-description` | 6 处 | `<figure>` + `<figcaption>` |
| `::: tip` / `::: warning` / `::: danger` | 少量 | `<Callout type="info|warn|error">` |
| `{{$localeConfig.brandName}}` | 少量 | 直接写产品名（8 语言各写一份） |
| 原始 HTML 表格 / `<li>` / `<br>` | 313+ 处 | 归一化为 Markdown（表格转 md 表；`<br>` 保留，MDX 允许） |

### 2.7 存量清理（Q6=A）

| 对象 | 处理 |
|---|---|
| `guides/basics/platform-guide/*` 4 篇 + `guides/basics/console` | 删（Authing OSS 时代遗留，产品已不用） |
| 12 文件里的 Authing 标签 | 随页面删除或就地摘除 |
| `build-docs-v2-prod.sh`、`convert_to_traditional.py`、根目录 3 个 `.patch` | 不迁移（留在归档仓） |
| `docs/.config/zh-hant/`、`config.js:848` 死 locale、`@imagesZhCn`/`@imagesEnUs` alias | 不迁移 |
| `recover`/`_template`/`search` 类页面 | 不迁移 |
| 23 篇 FAQ | **先原样搬**，`faq/` 下再合并重复项（第二轮 polish，不阻塞上线） |
| `contact/contact` | 迁到 `/contact`（站级） |
| `trouble_issue/connect_issue` + `troubleshooting/app-client-connect-issue` | 合并成一篇（`troubleshooting/app-client-connect-issue`） |
| `changelog/` 11 个日期页 | 保留内容，不进侧栏；`changelog/index.mdx` 列卡片 |

---

## 3. 执行计划

### P0 冻结与准备（0.5 人日）

```bash
# 旧仓：打归档 tag、开只读窗口
cd stationpc_nas_help && git tag archive/pre-merge-2026-11 && git push origin archive/pre-merge-2026-11
# 新仓：拉功能分支，先把依赖装好（后续所有验证的前提）
cd stationospro-docs && git switch -c feat/pocketcloud && npm ci
```

- 通知旧站写作者：合并期间新内容只写在新仓 `content/docs/zh/portable/`（或暂停更新，合并后补）。
- **验收**：`npm run dev` 能起、`npm run build` 在未改动时通过（基线绿）。
- **回滚**：无副作用，`git switch main` 即可。

### P1 平台改造（3.5 人日）

1. `src/lib/products.ts` + `<ProductSwitcher>` + 顶栏（`docsRoute` 的改动见第 2 项）。
2. **去掉 `/docs` 路径前缀**（§2.1.1）：改 `docsRoute`、上移 `[[...slug]]`、放宽 `proxy.ts` 4 条 pattern、迁移 `llms.mdx`/`og` 两个 route、按附录 B.2 加 4 + 28 条 301（`/docs` 段分流：`policies`/`contact` 升站级、其余进 `/desktop`）。
3. `/` 站首页（`<ProductPicker>` + 全站搜索，HomeLayout）；`/docs` 总览页取消，不再有第二个入口页。
4. 两个产品落地页（对称实现，共用 `<ProductHero>` / `<CardGrid>`，只换数据）：
   - `desktop/index.mdx`：hero（桌面式 · StationOS Pro · DA400 / DA400 Air）+ 热门 3 条 + 快速入门 3 卡（开箱安装 → `quick-start/da400-install`、初始化与系统设置 → `app-guide/settings`、文件管理与客户端 → `app-guide/files`）+ 核心功能 6 卡（存储与磁盘 → `app-guide/settings/storage`、文件管理 → `app-guide/files`、备份 → `app-guide/backup`、Docker → `app-guide/docker`、远程访问 → `app-guide/settings/remote-access`、Station AI → `app-guide/station-ai`）+ 底部 chips（更新日志 / 兼容性列表 / 玩法探索 / 常见问题）。
   - `desktop/overview.mdx`：把现有 `index.mdx` 的「关于 StationOS Pro」7 段长文搬过来，侧栏放在 `quick-start/` 之前；落地页 hero 下给一条「了解 StationOS Pro 全貌 →」。
   - `portable/index.mdx`：承接旧站首页（见 2.2.1）。
5. 侧栏身份块 + 跨产品引导 + `collapsible` 默认折叠 + 面包屑。
6. 三个新组件：`VideoEmbed`、`Tabs`（全局注册）、`ChangelogList`；`ZoomedImage` 支持 `style`/`width`。
7. 搜索加 `scope` 过滤与「搜索全站」入口。

- **验收**：本地手工过 5 屏（`/`、两个产品落地页、一篇文档、一篇法务）；`/docs` 与 `/docs/*` 按附录 B.2 全部 301（`/docs` → `/`、`policies`/`contact` 升站级、其余 → `/desktop/*`）；`.md` 内容协商在新 scheme 下仍可用；语言切换 8 语言都通；`npm run types:check` + `npm run build` 绿。
- **回滚**：`feat/pocketcloud` 分支丢弃，`main` 不受影响。

### P2 内容管道（2 人日）

写 `scripts/import-portable/`（独立目录，产物可重跑）：

| 脚本 | 职责 |
|---|---|
| `01-collect-images.mjs` | 扫 `docs/<locale>/pocketcloud/**` 图片 → md5 去重 → 复制到 `public/images/common/portable/<section>/<page>/` → 出 `image-map.json` |
| `02-convert-pages.mjs` | md → mdx：CRLF→LF、frontmatter 规范化（只留 `title`/`description`，标题取首个 H1）、`README.md`→`index.mdx`、组件/容器/HTML 按 §2.6 替换、图片与链接改绝对路径 |
| `03-build-meta.mjs` | 6 份 `nav.js` → 每个目录的 `meta.json`；孤儿页按 Q10 分流（进 nav / 不进 nav / 删除） |
| `04-report.mjs` | 汇总 `reports/convert-report.md`：每页状态（ok / warn / skipped）、未识别语法、缺失图片、断链 |

- 幂等：转出目录每次清空重建；`image-map.json` 落盘复用，避免重复 hash 695MB。
- **验收**：报告里 `warn` 只允许出现在「已声明的 18 类清洗项」内；图片引用 0 缺失；`npm run check:content` 无新增错误（此时只有 zh，语言 1:1 检查会报错，属预期，P4 收口）。
- **回滚**：产物全在 `content/docs/zh/portable/` 与 `public/images/common/portable/`，删目录即回滚。

### P3 中文导入与上线（3 人日）

1. 逐组校对（17 组，按 nav 顺序）：标题、图片、内链、Callout 样式、Tabs 折叠、视频比例。
2. 补 `meta.json` 顺序与层级（视频教程挪到快速开始之后；更新日志、联系我们降级）。
3. 内链死链修复：旧站相对链接改成新绝对路径（`03-build-meta` 只做机械映射，语义链接需人工/脚本二次校验）。
4. `npm run check:content` + `npm run build` + 生产预览（`PORT=3458 node .next/standalone/server.js`）。

- **验收**：中文 169 篇无 404、无裸组件、无未注册标签；侧栏无孤儿页；搜索能命中 PocketCloud 页。
- **回滚**：不合并 `main`，`/portable/*` 不出现在线上。

### P4 翻译（3–5 人日）

1. **先扩术语表**（`glossary.json`）：加 `PocketCloud`（改名期与 `PA100` 并存）、`PA100`、`PA100 Pro`、`PA200`、`PocketCloud Dock`、`StationCloud`、`StationOS`、`StationOS Pro`、`DA400 Air`、`便携式 NAS`、`桌面式 NAS` 等词条（见 GLOSSARY.md 的新增清单）。注意 `keep` 里不能把 `StationOS` 与 `StationOS Pro` 并成一条，两者是两条产品线的两个系统。
2. **基线落盘**：把旧站 en/ja/ko/de/zh-TW 译文按新 slug 放进对应语言目录，手工补 `sourceHash`；修 de 1 篇 / ja 3 篇 / ko 3 篇的标题冗余；补 en 缺 4 篇、ja/ko/de/zh-TW 各缺 2 篇。
3. **zh-Hant 重做**：旧 zh-TW 是半直转（`信息`49 / `文件`230 / `设置`2 未转），整目录按术语表重新生成。
4. **新翻 fr / es**：125 篇 × 2。
5. **回扫校准**：6 种旧译文按新术语表过一遍（尤其 `StationCloud` 别被改成 `StationNAS`）。
6. 收口：`npm run sync:sourcehash` → `npm run check:content` → 抽 5% 人工验收（每语言 6–7 篇，优先 FAQ 与快速开始）。

- **执行方式**：用 `translate-docs` 技能，`--full` 分批（每批 20–30 页 × 1 语言），逐批把 diff 摘要给用户确认。
- **成本**：PocketCloud 中文约 0.1MB，7 语言全量 ≈ 0.4M output tokens；走 Claude Code / Codex CLI 订阅。
- **验收**：8 语言目录 1:1；`check:content` 全绿（meta 告警清零）；每语言抽检无英文残留、无简繁混排。

### P5 切流（1 人日）

1. PR 到 `main`（一个 PR，避免中文/译文分叉），附带截图与验证记录。
2. 上线后 24h：抓 sitemap、curl 8 语言 × 20 个代表 URL，确认 200 与 canonical。
3. **旧站不立刻 301**（Q20=A）：
   - `help.stationpc.cn` / `.com` 继续服务（包装盒二维码仍指向它）。
   - 旧站加 `<meta name="robots" content="noindex,follow">` + `<link rel="canonical" href="https://docs.stationpc.com/…">`，避免与新区重复收录。
   - 在旧站顶栏加一条公告条：「帮助中心已迁移至 docs.stationpc.com」，链到对应产品落地页。
4. 四条验收全绿后（8 语言齐 / 死链 0 / 图片全通 / 侧栏无孤儿），再单独提 301 方案（附录 B 的映射表可直接用 nginx `return 301` 或 Pages 规则）。
5. GA（`G-KN8GW9JM3K` 中文、`G-DS9C35LTB6` 英文）与新站 PostHog 双跑 2 周再决定归因口径。
6. 旧仓打 tag `archive/pre-merge-2026-11`、镜像快照保留 ≥12 个月。

---

## 4. 转换器规格（P2 的合同）

**输入**：`../stationpc_nas_help/docs/`（只读）
**输出**：
- `content/docs/zh/portable/**`（125 篇 mdx）
- `public/images/common/portable/**`（899 张）
- `reports/image-map.json`、`reports/convert-report.md`、`reports/url-map.csv`

**转换规则（必须逐条实现）**

1. 编码与换行：UTF-8、LF、文件尾单个换行。
2. frontmatter：只留 `title`（无 H1 时取 nav 里的文案）与 `description`（取首段 ≤120 字，可空）；丢弃旧 frontmatter 的其余键。
3. `README.md` → `index.mdx`；其余 `X.md` → `x.mdx`（kebab-case，单词间 `-`）。
4. 图片：`./images/a.png`、`../../images/b.jpg` → `/images/common/portable/<section>/<page>/<name>.<ext>`；`<img src="…" width="30%">` → `<img src="…" style={{ width: '30%' }} />`（自闭合）。
5. 组件：§2.6 表格逐条；未命中新规则的自定义标签 → 删标签保留内部文本 + 报告 `warn`。
6. 容器：`:::: tabs` 块按 `<Tab value="…">` 结构重写，tab 标题取旧的 tab 文案。
7. 链接：站内绝对链接（`/pocketcloud/…/`）→ `/portable/…`（改产品段 + 去尾斜杠）；相对链接按目标目录解析后同样改写；外链不动。
8. 严禁：改写正文语义、翻译、删段落。
9. 报告：每页一行（slug / 状态 / 命中规则 / 未识别语法 / 图片数），供人工按 warn 清单复查。

---

## 5. 风险与对策

| 风险 | 影响 | 对策 |
|---|---|---|
| 301 押后 → 与旧站重复收录 | SEO 分散 | 旧站立刻加 `noindex,follow` + canonical（P5.3），不等 301 |
| 去 `/docs` 前缀需放宽 `proxy.ts` 的 rewrite pattern | 所有页面被吞成 markdown 或 i18n 失效 | §2.1.1 的验证脚本先跑通再改路由；失败即 `git revert` 回退到带前缀形态（改动集中在 6 个文件） |
| `public/` +130MB | 镜像/克隆变慢 | 接受（ADR-0004）；CI 已有 Docker layer 缓存；仓库体积在 200MB 内可控 |
| Fumadocs `Tabs`/`sidebar.collapsible` API 未在本机验证（`node_modules` 缺失） | P1 返工 | P0 先 `npm ci`，P1 第一天用 1 篇样例页验证组件与折叠，再全量改造 |
| 29 个文件 `<img>` 未闭合 | MDX 编译失败 | 转换器统一自闭合；`build` 报错即定位 |
| YouTube 屏蔽（国内） | 用户看不到视频 | 组件内 iframe 失败时显示「在 YouTube 观看」外链；不改结构（Q11） |
| 旧译文质量不均（de 标题冗余） | 观感差 | P4.2 专项修 + 抽 5% 验收 |
| 旧站合并期间仍在更新 | 内容分叉 | P0 冻结公告；解冻后按 `url-map.csv` 补 diff |
| 翻译批次中断 | `sourceHash` 半新半旧 | 分批提交，每批跑 `sync:sourcehash`，最终 `check:content` 兜底 |

---

## 6. 验收清单

**技术**
- [ ] `npm ci && npm run types:check && npm run build` 在合并后分支全绿
- [ ] 8 语言目录 1:1，`check:content` 无错误、meta 告警 0
- [ ] 站内死链 0（`check:content` 的死链检查覆盖）
- [ ] 每个 `/images/...` 引用都能 200
- [ ] `/`、`/policies/*`、`/contact` 无侧栏，两个产品落地页有侧栏
- [ ] 线上历史 URL 全部按附录 B.2 生效：`/docs` → `/`、`/docs/policies/*` → `/policies/*`、`/docs/contact` → `/contact`、其余 `/docs/*` → `/desktop/*`

**内容**
- [ ] PocketCloud 17 组标签、顺序、层级与旧站一致
- [ ] 41 篇孤儿页按 Q10 处置（该进 nav 的进，该删的删），侧栏无意外挂到末尾的页面
- [ ] 90 处视频全部渲染 16:9 且可播放
- [ ] 313 处 `<img>` 宽度样式保留
- [ ] 23 篇 FAQ 全部可达（合并项标注在 changelog）

**运营**
- [ ] 旧站公告条上线，链接到对应产品落地页
- [ ] 旧站 `noindex` + canonical 生效
- [ ] GA 与 PostHog 双跑数据可查

---

## 附录 A：17 组 → 目录映射

| 旧侧栏分组 | 叶子数 | 新目录 |
|---|---|---|
| 视频教程 | 10 | `portable/video_tutorial/` |
| 硬件安装 | 4 | `portable/hardware/`（含 `ssd-install` 进 nav） |
| 快速开始 | 11 | `portable/guides/`（含 `device-connection/*`、`install-app`、`manual` 等） |
| 远程访问 | 2 | `portable/remote-access/` |
| 相册 | 2 | `portable/photos/` |
| 影院 | 3 | `portable/cinema/` |
| 文件 | 2 | `portable/file/` |
| 文件共享服务 | 10 | `portable/file-service/` |
| 备份与同步 | 3 | `portable/backup/` + `portable/backup-center/` |
| Docker | 2 | `portable/docker/` |
| 系统设置 | 4 | `portable/setting/`（含 `factory/force_factory_reset`） |
| 兼容性列表 | 3 | `portable/compatible-list/`（4 篇详情进 nav） |
| 性能测试 | 1 | `portable/performance/` |
| 故障排除 | 2 | `portable/troubleshooting/` + `trouble_issue/`（合并） |
| 常见问题 | 23 | `portable/faq/` |
| 更新日志 | 0 | `portable/changelog/`（11 日期页不进 nav） |
| 联系我们 | 0 | `/contact`（站级） |

## 附录 B：301 映射（延后执行）

### B.1 旧站 → 新站

**推荐直接用生成好的文件**：`docs/deployment/nginx-redirect-pocketcloud.conf` —— 739 条旧 URL（含无尾斜杠变体共 1,314 条 `location =`），由 `node scripts/portable/nginx-map.mjs` 扫描旧站 `docs/<locale>/pocketcloud/**/*.md` 生成，映射明细在 `reports/url-map-full.csv`（`locale,from,to,kind`）。生成器的落点规则：页面存在 → 同页；目录页没有 index → 第一个子页（36 条）；被删页（Authing 5 篇、空占位 8 篇）→ 最近存在的祖先或产品落地页（42 条）；`contact/contact` → 站级 `/contact`；`search` → 产品落地页；`trouble_issue/connect_issue` → `troubleshooting/connect-issue`。

旧站 server 块里 `include /etc/nginx/snippets/pocketcloud-redirects.conf;` 即可，且 `.conf` 里全是精确 `location =`，不依赖顺序。

下面的通配写法是等价简化版，适合想少几条配置的场景（但覆盖不到被删页的落点）：

```nginx
# help.stationpc.com / help.stationpc.cn（同一份 dist，两域名规则完全相同）
# 站首页：英文在 /，中文在 /zh-CN/；其余语言在各自目录下
location = /    { return 301 https://docs.stationpc.com/; }
location = /zh-CN/ { return 301 https://docs.stationpc.com/zh/; }
location = /zh-TW/ { return 301 https://docs.stationpc.com/zh-Hant/; }
location = /ja-JP/ { return 301 https://docs.stationpc.com/ja/; }
location = /ko-KR/ { return 301 https://docs.stationpc.com/ko/; }
location = /de-DE/ { return 301 https://docs.stationpc.com/de/; }

# 旧的全文搜索页在新站不存在（改由顶栏搜索承担）→ 落到产品落地页
location ~ ^/pocketcloud/search/?$       { return 301 https://docs.stationpc.com/portable/; }
location ~ ^/zh-CN/pocketcloud/search/?$ { return 301 https://docs.stationpc.com/zh/portable/; }

# 其余全部内容页：换语言段 + 去尾斜杠 + 产品段 pocketcloud → portable
location ~ ^/pocketcloud/(.*)/?$       { return 301 https://docs.stationpc.com/portable/$1; }
location ~ ^/zh-CN/pocketcloud/(.*)/?$ { return 301 https://docs.stationpc.com/zh/portable/$1; }
location ~ ^/zh-TW/pocketcloud/(.*)/?$ { return 301 https://docs.stationpc.com/zh-Hant/portable/$1; }
location ~ ^/ja-JP/pocketcloud/(.*)/?$ { return 301 https://docs.stationpc.com/ja/portable/$1; }
location ~ ^/ko-KR/pocketcloud/(.*)/?$ { return 301 https://docs.stationpc.com/ko/portable/$1; }
location ~ ^/de-DE/pocketcloud/(.*)/?$ { return 301 https://docs.stationpc.com/de/portable/$1; }
```

- 旧站没有的语言（`fr`/`es`）无需规则。
- 具体规则（`search`）必须写在 `^/pocketcloud/(.*)` 通配之前，nginx 的 `~` 按出现顺序匹配。
- 旧站 `README.md` 声称已去掉 `/pocketcloud/` 前缀但实际没去，所以真实 URL 全部带这个段（已核 6 份 nav 与 745 篇文件路径）。

映射只有三件事：**换语言段 + 去尾斜杠 + 改产品段**（`pocketcloud` → `portable`）；桌面式内容不在旧站里，无需规则。旧站首页是 `/`（英文）与 `/zh-CN/`（中文），两域名共用同一份 dist，所以 `.com` 与 `.cn` 用同一套规则。

### B.2 新站自己的历史 URL

`docs.stationpc.com` 上线至今的页面都在 `/docs/*` 下（8 语言 × 43 篇 = 344 个 URL 已可能被收录）。去掉前缀**并**给桌面式内容加 `/desktop` 段之后，映射不再是一条通配：

| 现有 URL | 新 URL | 说明 |
|---|---|---|
| `/docs` | `/` | 总览页取消，入口只剩站首页 |
| `/docs/policies/:slug` | `/policies/:slug` | 法务升到站级 |
| `/docs/contact` | `/contact` | 联系升到站级 |
| `/docs/:path*`（其余全部） | `/desktop/:path*` | 43 篇 + 概览 + `explore`/`faq`/`compatible`/`changelog` |

**顺序敏感**：`/docs/policies/*` 必须排在 `/docs/:path*` 之前，否则会被通配吞掉。`redirects()` 的数组按顺序匹配，写成：

```js
// next.config.mjs —— 具体规则在前，通配在后
{ source: '/docs',                 destination: '/',                permanent: true },
{ source: '/docs/policies/:slug',  destination: '/policies/:slug',  permanent: true },
{ source: '/docs/contact',         destination: '/contact',         permanent: true },
{ source: '/docs/:path*',          destination: '/desktop/:path*',  permanent: true },
```

语言前缀同样一套：`/zh/docs/*`、`/zh-Hant/docs/*`、`/ja/docs/*`、`/ko/docs/*`、`/de/docs/*`、`/fr/docs/*`、`/es/docs/*` 各 4 条（en 无前缀，已含在上面）。7 × 4 = 28 条，实际实现是 `next.config.mjs` 里 `legacyDocsRedirects()` 用循环生成（共 36 条），**不要手写正则**——手写容易在 `policies` 的先后顺序上翻车。

### B.3 已在应用内落地的兜底（比 B.1 更早生效）

`next.config.mjs` 的 `legacySiteRedirects()` 已把 B.1 的旧站规则实现在应用里（`redirects()` 在中间件之前执行）。这样即使历史链接或二维码直接打到 `docs.stationpc.com`，也不会 404：

| 旧 URL | 新 URL |
|---|---|
| `/pocketcloud/:path*` | `/portable/:path*` |
| `/pocketcloud/search` | `/portable`（旧搜索页已取消，换成顶栏 ⌘K） |
| `/zh-CN/pocketcloud/:path*` | `/zh/portable/:path*` |
| `/zh-TW/pocketcloud/:path*` | `/zh-Hant/portable/:path*` |
| `/ja-JP/pocketcloud/:path*` | `/ja/portable/:path*` |
| `/ko-KR/pocketcloud/:path*` | `/ko/portable/:path*` |
| `/de-DE/pocketcloud/:path*` | `/de/portable/:path*` |
| `/zh-CN`、`/zh-TW`、`/ja-JP`、`/ko-KR`、`/de-DE`（语言首页） | `/zh`、`/zh-Hant`、`/ja`、`/ko`、`/de` |
| `/<新语言>/pocketcloud/:path*`（例如 `/fr/pocketcloud/x`） | `/<新语言>/portable/:path*` |
| `/en/pocketcloud/:path*` | `/portable/:path*`（默认语言去前缀） |

实测（2026-11-23，standalone）：`/pocketcloud/faq/support-max-sd` → `/portable/faq/support-max-sd`、`/zh-CN/pocketcloud/faq/support-max-sd` → `/zh/portable/faq/support-max-sd`、`/zh-TW/pocketcloud/hardware/dock` → `/zh-Hant/portable/hardware/dock`、`/pocketcloud/search` → `/portable`、`/en/pocketcloud/faq/support-max-sd` → `/portable/faq/support-max-sd`，全部 308。

B.1 的 nginx 规则仍然保留：域名切换后由 nginx 做 301 更省一跳，应用内规则作为兜底。

## 附录 C：内容取舍清单（便携式 125 篇 → 111 篇）

旧站 `docs/zh-CN/pocketcloud/` 共 125 篇，导入 110 篇正文 + 1 篇落地页 = 111 篇。差额 15 篇的去向逐条可查：

| 处理 | 篇目 | 原因 |
|---|---|---|
| 删除（Authing 遗留） | `search`、`contact/contact`、`guides/basics/console`、`guides/basics/platform-guide/integrate-with-{backend-app,mobile-app,regular-web-app,spa}` | 属于 Authing 鉴权后台的说明，产品侧已无此功能；`search` 由顶栏搜索取代，`contact/contact` 升为站级 `/contact` |
| 跳过（空占位） | `backup-center/README.md`、`compatible-list/README.md`、`faq/README.md`、`guides/device-connection/direct-connection.md`、`guides/manual/README.md`、`guides/users/README.md`、`hardware/ssd-install/README.md`、`setting/README.md` | 文件内容为空，仅用于占目录；真实内容在子页 |
| 合并 | `trouble_issue/connect_issue` → `troubleshooting/connect-issue` | 与 `troubleshooting/app-client-connect-issue` 内容不同（设备侧 vs App 侧排查），保留为一篇并登记进 `troubleshooting/meta.json` |
| 删除（重复产物） | `en/portable/changelog.mdx` | 转换器把「只有 README 的目录」降级成单文件的副产物，与 `changelog/` 目录重复 |

另外做了三处内容清洁（不属于删页）：8 语言的 `guides/install-tv-app.mdx` 删掉正文里的测试残留 `test push`；`file-service/windows-nfs-garbled-code.mdx` 的畸形内联代码块换成通顺句子；`guides/basics/*` 里引用的 `/pocketcloud/search` 链接改指产品落地页。

## 附录 D：图片处置实况

| 指标 | 实际值 |
|---|---|
| 旧站图片文件 | 3,122 个 / 695MB（6 语言各存一份） |
| 导入后 | `public/images/common/portable/` **357 个文件 / 88MB** |
| 去重方式 | 按文件 md5 去重，同图多页引用复用同一份 |
| 格式 | 原图（PNG/JPG）直接入库，**不转 WebP、不压缩**（Q16 决策） |
| 路径 | `/images/common/portable/<分组>/<页面>/<文件名>`；译文覆盖走 `/images/<语言>/...` + `next.config.mjs` 的 `afterFiles` 回退 |

比估的 899 张少很多：估算是按「6 语言目录全量 md5 去重」，实际去重范围是同一产品的全部引用（含跨语言），且旧站有大量同名不同文重复图。

