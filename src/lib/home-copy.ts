import type { Locale } from './i18n';

/**
 * 站首页（/）的界面文案（8 语言）。
 *
 * 与 `product-labels.ts` 的分工：那里放「跨页面骨架」的短词（产品线名、进入文档、篇数），
 * 这里只放首页专有的句子与分区标题。页面正文仍然只在 content/docs/<lang>/**，
 * 模块卡片的标题与热门文档都取自页面树，不在这里手写。
 */
interface HomeStrings {
  searchPlaceholder: string;
  /** 搜索框下方的「热门搜索」引导 */
  hotSearch: string;
  /** 搜索无结果时的提示 */
  noResults: string;
  /** 清空输入框的按钮，读屏用 */
  clear: string;
  /** 结果面板底部「查看全部结果」按钮 */
  searchMore: string;
  /** 页首标题下的一句定位 */
  subtitle: string;
  faq: string;
  /** 常见问题的条目徽标：热门 / 推荐，配在 `home-faq.ts` 的条目上 */
  hotBadge: string;
  recommendBadge: string;
}

const homeStrings: Record<Locale, HomeStrings> = {
  en: {
    searchPlaceholder: 'Search all docs, e.g. "initialize"',
    hotSearch: 'Popular searches:',
    noResults: 'No matching documents',
    clear: 'Clear',
    searchMore: 'Show all results',
    subtitle: 'Installation, setup, backup and troubleshooting in one place',
    faq: 'FAQ',
    hotBadge: 'Popular',
    recommendBadge: 'Recommended',
  },
  zh: {
    searchPlaceholder: '搜索全部文档，例如「初始化」',
    hotSearch: '热门搜索：',
    noResults: '没有找到相关的文档',
    clear: '清除',
    searchMore: '查看全部结果',
    subtitle: '安装、设置、备份与故障排查，都在这里',
    faq: '常见问题',
    hotBadge: '热门',
    recommendBadge: '推荐',
  },
  'zh-Hant': {
    searchPlaceholder: '搜尋全部文件，例如「初始化」',
    hotSearch: '熱門搜尋：',
    noResults: '找不到相關文件',
    clear: '清除',
    searchMore: '檢視全部結果',
    subtitle: '安裝、設定、備份與疑難排解，都在這裡',
    faq: '常見問題',
    hotBadge: '熱門',
    recommendBadge: '推薦',
  },
  ja: {
    searchPlaceholder: 'ドキュメントを検索（例:「初期化」）',
    hotSearch: '人気の検索：',
    noResults: '該当するドキュメントがありません',
    clear: 'クリア',
    searchMore: 'すべての結果を表示',
    subtitle: 'インストール、設定、バックアップ、トラブルシューティングをまとめて',
    faq: 'よくある質問',
    hotBadge: '人気',
    recommendBadge: 'おすすめ',
  },
  ko: {
    searchPlaceholder: '문서 검색 (예: "초기화")',
    hotSearch: '인기 검색어:',
    noResults: '일치하는 문서가 없습니다',
    clear: '지우기',
    searchMore: '모든 결과 보기',
    subtitle: '설치, 설정, 백업, 문제 해결을 한곳에서',
    faq: '자주 묻는 질문',
    hotBadge: '인기',
    recommendBadge: '추천',
  },
  de: {
    searchPlaceholder: 'Alle Dokumente durchsuchen, z. B. „Initialisierung"',
    hotSearch: 'Beliebte Suchbegriffe:',
    noResults: 'Keine passenden Dokumente gefunden',
    clear: 'Löschen',
    searchMore: 'Alle Ergebnisse anzeigen',
    subtitle: 'Installation, Einrichtung, Backup und Fehlerbehebung an einem Ort',
    faq: 'Häufige Fragen',
    hotBadge: 'Beliebt',
    recommendBadge: 'Empfohlen',
  },
  fr: {
    searchPlaceholder: 'Rechercher dans les documents, ex. « initialisation »',
    hotSearch: 'Recherches populaires :',
    noResults: 'Aucun document correspondant',
    clear: 'Effacer',
    searchMore: 'Afficher tous les résultats',
    subtitle: 'Installation, configuration, sauvegarde et dépannage au même endroit',
    faq: 'Questions fréquentes',
    hotBadge: 'Populaire',
    recommendBadge: 'Recommandé',
  },
  es: {
    searchPlaceholder: 'Buscar en los documentos, p. ej. «inicialización»',
    hotSearch: 'Búsquedas populares:',
    noResults: 'No se encontraron documentos',
    clear: 'Borrar',
    searchMore: 'Mostrar todos los resultados',
    subtitle: 'Instalación, configuración, copias y solución de problemas en un solo lugar',
    faq: 'Preguntas frecuentes',
    hotBadge: 'Destacado',
    recommendBadge: 'Recomendado',
  },
};

export function getHomeStrings(locale: Locale | string): HomeStrings {
  return homeStrings[(locale as Locale) in homeStrings ? (locale as Locale) : 'en'];
}
