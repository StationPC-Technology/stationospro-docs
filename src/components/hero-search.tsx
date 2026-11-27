'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, CornerDownLeft, Search, X } from 'lucide-react';
import { useDocsSearch } from 'fumadocs-core/search/client';

interface HotLink {
  label: string;
  href: string;
}

interface HeroSearchProps {
  /** 当前语言，搜索接口按它过滤索引 */
  locale: string;
  placeholder: string;
  hotSearch: string;
  noResults: string;
  clear: string;
  searchMore: string;
  hot: HotLink[];
}

/** 结果里的 `<mark>` 由 fumadocs 混排在正文里，这里按纯文本显示，只去掉标记本身 */
const plain = (content: string) => content.replace(/<\/?mark>/g, '');

/**
 * 更新日志按日期累积，命中关键词时数量最多，却几乎不是用户此刻要找的东西。
 * 排序时把它们压到操作指南后面，面板里先出现能照着做的页面。
 */
const isChangelog = (url: string) => url.split('/').includes('changelog');

/**
 * 站首页的大搜索框：直接在框里输入，结果就地展开，不再弹对话框。
 *
 * 搜索请求复用 fumadocs 的 `useDocsSearch`（同一套分词与 /api/search），
 * 键盘沿用对话框的习惯：↑↓ 选、Enter 进入、Esc 收起。
 */
