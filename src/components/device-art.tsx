import type { CSSProperties } from 'react';
import type { Product } from '@/lib/products';

type Point = [number, number];

const n = (value: number) => Math.round(value * 100) / 100;
const pt = ([x, y]: Point) => `${n(x)} ${n(y)}`;

/** 描边的公共属性：颜色来自 global.css 的 `.home-art`，线宽不随画布缩放 */
const stroke = {
  fill: 'none',
  stroke: 'var(--art-line)',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  vectorEffect: 'non-scaling-stroke',
} as const;
const thin = { ...stroke, strokeWidth: 1 };

/**
 * 站首页两块产品面板里的设备线稿：桌面式 DA400、便携式 PocketCloud。
 *
 * 造型对照仓库里现有的安装图示和官方视频里的实物；用斜投影的几何体拼出来。
 * DA400 的面与描边跟随亮暗主题，点亮的部分（指示灯、风扇护罩）取外层的 currentColor，
 * 即所属产品线的识别色；PocketCloud 实物就是银机身配黑底座，两种主题下都照实物画。
 * 画布 280×205，两台设备站在同一条底线上。
 */
export function DeviceArt({ product }: { product: Product['slug'] }) {
  return product === 'desktop' ? <DesktopArt /> : <PortableArt />;
}

/** 圆角多边形：每个顶点用一段二次曲线切角；cut 是切角在相邻两条边上的长度，可按顶点分别给 */
function roundedPoly(points: Point[], cut: number | number[]): string {
  const total = points.length;
  return (
    points
      .map((p, i) => {
        const prev = points[(i - 1 + total) % total];
        const next = points[(i + 1) % total];
        const lenIn = Math.hypot(p[0] - prev[0], p[1] - prev[1]);
        const lenOut = Math.hypot(next[0] - p[0], next[1] - p[1]);
        const c = Math.min(Array.isArray(cut) ? cut[i] : cut, lenIn / 2, lenOut / 2);
        const from: Point = [p[0] + ((prev[0] - p[0]) / lenIn) * c, p[1] + ((prev[1] - p[1]) / lenIn) * c];
        const to: Point = [p[0] + ((next[0] - p[0]) / lenOut) * c, p[1] + ((next[1] - p[1]) / lenOut) * c];
        return `${i ? 'L' : 'M'}${pt(from)}Q${pt(p)} ${pt(to)}`;
      })
      .join('') + 'Z'
  );
}

type Box = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** 深度方向在整个盒深上的投影位移 */
  dx: number;
  dy: number;
};

/** 斜投影盒子的外形：正面矩形沿深度方向扫过得到的六边形 */
function boxOutline({ x, y, w, h, dx, dy }: Box): Point[] {
  return [
    [x, y + h],
    [x + w, y + h],
    [x + w + dx, y + h + dy],
    [x + w + dx, y + dy],
    [x + dx, y + dy],
    [x, y],
  ];
}

/**
 * 斜投影盒子，看得见正面、右侧面、顶面三个平面。
 * 三个面用同一份轮廓裁切填色，描边只画轮廓线和三条棱。
 */
function IsoBox({ id, x, y, w, h, dx, dy, r }: Box & { r: number }) {
  const silhouette = roundedPoly(boxOutline({ id, x, y, w, h, dx, dy }), r);
  // 正面右上角三条棱的汇合点；三个面的填色区域从它出发伸到轮廓外，再被轮廓裁掉
  const corner: Point = [x + w, y + r];
  const far = 4000;
  const reach = 8;
  const front = `M${x - 2} ${y}L${x + w - r} ${y}Q${x + w} ${y} ${pt(corner)}L${x + w} ${far}L${x - 2} ${far}Z`;
  const top = `M${x - 2} ${y}L${x + w - r} ${y}Q${x + w} ${y} ${pt(corner)}L${pt([
    corner[0] + dx * reach,
    corner[1] + dy * reach,
  ])}L${pt([x + dx * reach, y + dy * reach])}L${x - 2} ${y + dy * reach}Z`;
  const side = `M${pt(corner)}L${x + w} ${far}L${far} ${far}L${far} ${n(
    corner[1] + ((far - corner[0]) * dy) / dx,
  )}Z`;
  const edge = `M${n(x + r * 0.9)} ${y}L${x + w - r} ${y}Q${x + w} ${y} ${pt(corner)}L${x + w} ${y + h - 1.5}`;
  const edgeTop = `M${pt(corner)}L${x + w + dx} ${y + r + dy}`;

  return (
    <>
      <clipPath id={id}>
        <path d={silhouette} />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <path d={front} fill="var(--art-front)" />
        <path d={top} fill="var(--art-top)" />
        <path d={side} fill="var(--art-side)" />
      </g>
      <path {...stroke} d={silhouette} strokeWidth={1.5} />
      <path {...stroke} d={edge} strokeWidth={1.1} />
      <path {...stroke} d={edgeTop} strokeWidth={1.1} />
    </>
  );
}

