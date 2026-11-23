import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';
import { localeConfigs } from '@/lib/i18n';
import { getCjkTokenizer } from '@/lib/search-tokenizers';
import { productSlugs } from '@/lib/products';

const search = createFromSource(source, {
  localeMap: Object.fromEntries(
    localeConfigs.map((locale) => [
      locale.id,
      locale.search === 'cjk' ? { tokenizer: getCjkTokenizer(locale.id) } : locale.search,
    ]),
  ),
});

type SearchRecord = { url?: string };

/**
 * 单索引 + 按产品域过滤（merge-plan §2.4）：
 * 带 `?scope=desktop|portable` 时只返回该产品线下的结果，
 * 不带 scope 则是全站搜索（首页与"搜索全站"入口用）。
 */
function inScope(url: string | undefined, scope: string) {
  if (!url) return false;
  return url.split('/').includes(scope);
}

export async function GET(request: Request) {
  const scope = new URL(request.url).searchParams.get('scope');
  const response = await search.GET(request);
  if (!scope || !productSlugs.includes(scope as never) || !response.ok) return response;

  const records: SearchRecord[] = await response.json();
  if (!Array.isArray(records)) return response;

  return Response.json(records.filter((record) => inScope(record.url, scope)));
}
