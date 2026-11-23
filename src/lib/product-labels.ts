import type { Locale } from './i18n';

/**
 * 产品线与站点骨架的界面文案（8 语言）。
 *
 * 只放"站点骨架"用到的短词：产品线名称、进入文档、跨产品引导、站首页文案。
 * 页面正文与卡片文案一律走 content/docs/<lang>/**，不进这里。
 */
interface ProductLabels {
  /** 产品线名称：桌面式 NAS / 便携式 NAS */
  line: Record<'desktop' | 'portable', string>;
  /** 「进入文档」 */
  enter: string;
  /** 「还在找 {其他产品线}？」 */
  lookingFor: (name: string) => string;
  /** 落地页卡片下方的分组统计单位，如「12 篇文档」 */
  docsCount: (n: number) => string;
  /** 站首页（/）文案 */
  hub: {
    title: string;
    subtitle: string;
    policies: string;
    contact: string;
  };
}

export const productLabels: Record<Locale, ProductLabels> = {
  en: {
    line: { desktop: 'Desktop NAS', portable: 'Portable NAS' },
    enter: 'Open docs',
    lookingFor: (name) => `Looking for ${name}?`,
    docsCount: (n) => `${n} articles`,
    hub: {
      title: 'StationPC Help Center',
      subtitle: 'Pick your product line to open its documentation.',
      policies: 'Legal & Privacy',
      contact: 'Contact us',
    },
  },
  zh: {
    line: { desktop: '桌面式 NAS', portable: '便携式 NAS' },
    enter: '进入文档',
    lookingFor: (name) => `还在找${name}？`,
    docsCount: (n) => `${n} 篇文档`,
    hub: {
      title: 'StationPC 帮助中心',
      subtitle: '先选择产品线，再进入对应的使用文档。',
      policies: '法务与隐私',
      contact: '联系我们',
    },
  },
  'zh-Hant': {
    line: { desktop: '桌上型 NAS', portable: '可攜式 NAS' },
    enter: '進入文件',
    lookingFor: (name) => `還在找${name}？`,
    docsCount: (n) => `${n} 篇文件`,
    hub: {
      title: 'StationPC 說明中心',
      subtitle: '先選擇產品線，再進入對應的使用文件。',
      policies: '法務與隱私',
      contact: '聯絡我們',
    },
  },
  ja: {
    line: { desktop: 'デスクトップNAS', portable: 'ポータブルNAS' },
    enter: 'ドキュメントを見る',
    lookingFor: (name) => `${name}をお探しですか？`,
    docsCount: (n) => `${n} 件の記事`,
    hub: {
      title: 'StationPC ヘルプセンター',
      subtitle: '製品ラインを選択して、ドキュメントを開いてください。',
      policies: '法務とプライバシー',
      contact: 'お問い合わせ',
    },
  },
  ko: {
    line: { desktop: '데스크톱 NAS', portable: '휴대용 NAS' },
    enter: '문서 보기',
    lookingFor: (name) => `${name}을(를) 찾고 계신가요?`,
    docsCount: (n) => `문서 ${n}개`,
    hub: {
      title: 'StationPC 도움말 센터',
      subtitle: '제품 라인을 선택한 뒤 해당 문서로 이동하세요.',
      policies: '법적 고지 및 개인정보',
      contact: '문의하기',
    },
  },
  de: {
    line: { desktop: 'Desktop-NAS', portable: 'tragbares NAS' },
    enter: 'Zu den Dokumenten',
    lookingFor: (name) => `Sie suchen ${name}?`,
    docsCount: (n) => `${n} Artikel`,
    hub: {
      title: 'StationPC Hilfe-Center',
      subtitle: 'Wählen Sie Ihre Produktlinie, um die Dokumentation zu öffnen.',
      policies: 'Rechtliches & Datenschutz',
      contact: 'Kontakt',
    },
  },
  fr: {
    line: { desktop: 'NAS de bureau', portable: 'NAS portable' },
    enter: 'Voir la documentation',
    lookingFor: (name) => `Vous cherchez ${name} ?`,
    docsCount: (n) => `${n} articles`,
    hub: {
      title: 'Centre d’aide StationPC',
      subtitle: 'Choisissez votre gamme de produits pour ouvrir la documentation.',
      policies: 'Mentions légales et confidentialité',
      contact: 'Nous contacter',
    },
  },
  es: {
    line: { desktop: 'NAS de escritorio', portable: 'NAS portátil' },
    enter: 'Ver la documentación',
    lookingFor: (name) => `¿Busca ${name}?`,
    docsCount: (n) => `${n} artículos`,
    hub: {
      title: 'Centro de ayuda de StationPC',
      subtitle: 'Elija su línea de producto para abrir la documentación.',
      policies: 'Aviso legal y privacidad',
      contact: 'Contacto',
    },
  },
};

export function getProductLabels(locale: string): ProductLabels {
  return productLabels[locale as Locale] ?? productLabels.en;
}
