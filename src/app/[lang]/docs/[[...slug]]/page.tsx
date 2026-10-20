import { getPageImage, getPageMarkdownUrl, source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  PageLastUpdate,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/docs/page';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/components/mdx';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { gitConfig } from '@/lib/shared';
import { localeConfigs } from '@/lib/i18n';
import { baseOptions } from '@/lib/layout.shared';
import { Feedback } from '@/components/feedback-adapter';

export default async function Page(props: PageProps<'/[lang]/docs/[[...slug]]'>) {
  const params = await props.params;
  const page = source.getPage(params.slug, params.lang);
  if (!page) notFound();

  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page).url;
  const standalone = params.slug?.[0] === 'policies';
  const layoutOptions = {
    ...baseOptions(params.lang),
    ...(standalone ? { sidebar: { enabled: false }, nav: { enabled: false } } : {}),
  };

  return (
    <DocsLayout
      tree={source.getPageTree(params.lang)}
      {...layoutOptions}
    >
      <DocsPage
        toc={page.data.toc}
        full={standalone || page.data.full}
        tableOfContent={standalone ? { enabled: false } : undefined}
        tableOfContentPopover={standalone ? { enabled: false } : undefined}
      >
        <DocsTitle>{page.data.title}</DocsTitle>
        <DocsDescription className="mb-0">
          {page.data.description}
        </DocsDescription>
        <div className="flex flex-row gap-2 items-center border-b pb-6">
          <MarkdownCopyButton markdownUrl={markdownUrl} />
          <ViewOptionsPopover
            markdownUrl={markdownUrl}
            githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/content/docs/${page.path}`}
          />
        </div>
        <DocsBody>
          <MDX
            components={getMDXComponents({
              // this allows you to link to other pages with relative file paths
              a: createRelativeLink(source, page),
            })}
          />
        </DocsBody>
        <Feedback locale={params.lang} path={page.url} title={page.data.title} />
        {page.data.lastModified && (
          <PageLastUpdate date={page.data.lastModified} />
        )}
      </DocsPage>
    </DocsLayout>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(
  props: PageProps<'/[lang]/docs/[[...slug]]'>,
): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug, params.lang);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
    alternates: {
      canonical: page.url,
      languages: Object.fromEntries([
        ...localeConfigs.flatMap((locale) => {
          const localizedPage = source.getPage(params.slug, locale.id);
          if (!localizedPage) return [];
          return [[locale.tag, localizedPage.url] as const];
        }),
        ['x-default', source.getPage(params.slug, 'en')?.url ?? page.url],
      ]),
    },
    openGraph: {
      images: getPageImage(page).url,
    },
  };
}
