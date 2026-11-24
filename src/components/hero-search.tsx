'use client';

import { Search } from 'lucide-react';
import { useSearchContext } from 'fumadocs-ui/contexts/search';

/**
 * 站首页的大搜索框。
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
      className="group mx-auto flex h-14 w-full max-w-[720px] items-center gap-3 rounded-2xl border bg-white px-4 text-left transition-[border-color,box-shadow,transform] duration-200 ease-out hover:border-blue-600/50 hover:shadow-md active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 motion-reduce:transition-none motion-reduce:active:scale-100 sm:h-[60px] sm:px-5 dark:bg-fd-card dark:hover:border-blue-400/50 dark:focus-visible:outline-blue-400"
    >
      <Search className="size-[18px] shrink-0 text-fd-muted-foreground transition-colors group-hover:text-blue-600 motion-reduce:transition-none dark:group-hover:text-blue-400" />
      <span className="truncate text-[15px] text-fd-foreground/60 sm:text-base">{placeholder}</span>
      <kbd className="ml-auto hidden shrink-0 rounded-md border bg-fd-background px-1.5 py-0.5 font-sans text-xs text-fd-foreground/60 sm:block">
        Ctrl K
      </kbd>
    </button>
  );
}
