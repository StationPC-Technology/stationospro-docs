import { RootProvider } from 'fumadocs-ui/provider/next';
import '../global.css';
import { i18nProvider } from 'fumadocs-ui/i18n';
import { translations } from '@/lib/layout.shared';
import { getLocaleConfig } from '@/lib/i18n';
import type { Metadata } from 'next';
import { siteUrl } from '@/lib/shared';
import { Analytics } from '@/components/analytics';

export const metadata: Metadata = {
  metadataBase: siteUrl,
};

export default async function Layout({ params, children }: LayoutProps<'/[lang]'>) {
  const { lang } = await params;
  const locale = getLocaleConfig(lang);

  return (
    <html
      lang={locale.tag}
      dir={locale.direction}
      className="font-sans"
      suppressHydrationWarning
    >
      <body className="flex flex-col min-h-screen">
        <RootProvider i18n={i18nProvider(translations, lang)}>
          <Analytics locale={lang} />
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
