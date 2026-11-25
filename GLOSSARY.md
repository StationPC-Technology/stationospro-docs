# GLOSSARY — StationPC 帮助中心术语表

> 本项目唯一的术语事实源。写作、翻译、代码命名、导航文案一律以本表为准。
> 与 `glossary.json`（翻译流水线用）的关系：**本表是决策与理由，`glossary.json` 是机器可读的落地子集**。改本表时，同步检查 `glossary.json` 的 `keep` / `fixed` / `notes`。
> 合并背景见 [docs/merge-plan.md](./docs/merge-plan.md)。

---

## 1. 两条产品线（最容易混的一层）

| 产品线 | 系统 | 系统底座 | 现有型号 | 即将发布的型号 |
|---|---|---|---|---|
| **便携式 NAS** | **StationOS** | OpenWrt | PocketCloud（即将改名为 **PA100**）、PA100 Pro | PA200 |
| **桌面式 NAS** | **StationOS Pro** | Debian | DA400、DA400 Air | DA200 |

`PocketCloud Dock` 是**底座配件**（PA100 / PA100 Pro 共用），不是型号，见 §2。

**这是本表最重要的一条**：`StationOS` 与 `StationOS Pro` 是**两个不同产品线的两个不同系统**，不是「家族名 / 升级版」的关系。

- `StationOS` = 便携式（PocketCloud / PA100 系列）的系统，OpenWrt 底座。
- `StationOS Pro` = 桌面式（DA400 系列）的系统，Debian 底座。

两者**不得互相简称**，也不存在「StationOS 家族的 Pro 版」这种写法。

## 2. 产品与型号

| 术语 | 定义 | 不要写成 |
|---|---|---|
| **StationPC** | 公司/品牌名，站点名 `StationPC 帮助中心` 的来源。 | Station PC、思特森（对外中文文案不用） |
| **便携式 NAS** | 产品线分类词，对应 StationOS 系统。 | 移动 NAS、随身 NAS、便携 NAS、口袋云 |
| **桌面式 NAS** | 产品线分类词，对应 StationOS Pro 系统。 | 台式 NAS、桌面 NAS、固定式 NAS |
| **PocketCloud** | 便携式产品名，**即将改名为 PA100**（改名迁移期两名字并存，规则见 §8）。 | Pocket Cloud、口袋云、PocketNAS（这是客户端） |
| **PA100** | 便携式型号，PocketCloud 的新名字；也是整个系列的型号族前缀。 | Pa100、PA-100 |
| **PA100 Pro** | 便携式高配型号（旧代号 `pkc2`）。 | PocketCloud Pro（改名后不再用旧名） |
| **PA200** | 便携式即将发布的新型号。 | PA-200 |
| **PocketCloud Dock** | 便携式 NAS 的**底座配件**（不是独立型号），PA100 / PA100 Pro 共用；文档归在硬件安装（`hardware/installation/dock`）。 | Dock 底座、扩展坞、便携式底座 |
| **DA400** | 桌面式主力型号。 | DA 400、DA400 Pro |
| **DA400 Air** | 桌面式型号，**DA400 的低配版**；因算力较低不支持 Station AI 及部分 AI 功能（见 `content/docs/zh/index.mdx:38` 的 Callout，各功能页按需重复提示）。 | Air 版、DA400 青春版、Air 型号 |
| **DA200** | 桌面式即将发布的新型号。 | DA-200、DA200 Air |

## 3. 客户端软件（三个名字，并存不统一）

| 术语 | 平台 | 归属 | 不要写成 |
|---|---|---|---|
| **PocketNAS** | Windows / macOS / Linux / iOS / Android | 便携式（StationOS / PA100 系列） | StationNAS、Station Hub、PocketNAS App（写「PocketNAS 客户端」） |
| **StationNAS** | Windows / macOS | 桌面式（StationOS Pro / DA400 系列） | Station NAS、StationNAS 客户端（多余） |
| **StationHub** | iOS / Android | 桌面式（StationOS Pro / DA400 系列） | Station Hub、Hub App |

**最容易出的错**：便携式（旧站）的客户端现在叫 PocketNAS（旧名 StationCloud），桌面式（新站）的叫 StationNAS / StationHub。三者是不同软件，**不得在翻译或改写时互相替换**——尤其别把 PocketNAS 当成「StationOS 的客户端」去统一成 StationNAS。

> 电视端应用仍是 **StationCloudTV**，与 PocketNAS 配套，不随本次改名调整。

## 4. 功能概念（两条线共享概念，实现不同）

