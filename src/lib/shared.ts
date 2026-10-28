export const appName = 'StationPC';
export const docsRoute = '/docs';
export const docsImageRoute = '/og/docs';
export const docsContentRoute = '/llms.mdx/docs';
export const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000');

export const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

// fill this with your actual GitHub info, for example:
export const gitConfig = {
  user: 'StationPC-Technology',
  repo: 'stationospro-docs',
  branch: 'main',
};
