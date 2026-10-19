---
name: translate-docs
description: 将 content/docs/zh/ 下新增或修改的中文文档同步到 7 种目标语言（繁體中文/English/日本語/한국어/Deutsch/Français/Español）并更新 sourceHash。基于水位线 commit 的增量 patch——小改动、已提交改动、同事同步下来的改动都只动译文对应位置；新文件或大改才全篇翻译。当用户要求翻译文档、同步译文、更新译文时使用。
---

# 文档翻译与增量同步（zh → 7 种目标语言）

本项目所有译文由本流程生成（已替代 GitLocalize）。`content/docs/zh/` 是唯一人工编写的源语言。

## 调用参数

```
/translate-docs [--full] [语言...]
```

- 无参数：自动判定模式（增量优先、按需回退全篇），同步全部 7 种语言；
- `--full`（或用户说"全量重翻/全部重翻"）：强制全篇翻译——忽略过期状态与增量判定，对全部 zh 文档的译文整篇重写；完成后水位线照常推进；
- 语言 id（如 `en ja`）：只同步指定语言，可与 `--full` 组合。

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

### 1. 模式判定（先跑这个；`--full` 时跳过本步骤直接全篇）

1. 运行 `npm run check:content` 收集待同步清单：
   - `[翻译] ... 已过期 / 缺少 sourceHash` → 已有译文需同步；
   - `[结构] zh 有而 <lang> 缺失` → 新文件，需全篇翻译；
   - 都没有 → 无事可做，直接报告结束。
2. 对每个需同步的**已有**译文文件，按以下优先级取改动依据：
   - **水位线（优先）**：项目根 `.translate-sync-commit` 记录上次全量同步时的 commit。文件存在且 `git merge-base --is-ancestor <hash> HEAD` 通过 → 改动依据 = `git diff <hash> -- content/docs/zh`（自动包含已提交与未提交的全部改动）。因此改完即跑、commit 几次后再跑、从远端 pull 下同事的改动，都能增量；
   - 水位线文件不存在（首次）：check 全绿 → 初始化为当前 HEAD 建立基线（见步骤 7）；有过期 → 该文件回退全篇；
   - 校验失败（rebase/历史重写后 hash 不存在、浅克隆）→ 该文件回退全篇，完成后重建基线；
   - 兜底：`git diff HEAD -- <file>`（仅工作区未提交改动）拿得到且非空 → 也可增量；否则回退**全篇翻译模式**（步骤 3b）。
3. 用户显式要求"全量重翻"（`--full`）时，所有文件走全篇模式。
4. 向用户确认目标语言（默认全部 7 种）与模式判定结果后开始。

### 2. 读取术语表与语言注意点（两种模式共用）

读取本 skill 目录下的 `glossary.json`，严格遵守：
- `keep`：品牌、产品、型号名，所有语言永不翻译；
- `fixed`：按目标语言取对应表格，固定译法必须逐字采用，不得临场发挥同义词；
- `technicalAbbreviations`：技术缩写在所有语言中保留原文；
- `notes`：目标语言的强制风格规则（如繁中的词汇改写、日语敬体、德语 Sie 称呼等），逐条执行；
- `universalRules`：MDX 保护规则，所有语言通用。

### 3a. 增量 patch 模式（默认：一句话/一个链接级别的小改动）

对每个文件的每个 diff hunk，按类型处理：

1. **机械改动**——仅涉及 URL、锚点、图片路径、代码块/行内代码内容、表格纯数据列（型号/协议/容量等不译内容）、MDX 标签属性名：
   把**完全相同的替换**应用到 7 种译文对应位置。不经翻译、不润色，保证 URL 等内容零漂移。
2. **文案改动**——句子的措辞修改、增删、改写：
   依结构对齐不变量定位译文对应位置（翻译流程保证标题层级、列表条数、表格行数与 zh 一一对应；按 diff 位置前后的最近标题 + 段内顺序定位），只翻译新句、最小改写对应句。术语表与该语言风格规则照常生效，**译文其余内容一字不动**。
