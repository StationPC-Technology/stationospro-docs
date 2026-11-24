import type { Locale } from './i18n';

/**
 * 站首页（/）的界面文案（8 语言）。
 *
 * 与 `product-labels.ts` 的分工：那里放「跨页面骨架」的短词（产品线名、进入文档、篇数），
 * 这里只放首页专有的句子与分区标题。页面正文仍然只在 content/docs/<lang>/**。
 */
export interface HomeScenario {
  /** 场景名，如「备份手机里的照片」 */
  label: string;
  /** 桌面式对应的页面 slug（语言无关） */
  desktop: string[];
  /** 便携式对应的页面 slug（语言无关） */
  portable: string[];
}

interface HomeStrings {
  kicker: string;
  title: string;
  lede: string;
  searchPlaceholder: string;
  browse: string;
  scenarios: string;
  scenariosHint: string;
  /** 与 `SCENARIO_LINKS` 一一对应 */
  scenarioLabels: string[];
  videos: string;
  videosMore: (n: number) => string;
  faq: string;
  faqMore: (n: number) => string;
  badges: { hot: string; recommended: string };
  footer: { changelog: string; compatible: string };
}

/**
 * 场景 → 两条产品线各自的落点。
 *
 * 只有 slug 是共享的（语言无关），文案在 `homeStrings[locale].scenarioLabels`。
 * slug 指向哪一页是内容决策：尽量选"同一件事在两个产品里最常被查的那篇"。
 */
const SCENARIO_LINKS: { desktop: string[]; portable: string[] }[] = [
  { desktop: ['desktop', 'app-guide', 'backup'], portable: ['portable', 'backup', 'create-cloud-backup'] },
  {
    desktop: ['desktop', 'app-guide', 'settings', 'remote-access'],
    portable: ['portable', 'guides', 'remote-access'],
  },
  {
    desktop: ['desktop', 'app-guide', 'settings', 'file-sharing-protocol'],
    portable: ['portable', 'file-service', 'access-samba-service'],
  },
  { desktop: ['desktop', 'app-guide', 'docker'], portable: ['portable', 'docker', 'app-center'] },
  { desktop: ['desktop', 'app-guide', 'files'], portable: ['portable', 'photos'] },
  {
    desktop: ['desktop', 'app-guide', 'settings', 'users'],
    portable: ['portable', 'guides', 'create-user'],
  },
];

