import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import lastModified from 'fumadocs-mdx/plugins/last-modified';

// You can customize Zod schemas for frontmatter and `meta.json` here
// see https://fumadocs.dev/docs/mdx/collections
export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: pageSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

export default defineConfig({
  plugins: [lastModified()],
  mdxOptions: {
    // 图片不做构建期静态导入：译文统一引用 /images/<语言>/...，本地化图片
    // 不存在时由 next.config 的 afterFiles rewrite 回退到 /images/common/，
    // 因此构建期不能要求文件存在（useImport:false + onError:'ignore'）。
    // 文件存在时仍会附带 width/height，减少布局偏移。
    remarkImageOptions: { useImport: false, onError: 'ignore' },
  },
});