3. **纯中文语病修正**（错别字、标点，语义不变）：
   译文无需改动（各语言本来就不是逐字翻译），仅等步骤 5 统一更新 hash。

注意：
- 增量模式不得重写译文未受影响的内容（最小 patch 原则）；
- 删除段落/列表项/表格行 → 删除译文对应项；新增 → 插入翻译；
- **大 diff 判断**：单文件的改动覆盖超过约一半篇幅（如同事整篇重写），增量 patch 不划算，建议该文件改走全篇翻译；
- 多文件多语言的大范围同步可用并行子 agent 按语言分派（每个 agent 发给：本 SKILL 流程说明、glossary.json 路径、文件清单与 diff hunks）。

### 3b. 全篇翻译模式（新文件 / 无 diff 回退 / 用户显式全量）

对每个源文件 `content/docs/zh/<path>.mdx`：

1. 通读全文，理解上下文（同一栏目内术语、语气保持一致）；
2. 翻译正文与 frontmatter 的 `title`、`description`；
3. **保护优先**：代码块、行内代码、URL、邮箱、HTML/MDX 标签结构一律原样保留；图片路径按术语表 `universalRules` 的规则把 `/images/common/` 机械替换为 `/images/<目标语言>/`（缺失图片由 rewrite 自动回退）；不确定的词优先查术语表而不是猜；
4. 写入 `content/docs/<目标语言>/<path>.mdx`（目录结构和文件名必须与中文完全一致，目录不存在则创建）。

批量翻译时可用并行子 agent 按语言分派（每个 agent 负责一种语言，发给它：本 SKILL 的流程说明、glossary.json 路径、文件清单）。

### 4. meta.json（仅新增/删除文件时涉及）

每个语言目录的 `meta.json` 结构（`pages` 数组）必须与 `content/docs/zh/` 完全一致，`title` 翻译为对应语言。`pages` 中的文件名/文件夹名**不得翻译**。内容级 patch（3a）不涉及 meta.json。

### 5. 同步 sourceHash（关键步骤）

全部同步完成后运行：

```bash
node scripts/update-sourcehash.mjs          # 全部语言
node scripts/update-sourcehash.mjs en ja    # 只同步指定语言
```

该脚本计算每个中文源文件的 sha256（前 12 位）并写入对应译文 frontmatter。注意：
- 中文源文件**不要**写 sourceHash；
- 译文已有旧 sourceHash 时脚本会自动替换。

### 6. 终检

运行 `npm run check:content`，必须全绿（0 错误）才算完成：
- 结构对齐错误 → 有中文文件漏翻，回到步骤 3b；
- sourceHash 错误 → 重跑步骤 5；
- 链接错误 → 翻译时误改了 URL，恢复原样。

再运行 `npm run types:check` 确认 MDX 未被破坏。

### 7. 记录水位线（关键步骤）

终检**全绿**后运行：

```bash
git rev-parse HEAD > .translate-sync-commit
```

- `.translate-sync-commit` 记录"此 commit 时刻全部译文已同步"，是下次增量的 diff 基准；
- **严格推进条件**：只有 check:content 全绿（0 过期）才推进。若本次只同步了部分文件、check 仍报其他文件过期，保持旧水位线不动（下次 diff 仍从旧水位线开始，不漏改动）；
- 该文件需随代码一起提交——push 后团队共享同一水位线，同事 pull 下来的改动也能被增量覆盖。

## 禁止事项

- 不得修改任何 `content/docs/zh/` 文件（中文是源，只读）；
- 不得改动 `meta.json` 的 `pages` 文件名；
- 不得跳过 sourceHash 步骤——没有它过期检测就失效了；
- 不得把简体中文逐字转成繁体当 zh-Hant 译文——必须按术语表改写词汇；
- 增量模式下不得重写译文未受影响的内容——最小 patch 原则；
- 终检未全绿（仍有过期）不得推进水位线——否则下次增量会漏掉未同步的改动。