const homeStrings: Record<Locale, HomeStrings> = {
  en: {
    kicker: 'Help center',
    title: 'Search first, then pick a product line',
    lede: 'Two systems with separate docs. Describe the problem instead of digging through the sidebar.',
    searchPlaceholder: 'Search all docs, e.g. "initialize", "SD card capacity", "WebDAV mount"',
    browse: 'Browse by product',
    scenarios: 'Browse by task',
    scenariosHint: 'Not sure which line?',
    scenarioLabels: [
      'Back up photos from your phone',
      'Access files away from home',
      'Mount the NAS as a network drive',
      'Run Docker apps',
      'View NAS photos on your phone',
      'Create accounts for family members',
    ],
    videos: 'Video tutorials',
    videosMore: (n) => `All ${n} videos →`,
    faq: 'FAQ',
    faqMore: (n) => `All ${n} questions →`,
    badges: { hot: 'Popular', recommended: 'Recommended' },
    footer: { changelog: 'Changelog', compatible: 'Compatibility' },
  },
  zh: {
    kicker: '帮助中心',
    title: '先搜，再进产品线',
    lede: '桌面式与便携式两套系统，文档分开维护。直接描述问题，比翻侧栏快。',
    searchPlaceholder: '搜索全部文档，例如「初始化」「SD 卡容量」「WebDAV 挂载」',
    browse: '按产品浏览',
    scenarios: '按场景找',
    scenariosHint: '不知道选哪条线？',
    scenarioLabels: [
      '备份手机里的照片',
      '在家以外访问 NAS 文件',
      '把 NAS 当电脑的共享盘',
      '跑 Docker 应用',
      '在手机上查看 NAS 里的照片',
      '给家人分账号、限制权限',
    ],
    videos: '视频教程',
    videosMore: (n) => `查看全部 ${n} 个 →`,
    faq: '常见问题',
    faqMore: (n) => `查看全部 ${n} 条 →`,
    badges: { hot: '热门', recommended: '推荐' },
    footer: { changelog: '更新日志', compatible: '兼容性列表' },
  },
  'zh-Hant': {
    kicker: '說明中心',
    title: '先搜，再進產品線',
    lede: '桌上型與可攜式兩套系統，文件分開維護。直接描述問題，比翻側邊欄快。',
    searchPlaceholder: '搜尋全部文件，例如「初始化」「SD 卡容量」「WebDAV 掛載」',
    browse: '依產品瀏覽',
    scenarios: '依情境找',
    scenariosHint: '不知道選哪條線？',
    scenarioLabels: [
      '備份手機裡的照片',
      '在家以外存取 NAS 檔案',
      '把 NAS 當電腦的網路磁碟',
      '跑 Docker 應用',
      '在手機上檢視 NAS 裡的照片',
      '給家人分帳號、限制權限',
    ],
    videos: '影片教學',
    videosMore: (n) => `查看全部 ${n} 支 →`,
    faq: '常見問題',
    faqMore: (n) => `查看全部 ${n} 條 →`,
    badges: { hot: '熱門', recommended: '推薦' },
    footer: { changelog: '更新記錄', compatible: '相容性清單' },
  },
  ja: {
    kicker: 'ヘルプセンター',
    title: 'まず検索、次に製品ライン',
    lede: 'デスクトップとポータブルの 2 系統で、ドキュメントも別々です。サイドバーをたどるより、問題をそのまま検索してください。',
    searchPlaceholder: 'すべてのドキュメントを検索（例:「初期化」「SD カード容量」「WebDAV マウント」）',
    browse: '製品から探す',
    scenarios: '用途から探す',
    scenariosHint: 'どちらのラインか分からない？',
    scenarioLabels: [
      'スマホの写真をバックアップ',
      '外出先から NAS のファイルにアクセス',
      'NAS をネットワークドライブとして使う',
      'Docker アプリを動かす',
      'スマホから NAS の写真を見る',
      '家族用のアカウントと権限を分ける',
    ],
    videos: '動画チュートリアル',
    videosMore: (n) => `全 ${n} 本を見る →`,
    faq: 'よくある質問',
    faqMore: (n) => `全 ${n} 件を見る →`,
    badges: { hot: '人気', recommended: 'おすすめ' },
    footer: { changelog: '更新履歴', compatible: '対応リスト' },
  },
  ko: {
    kicker: '도움말 센터',
    title: '먼저 검색, 그다음 제품 라인',
    lede: '데스크톱과 휴대용, 두 시스템의 문서가 따로 있습니다. 사이드바를 뒤지는 대신 문제를 그대로 검색하세요.',
    searchPlaceholder: '모든 문서 검색 (예: "초기화", "SD 카드 용량", "WebDAV 마운트")',
    browse: '제품별로 찾기',
    scenarios: '상황별로 찾기',
    scenariosHint: '어떤 라인인지 모르겠다면?',
    scenarioLabels: [
      '휴대폰 사진 백업',
      '외부에서 NAS 파일 접근',
      'NAS를 네트워크 드라이브로 사용',
      'Docker 앱 실행',
      '휴대폰에서 NAS 사진 보기',
      '가족 계정과 권한 분리',
    ],
    videos: '동영상 튜토리얼',
    videosMore: (n) => `전체 ${n}개 보기 →`,
    faq: '자주 묻는 질문',
    faqMore: (n) => `전체 ${n}개 보기 →`,
    badges: { hot: '인기', recommended: '추천' },
    footer: { changelog: '변경 기록', compatible: '호환성 목록' },
  },
  de: {
    kicker: 'Hilfe-Center',
    title: 'Erst suchen, dann Produktlinie wählen',
    lede: 'Zwei Systeme, zwei Doku-Sätze. Beschreiben Sie das Problem, statt die Seitenleiste zu durchsuchen.',
    searchPlaceholder: 'Alle Dokumente durchsuchen, z. B. „Initialisierung", „SD-Kartenkapazität", „WebDAV einbinden"',
    browse: 'Nach Produkt',
    scenarios: 'Nach Aufgabe',
    scenariosHint: 'Unsicher, welche Linie?',
    scenarioLabels: [
      'Fotos vom Smartphone sichern',
      'Von unterwegs auf NAS-Dateien zugreifen',
      'NAS als Netzlaufwerk einbinden',
      'Docker-Apps ausführen',
      'NAS-Fotos auf dem Smartphone ansehen',
      'Konten für Familienmitglieder anlegen',
    ],
    videos: 'Video-Tutorials',
    videosMore: (n) => `Alle ${n} Videos →`,
    faq: 'Häufige Fragen',
    faqMore: (n) => `Alle ${n} Fragen →`,
    badges: { hot: 'Beliebt', recommended: 'Empfohlen' },
    footer: { changelog: 'Änderungen', compatible: 'Kompatibilität' },
  },
  fr: {
    kicker: "Centre d'aide",
    title: "Chercher d'abord, choisir la gamme ensuite",
    lede: 'Deux systèmes, deux documentations. Décrivez le problème plutôt que de parcourir la barre latérale.',
    searchPlaceholder: 'Rechercher dans tous les documents, ex. « initialisation », « capacité SD », « montage WebDAV »',
    browse: 'Par produit',
    scenarios: 'Par besoin',
    scenariosHint: 'Vous hésitez ?',
    scenarioLabels: [
      'Sauvegarder les photos du téléphone',
      'Accéder aux fichiers hors du domicile',
      'Monter le NAS comme lecteur réseau',
      'Exécuter des applications Docker',
      'Consulter les photos du NAS sur mobile',
      'Créer des comptes pour la famille',
    ],
    videos: 'Tutoriels vidéo',
    videosMore: (n) => `Les ${n} vidéos →`,
    faq: 'Questions fréquentes',
    faqMore: (n) => `Les ${n} questions →`,
    badges: { hot: 'Populaire', recommended: 'Conseillé' },
    footer: { changelog: 'Nouveautés', compatible: 'Compatibilité' },
  },
  es: {
    kicker: 'Centro de ayuda',
    title: 'Busca primero, elige la línea después',
    lede: 'Dos sistemas con documentación separada. Describe el problema en lugar de recorrer la barra lateral.',
    searchPlaceholder: 'Buscar en todos los documentos, p. ej. «inicialización», «capacidad SD», «montaje WebDAV»',
    browse: 'Por producto',
    scenarios: 'Por tarea',
    scenariosHint: '¿No sabes cuál?',
    scenarioLabels: [
      'Copiar fotos del teléfono',
      'Acceder a los archivos fuera de casa',
      'Montar el NAS como unidad de red',
      'Ejecutar aplicaciones Docker',
      'Ver las fotos del NAS en el móvil',
      'Crear cuentas para la familia',
    ],
    videos: 'Tutoriales en vídeo',
    videosMore: (n) => `Los ${n} vídeos →`,
    faq: 'Preguntas frecuentes',
    faqMore: (n) => `Las ${n} preguntas →`,
    badges: { hot: 'Destacado', recommended: 'Recomendado' },
    footer: { changelog: 'Novedades', compatible: 'Compatibilidad' },
  },
};

