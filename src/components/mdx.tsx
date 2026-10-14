import defaultMdxComponents from 'fumadocs-ui/mdx';
import { ImageZoom } from 'fumadocs-ui/components/image-zoom';
import type { MDXComponents } from 'mdx/types';
import type { ImgHTMLAttributes } from 'react';

function ZoomedImage(props: ImgHTMLAttributes<HTMLImageElement>) {
  // 译文图片未本地化时 remark 编译期拿不到尺寸（onError: 'ignore'），
  // next/image 缺 width 会抛错导致整页 500，此处退化为普通 img
  // （HTTP 层由 next.config rewrite 回退到 /images/common/）
  if (!props.width || !props.height) {
    return <img {...props} />;
  }
  return <ImageZoom {...(props as Parameters<typeof ImageZoom>[0])} />;
}

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    img: ZoomedImage,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
