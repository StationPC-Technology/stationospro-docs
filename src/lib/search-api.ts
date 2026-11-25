import { createFromSource } from 'fumadocs-core/search/server';
import { getLocaleConfig } from '@/lib/i18n';
import { getCjkTokenizer } from '@/lib/search-tokenizers';
import { source } from '@/lib/source';

type SearchAPI = ReturnType<typeof createFromSource>;

/**
 * 每个语言一套索引，按需构建。
 *
 * fumadocs 的 `createFromSource` 在第一次查询时会把 loader 里的**所有语言**
 * 一次建完（8 种语言约 10 秒），但一次访问只会查一种语言。这里给每种语言
 * 派生一个只交出该语言页面的 loader，并隐藏 `_i18n`，让 fumadocs 走单语言
 * 分支——冷启动从约 10 秒降到约 1 秒，之后常驻内存。
 *
 * 索引缓存在 globalThis 上：`src/instrumentation.ts` 与路由处理器是分别打包
 * 的，模块级变量不共享，启动预热建好的索引才不会白建。开发模式下内容会热
 * 更新，改用模块级缓存，避免命中旧内容的索引。
 */
declare global {
  // eslint-disable-next-line no-var
  var __stationpcSearchAPIs: Map<string, SearchAPI> | undefined;
}

const searchAPIs =
  process.env.NODE_ENV === 'development'
    ? new Map<string, SearchAPI>()
    : (globalThis.__stationpcSearchAPIs ??= new Map<string, SearchAPI>());

function loaderFor(locale: string): typeof source {
  // Object.create 保留 pageTree/getPageTree 等原型方法，只覆盖取页面的入口
  const scoped = Object.create(source) as typeof source;
  scoped.getPages = () => source.getPages(locale);
  // 有 _i18n 时 fumadocs 会建全部语言的索引；这里显式置空走单语言分支
  Object.defineProperty(scoped, '_i18n', { value: undefined });
  return scoped;
}

function createSearchAPI(locale: string): SearchAPI {
  const config = getLocaleConfig(locale);
  const options =
    config.search === 'cjk'
      ? { tokenizer: getCjkTokenizer(locale) }
      : { language: config.search as 'english' };

  return createFromSource(loaderFor(locale), options);
}

/** 取该语言的搜索索引；第一次调用会花约 1 秒建索引，之后直接复用。 */
export function getSearchAPI(locale: string): SearchAPI {
  let api = searchAPIs.get(locale);
  if (!api) {
    api = createSearchAPI(locale);
    searchAPIs.set(locale, api);
  }
  return api;
}
