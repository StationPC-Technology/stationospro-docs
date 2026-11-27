# ADR 索引

本目录记录帮助中心合并过程中**难以回退、且需要解释理由**的决策。格式：背景 → 决策 → 后果 → 被否决的方案。

| 编号 | 标题 | 状态 |
|---|---|---|
| [0001](./0001-one-site-two-product-domains.md) | 一个站点、两个产品域 | 已采纳 |
| [0002](./0002-fumadocs-single-stack.md) | 全量迁入 Fumadocs，VuePress 只归档 | 已采纳 |
| [0003](./0003-chinese-source-baseline-translations.md) | 中文唯一源，旧译文当基线校准 | 已采纳 |
| [0004](./0004-raw-images-in-git.md) | 图片原图入库，不压缩不转 WebP | 已采纳 |
| [0005](./0005-defer-301-keep-both-domains.md) | 旧站两域名长期保留，301 延后 | 已采纳 |
| [0006](./0006-drop-docs-url-prefix.md) | URL 去掉 `/docs` 路径前缀 | 已采纳 |
| [0007](./0007-line-based-url-slugs.md) | URL 段按产品线命名（`/desktop`、`/portable`） | 已采纳 |

执行细节见 [../merge-plan.md](../merge-plan.md)，术语见 [../../GLOSSARY.md](../../GLOSSARY.md)。
