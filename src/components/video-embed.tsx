/**
 * 视频嵌入：取代旧站 VuePress 的 `<VideoEmbed>`。
 *
 * 旧站用法：`<VideoEmbed src="https://www.youtube.com/embed/xxx" loaderText="视频加载中..." />`
 * 文档主要面向海外用户，YouTube 嵌入原样保留（见 docs/adr 与 merge-plan §2.6）。
 */
export function VideoEmbed({
  src,
  title,
  loaderText,
}: {
  src: string;
  title?: string;
  loaderText?: string;
}) {
  // 从 embed 地址推出可点开的观看地址，iframe 被地区限制时仍有出口
  const watchUrl = src.includes('youtube.com/embed/')
    ? `https://www.youtube.com/watch?v=${src.split('/embed/')[1]?.split(/[?&]/)[0]}`
    : src;

  return (
    <figure className="not-prose my-6 overflow-hidden rounded-xl border bg-fd-card">
      <div className="relative aspect-video w-full bg-black">
        <iframe
          src={src}
          title={title ?? 'Video'}
          className="absolute inset-0 h-full w-full"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      <figcaption className="flex items-center justify-between gap-3 px-3 py-2 text-xs text-fd-muted-foreground">
        <span>{loaderText || title || ''}</span>
        <a href={watchUrl} target="_blank" rel="noreferrer" className="shrink-0 hover:text-fd-foreground">
          YouTube ↗
        </a>
      </figcaption>
    </figure>
  );
}
