/**
 * 服务启动后在后台把常用语言的搜索索引先建好。
 *
 * 索引是「首次查询才构建」的：单语言约 1 秒，但在建好之前进来的搜索都要排队
 * 等它，第一个访客会觉得搜索卡住。这里启动后立刻开始构建源语言与默认语言，
 * 不阻塞启动；构建失败的后果只是退回到按需构建，因此只记日志。
 */
export async function register() {
  // instrumentation 也会在 edge runtime（middleware）里执行，搜索索引只能在 Node 里建
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  // 开发模式下搜索索引不共享（内容会热更新），预热只会白费 CPU
  if (process.env.NODE_ENV === 'development') return;

  const [{ getSearchAPI }, { defaultLanguage, sourceLanguage }] = await Promise.all([
    import('@/lib/search-api'),
    import('@/lib/i18n'),
  ]);

  // 不 await：后台建索引，别拖慢启动；两种语言顺序建，避免抢 CPU
  void (async () => {
    for (const locale of new Set([sourceLanguage, defaultLanguage])) {
      try {
        await getSearchAPI(locale).search('a');
      } catch (error) {
        console.warn(`[search] ${locale} 索引预热失败，将在首次查询时重建`, error);
      }
    }
  })();
}
