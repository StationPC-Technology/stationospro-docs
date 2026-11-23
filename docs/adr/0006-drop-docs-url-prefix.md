# 0006 — URL 去掉 `/docs` 路径前缀

日期：2026-11
状态：已采纳

## 背景

站点主域是 `docs.stationpc.com`，而 Fumadocs 模板默认 `baseUrl: '/docs'`，于是每个页面都长成：

```
docs.stationpc.com/desktop/app-guide/files
└──── 域名说 docs ────┘ └─ 路径又说 docs ─┘
```

`docs` 出现两次。1,352 个 URL 每个多 5 个字符，念出来像结巴；而且因为 `/docs` 与 `/` 都要放「产品选择」，方案里出现了两个近重复的入口页。

合并本身要把所有 PocketCloud URL 重排一遍，这是改动最便宜的时机——上线之后再动，就要为 1,352 个 URL 再发一次 301。

## 决策

**`docsRoute` 置空，路径不带 `docs` 段**：

```
/                    站首页（产品选择 + 全站搜索，唯一入口页）
/policies/<slug>     法务
/contact             联系我们
/desktop/**         产品域 A
/portable/**        产品域 B
```

配套改动（`docsRoute` 被 `source.ts` 与 `proxy.ts` 的 4 条 pattern 引用）：

| 位置 | 改动 |
|---|---|
| `src/lib/shared.ts:2` | `docsRoute = '/docs'` → `''` |
| `src/lib/source.ts:9` | `baseUrl: docsRoute` 随常量生效 |
| `src/app/[lang]/docs/[[...slug]]/` | 上移为 `src/app/[lang]/[[...slug]]/` |
| `src/proxy.ts:22-35` | 4 条 markdown rewrite pattern 放宽；只在 `.md` 后缀或 `isMarkdownPreferred()` 时生效 |
| `docsContentRoute` / `docsImageRoute` | `/llms.mdx/docs` → `/llms.mdx`、`/og/docs` → `/og`，route 目录同步上移 |
| 线上历史 URL | `/docs/:path*` → `/:path*`、`/:lang/docs/:path*` → `/:lang/:path*`，均 301 |

## 后果

- 好处：URL 短且不重复；`/docs` 总览页消失，入口只剩 `/` 一个；旧站 301 规则简化成「换语言段 + 去尾斜杠」。
- 代价：路由重构 0.5–1 人日；风险集中在 `proxy.ts`——pattern 放宽后所有路径都进入匹配，必须保证 `/`、`/zh`、`/api/*`、`/llms.txt` 不被改写成 markdown。
- 代价：`docs.stationpc.com/docs/*` 这 344 个已可能被收录的 URL 需要一次性 301。
- 缓解：改动集中在 6 个文件，`git revert` 干净；先验证 `.md` 内容协商与 8 语言前缀，再全量改造。

## 被否决的方案

1. **换一个段名**（`/guide/portable`、`/manual/...`）：风险极低，但只是把「重复」换成「含糊」，语义还不如 `docs`。否决。
2. **保持现状**（`docs.stationpc.com/docs/...`）：Fumadocs 官方站点就是这么用的，SEO 无实质损失；但 1,352 个 URL 的冗余是永久的，且合并期是最便宜的唯一改造窗口。否决。
3. **废弃子域，挂到主域 `stationpc.com/docs/...`**：`docs` 只出现一次，SEO 权重也集中；但要把这个 Node 服务接进主站（另有一套 nginx/站点管理）的路径下，跨团队成本远超收益，且主站不归本仓库管。否决。
