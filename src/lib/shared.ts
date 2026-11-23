export const appName = 'StationPC';
// 帮助中心不再有 `/docs` 前缀：产品线直接作为一级段（/desktop/**、/portable/**），
// 站级页面是 /（首页）、/policies/*、/contact。见 docs/adr/0006-drop-docs-url-prefix.md。
export const docsRoute = '';
export const docsImageRoute = '/og';
export const docsContentRoute = '/llms.mdx';
export const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000');

export const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

// fill this with your actual GitHub info, for example:
export const gitConfig = {
  user: 'StationPC-Technology',
  repo: 'stationospro-docs',
  branch: 'main',
};
