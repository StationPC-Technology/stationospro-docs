// 站点语言 → Intl.Segmenter 的 BCP 47 语言：
// 简繁中文共用 zh 分词，日语/韩语各用原生分词（词粒度更准）。
const SEGMENTER_LOCALES: Record<string, string> = {
  zh: 'zh',
  'zh-Hant': 'zh',
  ja: 'ja',
  ko: 'ko',
};

const segmenters = new Map<string, Intl.Segmenter>();

function getSegmenter(siteLocale: string): Intl.Segmenter {
  const bcpLocale = SEGMENTER_LOCALES[siteLocale] ?? 'zh';
  let segmenter = segmenters.get(bcpLocale);
  if (!segmenter) {
    segmenter = new Intl.Segmenter(bcpLocale, { granularity: 'word' });
    segmenters.set(bcpLocale, segmenter);
  }
  return segmenter;
}

function addCjkSubtokens(token: string, output: Set<string>) {
  const characters = [...token];
  if (characters.length < 2) return;
  for (let index = 0; index < characters.length - 1; index += 1) {
    output.add(`${characters[index]}${characters[index + 1]}`);
  }
}

export interface CjkTokenizer {
  language: 'cjk';
  normalizationCache: Map<string, string>;
  tokenize(raw: string): string[];
}

const tokenizers = new Map<string, CjkTokenizer>();

/** 按站点语言返回 CJK 分词器（各语言独立 segmenter 与缓存）。 */
export function getCjkTokenizer(siteLocale: string): CjkTokenizer {
  let tokenizer = tokenizers.get(siteLocale);
  if (!tokenizer) {
    const segmenter = getSegmenter(siteLocale);
    tokenizer = {
      language: 'cjk',
      normalizationCache: new Map<string, string>(),
      tokenize(raw: string) {
        const output = new Set<string>();
        const normalized = raw.normalize('NFKC').toLocaleLowerCase();

        for (const segment of segmenter.segment(normalized)) {
          const token = segment.segment.trim();
          if (!token || (!segment.isWordLike && !/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(token))) {
            continue;
          }
          output.add(token);
          addCjkSubtokens(token, output);
        }

        return [...output];
      },
    };
    tokenizers.set(siteLocale, tokenizer);
  }
  return tokenizer;
}

/** 兼容旧引用：中文分词器。 */
export const cjkTokenizer = getCjkTokenizer('zh');
