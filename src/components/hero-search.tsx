'use client';

import { useSearchContext } from 'fumadocs-ui/contexts/search';

/**
 * 首页的大搜索框。
 *
 * 视觉上是一个 56px 的输入框，但实际是按钮：点击打开 fumadocs 的搜索对话框，
 * 这样不必自己实现一套搜索（分词、快捷键、键盘导航都由 fumadocs 负责）。
 */
export function HeroSearch({ placeholder }: { placeholder: string }) {
  const { enabled, setOpenSearch } = useSearchContext();

  if (!enabled) return null;

  return (
    <button
      type="button"
      onClick={() => setOpenSearch(true)}
      className="group mx-auto mt-7 flex h-14 w-full max-w-2xl items-center gap-3 rounded-xl border bg-fd-card px-4 text-left shadow-sm transition-colors hover:border-fd-primary/40"
    >
      <span aria-hidden className="text-base text-fd-muted-foreground">
        ⌕
      </span>
      <span className="truncate text-[15px] text-fd-muted-foreground">{placeholder}</span>
      <kbd className="ml-auto shrink-0 rounded border bg-fd-muted px-1.5 py-0.5 font-sans text-[11px] text-fd-muted-foreground">
        Ctrl K
      </kbd>
    </button>
  );
}
