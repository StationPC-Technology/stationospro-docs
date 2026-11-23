# 0002 — 全量迁入 Fumadocs，VuePress 只归档

日期：2026-11
状态：已采纳

## 背景

旧站是 VuePress 1.9.7 + webpack4（Node 16），主题是 fork 出来的 theme-default：`docs/.vuepress/theme/` 下 54 个 `.vue` 组件 + `util/language.js`（客户端语言重定向）+ 3 个自写插件（cache-sidebar、compress-html、fulltext-search），合计约 14.6k 行。

新站是 Next.js 16 + React 19 + Fumadocs 16.9，已具备：i18n（8 语言、`hideLocale` 默认语言无前缀）、全文搜索（CJK 分词）、`meta.json` 导航、`lastModified`、OG 图、`llms.txt`、Markdown 内容协商、反馈组件。

旧站内容对主题的依赖集中在 5 个组件（`VideoEmbed` 90 处、Tabs 36 文件、`LastUpdated` 65 文件、`ChangelogList` 7 文件、`FullSearchResults` 6 文件），其余是标准 Markdown。

## 决策

**把内容全量搬进 Fumadocs，旧站代码一行不迁**；VuePress 仓库打 tag 归档，只保留构建产物用于过渡期服务。

新建的三个组件用 Fumadocs 自身的 MDX 组件体系实现：

- `VideoEmbed`（16:9 iframe，全局注册）——Fumadocs 没有视频组件，必须自研；90 处嵌入原样保留（产品面向海外用户，YouTube 可用性不是阻塞项）。
- `Tabs`/`Tab`（全局注册）——Fumadocs 自带但默认未全局注册；36 个文件的用量下，逐文件 `import` 是噪音。
- `ChangelogList`（读 `meta.json` 生成卡片）——替代旧站的自定义指令。

## 后果

- 好处：一套技术栈、一条 CI、一套翻译流水线、一处样式；Node 16 → 22。
- 代价：旧主题里与内容无关的部分（首页 hero 的实验样式、`feishu.js` 反馈上报）需重写或替换为 Fumadocs 等价物；首页是**新建**而非移植（旧首页是 frontmatter 驱动的 `home: true` 布局，新站没有等价物）。
- 代价：`<FullSearchResults>`（6 文件）没有等价物，`/portable/search` 页删除，搜索统一走顶栏 ⌘K。
- 迁移期仍需旧站运行（包装盒二维码指向它），所以**归档仓要能构建**，不能删 `package.json`。

## 被否决的方案

1. **双栈共存**（PocketCloud 留在 VuePress，挂到 `/portable` 子路径）：省 4–6 人日的主题迁移，但两套依赖树、两套 CI、两套翻译上下文；且 VuePress 1.x 已停止维护，Node 16 是安全与工具链的负债。否决。
2. **VuePress 2 / VitePress 升级后再合并**：等于多付一次迁移成本，收益只是"分两步"，没有解决两栈并存的根本问题。否决。
3. **只要内容、不要组件**（把视频降级为文字 + 截图）：会损失 90 处视频的教学价值，且产品面向海外用户时正是视频最有用的场景。否决（Q11 一并推翻）。
