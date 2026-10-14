# StationOS Pro Help Center

[简体中文](./README.zh-CN.md) | **English**

Welcome to the official help center for **StationOS Pro**, the operating system that powers StationPC NAS devices.

This repository contains the user documentation for our NAS products — from unboxing and hardware setup to day-to-day usage, troubleshooting, and the latest system updates.

## Online Documentation

The help center is available at: **https://docs.stationpc.com**

- English: <https://docs.stationpc.com/docs>
- 简体中文: <https://docs.stationpc.com/zh/docs>

## What's Inside

| Section | What you'll find |
| --- | --- |
| Quick Start | Unboxing, hardware installation, and first-time setup for DA400 and other NAS devices |
| Tutorials | Step-by-step tutorials on common features and advanced usage |
| Troubleshooting | Solutions to common issues and error messages |
| Changelog | Release notes and system updates for StationOS Pro |
| Support | How to get in touch with our support team |

## Getting Support

If you need help beyond the documentation:

- **Help Center**: <https://docs.stationpc.com>
- **Website**: <https://www.stationpc.com>
- **StationNAS App**: available on the App Store, Google Play, and the StationPC website
- **Support Email**: service@stationipc.com

## Contributing & Local Development

This documentation site is built with [Next.js](https://nextjs.org/) and [Fumadocs](https://fumadocs.dev/).

To run it locally:

```bash
npm install
npm run dev
```

Then open <http://localhost:3000/docs> (English) or <http://localhost:3000/zh/docs> (简体中文).

For writers and contributors, see:

- [Fumadocs components writing guide](./docs/fumadocs-components.md)
- [Writing & publishing workflow](./docs/writing-workflow.md)

Before submitting changes, run `npm run types:check` and `npm run build`. Quality checks run automatically on push and pull requests.
