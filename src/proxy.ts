import { NextRequest, NextFetchEvent, NextResponse } from 'next/server';
import { createI18nMiddleware } from 'fumadocs-core/i18n/middleware';
import { isMarkdownPreferred, rewritePath } from 'fumadocs-core/negotiation';
import { i18n } from '@/lib/i18n';
import { docsContentRoute, docsRoute } from '@/lib/shared';

// i18n middleware: with hideLocale='default-locale',
//   /docs      -> rewrite to /en/docs  (URL stays /docs)
//   /zh/docs   -> served as-is
//   /en/docs   -> redirect to /docs
const i18nMiddleware = createI18nMiddleware({
  defaultLanguage: i18n.defaultLanguage,
  languages: i18n.languages,
  hideLocale: i18n.hideLocale,
});

// Markdown rewrite for the `/llms.mdx/...` content route.
// The content route lives under `[lang]`, so rewrite targets must include the
// locale prefix (e.g. `/en/llms.mdx/docs/.../content.md`) to match the route.
// A docs page may be requested as `/docs/x` (default locale) or `/zh/docs/x`.
const { rewrite: rewriteDocsPrefixed } = rewritePath(
  `/:lang${docsRoute}{/*path}`,
  `/:lang${docsContentRoute}{/*path}/content.md`,
);
const { rewrite: rewriteDocsDefault } = rewritePath(
  `${docsRoute}{/*path}`,
  `/${i18n.defaultLanguage}${docsContentRoute}{/*path}/content.md`,
);
const { rewrite: rewriteSuffixPrefixed } = rewritePath(
  `/:lang${docsRoute}{/*path}.md`,
  `/:lang${docsContentRoute}{/*path}/content.md`,
);
const { rewrite: rewriteSuffixDefault } = rewritePath(
  `${docsRoute}{/*path}.md`,
  `/${i18n.defaultLanguage}${docsContentRoute}{/*path}/content.md`,
);

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  // 1. Handle `.md` suffix and markdown-preferred requests (e.g. LLM crawlers).
  //    Done before the i18n middleware because i18n would rewrite the path
  //    and short-circuit, preventing the markdown route from being reached.
  let mdTarget = rewriteSuffixPrefixed(pathname);
  if (!mdTarget) mdTarget = rewriteSuffixDefault(pathname);
  if (mdTarget) {
    return NextResponse.rewrite(new URL(mdTarget, request.nextUrl));
  }

  if (isMarkdownPreferred(request)) {
    let mdDocsTarget = rewriteDocsPrefixed(pathname);
    if (!mdDocsTarget) mdDocsTarget = rewriteDocsDefault(pathname);
    if (mdDocsTarget) {
      return NextResponse.rewrite(new URL(mdDocsTarget, request.nextUrl));
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
  // Note: `.md` doc requests (e.g. `/docs.md`) MUST stay in the matcher
  // so the markdown rewrite above can handle them.
  matcher: ['/((?!api|images|_next/static|_next/image|favicon.ico|llms.txt|llms-full.txt).*)'],
};
