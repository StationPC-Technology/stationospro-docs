# 多语言文档维护工作流

本项目使用 **LLM 翻译流程**（Claude Code skill）将中文文档翻译为 7 种目标语言，替代了早期的 GitLocalize 方案。

## 基本原则

- `content/docs/zh/` 是唯一人工编写的文档源（源语言：简体中文）。
- 其余 7 种语言均由翻译流程生成，**不要直接手改译文**（修改会被下次翻译覆盖）：

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
- 每篇译文的 frontmatter 记录 `sourceHash`（中文源内容的 sha256 前 12 位）。中文源一旦修改，hash 不再匹配，`check:content` 会判定该译文**过期**并报错——这是防止译文悄悄烂掉的核心机制。
- 语言配置集中在 `src/lib/i18n.ts`（`localeConfigs` / `languages` / `sourceLanguage`）。

## 日常流程

写完中文后，执行翻译 skill：

```
/translate-docs
```

skill 会自动完成：识别改动文件 → 按术语表翻译 → 创建/更新各语言 meta.json → 同步 sourceHash → 运行 `npm run check:content` 终检。

全部绿了再 commit / push。

## 质量防线

1. **`npm run check:content`**（CI 中运行）：中英结构对齐、meta.json 一致性、sourceHash 过期检测、内部死链。任何一项失败都会阻塞合并。
2. **术语表**：`.claude/skills/translate-docs/glossary.json` 维护了品牌名（永不翻译）、各语言固定译法、技术缩写和分语言风格注意点（如繁中的词汇改写、日语敬体、德语 Sie 称呼）。发现译法不统一时，先更新术语表再重翻。
3. **`npm run types:check` + `npm run build`**：确认 MDX 结构未被破坏。

## 译文过期（check:content 报"已过期"）怎么处理

中文源修改后未重新翻译时必然出现。处理方式：

```bash
git diff --name-only -- content/docs/zh   # 看哪些中文文件改过
# 然后运行 /translate-docs 增量翻译
```

## 新增语言

1. 在 `src/lib/i18n.ts` 的 `localeConfigs` 和 `languages` 中增加对应语言；
2. 在 `scripts/check-content.mjs` 和 `scripts/update-sourcehash.mjs` 的语言列表中增加该语言；
3. 在 `.claude/skills/translate-docs/glossary.json` 中补充该语言的 `fixed` 固定译法和 `notes` 风格注意点，并在 SKILL.md 的语言表中登记；
4. 运行 `/translate-docs` 全量翻译生成 `content/docs/<lang>/`；
5. 在 GitLocalize 时代已无其他配置需求；RTL 语言需额外检查布局。

## 运维要求

- 部署文档站时设置 `NEXT_PUBLIC_SITE_URL`，确保 canonical、Open Graph 和 `hreflang` 使用生产域名。
- 内容或导航变更后，检查各语言 `/docs`、搜索、内部链接和移动端布局。
