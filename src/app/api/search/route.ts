import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';
import { localeConfigs } from '@/lib/i18n';
import { getCjkTokenizer } from '@/lib/search-tokenizers';

export const { GET } = createFromSource(source, {
  localeMap: Object.fromEntries(
    localeConfigs.map((locale) => [
      locale.id,
      locale.search === 'cjk' ? { tokenizer: getCjkTokenizer(locale.id) } : locale.search,
    ]),
  ),
});
