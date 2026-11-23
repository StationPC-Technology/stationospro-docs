import { NextRequest, NextFetchEvent, NextResponse } from 'next/server';
import { createI18nMiddleware } from 'fumadocs-core/i18n/middleware';
import { isMarkdownPreferred, rewritePath } from 'fumadocs-core/negotiation';
import { i18n } from '@/lib/i18n';
import { docsContentRoute } from '@/lib/shared';
import { productSlugs } from '@/lib/products';

// i18n middleware: with hideLocale='default-locale',
//   /desktop   -> rewrite to /en/desktop  (URL stays /desktop)
//   /zh/desktop -> served as-is
//   /en/desktop -> redirect to /desktop
const i18nMiddleware = createI18nMiddleware({
  defaultLanguage: i18n.defaultLanguage,
  languages: i18n.languages,
  hideLocale: i18n.hideLocale,
});

// Markdown rewrite for the `/llms.mdx/...` content route.
// The content route lives under `[lang]`, so rewrite targets must include the
// locale prefix (e.g. `/en/llms.mdx/desktop/faq/x/content.md`) to match the route.
//
// 站内没有 `/docs` 前缀了，但**不能**用一个 `{/*path}` 通配：那会把 `/`、`/zh`
// 这类非文档路径也改写成 content.md 请求（LLM 爬取首页会 404）。所以按内容根
// 逐个生成 pattern——产品线（desktop / portable）+ 站级页（policies / contact）。
const contentRoots = [...productSlugs, 'policies', 'contact'];

interface Rewriter {
  rewrite: (pathname: string) => string | false;
}

const rewriters = (suffix: boolean): Rewriter[] =>
  contentRoots.flatMap((root) =>
    suffix
      ? // `/desktop/faq/x.md`
        [
          rewritePath(`/:lang/${root}{/*path}.md`, `/:lang${docsContentRoute}/${root}{/*path}/content.md`),
          rewritePath(`/${root}{/*path}.md`, `/${i18n.defaultLanguage}${docsContentRoute}/${root}{/*path}/content.md`),
        ]
      : // `/desktop/faq/x`
        [
          rewritePath(`/:lang/${root}{/*path}`, `/:lang${docsContentRoute}/${root}{/*path}/content.md`),
          rewritePath(`/${root}{/*path}`, `/${i18n.defaultLanguage}${docsContentRoute}/${root}{/*path}/content.md`),
        ],
  );

const suffixRewriters = rewriters(true);
const preferredRewriters = rewriters(false);

function firstRewrite(writers: Rewriter[], pathname: string): string | undefined {
  for (const writer of writers) {
    const target = writer.rewrite(pathname);
    if (target) return target;
  }
  return undefined;
}

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  // 1. Handle `.md` suffix and markdown-preferred requests (e.g. LLM crawlers).
  //    Done before the i18n middleware because i18n would rewrite the path
  //    and short-circuit, preventing the markdown route from being reached.
  const mdTarget = firstRewrite(suffixRewriters, pathname);
  if (mdTarget) {
    return NextResponse.rewrite(new URL(mdTarget, request.nextUrl));
  }

  if (isMarkdownPreferred(request)) {
    const preferredTarget = firstRewrite(preferredRewriters, pathname);
    if (preferredTarget) {
      return NextResponse.rewrite(new URL(preferredTarget, request.nextUrl));
    }
  }

  // 2. Let i18n middleware handle locale negotiation (rewrite/redirect).
  const i18nResponse = i18nMiddleware(request, event);
  if (i18nResponse) return i18nResponse;

  return NextResponse.next();
}

export const config = {
  // Ignore `/_next/`, `/api/`, `/images/` (locale fallback is handled by
  // next.config rewrites, images must not go through locale negotiation),
  // and top-level route handlers that don't need locale handling.
  // Note: `.md` doc requests (e.g. `/desktop/faq/x.md`) MUST stay in the matcher
  // so the markdown rewrite above can handle them.
  matcher: ['/((?!api|images|_next/static|_next/image|favicon.ico|llms.txt|llms-full.txt).*)'],
};