export function HeroSearch({
  locale,
  placeholder,
  hotSearch,
  noResults,
  clear,
  searchMore,
  hot,
}: HeroSearchProps) {
  const router = useRouter();
  // 不带 locale 的话接口会按默认语言（en）查索引，中文关键词会全部落空
  const { search, setSearch, query } = useDocsSearch({ type: 'fetch', api: '/api/search', locale });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  // 输入法组字期间不展示结果、也不响应回车：中文按回车是「选字」，不能当成跳转
  const [composing, setComposing] = useState(false);
  // 面板先给 6 条，点「完整搜索」后在同一处展开全部命中
  const [expanded, setExpanded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // 展开全部结果时指针会正好落在新出现的那一行上，
  // 这里短暂忽略 hover，避免选中项被光标抢走
  const hoverLockRef = useRef(0);

  // 同一个页面会同时命中标题和若干正文片段（带 #锚点），按文档合并，标题优先用整页那条
  const results = useMemo(() => {
    if (!query.data || query.data === 'empty') return [];
    const merged = new Map<string, { url: string; title: string; crumbs: string[]; isPage: boolean }>();
    for (const item of query.data) {
      const key = item.url.split('#')[0]!;
      // 面包屑首段是站点名「帮助中心」，对判断位置没有帮助，去掉
      const crumbs = (item.breadcrumbs ?? []).slice(1);
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, { url: item.url, title: plain(item.content), crumbs, isPage: item.type === 'page' });
      } else if (item.type === 'page' && !existing.isPage) {
        merged.set(key, { url: key, title: plain(item.content), crumbs, isPage: true });
      }
    }
    const list = [...merged.values()].sort(
      (a, b) => Number(isChangelog(a.url)) - Number(isChangelog(b.url)),
    );
    // 有的页面只有正文命中、没有面包屑，标题又和别的页面重名；这类条目去掉，
    // 免得面板里出现两条同名却分不出来的结果
    const titled = new Set(list.filter((item) => item.crumbs.length > 0).map((item) => item.title));
    return list.filter((item) => item.crumbs.length > 0 || !titled.has(item.title));
  }, [query.data]);

  const hasQuery = search.trim().length > 0;
  const showPanel = open && hasQuery && !composing;
  const visible = expanded ? results : results.slice(0, 6);

  useEffect(() => {
    setActive(0);
    setExpanded(false);
  }, [search]);

  // 点页面其他地方收起结果
  useEffect(() => {
    if (!showPanel) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [showPanel]);

  // 展开全部命中后，键盘上下移动要把当前项滚进可见区域
  useEffect(() => {
    if (!expanded) return;
    document.getElementById(`hero-search-option-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, expanded]);

  // 服务端是「首次查询才建索引」，冷启动要一秒多。首页空闲时先把当前语言的
  // 索引焐热，用户真正输入时就不用等；同一会话只发一次。
  useEffect(() => {
    const key = `hero-search-warm:${locale}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
    } catch {
      // 隐私模式下 sessionStorage 可能不可用：照常预热，只是每次都发
    }

    const controller = new AbortController();
    const warm = () => {
      fetch(`/api/search?query=a&locale=${encodeURIComponent(locale)}&warm=1`, {
        signal: controller.signal,
      })
        .then(() => {
          try {
            window.sessionStorage.setItem(key, '1');
          } catch {
            // 存不下就下次再预热
          }
        })
        .catch(() => {
          // 预热失败不影响搜索本身，忽略
        });
    };

    const idle = window.requestIdleCallback?.(warm, { timeout: 500 });
    const timer = idle === undefined ? window.setTimeout(warm, 150) : undefined;

    return () => {
      controller.abort();
      if (idle !== undefined) window.cancelIdleCallback?.(idle);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [locale]);

  const go = (url: string) => {
    setOpen(false);
    inputRef.current?.blur();
    router.push(url);
  };

  // 展开后在原位继续看全部命中，query 与键盘选择都保留
  const expand = () => {
    hoverLockRef.current = Date.now() + 300;
    setActive(0);
    setExpanded(true);
    // 焦点留在输入框，展开后 ↑↓ 和 Esc 仍然能被输入框接住
    inputRef.current?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // 组字期间的回车属于输入法（选字/上屏），不能当成打开结果
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;

    if (event.key === 'Escape') {
      if (hasQuery) {
        setSearch('');
        setOpen(false);
      } else {
        inputRef.current?.blur();
      }
      return;
    }
    if (!showPanel || visible.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => (index + 1) % visible.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => (index - 1 + visible.length) % visible.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      // 结果还在路上时先不跳转，避免把上一次查询的命中当成这一次的结果
      if (query.isLoading) return;
      go(visible[Math.min(active, visible.length - 1)]!.url);
    }
  };

  return (
    <div
      ref={rootRef}
      className="mx-auto w-full max-w-[720px]"
      onKeyDown={(event) => {
        // 焦点在「查看全部结果」等按钮上时，Esc 也要能收起面板
        if (event.key !== 'Escape' || !showPanel || event.target === inputRef.current) return;
        event.preventDefault();
        setSearch('');
        setOpen(false);
      }}
    >
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-fd-muted-foreground"
        />
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={(event) => {
            setComposing(false);
            setSearch(event.currentTarget.value);
            setOpen(true);
          }}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          placeholder={placeholder}
          aria-label={placeholder}
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="hero-search-results"
          aria-autocomplete="list"
          aria-activedescendant={showPanel && visible[active] ? `hero-search-option-${active}` : undefined}
          className="h-14 w-full rounded-2xl border bg-white pr-11 pl-11 text-base text-fd-foreground shadow-sm outline-none transition-[border-color,box-shadow] duration-200 ease-out placeholder:text-fd-foreground/60 focus:shadow-md focus-visible:border-blue-600/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 motion-reduce:transition-none sm:h-[60px] dark:bg-fd-card dark:focus-visible:border-blue-400/60 dark:focus-visible:outline-blue-400"
        />
        {hasQuery && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setOpen(false);
              inputRef.current?.focus();
            }}
            aria-label={clear}
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1.5 text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 motion-reduce:transition-none dark:focus-visible:outline-blue-400"
          >
            <X className="size-4" />
          </button>
        )}

        {showPanel && (
          <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border bg-fd-popover shadow-xl">
            <div
              id="hero-search-results"
              role="listbox"
              className={
                expanded
                  ? 'max-h-[min(70vh,560px)] overflow-y-auto overscroll-contain py-1.5'
                  : 'py-1.5'
              }
            >
              {visible.length > 0 ? (
                visible.map((result, index) => (
                  <Link
                    key={result.url}
                    id={`hero-search-option-${index}`}
                    role="option"
                    aria-selected={index === active}
                    href={result.url}
                    onClick={() => setOpen(false)}
                    onMouseEnter={() => {
                      if (Date.now() < hoverLockRef.current) return;
                      setActive(index);
                    }}
                    className={`flex min-h-[52px] items-center gap-3 px-4 py-2 no-underline transition-colors motion-reduce:transition-none ${
                      index === active ? 'bg-fd-accent' : ''
                    }`}
                  >
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-sm text-fd-foreground/90">{result.title}</span>
                      {result.crumbs.length > 0 && (
                        <span className="truncate text-[11.5px] text-fd-foreground/60">
                          {result.crumbs.join(' › ')}
                        </span>
                      )}
                    </span>
                    <CornerDownLeft
                      aria-hidden
                      className={`ml-auto size-3.5 shrink-0 text-fd-foreground/60 ${index === active ? 'opacity-100' : 'opacity-0'}`}
                    />
                  </Link>
                ))
              ) : query.isLoading ? (
                // 冷启动那一下用骨架屏代替一个省略号，至少看得出在加载
                <div aria-hidden className="flex flex-col gap-2.5 px-4 py-3">
                  {[100, 82, 64].map((width) => (
                    <div
                      key={width}
                      className="h-3.5 animate-pulse rounded-full bg-fd-foreground/10"
                      style={{ width: `${width}%` }}
                    />
                  ))}
                </div>
              ) : (
                <p className="px-4 py-3 text-sm text-fd-foreground/70">{noResults}</p>
              )}
            </div>
            {/* 命中条数封顶在 6 条，其余在同一块面板里就地展开，query 不会丢 */}
            {!expanded && results.length > 6 && (
              <button
                type="button"
                onClick={expand}
                className="flex w-full items-center justify-between gap-3 border-t border-fd-border bg-fd-secondary/40 px-4 py-2.5 text-[12.5px] text-fd-foreground/70 transition-colors hover:bg-fd-accent hover:text-fd-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 motion-reduce:transition-none dark:focus-visible:outline-blue-400"
              >
                <span>{searchMore}</span>
                <ChevronDown aria-hidden className="size-4 shrink-0" />
              </button>
            )}
          </div>
        )}
      </div>

      {hot.length > 0 && (
        <div className="mt-3 flex flex-col items-center gap-2 text-[13px] text-fd-foreground/65 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-center sm:gap-x-4 sm:gap-y-1">
          <span className="shrink-0">{hotSearch}</span>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:flex sm:flex-wrap sm:gap-x-4 sm:gap-y-1">
            {hot.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded text-fd-foreground/80 underline decoration-fd-foreground/35 decoration-1 underline-offset-[3px] transition-colors hover:text-fd-foreground hover:decoration-fd-foreground/60 motion-reduce:transition-none"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