/**
 * 圆角剖面沿深度方向挤出的机身：表面连续，没有顶面棱线，所以先铺侧面带、再盖正面。
 * corners 是正面四个角的切角长度，顺序为 [左下, 右下, 右上, 左上]。
 */
function Extrusion({ id, x, y, w, h, dx, dy, corners }: Box & { corners: [number, number, number, number] }) {
  const [bl, br, tr, tl] = corners;
  const silhouette = roundedPoly(boxOutline({ id, x, y, w, h, dx, dy }), [bl, br, br, tr, tl, tl]);
  const face = roundedPoly(
    [
      [x, y + h],
      [x + w, y + h],
      [x + w, y],
      [x, y],
    ],
    corners,
  );

  return (
    <>
      <clipPath id={id}>
        <path d={silhouette} />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <path d={silhouette} fill="var(--art-band)" />
        <path d={face} fill="var(--art-front)" />
      </g>
      <path {...stroke} d={silhouette} strokeWidth={1.5} />
      <path {...stroke} d={face} strokeWidth={1.1} />
    </>
  );
}

/** 设备脚下的软阴影，贴着画布底线（y=194） */
function Ground({ id, cx, rx }: { id: string; cx: number; rx: number }) {
  return (
    <>
      <defs>
        <radialGradient id={id} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="var(--art-line)" stopOpacity="0.2" />
          <stop offset="1" stopColor="var(--art-line)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx={cx} cy={194} rx={rx} ry={7} fill={`url(#${id})`} />
    </>
  );
}

/** 桌面式 DA400：顶盖、硬盘仓、底座同宽，叠成一台小塔；指示灯和侧面的风扇护罩是点亮的部分 */
function DesktopArt() {
  const id = 'home-art-desktop';
  /** 硬盘仓正面的托盘条纹 */
  const ridges = Array.from({ length: 13 }, (_, i) => `M${n(64 + (124 * (i + 1)) / 14)} 81V147`).join('');
  /** 风扇护罩画在硬盘仓的右侧面上：origin 是该面的左下角，depth 沿深度方向，up 竖直向上 */
  const origin: Point = [188, 149];
  const depth: Point = [62, -31];
  const up: Point = [0, -1];
  const on = (a: number, b: number): Point => [
    origin[0] + depth[0] * a + up[0] * b,
    origin[1] + depth[1] * a + up[1] * b,
  ];
  const [a, b, c, d] = [on(0.14, 8), on(0.86, 8), on(0.86, 68), on(0.14, 68)];
  /** X 的端点：从框角向相邻两边各收 16% */
  const inward = (p: Point, q: Point, s: Point): Point => [
    p[0] + (q[0] + s[0] - 2 * p[0]) * 0.16,
    p[1] + (q[1] + s[1] - 2 * p[1]) * 0.16,
  ];
  const hub = on(0.5, 38);

  return (
    <svg viewBox="0 0 280 205" aria-hidden="true" focusable="false">
      <Ground id={`${id}-ground`} cx={157} rx={96} />
      <IsoBox id={`${id}-base`} x={64} y={153} w={124} h={38} dx={62} dy={-31} r={10} />
      {/* 底座正面的接口：指示灯、DC、HDMI、网口、两个 USB */}
      <circle cx={76} cy={172} r={2.6} fill="currentColor" />
      <circle cx={90} cy={172} r={3.6} {...thin} />
      <circle cx={90} cy={172} r={1.3} fill="var(--art-line)" />
      <rect x={99} y={168} width={13} height={8} rx={2} {...thin} />
      <rect x={117} y={166} width={16} height={12} rx={1.5} {...thin} />
      <path d="M120 166v-2.5h10v2.5" {...thin} />
      <rect x={138} y={168} width={8} height={8} rx={2} {...thin} />
      <rect x={150} y={168} width={8} height={8} rx={1.5} {...thin} />
      <IsoBox id={`${id}-stack`} x={64} y={73} w={124} h={82} dx={62} dy={-31} r={6} />
      <path d={ridges} {...thin} opacity={0.45} />
      <path {...thin} d={`M${pt(a)}L${pt(b)}L${pt(c)}L${pt(d)}Z`} fill="currentColor" fillOpacity={0.3} stroke="currentColor" />
      <path
        d={`M${pt(inward(a, b, d))}L${pt(inward(c, d, b))}M${pt(inward(b, a, c))}L${pt(inward(d, c, a))}`}
        {...thin}
      />
      <circle cx={n(hub[0])} cy={n(hub[1])} r={6.5} {...thin} fill="var(--art-front)" />
      <IsoBox id={`${id}-cover`} x={62} y={37} w={128} h={40} dx={64} dy={-32} r={16} />
    </svg>
  );
}

