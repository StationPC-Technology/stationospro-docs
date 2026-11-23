# 0003 — 中文唯一源，旧译文当基线校准

日期：2026-11
状态：已采纳

## 背景

新站机制：`content/docs/zh/` 是唯一人工源，其余 7 种语言由 `translate-docs` 生成，每篇译文 frontmatter 带 `sourceHash`（中文源 SHA-256 前 12 位）；中文一改，哈希不匹配，`check:content` 判定译文过期。目录与文件名在 8 种语言间强制 1:1。

旧站有 5 种既有译文（en/ja/ko/de/zh-TW，共 ~620 篇）。质量抽样结论（`pocketcloud/faq/support-max-sd` 四语对照）：

- en / ja / ko：通顺准确，可用。
- de：正文可用，但标题被重复拼上产品名（`# PocketCloud Was ist die maximale Kapazität…`），命中 1 篇；ja 3 篇、ko 3 篇有同类问题。
- zh-TW：**半直转**——`軟體`/`資訊`/`網路`/`檔案`/`設定` 已转，但 `信息`49 处、`文件`230 处、`设置`2 处未转，同一篇里简繁混排。
- 结构齐平度：以 zh-CN 125 篇为基准，每语言 heading 不匹配仅 3 篇；缺失 2–4 篇（en 缺 `docker/plik`、`file-service/windows-nfs-garbled-code`、`guides/install-tv-app`、`syncthing/how-to-use-sync`；ja/ko/de/zh-TW 各缺 `syncthing/how-to-use-sync`、`troubleshooting/app-client-connect-issue`）。

## 决策

1. **中文是唯一源**，不引入第二个人工维护语言。
2. **旧译文落盘当基线**（而非丢弃重译）：按新 slug 放进对应语言目录，补 `sourceHash`，再按**扩展后的术语表**回扫校准；只修标题冗余、术语偏差、缺失页，不做全量重写。
3. **zh-Hant 整目录重做**：旧 zh-TW 简繁混排，修补成本高于重生成（且量小，125 篇）。
4. **fr / es 全新翻译**：旧站没有对应语言。
5. **抽 5% 人工验收**（每语言 6–7 篇，优先 FAQ 与快速开始），不逐篇通读。

## 后果

- 成本：PocketCloud 中文约 0.1MB，7 语言全量 ≈ 0.4M output tokens；基线落盘 + 回扫约占 2 人日，zh-Hant 重做 + fr/es 新翻约占 1–2 人日。
- 好处：en/ja/ko/de 的内容质量不倒退，且立刻满足 8 语言 1:1 的硬约束（不能先上线中文）。
- 风险：旧译文的错误会被"继承"。缓解手段是抽检 + 术语表回扫；发现系统性问题时单页重翻，不整批重来。
- 后续：中文每改一次，对应译文过期 → 必须同批翻译，这是流水线的常态而非例外。

## 被否决的方案

1. **7 语言全部重译**：875 篇 × 7 ≈ 0.8–1.1M output tokens 级别，且 en/ja/ko 现有质量已经够用，纯浪费。否决。
2. **各语言独立人工维护**（去掉 `sourceHash` 机制）：短期灵活，长期必然漂移成 8 个不同版本，正是旧站 zh-TW 烂掉的原因。否决。
3. **先只上中文，译文随后补**：`check:content` 的 1:1 检查会直接失败，且站点 8 语言入口会出现空目录。否决。
