#!/usr/bin/env node
/**
 * 便携式帮助中心（旧 VuePress 站）→ StationOS Pro 帮助中心（Fumadocs）。
 *
 * 只做机械转换，不做内容重写：
 *   - 目录结构 1:1 保留（README.md → 文件夹 index.mdx；其它 .md → 同名 .mdx）
 *   - 图片按 md5 去重后落到 public/images/common/portable/<page>/<file>
 *   - VuePress 容器（tabs / img-description）→ MDX 组件
 *   - 站内链接改写到 /portable/...
 *   - nav.js → meta.json（顺序与标题取旧站导航）
 *
 * 用法：node scripts/portable/convert.mjs [--only=zh]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const WS = path.resolve(import.meta.dirname, '../../..');
const OLD = path.join(WS, 'stationpc_nas_help');
const DOCS = path.join(WS, 'stationospro-docs');
const OUT_CONTENT = path.join(DOCS, 'content/docs');
const OUT_IMAGES = path.join(DOCS, 'public/images/common/portable');
const REPORTS = path.join(DOCS, 'reports');

/** 旧站语言目录 → 新站语言目录 */
const LOCALES = [
  { old: '', next: 'en', nav: 'en-US' },
  { old: 'zh-CN', next: 'zh', nav: 'zh-CN' },
  { old: 'zh-TW', next: 'zh-Hant', nav: 'zh-TW' },
  { old: 'ja-JP', next: 'ja', nav: 'ja-JP' },
  { old: 'ko-KR', next: 'ko', nav: 'ko-KR' },
  { old: 'de-DE', next: 'de', nav: 'de-DE' },
];

/** Authing 遗留页面：整篇删除（merge-plan §2.7） */
const DROP = [
  'search',
  'contact/contact',
  'guides/basics/console',
  'guides/basics/platform-guide/integrate-with-backend-app',
  'guides/basics/platform-guide/integrate-with-mobile-app',
  'guides/basics/platform-guide/integrate-with-regular-web-app',
  'guides/basics/platform-guide/integrate-with-spa',
];

const stats = { pages: 0, skipped: [], images: 0, reused: 0, warnings: [] };
const imageIndex = new Map(); // md5 → { target, source }
const imageMap = {}; // oldRelPath → newUrl
const urlMap = []; // { locale, from, to }

const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const onlyLocale = onlyArg ? onlyArg.split('=')[1] : null;

// ---------------------------------------------------------------- helpers

function oldRoot(locale) {
  return locale.old ? path.join(OLD, 'docs', locale.old, 'pocketcloud') : path.join(OLD, 'docs/pocketcloud');
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

/** README 所在目录是否还有别的页面（有才需要 index.mdx，否则降级为普通页面） */
function folderHasMorePages(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'README.md') continue;
    if (entry.isFile() && entry.name.endsWith('.md')) return true;
    if (entry.isDirectory() && walk(path.join(dir, entry.name)).length > 0) return true;
  }
  return false;
}
function pageKeyOf(file, root) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  if (rel !== 'README.md' && rel.endsWith('/README.md')) {
    const key = rel.slice(0, -'/README.md'.length);
    // 目录里只有 README 时，它就是该目录的唯一页面，降级为普通 .mdx
    return { key, isIndex: folderHasMorePages(path.dirname(file)) };
  }
  if (rel === 'README.md') return { key: '', isIndex: true };
  return { key: rel.replace(/\.md$/, ''), isIndex: false };
}

