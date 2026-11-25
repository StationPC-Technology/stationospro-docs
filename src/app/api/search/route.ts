import { defaultLanguage, languages } from '@/lib/i18n';
import { productSlugs } from '@/lib/products';
import { getSearchAPI } from '@/lib/search-api';

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

/**
 * 搜索接口按 `?locale=` 取语言，只构建该语言的索引（见 `@/lib/search-api`）。
 * `?warm=1` 不返回结果，只用来在空闲时先把索引建好，见首页搜索框的预热请求。
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const scope = url.searchParams.get('scope');
  const locale = url.searchParams.get('locale');
  const search = getSearchAPI(locale && languages.includes(locale) ? locale : defaultLanguage);

  if (url.searchParams.get('warm') === '1') {
    // 任意 query 都会触发建索引；结果没人要，省一次序列化
    await search.search('a');
    return Response.json([]);
  }

  const response = await search.GET(request);
  if (!scope || !productSlugs.includes(scope as never) || !response.ok) return response;

  const records: SearchRecord[] = await response.json();
  if (!Array.isArray(records)) return response;

  return Response.json(records.filter((record) => inScope(record.url, scope)));
}
