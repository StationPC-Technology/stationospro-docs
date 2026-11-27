# 0004 — 图片原图入库，不压缩不转 WebP

日期：2026-11
状态：已采纳

## 背景

旧站图片：**3,122 个文件 / 695MB**，`docs/` 下每个语言各存一份（每语言 451–466 图 / 112–118MB），71% 的字节是跨语言重复。按 md5 去重后 **899 张唯一图 / ~130MB**。

新站 `public/` 目前 11MB（只有 `images/common/` 71 张 PNG）。图片引用机制：中文源用 `/images/common/...`，译文可用 `/images/<lang>/...` 覆盖，缺失时由 `next.config.mjs` 的 `afterFiles` rewrite 回退到 `images/common/`。`source.config.ts` 里 `remarkImageOptions: { useImport: false, onError: 'ignore' }`——不做构建期静态导入，缺图不炸构建。

候选载体：① 原图进 git；② 转 WebP 再进 git（40–60MB）；③ Git LFS；④ OSS/COS 外链。

## 决策

**去重后的原图（PNG/JPG，不重编码、不转 WebP）直接提交 git**，路径 `public/images/common/portable/<section>/<page>/<name>.<ext>`（产品段与 URL 一致，见 [0007](./0007-line-based-url-slugs.md)）。

- 去重仍然是必须的：3,122 → 899，省 565MB。
- 不压缩、不转码：**保真优先**。文档截图常含细字、UI 边线、深色模式下的低对比元素，重编码的收益（~70MB）不抵失真与"原始素材与线上不一致"的排障成本。
- 不本地化截图（不做每语言一套），但**保留 `/images/<lang>/` 覆盖能力**——个别语言将来要换图时可直接放。

## 后果

- `public/` 从 11MB → ~141MB；Docker 镜像增加 ~130MB；`git clone` 从 ~12MB → ~142MB。
- 构建时间影响可忽略（图片只是静态复制）。
- ECS 磁盘与镜像拉取时间需要确认一次（一次性成本）。
- 若将来仓库超过 200MB 或 clone 变痛，迁移路径明确：转 WebP 或迁 LFS，且因为引用都是绝对路径 `/images/common/...`，迁移不需要改任何正文。

## 被否决的方案

1. **转 WebP（40–60MB）**：省 ~70MB，但需要保证转换前后视觉一致；且旧素材是 PNG 截图，WebP 有损/无损选择要逐张判断。收益相对总成本不显著，用户明确要求不压缩。否决。
2. **Git LFS**：仓库瘦身，但 GitHub Actions checkout 需要 `lfs: true`，ECS 部署走 GHCR 镜像不受影响、而本地开发要多一步 `git lfs pull`；引入新的失败模式（LFS 配额、拉取失败）。否决。
3. **OSS/COS 外链**：仓库最轻，但本地预览与离线构建会失效，译文 fallback 机制也要重写。否决。
4. **保留多语言重复图**：695MB 里 71% 是重复字节，纯浪费。否决。
