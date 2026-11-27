'use client';

import { usePathname } from 'next/navigation';
import DefaultSearchDialog from 'fumadocs-ui/components/dialog/search-default';
import type { ComponentProps } from 'react';
import { productSlugs } from '@/lib/products';

/**
 * 搜索框按当前路径所属产品域限定范围（merge-plan §2.4）。
 * `/zh/desktop/...` → `?scope=desktop`；站首页与非产品页 → 全站搜索。
 */
export function ScopedSearchDialog(props: ComponentProps<typeof DefaultSearchDialog>) {
  const pathname = usePathname();
  const scope = pathname.split('/').find((segment) => productSlugs.includes(segment as never));

  return <DefaultSearchDialog {...props} api={scope ? `/api/search?scope=${scope}` : '/api/search'} />;
}
