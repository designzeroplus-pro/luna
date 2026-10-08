// 명함 템플릿. 모든 좌표는 mm 단위(재단 기준 90×50, 원점은 재단선 좌상단).
// 배경은 도련(B)까지 채운다.

const CARD = { W: 90, H: 50, B: 1 };
const DARK = '#1d1d1f';
const GRAY = '#707075';

function text(ctx, s, x, y, o = {}) {
  if (!s) return 0;
  ctx.save();
  ctx.font = `${o.w || 400} ${o.size || 2.2}px "${o.font}", "Noto Sans KR", sans-serif`;
  ctx.fillStyle = o.color || DARK;
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = 'alphabetic';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${o.ls || 0}px`;
  if (o.max) ctx.fillText(s, x, y, o.max); else ctx.fillText(s, x, y);
  const w = Math.min(ctx.measureText(s).width, o.max || Infinity);
  ctx.restore();
  return w;
}

function logo(ctx, img, x, y, maxW, maxH, align = 'left', valign = 'top') {
  if (!img) return null;
  const r = Math.min(maxW / img.width, maxH / img.height);
  const w = img.width * r, h = img.height * r;
  const dx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  const dy = valign === 'middle' ? y - h / 2 : valign === 'bottom' ? y - h : y;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, dx, dy, w, h);
  return { x: dx, y: dy, w, h };
}

function contactItems(d) {
  return [
    ['M', d.phone], ['T', d.tel], ['E', d.email], ['W', d.web], ['A', d.address],
  ].filter(([, v]) => v && v.trim());
}

// 연락처 블록: yBottom을 마지막 줄 기준선으로 위로 쌓는다
function contacts(ctx, d, x, yBottom, o) {
  const items = contactItems(d);
  const lh = o.lh || 3.0, size = o.size || 2.0;
  const y0 = yBottom - (items.length - 1) * lh;
  items.forEach(([k, v], i) => {
    const y = y0 + i * lh;
    if (o.align === 'right') {
      const vw = text(ctx, v, x, y, { size, color: o.color, font: o.font, align: 'right', max: o.max });
      text(ctx, k, x - vw - 1.6, y, { size, w: 700, color: o.label, font: o.font, align: 'right' });
    } else {
      text(ctx, k, x, y, { size, w: 700, color: o.label, font: o.font });
      text(ctx, v, x + 3.2, y, { size, color: o.color, font: o.font, max: o.max });
    }
  });
}

function fillAll(ctx, color) {
  const { W, H, B } = CARD;
  ctx.fillStyle = color;
  ctx.fillRect(-B, -B, W + 2 * B, H + 2 * B);
}

function poly(ctx, pts, color) {
  ctx.beginPath();
  pts.forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

// 각 템플릿: front/back(ctx, d) — d = { info, c(메인), a(포인트), font, logo, logoWhite }
const TEMPLATES = [
  {
    id: 'classic', name: '클래식',
    front(ctx, d) {
      const { H, B } = CARD, f = d.font;
      fillAll(ctx, '#ffffff');
      ctx.fillStyle = d.c; ctx.fillRect(-B, -B, 2.2 + B, H + 2 * B);
      logo(ctx, d.logo, 8, 6.5, 34, 9);
      const nw = text(ctx, d.info.name, 8, 23, { size: 4.8, w: 700, font: f });
      text(ctx, d.info.title, 8 + nw + 2.5, 23, { size: 2.3, color: GRAY, font: f, max: 40 });
      text(ctx, d.info.nameEn, 8, 27, { size: 2.1, color: GRAY, font: f, ls: 0.15 });
      contacts(ctx, d.info, 8, 45, { color: DARK, label: d.c, font: f, max: 72 });
    },
    back(ctx, d) {
      fillAll(ctx, d.c);
      logo(ctx, d.logoWhite, 45, 23, 48, 16, 'center', 'middle');
      text(ctx, d.info.web, 45, 43, { size: 2.1, color: 'rgba(255,255,255,.8)', align: 'center', font: d.font, ls: 0.2 });
    },
  },
  {
    id: 'modern', name: '모던 다크',
    front(ctx, d) {
      const f = d.font;
      fillAll(ctx, '#17181c');
      logo(ctx, d.logoWhite, 83, 7, 28, 8, 'right');
      text(ctx, d.info.name, 7, 14, { size: 4.8, w: 700, color: '#fff', font: f });
      text(ctx, d.info.title, 7, 19, { size: 2.3, color: d.a, font: f, max: 44 });
      ctx.fillStyle = d.a; ctx.fillRect(7, 22.5, 10, 0.5);
      contacts(ctx, d.info, 7, 44, { color: '#d8d8dc', label: d.a, font: f, max: 72 });
    },
    back(ctx, d) {
      fillAll(ctx, '#17181c');
      const r = logo(ctx, d.logoWhite, 45, 23, 48, 16, 'center', 'middle');
      ctx.fillStyle = d.a; ctx.fillRect(41, (r ? r.y + r.h : 31) + 4, 8, 0.5);
    },
  },
  {
    id: 'split', name: '스플릿',
    front(ctx, d) {
      const { H, B } = CARD, f = d.font;
      fillAll(ctx, '#ffffff');
      ctx.fillStyle = d.c; ctx.fillRect(-B, -B, 31 + B, H + 2 * B);
      logo(ctx, d.logoWhite, 15.5, 25, 22, 18, 'center', 'middle');
      text(ctx, d.info.name, 37, 14, { size: 4.6, w: 700, font: f });
      text(ctx, d.info.title, 37, 19, { size: 2.2, color: d.c, w: 500, font: f, max: 46 });
      contacts(ctx, d.info, 37, 44, { size: 1.9, lh: 2.9, color: DARK, label: d.c, font: f, max: 46 });
    },
    back(ctx, d) {
      const { W, H, B } = CARD;
      fillAll(ctx, '#ffffff');
      ctx.fillStyle = d.c; ctx.fillRect(-B, H - 3, W + 2 * B, 3 + B);
      logo(ctx, d.logo, 45, 22, 48, 16, 'center', 'middle');
      text(ctx, d.info.web, 45, 40, { size: 2.1, color: d.c, align: 'center', font: d.font, ls: 0.2 });
    },
  },
  {
    id: 'center', name: '미니멀 센터',
    front(ctx, d) {
      const f = d.font, i = d.info;
      fillAll(ctx, '#fbfaf7');
      logo(ctx, d.logo, 45, 6.5, 30, 8, 'center');
      text(ctx, i.name, 45, 25, { size: 5, w: 700, align: 'center', font: f, ls: 0.4 });
      text(ctx, i.title, 45, 30, { size: 2.2, color: GRAY, align: 'center', font: f, ls: 0.2 });
      ctx.fillStyle = d.c; ctx.fillRect(41, 33, 8, 0.35);
      const l1 = [i.phone, i.email].filter(Boolean).join('   ·   ');
      const l2 = [i.tel && `T. ${i.tel}`, i.web].filter(Boolean).join('   ·   ');
      text(ctx, l1, 45, 38.5, { size: 2.05, align: 'center', font: f, max: 80 });
      text(ctx, l2, 45, 42, { size: 1.9, color: GRAY, align: 'center', font: f, max: 80 });
      text(ctx, i.address, 45, 45.3, { size: 1.9, color: GRAY, align: 'center', font: f, max: 80 });
    },
    back(ctx, d) {
      fillAll(ctx, d.c);
      logo(ctx, d.logoWhite, 45, 25, 46, 18, 'center', 'middle');
    },
  },
  {
    id: 'band', name: '컬러 밴드',
    front(ctx, d) {
      const { W, B } = CARD, f = d.font;
      fillAll(ctx, '#ffffff');
      ctx.fillStyle = d.c; ctx.fillRect(-B, -B, W + 2 * B, 14 + B);
      ctx.fillStyle = d.a; ctx.fillRect(-B, 14, W + 2 * B, 0.8);
      logo(ctx, d.logoWhite, 7, 7, 34, 8, 'left', 'middle');
      text(ctx, d.info.web, 83, 8, { size: 2, color: 'rgba(255,255,255,.85)', align: 'right', font: f });
      const nw = text(ctx, d.info.name, 7, 23.5, { size: 4.6, w: 700, font: f });
      text(ctx, d.info.title, 7 + nw + 2.5, 23.5, { size: 2.2, color: GRAY, font: f, max: 44 });
      const rest = { ...d.info, web: '' };
      contacts(ctx, rest, 7, 45, { size: 2.0, lh: 3.0, color: DARK, label: d.c, font: f, max: 74 });
    },
    back(ctx, d) {
      const { W, H, B } = CARD;
      fillAll(ctx, d.c);
      ctx.fillStyle = d.a; ctx.fillRect(-B, H - 4, W + 2 * B, 4 + B);
      logo(ctx, d.logoWhite, 45, 22, 48, 16, 'center', 'middle');
    },
  },
  {
    id: 'geo', name: '지오메트릭',
    front(ctx, d) {
      const { W, B } = CARD, f = d.font;
      fillAll(ctx, '#ffffff');
      poly(ctx, [[W + B, -B], [W - 32, -B], [W + B, 30]], d.c);
      poly(ctx, [[W + B, -B], [W - 15, -B], [W + B, 14]], d.a);
      logo(ctx, d.logo, 7, 7, 32, 8);
      text(ctx, d.info.name, 7, 22, { size: 4.8, w: 700, font: f });
      text(ctx, d.info.title, 7, 26.5, { size: 2.2, color: d.c, w: 500, font: f, max: 50 });
      contacts(ctx, d.info, 7, 45, { color: DARK, label: d.c, font: f, max: 74 });
    },
    back(ctx, d) {
      const { H, B } = CARD;
      fillAll(ctx, d.c);
      poly(ctx, [[-B, H + B], [-B, H - 18], [22, H + B]], d.a);
      logo(ctx, d.logoWhite, 45, 23, 46, 16, 'center', 'middle');
    },
  },
];

// 지정한 해상도로 캔버스에 렌더링
function renderCard(canvas, tpl, side, data, { dpi = 300, bleed = false } = {}) {
  const { W, H, B } = CARD;
  const b = bleed ? B : 0;
  const s = dpi / 25.4;
  canvas.width = Math.round((W + 2 * b) * s);
  canvas.height = Math.round((H + 2 * b) * s);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(s, 0, 0, s, b * s, b * s);
  tpl[side](ctx, data);
  return canvas;
}
