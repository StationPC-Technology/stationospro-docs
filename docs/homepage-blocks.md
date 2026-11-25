# 首页模块：图标、FAQ 徽标与底栏

> 首页（`src/app/[lang]/(home)/page.tsx`）里三块「可配置」的内容：模块卡图标、常见问题徽标、页脚。三者都只依赖代码与页面树，不改任何译文，也不需要重新翻译。

首页结构本身（搜索区、两条产品线、FAQ、底栏）写在 `page.tsx` 里；本文只讲这些经常要换的内容。

## 模块卡图标

首页每张模块卡标题前有一个图标位。图标按模块配置在 `src/lib/home-modules.ts`：

```ts
{ path: 'backup', icon: 'Archive', docs: [...] }
```

`icon` 支持两种写法，两者外观不同：

- **Lucide 图标名**（`Rocket`、`Settings`、`Archive` 等），完整列表见 <https://lucide.dev/icons>。渲染成「32×32 的圆角浅色底 + 22×22 的线性图标」，底色和图标颜色都跟随产品线（桌面式蓝、便携式青）。适合单色线条图标。
- **以 `/` 开头的图片路径**。把文件放进 `public/`，例如 `public/images/common/icons/backup.svg`，再写 `icon: '/images/common/icons/backup.svg'`。图片直接按 32×32 渲染，带 8px 圆角（与浅色胶囊一致），**不再套浅色底**，保留它自己的颜色和形状。适合自带底色/多色的成品图标。

替换图标的步骤：

1. 改 `src/lib/home-modules.ts` 里对应模块的 `icon` 值；
2. 用自定义图片时，把 SVG/PNG 复制到 `public/images/common/icons/`（建议正方形，最短边 64 px 以上），填它的路径；
3. `npm run dev` 后分别看 <http://localhost:3000/zh> 和 <http://localhost:3000/>。

说明：

- 图标名写错或图片不存在时该位置直接不渲染，卡片布局不受影响，不会把页面弄坏。
- 模块数据与语言无关，标题取自页面树，所以换图标不需要动任何译文。
- 图标位尺寸（32×32 px，两种写法共用）、Lucide 图标尺寸（22×22 px）和各产品线的配色，都在 `src/app/[lang]/(home)/page.tsx` 的 `ModuleIcon` / `iconTone` 里：想让图片更大改 `size-8`，想让线性图标更粗壮改 `size-[22px]`。
- 自定义图片不要自己再加内边距或外框；如果图片自带的留白很多，缩到 32 px 后会显得小，建议裁掉留白或改用纯色线条图标。
- 某个模块不写 `icon` 就不显示图标位。

## FAQ 徽标

首页底部的常见问题列表可以给任意一条打徽标。问题清单和徽标都配置在 `src/lib/home-faq.ts`：

```ts
export const HOME_FAQ: HomeFaqItem[] = [
  { slug: ['portable', 'faq', 'factoryreset'], badge: 'hot' },
  { slug: ['portable', 'faq', 'compatible-system'], badge: 'recommend' },
  { slug: ['portable', 'faq', 'uninterrupted-operation'] },
];
```

- **`slug`** 是 `content/docs/<lang>/` 下与语言无关的路径。标题取自页面树，所以改这个文件不需要动任何译文。slug 找不到时该条会被跳过，不影响其他条目。
- **`badge`** 可省略，取值 `'hot'`（热门）或 `'recommend'`（推荐）。几条要标、标在哪一条都可以，不再按位置把第一条当热门。
- **数组顺序**就是展示顺序，增删、调顺序都改这里。

要改徽标文字，编辑 `src/lib/home-copy.ts` 里的 `hotBadge` / `recommendBadge`，8 种语言各一份。要改徽标样式（目前 `hot` 是琥珀色填充底、`recommend` 是描边胶囊），编辑 `src/app/[lang]/(home)/page.tsx` 里的 `faqBadgeStyles`。

## 首页底栏

底栏是首页底部整幅居中的一条带子，从上到下三层：社交圆钮 → 链接行 → 版权。它只挂在首页；文档页仍是 Fumadocs 自带的上一页 / 下一页与页面反馈。

**社交圆钮**：图形在 `src/components/brand-icons.tsx`，链接在 `src/lib/shared.ts` 的 `socialLinks`。

- `lucide-react` 1.31 起不再内置品牌图标，所以这几个图形取自 [simple-icons](https://simpleicons.org/)（CC0 1.0），统一 24×24 视框、跟随 `currentColor` 上色。
- 渠道与主站底栏一致：Facebook、Instagram、TikTok、YouTube、Discord，另加一个支持邮箱圆钮（`mailto:support@stationpc.com`）。
- 增删渠道要同时改三处：`socialLinks` 的链接、`brand-icons.tsx` 的图形、`page.tsx` 里 `socialChannels` 的数组。

**链接行**：条目在 `page.tsx` 的 `footerLinks` 里拼出来。

- 前两条是主站与社区，标签直接复用 `src/lib/contact-copy.ts` 里「官网 / 社区」的译名，不新增文案；
- 中间两条法务链接由 `FOOTER_LEGAL_LINKS` 决定：标题取自本地页面树（隐私政策 / 用户协议，各语言已有译文），链接指向主站的正式条款页 `stationpc.com/policies/*`；要再加法务项，往这个数组里加一条 `slug` + `href`；
- 最后一条是「联系我们」，同样取自页面树；
- 页面树里找不到的条目会自动跳过，不会留死链；
- 链接之间只用留白分隔，不加竖线：英文标题更长会折行，竖线容易掉到行首，反而更乱。

**版权行**：`© {年份} {appName}`，年份渲染时取当前年。备案号还没有，位置留在 `page.tsx` 底栏的注释里；拿到真实备案信息后加一行指向 `beian.miit.gov.cn` 的链接即可。

## 相关文件

| 文件 | 作用 |
| --- | --- |
| `src/lib/home-modules.ts` | 每条产品线展示哪几个模块、每张卡的图标与推荐文档 |
| `src/lib/home-faq.ts` | FAQ 选页与「热门 / 推荐」徽标 |
| `src/lib/home-copy.ts` | 首页文案：搜索、FAQ 标题、徽标文字 |
| `src/lib/shared.ts` | 站点级常量：GitHub 信息、底栏社交链接 |
| `src/components/brand-icons.tsx` | 底栏社交圆钮的品牌图形 |
| `src/app/[lang]/(home)/page.tsx` | 首页结构与样式：图标位、FAQ 行、分区标题、底栏 |
| `public/images/common/icons/` | 自定义图标存放位置 |