| 术语 | 说明 |
|---|---|
| **远程访问** | 内网穿透/公网访问。便携式走 P2P + 中继；桌面式走 StationLinks。 |
| **StationLinks** | 桌面式的远程访问服务名，保留不译。 |
| **Station AI** | 桌面式的 AI 能力（DA400 Air 不支持；便携式暂无对标功能），保留不译。 |
| **文件共享服务** | WebDAV、SMB/Samba、NFS、FTP/SFTP、Syncthing 的统称。便携式旧站就叫「文件共享服务」，沿用。 |
| **备份中心** | 便携式的备份聚合入口（`backup-center/`）；桌面式叫「备份」（`app-guide/backup`）。**同一概念、各自沿用本站叫法**，不强行统一。 |
| **更新日志** | 便携式按日期一页（`changelog/2026-10-26.mdx`），桌面式点分隔（`changelog/2026.11.16.mdx`）。**两种命名都保留**。 |
| **兼容性列表** | 支持的硬盘/SSD/SD 卡/相机型号表格。 |
| **客户端支持平台** | 客户端能装在哪些操作系统上（Windows、macOS、iOS、Android 等）。两条线各有一份答案，因为客户端不同（§3）。不要写成「系统兼容性」：本站的「系统」专指 StationOS / StationOS Pro。 |

## 5. 保留原文（不翻译）的词

系统与品牌：`StationPC` `StationOS` `StationOS Pro` `PocketCloud` `PA100` `PA100 Pro` `PA200` `PocketNAS` `StationCloudTV` `DA400` `DA400 Air` `DA200` `StationNAS` `StationHub` `StationLinks` `Station AI`

技术与产品：`Docker` `Compose` `App Store` `OTA` `WebDAV` `SMB` `Samba` `NFS` `FTP` `SFTP` `Syncthing` `OpenWrt` `Debian` `OpenClaw` `YouTube` `Discord`

> `OpenClaw` 出现在便携式的 Docker 教程里，是第三方项目名；`OpenWrt` / `Debian` 仅在讲系统底座时出现，不译。

## 6. 语言与本地化

| 语言 id | 目录 | 语言 | 旧站对应 |
|---|---|---|---|
| `zh` | `content/docs/zh/` | 简体中文（**唯一人工源**） | `/zh-CN/` |
| `zh-Hant` | `content/docs/zh-Hant/` | 繁體中文 | `/zh-TW/`（半直转，需重做） |
| `en` | `content/docs/en/` | English（默认语言，URL 无前缀） | `/`（en-US） |
| `ja` | `content/docs/ja/` | 日本語 | `/ja-JP/` |
| `ko` | `content/docs/ko/` | 한국어 | `/ko-KR/` |
| `de` | `content/docs/de/` | Deutsch | `/de-DE/` |
| `fr` | `content/docs/fr/` | Français | 无（新翻） |
| `es` | `content/docs/es/` | Español | 无（新翻） |

**沿用旧站译法、不重译**的常见词：文件→file、设置→settings、网络→network、软件→software、信息→information。zh-Hant 按台湾用语：`檔案`、`設定`、`網路`、`軟體`、`資訊`。

## 7. 站点结构词

| 术语 | 含义 |
|---|---|
| **站级页** | `/`、`/policies/*`、`/contact`，无侧栏，两条产品线共用。 |
| **产品域** | 一条产品线一个 URL 子树：`/desktop`（桌面式）、`/portable`（便携式）。按**产品线**命名，不按产品名（ADR-0007）。 |
| **产品落地页** | 每个产品域的 `index.mdx`：hero + 热门 + 快速入门 Cards + 核心功能 Cards；有侧栏。 |
| **URL 前缀** | 路径**不带** `docs` 段——域名 `docs.stationpc.com` 已承担该语义（ADR-0006）；产品段紧跟语言段：`/zh/portable/faq/support-max-sd`。 |
| **孤儿页** | 存在于内容目录但未在 `meta.json` 登记的页面。合并后应为 0（有意隐藏的 changelog 日期页除外）。 |
| **对应页** | 两条线上回答同一个问题的两篇文档，例如两条线各自的「兼容哪些操作系统」。它们是两份不同的答案，不是重复，也不共用一篇。不要叫「重复页」「同一篇」。 |
| **单线内容** | 只有一条线才有的页面或问题，例如便携式的「能否带上飞机」、桌面式的 Station AI。在另一条线上没有对应页。 |

## 8. 命名迁移期规则（PocketCloud → PA100）

改名不是一个开关，而是一段时间。期间的硬规则：

1. **同一条文案里只用一种名字**，不写「PocketCloud（PA100）」这种双写（只在「型号一览」类的表格里允许并列）。
2. **站点侧先不动**：本次合并按现有名字（PocketCloud）导入内容；改名正式生效时用脚本 + 术语表做一次全量替换（125 篇 × 8 语言），不手工改。
3. **URL 不用产品名**：产品段是 `/desktop` 与 `/portable`（ADR-0007），所以改名不需要发第二次全量 301。
4. `glossary.json` 里 `PocketCloud` 与 `PA100` 都进 `keep`，替换由术语表的迁移表驱动，不靠翻译器猜。

**URL slug 已定（ADR-0007）**：`/desktop/**` + `/portable/**`。理由：品牌名会变（PocketCloud → PA100）、型号会加（PA200 / DA200），而产品线名（桌面式 / 便携式）是长期稳定的；URL 是命名空间，不承载会变的品牌词。切换器与落地页照常显示产品名与型号，URL 只负责稳定。
