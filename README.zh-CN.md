# StationOS Pro 帮助中心

**简体中文** | [English](./README.md)

欢迎来到 **StationOS Pro** 官方帮助中心。StationOS Pro 是 StationPC NAS 设备的操作系统。

本仓库维护着我们的 NAS 产品用户文档，涵盖从开箱、硬件安装到日常使用、故障排查以及最新系统更新等全部内容。

## 在线文档

帮助中心在线地址：**https://docs.stationpc.com**

- 简体中文：<https://docs.stationpc.com/zh/docs>
- English：<https://docs.stationpc.com/docs>

## 文档内容

| 板块 | 内容 |
| --- | --- |
| 快速开始 | DA400 等 NAS 设备的开箱、硬件安装与首次使用指南 |
| 教程 | 常用功能与进阶用法的分步教程 |
| 故障排查 | 常见问题与错误提示的解决方法 |
| 更新日志 | StationOS Pro 的版本发布与系统更新说明 |
| 支持 | 如何联系我们的技术支持团队 |

## 获取支持

如果文档无法解决你的问题，可以通过以下方式联系我们：

- **在线帮助中心**：<https://docs.stationpc.com>
- **官方网站**：<https://www.stationpc.com>
- **StationNAS App**：可在各大应用商店及 StationPC 官网下载
- **技术支持邮箱**：service@stationipc.com

## 贡献与本地开发

本文档站点基于 [Next.js](https://nextjs.org/) 与 [Fumadocs](https://fumadocs.dev/) 构建。

本地运行：

```bash
npm install
npm run dev
```

然后访问 <http://localhost:3000/zh/docs>（简体中文）或 <http://localhost:3000/docs>（English）。

文档编写人员可参考：

- [Fumadocs 常用内置组件编写指南](./docs/fumadocs-components.md)
- [文档编写与发布工作流](./docs/writing-workflow.md)

提交前请运行 `npm run types:check` 和 `npm run build`。推送及创建 Pull Request 时会自动执行质量检查。
