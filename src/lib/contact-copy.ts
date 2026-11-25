export interface ContactItem {
  /** 渠道名，例如「官网」「支持邮箱」 */
  label: string;
  /** 链接前的文字 */
  pre: string;
  /** 链接文字，缺省表示该条没有链接 */
  linkText?: string;
  href?: string;
  /** 链接后的文字 */
  post: string;
}

export interface ContactStrings {
  intro: string;
  platform: string;
  items: ContactItem[];
  feedback: string;
  feedbackItems: ContactItem[];
}

const OFFICIAL = 'https://www.stationpc.com';
const COMMUNITY = 'https://community.stationpc.com/';
const DISCORD = 'https://discord.gg/R9acnGtDnP';

const COPY: Record<string, ContactStrings> = {
  zh: {
    intro:
      '若您在使用产品过程中需要帮助、有功能疑问或意见反馈，可通过以下渠道与我们取得联系，我们将及时为您提供支持。',
    platform: '官方平台',
    items: [
      { label: '官网', pre: '访问', linkText: 'StationPC 官网', href: OFFICIAL, post: '，获取产品最新动态' },
      { label: '支持邮箱', pre: '发送邮件至 support@stationpc.com，我们将在 2 个工作日内回复', post: '' },
      {
        label: '社区',
        pre: '访问',
        linkText: 'StationPC 社区',
        href: COMMUNITY,
        post: '，查看版本更新、功能排期与常见问题解答，分享使用心得与玩法，交流产品相关问题',
      },
    ],
    feedback: '技术交流与反馈',
    feedbackItems: [
      {
        label: 'Discord 技术讨论组',
        pre: '加入',
        linkText: 'Discord 社群',
        href: DISCORD,
        post: '，与官方技术团队、其他用户实时交流功能问题、分享使用经验，也可直接提交意见反馈，获取更快速的技术支持。',
      },
      { label: '参与内测组', pre: '加入内测组，抢先体验新功能。', post: '' },
    ],
  },
  en: {
    intro:
      'If you need help, have a feature question, or want to share feedback while using our products, reach us through the channels below. We will get back to you as soon as possible.',
    platform: 'Official channels',
    items: [
      { label: 'Website', pre: 'Visit the', linkText: 'StationPC website', href: OFFICIAL, post: ' for the latest product news' },
      { label: 'Support email', pre: 'Email support@stationpc.com and we will reply within 2 business days', post: '' },
      {
        label: 'Community',
        pre: 'Join the',
        linkText: 'StationPC community',
        href: COMMUNITY,
        post: ' for release notes, roadmap, FAQs, tips and product discussions',
      },
    ],
    feedback: 'Technical discussion and feedback',
    feedbackItems: [
      {
        label: 'Discord',
        pre: 'Join our',
        linkText: 'Discord server',
        href: DISCORD,
        post: ' to talk with the engineering team and other users in real time, or file feedback for faster support.',
      },
      { label: 'Beta program', pre: 'Join the beta group to try new features early.', post: '' },
    ],
  },
  'zh-Hant': {
    intro:
      '若您在使用產品過程中需要協助、有功能疑問或意見回饋，可透過以下管道與我們聯繫，我們將儘速為您提供支援。',
    platform: '官方平台',
    items: [
      { label: '官網', pre: '前往', linkText: 'StationPC 官網', href: OFFICIAL, post: '，取得產品最新動態' },
      { label: '支援信箱', pre: '寄送郵件至 support@stationpc.com，我們將於 2 個工作天內回覆', post: '' },
      {
        label: '社群',
        pre: '前往',
        linkText: 'StationPC 社群',
        href: COMMUNITY,
        post: '，查看版本更新、功能排程與常見問題解答，分享使用心得與玩法，交流產品相關問題',
      },
    ],
    feedback: '技術交流與回饋',
    feedbackItems: [
      {
        label: 'Discord 技術討論群',
        pre: '加入',
        linkText: 'Discord 社群',
        href: DISCORD,
        post: '，與官方技術團隊、其他使用者即時交流功能問題、分享使用經驗，也可直接提交意見回饋，取得更快速的技術支援。',
      },
      { label: '參與內測群', pre: '加入內測群，搶先體驗新功能。', post: '' },
    ],
  },
  ja: {
    intro:
      '製品のご利用中にサポートが必要な場合、機能に関するご質問やご意見がある場合は、以下の窓口からお問い合わせください。できるだけ早く回答いたします。',
    platform: '公式窓口',
    items: [
      { label: '公式サイト', pre: '', linkText: 'StationPC 公式サイト', href: OFFICIAL, post: 'で最新情報をご確認いただけます' },
      { label: 'サポート窓口', pre: 'support@stationpc.com までメールをお送りください。2 営業日以内に返信いたします', post: '' },
      {
        label: 'コミュニティ',
        pre: '',
        linkText: 'StationPC コミュニティ',
        href: COMMUNITY,
        post: 'では、リリース情報、ロードマップ、FAQ、活用事例を確認できます',
      },
    ],
    feedback: '技術的な議論とフィードバック',
    feedbackItems: [
      {
        label: 'Discord',
        pre: '',
        linkText: 'Discord サーバー',
        href: DISCORD,
        post: 'に参加すると、開発チームや他のユーザーとリアルタイムで情報交換でき、フィードバックも直接送れます。',
      },
      { label: 'ベータプログラム', pre: 'ベータグループに参加すると、新機能をいち早く試せます。', post: '' },
    ],
  },
  ko: {
    intro:
      '제품 사용 중 도움이 필요하거나 기능 관련 문의, 의견이 있으시면 아래 채널로 연락해 주세요. 최대한 빠르게 답변드리겠습니다.',
    platform: '공식 채널',
    items: [
      { label: '공식 사이트', pre: '', linkText: 'StationPC 공식 사이트', href: OFFICIAL, post: '에서 최신 소식을 확인하세요' },
      { label: '지원 이메일', pre: 'support@stationpc.com 으로 메일을 보내주시면 영업일 기준 2일 이내에 답변드립니다', post: '' },
      {
        label: '커뮤니티',
        pre: '',
        linkText: 'StationPC 커뮤니티',
        href: COMMUNITY,
        post: '에서 릴리스 정보, 로드맵, FAQ, 사용 팁을 확인할 수 있습니다',
      },
    ],
    feedback: '기술 논의 및 피드백',
    feedbackItems: [
      {
        label: 'Discord',
        pre: '',
        linkText: 'Discord 서버',
        href: DISCORD,
        post: '에 참여하면 개발팀과 다른 사용자와 실시간으로 소통하고 의견을 전달할 수 있습니다.',
      },
      { label: '베타 프로그램', pre: '베타 그룹에 참여하면 새 기능을 먼저 사용해 볼 수 있습니다.', post: '' },
    ],
  },
  de: {
    intro:
      'Wenn Sie bei der Nutzung unserer Produkte Hilfe benötigen, Fragen zu Funktionen haben oder Feedback geben möchten, erreichen Sie uns über die folgenden Kanäle. Wir melden uns so schnell wie möglich.',
    platform: 'Offizielle Kanäle',
    items: [
      { label: 'Website', pre: 'Besuchen Sie die', linkText: 'StationPC-Website', href: OFFICIAL, post: ' für aktuelle Produktneuigkeiten' },
      { label: 'Support-E-Mail', pre: 'Schreiben Sie an support@stationpc.com – wir antworten innerhalb von 2 Werktagen', post: '' },
      {
        label: 'Community',
        pre: 'Besuchen Sie die',
        linkText: 'StationPC-Community',
        href: COMMUNITY,
        post: ' für Release-Notes, Roadmap, FAQ und Erfahrungsaustausch',
      },
    ],
    feedback: 'Technischer Austausch und Feedback',
    feedbackItems: [
      {
        label: 'Discord',
        pre: 'Treten Sie unserem',
        linkText: 'Discord-Server',
        href: DISCORD,
        post: ' bei, um sich mit dem Entwicklungsteam und anderen Nutzern auszutauschen oder direkt Feedback zu geben.',
      },
      { label: 'Beta-Programm', pre: 'Nehmen Sie an der Beta-Gruppe teil und testen Sie neue Funktionen zuerst.', post: '' },
    ],
  },
  fr: {
    intro:
      "Si vous avez besoin d'aide, une question sur une fonctionnalité ou un retour à partager pendant l'utilisation de nos produits, contactez-nous via les canaux ci-dessous. Nous vous répondrons dans les meilleurs délais.",
    platform: 'Canaux officiels',
    items: [
      { label: 'Site web', pre: 'Consultez le', linkText: 'site StationPC', href: OFFICIAL, post: ' pour les actualités produit' },
      { label: 'E-mail de support', pre: 'Écrivez à support@stationpc.com, nous répondons sous 2 jours ouvrés', post: '' },
      {
        label: 'Communauté',
        pre: 'Rejoignez la',
        linkText: 'communauté StationPC',
        href: COMMUNITY,
        post: ' pour les notes de version, la feuille de route, la FAQ et les retours d’expérience',
      },
    ],
    feedback: 'Échanges techniques et retours',
    feedbackItems: [
      {
        label: 'Discord',
        pre: 'Rejoignez notre',
        linkText: 'serveur Discord',
        href: DISCORD,
        post: " pour échanger en temps réel avec l'équipe technique et les autres utilisateurs, ou envoyer vos retours.",
      },
      { label: 'Programme bêta', pre: 'Participez au groupe bêta pour tester les nouvelles fonctionnalités en avant-première.', post: '' },
    ],
  },
  es: {
    intro:
      'Si necesita ayuda, tiene dudas sobre alguna función o quiere enviarnos sus comentarios mientras usa nuestros productos, puede contactarnos por los siguientes canales. Le responderemos lo antes posible.',
    platform: 'Canales oficiales',
    items: [
      { label: 'Sitio web', pre: 'Visite el', linkText: 'sitio de StationPC', href: OFFICIAL, post: ' para conocer las novedades' },
      { label: 'Correo de soporte', pre: 'Escriba a support@stationpc.com y le responderemos en 2 días hábiles', post: '' },
      {
        label: 'Comunidad',
        pre: 'Visite la',
        linkText: 'comunidad de StationPC',
        href: COMMUNITY,
        post: ' para ver notas de versión, hoja de ruta, preguntas frecuentes y experiencias de uso',
      },
    ],
    feedback: 'Intercambio técnico y comentarios',
    feedbackItems: [
      {
        label: 'Discord',
        pre: 'Únase a nuestro',
        linkText: 'servidor de Discord',
        href: DISCORD,
        post: ' para hablar en tiempo real con el equipo técnico y otros usuarios, o enviar sus comentarios.',
      },
      { label: 'Programa beta', pre: 'Únase al grupo beta para probar las novedades antes que nadie.', post: '' },
    ],
  },
};

export function getContactStrings(locale: string): ContactStrings {
  return COPY[locale] ?? COPY.en;
}