function md5(buffer) {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

function loadNav(navName) {
  const file = path.join(OLD, 'docs/.config', navName, 'nav.js');
  if (!fs.existsSync(file)) return [];
  const source = fs.readFileSync(file, 'utf8');
  // nav.js 是纯数据 module，直接求值拿到对象
  const module_ = { exports: {} };
  new Function('module', 'exports', source)(module_, module_.exports);
  const tree = Object.values(module_.exports)[0] ?? [];
  const order = [];
  const titles = new Map();

  (function visit(nodes) {
    for (const node of nodes) {
      if (node.path) {
        const key = node.path.replace('/pocketcloud/', '').replace(/\/$/, '').replace(/\.md$/, '');
        if (!order.includes(key)) order.push(key);
        if (node.title) titles.set(key, node.title);
      }
      if (node.children) visit(node.children);
    }
  })(tree);

  return { tree, order, titles };
}

/** 文件夹标题：找"子页基本都落在该文件夹下"的导航分组名 */
function folderTitles(nav) {
  const groups = [];
  (function visit(nodes, depth) {
    for (const node of nodes) {
      if (node.children) {
        const descendantKeys = [];
        (function collect(children) {
          for (const child of children) {
            if (child.path) {
              descendantKeys.push(
                child.path.replace('/pocketcloud/', '').replace(/\/$/, '').replace(/\.md$/, ''),
              );
            }
            if (child.children) collect(child.children);
          }
        })(node.children);
        if (descendantKeys.length) groups.push({ title: node.title, keys: descendantKeys, depth });
        visit(node.children, depth + 1);
      }
    }
  })(nav.tree, 0);

  return (folder) => {
    let best = null;
    for (const group of groups) {
      const hit = group.keys.filter((key) => key === folder || key.startsWith(`${folder}/`)).length;
      const coverage = hit / group.keys.length;
      if (coverage < 0.6) continue;
      // 覆盖的页面越多越贴近该文件夹（"说明书"这种子分组只占 3 页，输给"快速开始"的 8 页）
      if (!best || hit > best.hit || (hit === best.hit && coverage > best.coverage)) {
        best = { title: group.title, coverage, hit };
      }
    }
    return best?.title;
  };
}

// ---------------------------------------------------------------- converter

/** MDX 不接受的老式 HTML：`</br>`、未自闭合的 `<br>`、`<!-- 注释 -->` */
function fixLegacyHtml(text) {
  const parts = text.split(/(```[\s\S]*?```)/);
  return parts
    .map((part, index) => {
      if (index % 2 === 1) return part; // 代码围栏原样保留
      return (
        part
          // 旧站的 <VideoEmbed> 带未加引号的 loaderText 等属性，MDX 不接受 → 只保留 src
          .replace(/<VideoEmbed[\s\S]*?\/>/g, (block) => {
            const src = block.match(/src\s*=\s*"([^"]+)"/)?.[1];
            return src ? `<VideoEmbed src="${src}" />` : '';
          })
          .replace(/<\/br>/gi, '')
          .replace(/(<img\b[^>]*?)\s+style="[^"]*"/gi, '$1') // JSX 不接受 style 字符串
          .replace(/<br\s*\/?>/gi, '<br />')
          .replace(/<!--[\s\S]*?-->/g, '')
          .replace(/<hr\s*\/?>/gi, '<hr />')
          // 正文里的 "< 3.1.0" / "<= 3.1.0" 会被当成 JSX 标签起始
          .replace(/<(?=[=\s])/g, '&lt;')
      );
    })
    .join('');
}

