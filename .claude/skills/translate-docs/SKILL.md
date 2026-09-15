---
name: translate-docs
description: 将 content/docs/zh/ 下新增或修改的中文文档翻译为目标语言（支持繁體中文/English/日本語/한국어/Deutsch/Français/Español），写入对应目录并更新 sourceHash。当用户要求翻译文档、同步译文、新增语言时使用。
---

# 文档翻译（zh → 7 种目标语言）

本项目所有译文由本流程生成（已替代 GitLocalize）。`content/docs/zh/` 是唯一人工编写的源语言。

目标语言（与 `scripts/check-content.mjs` 保持一致）：

| 语言 id | 目录 | 语言 |
|---|---|---|
| zh-Hant | `content/docs/zh-Hant/` | 繁體中文 |
| en | `content/docs/en/` | English（默认语言，URL 无前缀） |
| ja | `content/docs/ja/` | 日本語 |
| ko | `content/docs/ko/` | 한국어 |
| de | `content/docs/de/` | Deutsch |
| fr | `content/docs/fr/` | Français |
| es | `content/docs/es/` | Español |

## 执行流程

### 1. 确定翻译范围

- **增量模式（默认）**：运行 `git diff --name-only -- content/docs/zh`（如需含已暂存改动加 `--cached`，对比上次发布用 `git diff <last-tag>..HEAD`），找出本次改动的 `zh/**.mdx`。
- **全量模式**：用户明确要求时，翻译 `content/docs/zh/` 下全部 `.mdx`。
- 向用户确认要翻译的目标语言（默认全部 7 种）和文件清单后再开始。

### 2. 读取术语表与语言注意点

读取本 skill 目录下的 `glossary.json`，严格遵守：
- `keep`：品牌、产品、型号名，所有语言永不翻译；
- `fixed`：按目标语言取对应表格，固定译法必须逐字采用，不得临场发挥同义词；
- `technicalAbbreviations`：技术缩写在所有语言中保留原文；
- `notes`：目标语言的强制风格规则（如繁中的词汇改写、日语敬体、德语 Sie 称呼等），逐条执行；
- `universalRules`：MDX 保护规则，所有语言通用。

### 3. 逐文件翻译

对每个源文件 `content/docs/zh/<path>.mdx`：

1. 通读全文，理解上下文（同一栏目内术语、语气保持一致）；
2. 翻译正文与 frontmatter 的 `title`、`description`；
3. **保护优先**：代码块、行内代码、URL、图片路径、邮箱、HTML/MDX 标签结构一律原样保留；不确定的词优先查术语表而不是猜；
4. 写入 `content/docs/<目标语言>/<path>.mdx`（目录结构和文件名必须与中文完全一致，目录不存在则创建）。

批量翻译时可用并行子 agent 按语言分派（每个 agent 负责一种语言，发给它：本 SKILL 的流程说明、glossary.json 路径、文件清单）。

### 4. meta.json

每个语言目录的 `meta.json` 结构（`pages` 数组）必须与 `content/docs/zh/` 完全一致，`title` 翻译为对应语言。`pages` 中的文件名/文件夹名**不得翻译**。

### 5. 同步 sourceHash（关键步骤）

全部翻译完成后运行：

```bash
node scripts/update-sourcehash.mjs          # 全部语言
node scripts/update-sourcehash.mjs en ja    # 只同步指定语言
```

该脚本计算每个中文源文件的 sha256（前 12 位）并写入对应译文 frontmatter。注意：
- 中文源文件**不要**写 sourceHash；
- 译文已有旧 sourceHash 时脚本会自动替换。

### 6. 终检

运行 `npm run check:content`，必须全绿（0 错误）才算完成：
- 结构对齐错误 → 有中文文件漏翻，回到步骤 3；
- sourceHash 错误 → 重跑步骤 5；
- 链接错误 → 翻译时误改了 URL，恢复原样。

再运行 `npm run types:check` 确认 MDX 未被破坏。

## 禁止事项

- 不得修改任何 `content/docs/zh/` 文件（中文是源，只读）；
- 不得改动 `meta.json` 的 `pages` 文件名；
- 不得跳过 sourceHash 步骤——没有它过期检测就失效了；
- 不得把简体中文逐字转成繁体当 zh-Hant 译文——必须按术语表改写词汇。
