/**
 * 让便携式侧栏与旧站导航**完全一致**：只展示旧站 nav.js 里出现的 83 个叶子，
 * 其它页面仍然可访问（直达 URL、站内搜索、更新日志索引），只是不出现在侧栏。
 *
 * fumadocs 的 meta.json pages 支持三种特殊写法：
 *   "!name"        隐藏（页照常构建，只是不进侧栏）
 *   "...folder"    把该目录的子页摊平到当前层（旧站 ssd-install 就是这样）
 *   "[标题](/url)"  纯链接项（旧站「联系我们」指向 /pocketcloud/contact/contact.html）
 *
 * 用法：node scripts/portable/hide-orphans.mjs [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';

const DOCS = path.resolve(import.meta.dirname, '../..');
const CONTENT = path.join(DOCS, 'content/docs');

const LANGS = ['en', 'zh', 'zh-Hant', 'ja', 'ko', 'de', 'fr', 'es'];

// 旧站导航里没有、需要从侧栏隐藏的条目（相对 portable/）
const HIDDEN = [
  ['', ['backup-center', 'syncthing']],
  ['video_tutorial', ['battery']],
  ['guides', ['beta-version-update', 'install-tv-app', 'ios-testflight']],
  ['docker', ['plik']],
  ['compatible-list', ['aud-support-list', 'fs-support-list', 'pic-support-list', 'vid-support-list']],
  ['troubleshooting', ['connect-issue', 'app-client-connect-issue']],
];

// 旧站把这几页直接挂在父级（没有中间层）
const FLATTEN = [
  ['hardware', ['ssd-install']],
];

// 旧站这些目录只露出一个页面：把目录内部页面隐藏，目录退化成单页链接
// 注意：changelog 不再折叠——按用户要求与桌面式一致，日期页要出现在侧栏列表里。
const COLLAPSE = [
  ['guides/device-connection', ['direct-connection', 'net-connection']],
  ['setting/factory', ['force_factory_reset']],
];

const CONTACT_LABEL = {
  en: 'Contact Us',
  zh: '联系我们',
  'zh-Hant': '聯絡我們',
  ja: 'お問い合わせ',
  ko: '문의하기',
  de: 'Kontakt',
  fr: 'Nous contacter',
  es: 'Contacto',
};

const dry = process.argv.includes('--dry');
let touched = 0;

function readMeta(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeMeta(file, meta) {
  meta.pages = [...new Set(meta.pages)];
  if (!dry) fs.writeFileSync(file, `${JSON.stringify(meta, null, 2)}\n`);
  touched += 1;
}

for (const lang of LANGS) {
  const root = path.join(CONTENT, lang, 'portable');
  if (!fs.existsSync(root)) continue;

  // 1) 隐藏旧站没有的条目
  for (const [rel, names] of HIDDEN) {
    const file = path.join(root, rel, 'meta.json');
    if (!fs.existsSync(file)) continue;
    const meta = readMeta(file);
    for (const name of names) {
      const token = `!${name}`;
      if (!meta.pages.includes(token)) meta.pages.push(token);
      // 已经出现在 pages 里的同名条目要移除，否则仍然会显示
      meta.pages = meta.pages.filter((p) => p !== name);
    }
    writeMeta(file, meta);
  }

  // 2) 摊平
  for (const [rel, names] of FLATTEN) {
    const file = path.join(root, rel, 'meta.json');
    if (!fs.existsSync(file)) continue;
    const meta = readMeta(file);
    meta.pages = meta.pages.map((p) => (names.includes(p) ? `...${p}` : p));
    writeMeta(file, meta);
  }

  // 3) 目录内其它页面隐藏，目录退化为单页
  for (const [rel, names] of COLLAPSE) {
    const file = path.join(root, rel, 'meta.json');
    if (!fs.existsSync(file)) continue;
    const meta = readMeta(file);
    for (const name of names) {
      const token = `!${name}`;
      if (!meta.pages.includes(token)) meta.pages.push(token);
      meta.pages = meta.pages.filter((p) => p !== name);
    }
    writeMeta(file, meta);
  }

  // 4) 目录里所有子页都被隐藏时，去掉 pages 里的 "index"：
  //    否则侧栏会同时出现「目录名」和「目录内首页」两条同名条目。
  const walkDirs = (dir) => {
    const metaFile = path.join(dir, 'meta.json');
    if (!fs.existsSync(metaFile)) return;
    const meta = readMeta(metaFile);
    const visible = (meta.pages ?? []).filter((p) => p !== 'index' && !p.startsWith('!'));
    if (visible.length === 0 && (meta.pages ?? []).length > 0 && (meta.pages ?? []).includes('index')) {
      meta.pages = meta.pages.filter((p) => p !== 'index');
      writeMeta(metaFile, meta);
    }
    for (const page of meta.pages ?? []) {
      if (page.startsWith('!') || page.startsWith('...') || page.startsWith('[')) continue;
      const child = path.join(dir, page);
      if (fs.existsSync(child) && fs.statSync(child).isDirectory()) walkDirs(child);
    }
  };
  walkDirs(root);

  // 5) 更新日志固定排在可见分组之后（旧站它在 FAQ 下面），隐藏项与链接项之间
  const file = path.join(root, 'meta.json');
  const meta = readMeta(file);
  if (meta.pages?.includes('changelog')) {
    const rest = meta.pages.filter((p) => p !== 'changelog');
    const firstTrailing = rest.findIndex((p) => p.startsWith('!') || p.startsWith('[') || p === '---');
    const at = firstTrailing === -1 ? rest.length : firstTrailing;
    meta.pages = [...rest.slice(0, at), 'changelog', ...rest.slice(at)];
    writeMeta(file, meta);
  }

  // 6) 「设备安装指南」补第三项（旧站里它跨目录指到电池教程），并把该组排到视频教程首位
  const SUB_LABEL = {
    en: 'How to Replace the Battery?',
    zh: '电池更换教程',
    'zh-Hant': '電池更換教程',
    ja: 'バッテリー交換チュートリアル',
    ko: '배터리 교체 방법',
    de: 'Batterieaustausch-Anleitung',
    fr: 'Remplacer la batterie',
    es: 'Cómo sustituir la batería',
  };
  const batteryHref =
    lang === 'en'
      ? '/portable/video_tutorial/battery'
      : `/${lang}/portable/hardware/battery-install`;
  const subFile = path.join(root, 'video_tutorial/installation/meta.json');
  if (fs.existsSync(subFile)) {
    const sub = readMeta(subFile);
    sub.pages = (sub.pages ?? []).filter((p) => !p.startsWith('['));
    sub.pages.push(`[${SUB_LABEL[lang]}](${batteryHref})`);
    writeMeta(subFile, sub);
  }
  const vtFile = path.join(root, 'video_tutorial/meta.json');
  if (fs.existsSync(vtFile)) {
    const vt = readMeta(vtFile);
    if (vt.pages?.includes('installation')) {
      vt.pages = ['installation', ...vt.pages.filter((p) => p !== 'installation')];
      writeMeta(vtFile, vt);
    }
  }

  // 7) 侧栏最后补「联系我们」链接（旧站它在产品导航最末，指向站点联系页）
  const rootMetaFile = path.join(root, 'meta.json');
  const rootMeta = readMeta(rootMetaFile);
  const url = lang === 'en' ? '/contact' : `/${lang}/contact`;
  const linkToken = `[${CONTACT_LABEL[lang]}](${url})`;
  rootMeta.pages = rootMeta.pages.filter((p) => !p.startsWith('['));
  rootMeta.pages.push(linkToken);
  writeMeta(rootMetaFile, rootMeta);
}

console.log(`${dry ? 'would touch' : 'touched'} ${touched} meta.json`);