function convertBody(raw, ctx) {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let inFence = false;
  // tabs 状态机
  let tabs = null; // { items: [], current: null }
  let dropUntilBlank = false;

  const rewriteInline = (text) => rewriteLinks(text, ctx);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      out.push(line);
      continue;
    }
    if (inFence) {
      out.push(line);
      continue;
    }

    // ---- tabs 容器（旧站用 3~5 个冒号，两层容器冒号数可能不同）
    const tabsOpen = line.match(/^(:{3,})\s*tabs\b/);
    const tabOpen = line.match(/^(:{3,})\s*tab\s+(.+?)\s*$/);
    const markerClose = line.match(/^(:{3,})\s*$/);

    if (tabsOpen) {
      tabs = { outer: tabsOpen[1].length, items: [], blocks: [], current: null, inner: 0 };
      continue;
    }
    if (tabs) {
      if (tabOpen && !tabs.current) {
        tabs.items.push(tabOpen[2]);
        tabs.inner = tabOpen[1].length;
        tabs.current = [];
        continue;
      }
      if (markerClose) {
        const colonCount = markerClose[1].length;
        if (tabs.current && colonCount === tabs.inner) {
          tabs.blocks.push(tabs.current.join('\n'));
          tabs.current = null;
          continue;
        }
        if (colonCount === tabs.outer && !tabs.current) {
          out.push(`<Tabs items={${JSON.stringify(tabs.items)}}>`, '');
          for (const block of tabs.blocks) {
            out.push('<Tab>', '', block.trim(), '', '</Tab>', '');
          }
          out.push('</Tabs>', '');
          tabs = null;
          continue;
        }
        continue;
      }
      if (tabs.current) {
        tabs.current.push(rewriteInline(line));
        continue;
      }
      continue;
    }

    // ---- 其它 VuePress 容器
    if (/^:::\s*img-description\b/.test(line)) continue;
    if (/^:::\s*$/.test(line)) continue;
    if (/^::::?\s*(tip|warning|danger|details)\b/.test(line)) {
      stats.warnings.push(`${ctx.file}: 未处理的容器 ${line.trim()}`);
      continue;
    }

    // ---- 逐行清洗
    let text = line;

    // 组件清理
    text = text.replace(/<LastUpdated[^>]*\/?>(<\/LastUpdated>)?/g, '');
    text = text.replace(/<ChangelogList[^>]*\/?>(<\/ChangelogList>)?/g, '');
    text = text.replace(/<FullSearchResults[^>]*\/?>(<\/FullSearchResults>)?/g, '');
    // 未注册的 Authing 组件（防御性，页面本身已删除）
    text = text.replace(/<\/?(User|IP|App|AuthingGuard)\b[^>]*>/g, '');

    out.push(rewriteInline(text));
  }

  return out.join('\n');
}

/** 找到刚结束的 tabs 块起始位置（最外层 <Tab> 之前） */
function findTabsStart(out) {
  return 0;
}

function rewriteLinks(text, ctx) {
  return text
    // markdown 链接 / 站内绝对路径
    .replace(/\]\((\/pocketcloud\/[^)\s]*)\)/g, (_, href) => `](${toNewUrl(href, ctx)})`)
    // 相对链接（../x/ 或 ./x/ 或 x.md）
    .replace(/\]\((\.{1,2}\/[^)\s]*)\)/g, (_, href) => `](${toNewUrl(path.posix.join(ctx.oldDirRel, href), ctx, true)})`)
    // HTML href
    .replace(/href="(\/pocketcloud\/[^"]*)"/g, (_, href) => `href="${toNewUrl(href, ctx)}"`);
}

function toNewUrl(href, ctx, alreadyJoined = false) {
  let clean = href.replace(/[#?].*$/, '');
  const suffix = href.slice(clean.length);
  if (!alreadyJoined) clean = clean.replace('/pocketcloud/', '');
  clean = clean.replace(/^\/+/, '').replace(/\/+$/, '').replace(/\.md$/, '');
  if (clean === '' || clean === 'pocketcloud') return `${ctx.prefix}${suffix}`;
  return `${ctx.prefix}/${clean}${suffix}`;
}

/** 图片：复制到 public/images/common/portable/<page>/，返回新 URL */
function collectImage(rawSrc, ctx) {
  if (/^(https?:)?\/\//.test(rawSrc) || rawSrc.startsWith('data:')) return rawSrc;
  const clean = rawSrc.replace(/[?#].*$/, '');
  const abs = path.resolve(path.dirname(ctx.file), clean);
  if (!fs.existsSync(abs)) {
    stats.warnings.push(`${ctx.file}: 图片不存在 ${rawSrc}`);
    return rawSrc;
  }
  const buffer = fs.readFileSync(abs);
  const hash = md5(buffer);
  const rel = path.relative(OLD, abs).replace(/\\/g, '/');
  const existing = imageIndex.get(hash);
  if (existing) {
    stats.reused++;
    imageMap[rel] = existing.target;
    return existing.target;
  }
  const name = path.basename(abs);
  const dir = path.join(OUT_IMAGES, ctx.key || 'index');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), buffer);
  const target = `/images/common/portable/${ctx.key || 'index'}/${name}`;
  imageIndex.set(hash, { target, source: rel });
  imageMap[rel] = target;
  stats.images++;
  return target;
}

function convertImages(raw, ctx) {
  let text = raw;
  // markdown 图片
  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(\s+"[^"]*")?\)/g, (_, alt, src, title) => {
    const next = collectImage(src, ctx);
    return `![${alt}](${next}${title ?? ''})`;
  });
  // HTML <img ...>
  text = text.replace(/<img\b([^>]*?)\/?>/g, (whole, attrs) => {
    const srcMatch = attrs.match(/src="([^"]*)"/);
    if (!srcMatch) return whole;
    const next = collectImage(srcMatch[1], ctx);
    let rest = attrs
      .replace(/\bsrc="[^"]*"/, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (rest) rest = ` ${rest}`;
    return `<img src="${next}"${rest} />`;
  });
  return text;
}