export function getHomeStrings(locale: Locale | string): HomeStrings {
  return homeStrings[(locale as Locale) in homeStrings ? (locale as Locale) : 'en'];
}

/** 场景行：文案取当前语言，slug 全语言共享 */
export function getHomeScenarios(locale: Locale | string): HomeScenario[] {
  const labels = getHomeStrings(locale).scenarioLabels;
  return SCENARIO_LINKS.map((link, i) => ({
    label: labels[i] ?? link.desktop.join('/'),
    desktop: link.desktop,
    portable: link.portable,
  }));
}

/**
 * 首页视频块用到的 YouTube ID（键 = video_tutorial 下的页面文件名，小写）。
 *
 * 只存 ID，标题从页面树里取（已翻译），缩略图用 YouTube 的 mqdefault。
 * 详见 docs/merge-plan.md §2.2.1「视频教程」。
 */
export const HOME_VIDEO_IDS: Record<string, string> = {
  binding_settings: 'kHGx5_HkbJQ',
  ap_mode: 'LoRcy52atnk',
  'create-cloud-backup': 'YmWP-pGM1RU',
  'create-sd-backup': 'o4tQ3K4-hus',
  guest_wifi: 'lgGn_VM2A3w',
};

/**
 * 首页「常见问题」的固定选页（slug 语言无关，标题取页面树里的译文）。
 *
 * 选的是旧站 FAQ 里被标为热门/推荐的那几条，顺序即展示顺序；
 * 第一条当作「热门」，其余为「推荐」。
 */
export const HOME_FAQ_SLUGS: string[][] = [
  ['portable', 'faq', 'app-cannot-connect-device'],
  ['portable', 'faq', 'compatible-system'],
  ['portable', 'faq', 'bind-account-1'],
  ['portable', 'faq', 'android-backup-interrupt'],
  ['portable', 'faq', 'by-air'],
  ['portable', 'faq', 'external-storage-filesys'],
];