/** PocketCloud 的底座与机身各自的颜色，照实物（黑底座、银机身），不跟主题走 */
const DOCK_TONE = {
  '--art-front': '#2c3036',
  '--art-band': '#202329',
  '--art-line': '#101216',
} as CSSProperties;
const BODY_TONE = {
  '--art-front': '#e6e8ec',
  '--art-band': '#c9cdd4',
  '--art-line': '#4a505a',
} as CSSProperties;

/** 便携式 PocketCloud：银灰圆顶机身坐在更宽的黑色底座上，正面是亮着的一块屏 */
function PortableArt() {
  const id = 'home-art-portable';
  /** 底座正面的散热格栅 */
  const grille = Array.from({ length: 14 }, (_, i) => `M${70 + i * 6} 176V183`).join('');
  /** 机身右侧面的散热槽 */
  const vents = Array.from({ length: 5 }, (_, i) => `M221 ${86 + i * 5}H233`).join('');

  return (
    <svg viewBox="0 0 280 205" aria-hidden="true" focusable="false">
      <Ground id={`${id}-ground`} cx={151} rx={118} />
      <defs>
        <linearGradient id={`${id}-screen`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2dd4bf" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <g style={DOCK_TONE}>
        <Extrusion id={`${id}-dock`} x={30} y={152} w={208} h={38} dx={34} dy={-17} corners={[10, 10, 8, 8]} />
        <path d={grille} {...thin} stroke="#4a5058" />
        <rect x={212} y={164} width={13} height={7} rx={2} {...thin} stroke="#6a7078" />
      </g>
      <circle cx={48} cy={169} r={2.6} fill="currentColor" />
      <g style={BODY_TONE}>
        <Extrusion id={`${id}-body`} x={62} y={46} w={150} h={112} dx={40} dy={-20} corners={[8, 8, 48, 48]} />
        <path d={vents} {...thin} stroke="#6a7078" opacity={0.7} />
      </g>
      <rect x={78} y={62} width={118} height={74} rx={14} fill={`url(#${id}-screen)`} />
      <rect x={78} y={62} width={118} height={74} rx={14} {...thin} stroke="#3a404a" opacity={0.55} />
      <g
        transform="translate(137 97) scale(.82) skewX(-8)"
        fill="none"
        stroke="#fff"
        strokeWidth={7}
        strokeLinecap="round"
      >
        <path d="M9 -10C3 -14 -10 -13 -10 -5.5C-10 1 -1 1 1 1C3 1 12 1 12 8C12 15 0 16 -8 12" />
      </g>
    </svg>
  );
}