/** iframe → VideoEmbed */
function convertIframes(raw) {
  return raw.replace(/<iframe\b[^>]*?src="([^"]+)"[^>]*>(?:<\/iframe>)?/g, (_, src) => {
    return `<VideoEmbed src="${src}" />`;
  });
}

// ---------------------------------------------------------------- main

function processLocale(locale) {
  const root = oldRoot(locale);
  if (!fs.existsSync(root)) {
    console.log(`跳过 ${locale.next}（无源目录 ${root}）`);
    return;
  }
  const nav = loadNav(locale.nav);
  const files = walk(root).filter((file) => !DROP.includes(pageKeyOf(file, root).key));

  const keys = files.map((file) => pageKeyOf(file, root).key);
  const folderTitle = folderTitles(nav);
  const targetDir = path.join(OUT_CONTENT, locale.next, 'portable');

  // 清空该语言旧产物（保持可重跑）
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });

  const created = [];
  for (const file of files) {
    const { key, isIndex } = pageKeyOf(file, root);
    if (key === '') continue; // 产品 README 由落地页承担

    let raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');

    // frontmatter
    let front = {};
    const fm = raw.match(/^---\n([\s\S]*?)\n---\n?/);
    if (fm) {
      raw = raw.slice(fm[0].length);
      for (const line of fm[1].split('\n')) {
        const m = line.match(/^(\w+):\s*(.*)$/);
        if (m) front[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    }

    // 标题：第一个 H1
    let title = front.title || front.mainTitle || nav.titles.get(key) || null;
    const h1 = raw.match(/^\s*#\s+(.+?)\s*$/m);
    if (h1) {
      if (!title) title = h1[1];
      raw = raw.replace(h1[0], '');
    }

    // 空页（旧站用来占位的 README）跳过
    if (!raw.trim() && !title) continue;
    if (!title) title = key.split('/').pop();

    const ctx = {
      file,
      key,
      prefix: '/portable',
      oldDirRel: path.posix.dirname(`pocketcloud/${key}`) + '/',
    };

    raw = convertImages(raw, ctx);
    raw = convertIframes(raw);
    const body = fixLegacyHtml(convertBody(raw, ctx))
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const outFile = isIndex
      ? path.join(targetDir, key, 'index.mdx')
      : path.join(targetDir, `${key}.mdx`);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    const frontmatter = ['---', `title: ${JSON.stringify(title)}`];
    if (front.description) frontmatter.push(`description: ${JSON.stringify(front.description)}`);
    frontmatter.push('---', '');
    fs.writeFileSync(outFile, `${frontmatter.join('\n')}\n${body}\n`);

    stats.pages++;
    created.push({ key, title, isIndex, out: path.relative(DOCS, outFile) });

    // URL 映射
    const oldPrefix = locale.old ? `/${locale.old}` : '';
    const nextPrefix = locale.next === 'en' ? '' : `/${locale.next}`;
    urlMap.push({
      locale: locale.next,
      from: `${oldPrefix}/pocketcloud/${key === '' ? '' : `${key}/`}`,
      to: `${nextPrefix}/portable/${key}`,
    });
  }

  // ---- meta.json：按旧站导航顺序重建
  writeMeta(locale, targetDir, created, nav, folderTitle);
  finalizeChangelog(locale, targetDir);
  writeLanding(locale, targetDir);
  return created;
}

/** 产品落地页：转换会清空整个目录，重启后按语言重新写回（正文由 ProductLanding 组件渲染） */
const LANDING = {
  en: ['PocketCloud Help Center', 'Setup and usage guides for the portable NAS: PA100 / PA100 Pro / PA200.'],
  zh: ['PocketCloud 帮助中心', '便携式 NAS · PA100 / PA100 Pro / PA200 的使用文档。'],
  'zh-Hant': ['PocketCloud 說明中心', '可攜式 NAS · PA100 / PA100 Pro / PA200 的使用文件。'],
  ja: ['PocketCloud ヘルプセンター', 'ポータブル NAS · PA100 / PA100 Pro / PA200 のセットアップと使い方。'],
  ko: ['PocketCloud 도움말 센터', '휴대용 NAS · PA100 / PA100 Pro / PA200 설치 및 사용 문서.'],
  de: ['PocketCloud Hilfe-Center', 'Einrichtung und Nutzung des tragbaren NAS: PA100 / PA100 Pro / PA200.'],
  fr: ['Centre d’aide PocketCloud', 'Documentation d’installation et d’utilisation du NAS portable : PA100 / PA100 Pro / PA200.'],
  es: ['Centro de ayuda de PocketCloud', 'Documentación de instalación y uso del NAS portátil: PA100 / PA100 Pro / PA200.'],
};

function writeLanding(locale, targetDir) {
  const [title, description] = LANDING[locale.next] ?? LANDING.en;
  fs.writeFileSync(
    path.join(targetDir, 'index.mdx'),
    `---\ntitle: "${title}"\ndescription: "${description}"\n---\n`,
  );
}

/** 更新日志索引页：旧站是 <ChangelogList> 组件，这里生成静态卡片列表（新的在前） */
function finalizeChangelog(locale, targetDir) {
  const dir = path.join(targetDir, 'changelog');
  if (!fs.existsSync(dir)) return;
  const dates = fs
    .readdirSync(dir)
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.mdx$/.test(name))
    .map((name) => name.replace(/\.mdx$/, ''))
    .sort()
    .reverse();
  if (!dates.length) return;

  const prefix = locale.next === 'en' ? '' : `/${locale.next}`;
  const indexFile = path.join(dir, 'index.mdx');
  const existing = fs.existsSync(indexFile) ? fs.readFileSync(indexFile, 'utf8') : '';
  const [, title = '"更新日志"'] = existing.match(/^title:\s*(.+)$/m) ?? [];
  const body = dates.map((date) => `- [${date}](${prefix}/portable/changelog/${date})`).join('\n');
  fs.writeFileSync(indexFile, `---\ntitle: ${title}\n---\n\n${body}\n`);

  const metaFile = path.join(dir, 'meta.json');
  if (fs.existsSync(metaFile)) {
    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
    meta.pages = ['index', ...dates];
    fs.writeFileSync(metaFile, `${JSON.stringify(meta, null, 2)}\n`);
  }
}

/** 旧站导航里没有这几个目录（页面原本挂在别的分组下），英文兜底会让侧栏出现 "backup center" 这种名字 */
const FOLDER_TITLES = {
  en: { 'backup-center': 'Backup Center', syncthing: 'Syncthing Sync', trouble_issue: 'Connection Issues' },
  zh: { 'backup-center': '备份中心', syncthing: 'Syncthing 同步', trouble_issue: '连接问题' },
  'zh-Hant': { 'backup-center': '備份中心', syncthing: 'Syncthing 同步', trouble_issue: '連線問題' },
  ja: { 'backup-center': 'バックアップセンター', syncthing: 'Syncthing 同期', trouble_issue: '接続の問題' },
  ko: { 'backup-center': '백업 센터', syncthing: 'Syncthing 동기화', trouble_issue: '연결 문제' },
  de: { 'backup-center': 'Sicherungscenter', syncthing: 'Syncthing-Synchronisierung', trouble_issue: 'Verbindungsprobleme' },
  fr: { 'backup-center': 'Centre de sauvegarde', syncthing: 'Synchronisation Syncthing', trouble_issue: 'Problèmes de connexion' },
  es: { 'backup-center': 'Centro de copias de seguridad', syncthing: 'Sincronización con Syncthing', trouble_issue: 'Problemas de conexión' },
};

function writeMeta(locale, dir, created, nav, folderTitle) {
  const orderOf = (key) => {
    const index = nav.order.indexOf(key);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };
  const indexTitles = new Map(); // folder → index 页标题
  for (const page of created) if (page.isIndex) indexTitles.set(page.key, page.title);

  // folder → 直接子页
  const folderPages = new Map();
  const folderSet = new Set(['']);
  for (const page of created) {
    const parts = page.key.split('/');
    // 所有祖先文件夹都要登记
    for (let i = 1; i < parts.length; i++) folderSet.add(parts.slice(0, i).join('/'));
    if (page.isIndex) {
      folderSet.add(page.key);
      continue;
    }
    const folder = parts.slice(0, -1).join('/');
    folderSet.add(folder);
    if (!folderPages.has(folder)) folderPages.set(folder, []);
    folderPages.get(folder).push({ name: parts.at(-1), key: page.key });
  }

  const childFolders = (folder) => {
    const prefix = folder ? `${folder}/` : '';
    const out = [];
    for (const candidate of folderSet) {
      if (!candidate.startsWith(prefix) || candidate === folder) continue;
      const rest = candidate.slice(prefix.length);
      if (rest && !rest.includes('/')) out.push({ full: candidate, name: rest });
    }
    return out;
  };

  // 文件夹排序：取该文件夹下最靠前的导航位置（导航里没有的排到最后）
  const folderOrder = (folder) => {
    let min = Number.MAX_SAFE_INTEGER;
    for (const page of created) {
      if (page.key === folder || page.key.startsWith(`${folder}/`)) {
        min = Math.min(min, orderOf(page.key));
      }
    }
    return min === -1 ? Number.MAX_SAFE_INTEGER - 1 : min;
  };

  for (const folder of folderSet) {
    const pages = (folderPages.get(folder) ?? [])
      .sort((a, b) => orderOf(a.key) - orderOf(b.key))
      .map((page) => page.name);
    const folders = childFolders(folder)
      .sort((a, b) => {
        const priority = (name) => (name === 'changelog' ? 1 : 0);
        const diff = priority(a.name) - priority(b.name);
        return diff !== 0 ? diff : folderOrder(a.full) - folderOrder(b.full);
      })
      .map((entry) => entry.name);
    const hasIndex = indexTitles.has(folder) || folderSet.has(folder) && folder !== '' && fs.existsSync(path.join(dir, folder, 'index.mdx'));

    const title =
      folder === ''
        ? 'PocketCloud'
        : (FOLDER_TITLES[locale.next]?.[folder] ??
          folderTitle(folder) ??
          indexTitles.get(folder) ??
          folder.split('/').pop().replace(/[-_]/g, ' '));

    const meta = { title, ...(pages.length || folders.length || hasIndex ? {} : {}) };
    const entries = [...(hasIndex ? ['index'] : []), ...pages, ...folders];
    if (entries.length) meta.pages = [...new Set(entries)];
    fs.mkdirSync(path.join(dir, folder), { recursive: true });
    fs.writeFileSync(path.join(dir, folder, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`);
  }
}

fs.mkdirSync(OUT_IMAGES, { recursive: true });
fs.mkdirSync(REPORTS, { recursive: true });

for (const locale of LOCALES) {
  if (onlyLocale && locale.next !== onlyLocale) continue;
  const created = processLocale(locale);
  if (created) console.log(`${locale.next}: ${created.length} 篇`);
}

fs.writeFileSync(path.join(REPORTS, 'image-map.json'), `${JSON.stringify(imageMap, null, 2)}\n`);
fs.writeFileSync(
  path.join(REPORTS, 'url-map.csv'),
  `locale,from,to\n${urlMap.map((row) => `${row.locale},${row.from},${row.to}`).join('\n')}\n`,
);
fs.writeFileSync(
  path.join(REPORTS, 'convert-report.md'),
  [
    '# 便携式内容转换报告',
    '',
    `- 转换页面：${stats.pages}`,
    `- 复制图片：${stats.images}（复用去重 ${stats.reused}）`,
    `- 告警：${stats.warnings.length}`,
    '',
    '## 告警',
    '',
    ...(stats.warnings.length ? stats.warnings.map((w) => `- ${w}`) : ['- 无']),
    '',
  ].join('\n'),
);

console.log(`页面 ${stats.pages}，图片 ${stats.images}（去重复用 ${stats.reused}），告警 ${stats.warnings.length}`);
