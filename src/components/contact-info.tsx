import { getContactStrings, type ContactItem } from '@/lib/contact-copy';

function Item({ item }: { item: ContactItem }) {
  // 中文文案里 `pre` 常常是「访问」「加入」，直接拼链接会粘在一起，这里补一个空格
  const needsSpace = item.pre.length > 0 && !/\s$/.test(item.pre);
  const tail = (
    <>
      {item.pre}
      {item.linkText && item.href ? (
        <>
          {needsSpace ? ' ' : null}
          <a href={item.href} target="_blank" rel="noreferrer">
            {item.linkText}
          </a>
        </>
      ) : null}
      {item.post}
    </>
  );

  return (
    <li>
      <strong>{item.label}</strong>
      {item.pre || item.linkText || item.post ? ': ' : null}
      {tail}
    </li>
  );
}

/**
 * 联系我们正文。桌面式与便携式共用同一份渠道信息，各自在自己的产品域下渲染，
 * 这样侧栏不会因为点「联系我们」而跳出产品（八个语言的文案在 contact-copy.ts）。
 */
export function ContactInfo({ locale }: { locale: string }) {
  const t = getContactStrings(locale);

  return (
    <div>
      <p>{t.intro}</p>
      <h2>{t.platform}</h2>
      <ul>
        {t.items.map((item) => (
          <Item key={item.label} item={item} />
        ))}
      </ul>
      <h2>{t.feedback}</h2>
      <ul>
        {t.feedbackItems.map((item) => (
          <Item key={item.label} item={item} />
        ))}
      </ul>
    </div>
  );
}
