# 0007 — URL 段按产品线命名（`/desktop`、`/portable`）

日期：2026-11
状态：已采纳
取代：[0001](./0001-one-site-two-product-domains.md) 中的产品段命名（`/stationos-pro` + `/pocketcloud`）；「一个站点、两个产品域」的结构本身不变。

## 背景

ADR-0001 定的产品段是 `/stationos-pro/` + `/pocketcloud/`——**按产品名**命名。当时把产品名当成了长期稳定的事实，后来三条事实推翻了它：

1. **便携式产品要改名**：`PocketCloud` 即将改名为 `PA100`（现已在 19 篇中文里以小批量并存出现，旧名出现在 65 篇）。
2. **两条线都还要加型号**：便携式加 `PA200`，桌面式加 `DA200`；型号会持续增加，产品名与型号列表都不是稳定量。
3. **产品线名稳定**：桌面式 NAS / 便携式 NAS 是产品分类，不随型号与品牌改名而变。

URL 一旦上线就有外部引用（搜索结果、客服工单、线下二维码、第三方教程），改名成本远高于内部路径改名。

## 决策

**产品段按产品线命名**：

```
/desktop/**     桌面式 NAS（系统 StationOS Pro，型号 DA400 / DA400 Air）
/portable/**    便携式 NAS（系统 StationOS，型号 PA100 / PA100 Pro / PA200）
```

- 产品段紧跟语言段：`/zh/portable/faq/support-max-sd`；en 无语言前缀。
- 注册表 `src/lib/products.ts` 只存**稳定事实**（slug、产品线名、系统名、型号数组），**不存产品品牌名**——界面上的产品名取自各产品 `index.mdx` 的 `title`，改名只改内容不改代码。
- 产品段不翻译（8 语言共用同一段）。

## 后果

- 好处：改名（PocketCloud → PA100）**零重定向**；加型号（PA200 / DA200）自动归位，不需要新建子树；第三方引用与线下二维码长期有效。
- 代价：URL 里没有品牌词，SEO 信号全靠 `<title>`、`<h1>`、正文与 canonical（Fumadocs 的 `generateMetadata` 已生成 canonical 与 hreflang，足够）。
- 代价：`desktop` / `portable` 是较泛的词，与站点无关的上下文里看不出品牌；接受，路径只在站内被点击。
- 约束：现有的 `/docs/*` 历史 URL 不能简单 301 到 `/*`，必须先判 `policies` / `contact`，其余再进 `/desktop/*`（附录 B.2，顺序敏感）。

## 被否决的方案

1. **按系统命名**（`/stationos-pro/` + `/stationos/`）：对称且稳定，但两个前缀只差一个 `-pro`，手动输入与口头传达极易出错；且便携式用户不认识系统名 `StationOS`（旧站 125 篇中文里 `StationOS` 出现 0 次）。
2. **维持产品名**（`/stationos-pro/` + `/pocketcloud/`）：改名生效时就要再发一次 8 语言全量 301，且 `pocketcloud` 这个段会在改名后长期作为历史包袱存在。
3. **`/nas-desktop` + `/nas-portable`**：语义重复（域名已经是 NAS 帮助中心），路径冗长。
4. **加型号段**（`/portable/pa100/*` + `/portable/pa200/*`）：绝大多数内容是同一系统下的相同操作，立刻产生两份要同步的正文；型号差异用 Callout / 对比表格内联即可，真成规模时再在 `/portable/` 下开子段（一次局部重定向）。
