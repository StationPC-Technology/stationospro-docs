'use client';

import { CirclePlay } from 'lucide-react';
import { useState } from 'react';

/**
 * 首页视频卡的缩略图：取 YouTube 的 mqdefault（16:9）。
 *
 * 缩略图在 i.ytimg.com，访问不到时换成中性占位（播放图标），不让卡片露出破图；
 * 页面标题仍指向对应的 video_tutorial 页面。
 */
export function VideoThumb({ videoId, featured = false }: { videoId: string; featured?: boolean }) {
  const [failed, setFailed] = useState(false);

  return (
    <span
      className={`relative block aspect-video w-full overflow-hidden rounded-xl bg-fd-muted sm:rounded-2xl dark:ring-1 dark:ring-white/10 ${
        failed ? 'border border-dashed border-fd-border' : ''
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {!failed && (
        <img
          src={`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transition-none"
        />
      )}
      {/* 播放键压在左下角：缩略图自带的标题文字多半在右侧和顶部，不盖住 */}
      <span
        aria-hidden
        className={`absolute bottom-3 left-3 flex items-center justify-center rounded-full text-white ${
          featured
            ? 'size-11 bg-black/65 sm:size-12'
            : 'size-8 bg-black/60 opacity-0 group-hover:opacity-100 motion-reduce:transition-none'
        }`}
      >
        <CirclePlay className={featured ? 'size-7' : 'size-5'} strokeWidth={1.5} />
      </span>
    </span>
  );
}
