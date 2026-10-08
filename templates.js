// 90 × 50 mm. All drawing coordinates are in millimetres, including the 1 mm bleed.
const CARD = { W: 90, H: 50, B: 1 };
const SANS = 'DM Sans';
const SERIF = 'Bodoni Moda';

function fontStyle(ctx, size, o = {}) {
  const serif = o.font === SERIF || o.font === 'Noto Serif KR';
  ctx.font = `${o.w || 400} ${size}px "${o.font || SANS}", "${serif ? 'Noto Serif KR' : 'Noto Sans KR'}", ${serif ? 'serif' : 'sans-serif'}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${o.ls || 0}px`;
}

// Fit by reducing the actual font size, never by squeezing the letterforms horizontally.
function text(ctx, value, x, y, o = {}) {
  const s = String(value || '').trim();
  if (!s) return 0;
  ctx.save();
  let size = o.size || 2.6;
  fontStyle(ctx, size, o);
  if (o.max && ctx.measureText(s).width > o.max) {
    size *= o.max / ctx.measureText(s).width;
    fontStyle(ctx, size, o);
  }
  ctx.fillStyle = o.color || '#111111';
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.baseline || 'alphabetic';
  ctx.fillText(s, x, y);
  const width = ctx.measureText(s).width;
  ctx.restore();
  return width;
}

function wrapText(ctx, value, width) {
  const output = [];
  for (const paragraph of String(value).split('\n')) {
    let line = '';
    // Spaces are preferred break points; long URLs and Korean text also wrap safely.
    for (const token of paragraph.split(/(\s+|(?<=[@/.-]))/u)) {
      if (line && ctx.measureText(line + token).width > width) {
        output.push(line.trim()); line = '';
      }
      for (const char of token) {
        if (line && ctx.measureText(line + char).width > width) {
          output.push(line.trim()); line = '';
        }
        line += char;
      }
    }
    if (line.trim()) output.push(line.trim());
  }
  return output;
}

// A bounded, wrapping block. Optional fields disappear without empty rows.
function block(ctx, values, x, y, width, height, o = {}) {
  const items = values.filter(v => v && String(v).trim());
  if (!items.length) return;
  ctx.save();
  let size = o.size || 2.6, rows, lh;
  for (let pass = 0; pass < 40; pass++) {
    fontStyle(ctx, size, o);
    rows = items.flatMap(v => wrapText(ctx, v, width));
    lh = size * (o.leading || 1.25);
    if (rows.length * lh <= height) break;
    size *= 0.94;
  }
  let top = y;
  if (o.bottom) top += height - rows.length * lh;
  const tx = o.align === 'right' ? x + width : o.align === 'center' ? x + width / 2 : x;
  rows.forEach((row, i) => text(ctx, row, tx, top + i * lh, {
    ...o, size, max: width, baseline: 'top',
  }));
  ctx.restore();
}

function fillAll(ctx, color) {
  ctx.fillStyle = color;
  ctx.fillRect(-CARD.B, -CARD.B, CARD.W + 2 * CARD.B, CARD.H + 2 * CARD.B);
}

function logo(ctx, img, x, y, maxW, maxH, align = 'left', valign = 'top') {
  if (!img || !img.width || !img.height) return;
  const scale = Math.min(maxW / img.width, maxH / img.height);
  const w = img.width * scale, h = img.height * scale;
  const dx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  const dy = valign === 'middle' ? y - h / 2 : valign === 'bottom' ? y - h : y;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, dx, dy, w, h);
}

function wordmark(ctx, d, x, y, o = {}) {
  const size = o.size || 5;
  const img = o.reverse ? d.logoWhite : d.logo;
  if (img) {
    logo(ctx, img, x, y - size * 0.35, o.max || 80, o.height || size * 1.15, o.align || 'left', 'middle');
  } else {
    text(ctx, d.info.company, x, y, { font: d.display, color: d.c, max: 80, ...o });
  }
}

function identity(ctx, d, x, y, width, o = {}) {
  text(ctx, d.info.name, x, y, { font: d.display, size: 5, color: d.c, max: width, ...o });
  block(ctx, [d.info.nameEn, d.info.title], o.align === 'right' ? x - width : x, y + 2, width, 10, {
    font: d.font, color: o.color || d.c, size: 2.4, align: o.align,
  });
}

function contactValues(d) {
  return [d.info.phone, d.info.tel, d.info.email, d.info.web, d.info.address];
}
function contactBlock(ctx, d, x, y, width, height, o = {}) {
  block(ctx, contactValues(d), x, y, width, height, { font: d.font, color: d.c, size: 2.6, ...o });
}
function splitContacts(ctx, d, y = 34, o = {}) {
  block(ctx, [d.info.phone, d.info.tel, d.info.email, d.info.web], 5, y, 46, 46 - y, {
    font: d.font, size: 2.4, color: d.c, bottom: true, ...o,
  });
  block(ctx, [d.info.address], 59, y, 26, 46 - y, {
    font: d.font, size: 2.4, color: d.c, bottom: true, ...o,
  });
}
function companyLines(d) {
  const value = String(d.info.company || '').trim();
  if (!value) return [];
  const words = value.split(/\s+/);
  if (words.length > 1) {
    const midpoint = Math.ceil(words.length / 2);
    return [words.slice(0, midpoint).join(' '), words.slice(midpoint).join(' ')];
  }
  // Keep short Latin wordmarks intact; Korean wordmarks can break between syllables.
  if (/[가-힣]/.test(value) && value.length > 2) {
    const mid = Math.ceil(value.length / 2);
    return [value.slice(0, mid), value.slice(mid)];
  }
  return [value];
}
function square(ctx, x, y, size, color) {
  ctx.fillStyle = color; ctx.fillRect(x, y, size, size);
}
function thinLine(ctx, x1, y1, x2, y2, color, width = 0.15) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
}
function relief(ctx, color) {
  ctx.save(); ctx.strokeStyle = color; ctx.globalAlpha = 0.12; ctx.lineWidth = 0.13;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath(); ctx.moveTo(46 + i * 4, -1);
    ctx.bezierCurveTo(47 + i * 4, 15, 65 + i * 2, 25 - i * 3, 91, 30 - i * 3);
    ctx.stroke();
  }
  ctx.restore();
}

// Each template owns a recommended ink/paper palette and a display typeface.
// Front = brand face; back = contact face. All contact fields are retained.
const TEMPLATES = [
  {
    id: 'air', name: '에어', description: '작은 워드마크, 크게 비운 여백',
    palette: ['#191918', '#e9e5db'], display: SANS,
    front(ctx, d) {
      fillAll(ctx, d.a);
      wordmark(ctx, d, 45, 8, { size: 4.4, w: 500, align: 'center', max: 70, height: 7 });
      block(ctx, [d.info.tagline || d.info.title, d.info.web], 8, 36, 74, 10, {
        font: d.font, size: 3.2, color: d.c, align: 'center', bottom: true,
      });
    },
    back(ctx, d) {
      fillAll(ctx, d.a);
      identity(ctx, d, 5, 10, 56, { size: 4.6, w: 500 });
      splitContacts(ctx, d, 32, { size: 2.6 });
    },
  },
  {
    id: 'serif', name: '세리프 스튜디오', description: '큰 명조와 단정한 고딕의 대비',
    palette: ['#131313', '#f5f4f0'], display: SERIF,
    front(ctx, d) {
      fillAll(ctx, d.a);
      text(ctx, d.info.company, 45, 8, { font: d.font, color: d.c, size: 3.2, w: 700, align: 'center', max: 78 });
      if (d.logo) wordmark(ctx, d, 45, 40, { size: 11, max: 80, height: 19, align: 'center' });
      else text(ctx, d.info.tagline || d.info.company, 45, 44, {
        font: d.display, size: 10.5, color: d.c, align: 'center', max: 82,
      });
    },
    back(ctx, d) {
      fillAll(ctx, d.a);
      text(ctx, d.info.name, 45, 12, { font: d.display, color: d.c, size: 8, align: 'center', max: 80 });
      block(ctx, [d.info.nameEn, d.info.title], 5, 15, 80, 8, { font: d.font, color: d.c, size: 2.5, align: 'center' });
      contactBlock(ctx, d, 8, 27, 74, 19, { align: 'center', bottom: true, size: 2.5, leading: 1.12 });
    },
  },
  {
    id: 'signal', name: '시그널', description: '선명한 그린과 회전한 볼드 타이프',
    palette: ['#111c12', '#30dc35'], display: SANS,
    front(ctx, d) {
      fillAll(ctx, d.a);
      ctx.save(); ctx.translate(25, 45); ctx.rotate(-Math.PI / 2);
      wordmark(ctx, d, 0, 0, { size: 15, w: 700, max: 40, height: 19 }); ctx.restore();
      ctx.save(); ctx.translate(62, 45); ctx.rotate(-Math.PI / 2);
      text(ctx, d.info.name, 0, 0, { font: d.display, size: 10.5, w: 700, color: d.c, max: 40 });
      block(ctx, [d.info.nameEn, d.info.title], 0, 3, 40, 14, { font: d.font, size: 3, w: 700, color: d.c }); ctx.restore();
    },
    back(ctx, d) {
      fillAll(ctx, d.a);
      contactBlock(ctx, d, 5, 5, 80, 33, { size: 4.4, w: 700, leading: 1.03 });
      text(ctx, d.info.company, 85, 46, { font: d.font, size: 2.8, w: 700, align: 'right', color: d.c, max: 80 });
    },
  },
  {
    id: 'monogram', name: '모노그램', description: '거대한 이니셜과 작은 바이올렛 점',
    palette: ['#101010', '#7755d8'], display: SANS,
    front(ctx, d) {
      fillAll(ctx, '#ffffff'); square(ctx, 5, 5, 3.5, d.a);
      ctx.save(); ctx.translate(83, 45); ctx.rotate(-Math.PI / 2);
      if (d.logo) logo(ctx, d.logo, 0, 0, 40, 28, 'left', 'bottom');
      else text(ctx, d.initials, 0, 0, { font: d.display, size: 30, w: 500, color: d.c, max: 40 });
      ctx.restore();
      text(ctx, d.info.company, 5, 45, { font: d.font, size: 2.6, color: d.c, max: 43 });
    },
    back(ctx, d) {
      fillAll(ctx, '#ffffff');
      text(ctx, d.info.name, 5, 8, { font: d.font, size: 3.2, color: d.c, max: 40 });
      text(ctx, d.info.nameEn, 5, 12, { font: d.font, size: 2.4, color: d.c, max: 40 });
      block(ctx, [d.info.title, d.info.tagline], 48, 15, 37, 13, { font: d.font, size: 2.9, color: d.a });
      contactBlock(ctx, d, 5, 29, 80, 17, { size: 2.6, bottom: true, leading: 1.12 });
    },
  },
  {
    id: 'folio', name: '폴리오', description: '낮게 놓은 워드마크와 비대칭 정보',
    palette: ['#161813', '#e8e9e1'], display: SANS,
    front(ctx, d) {
      fillAll(ctx, d.a);
      block(ctx, [d.info.tagline || d.info.title], 50, 5, 35, 10, { font: d.font, size: 3.4, color: d.c });
      ctx.save(); ctx.globalAlpha = 0.15; thinLine(ctx, -1, 17, 91, 17, d.c); ctx.restore();
      wordmark(ctx, d, 85, 44, { size: 16, w: 400, max: 80, height: 24, align: 'right' });
    },
    back(ctx, d) {
      fillAll(ctx, d.a);
      text(ctx, d.info.name, 5, 12, { font: d.display, size: 7.2, color: d.c, max: 41 });
      block(ctx, [d.info.nameEn, d.info.title], 5, 15, 39, 10, { font: d.font, size: 2.4, color: d.c });
      block(ctx, [d.info.phone, d.info.tel, d.info.email], 50, 5, 35, 21, { font: d.font, size: 2.8, color: d.c });
      block(ctx, [d.info.web], 5, 31, 40, 14, { font: d.font, size: 3.2, color: d.c });
      block(ctx, [d.info.address], 50, 32, 35, 14, { font: d.font, size: 2.8, color: d.c, bottom: true });
    },
  },
  {
    id: 'grove', name: '그로브', description: '포레스트 그린과 절제된 곡선',
    palette: ['#124c38', '#f5f5ef'], display: SANS,
    front(ctx, d) {
      fillAll(ctx, d.c);
      wordmark(ctx, d, 45, 30, { size: 13, w: 500, color: d.a, max: 74, height: 22, align: 'center', reverse: true });
    },
    back(ctx, d) {
      fillAll(ctx, d.a); relief(ctx, d.c);
      wordmark(ctx, d, 5, 11, { size: 6, w: 700, max: 40, height: 9 });
      text(ctx, d.info.name, 5, 27, { font: d.font, size: 3.8, w: 700, color: d.c, max: 48 });
      text(ctx, [d.info.nameEn, d.info.title].filter(Boolean).join(' / '), 5, 31, { font: d.font, size: 2.5, color: d.c, max: 80 });
      splitContacts(ctx, d, 34);
    },
  },
  {
    id: 'offset', name: '오프셋', description: '엇갈린 두 줄의 라일락 워드마크',
    palette: ['#312a48', '#e1dcef'], display: SANS,
    front(ctx, d) {
      fillAll(ctx, d.a);
      text(ctx, d.info.tagline || d.info.title, 5, 8, { font: d.font, size: 2.6, color: d.c, max: 80 });
      const rows = companyLines(d);
      if (d.logo || rows.length < 2) wordmark(ctx, d, 85, 40, { size: 16, max: 78, align: 'right', height: 23 });
      else {
        text(ctx, rows[0], 5, 27, { font: d.display, size: 16, color: d.c, max: 65 });
        text(ctx, rows[1], 85, 44, { font: d.display, size: 16, color: d.c, max: 65, align: 'right' });
      }
    },
    back(ctx, d) {
      fillAll(ctx, d.a);
      identity(ctx, d, 85, 12, 62, { size: 6, align: 'right' });
      contactBlock(ctx, d, 5, 29, 66, 17, { size: 2.6, bottom: true });
    },
  },
  {
    id: 'poster', name: '타입 포스터', description: '코발트 블루 위의 대담한 활자',
    palette: ['#253fc5', '#f2f1e9'], display: SANS,
    front(ctx, d) {
      fillAll(ctx, d.c);
      if (d.logo) wordmark(ctx, d, 5, 34, { size: 21, max: 80, height: 29, reverse: true });
      else {
        const rows = companyLines(d);
        rows.forEach((row, i) => text(ctx, row, 4, rows.length === 1 ? 34 : 22 + i * 21, {
          font: d.display, size: 21, w: 700, color: d.a, max: 82, ls: -0.35,
        }));
      }
      text(ctx, d.info.web, 85, 47, { font: d.font, size: 2.2, color: d.a, max: 76, align: 'right' });
    },
    back(ctx, d) {
      fillAll(ctx, d.a);
      identity(ctx, d, 5, 15, 80, { size: 10, w: 700 });
      splitContacts(ctx, d, 32, { size: 2.7 });
    },
  },
  {
    id: 'index', name: '인덱스', description: '정보의 정렬만으로 만드는 질서',
    palette: ['#141414', '#ffffff'], display: SANS,
    front(ctx, d) {
      fillAll(ctx, d.a);
      wordmark(ctx, d, 5, 10, { size: 4, max: 41, height: 7 });
      block(ctx, [d.info.tagline || d.info.title], 52, 5, 33, 12, { font: d.font, size: 2.7, color: d.c });
      text(ctx, d.info.web || d.info.company, 5, 44, { font: d.display, size: 8.5, w: 500, color: d.c, max: 80 });
    },
    back(ctx, d) {
      fillAll(ctx, d.a);
      text(ctx, d.info.name, 5, 10, { font: d.display, size: 5.6, color: d.c, max: 40 });
      text(ctx, d.info.nameEn, 5, 15, { font: d.font, size: 2.5, color: d.c, max: 40 });
      block(ctx, [d.info.title], 52, 6, 33, 13, { font: d.font, size: 2.7, color: d.c });
      const rows = [['Mobile', d.info.phone], ['Office', d.info.tel], ['Email', d.info.email], ['Web', d.info.web], ['Address', d.info.address]].filter(([, v]) => v && v.trim());
      rows.forEach(([label, value], i) => {
        const y = 24 + i * 4.5;
        text(ctx, label, 5, y, { font: d.font, size: 2.4, color: d.c });
        text(ctx, value, 28, y, { font: d.font, size: 2.6, color: d.c, max: 57 });
      });
    },
  },
  {
    id: 'verso', name: '버소', description: '블랙과 버터 옐로의 반전',
    palette: ['#171710', '#eeed9a'], display: SANS,
    front(ctx, d) {
      fillAll(ctx, d.c);
      text(ctx, d.info.tagline || d.info.title, 5, 8, { font: d.font, size: 2.6, color: d.a, max: 80 });
      wordmark(ctx, d, 85, 42, { size: 17, max: 80, w: 500, color: d.a, align: 'right', height: 26, reverse: true });
    },
    back(ctx, d) {
      fillAll(ctx, d.a);
      identity(ctx, d, 5, 12, 80, { size: 6.5 });
      contactBlock(ctx, d, 38, 28, 47, 18, { size: 2.6, bottom: true, align: 'right' });
    },
  },
  {
    id: 'vertical', name: '버티컬', description: '방향을 바꾼 활자와 열린 공간',
    palette: ['#2c362d', '#e3e8df'], display: SANS,
    front(ctx, d) {
      fillAll(ctx, d.a);
      ctx.save(); ctx.translate(25, 45); ctx.rotate(-Math.PI / 2);
      wordmark(ctx, d, 0, 0, { size: 19, max: 40, height: 24 }); ctx.restore();
      block(ctx, [d.info.tagline || d.info.title], 50, 5, 35, 19, { font: d.font, size: 3.1, color: d.c });
      text(ctx, d.info.web, 85, 46, { font: d.font, size: 2.7, color: d.c, max: 47, align: 'right' });
    },
    back(ctx, d) {
      fillAll(ctx, d.a);
      ctx.save(); ctx.translate(13, 45); ctx.rotate(-Math.PI / 2);
      text(ctx, d.info.name, 0, 0, { font: d.display, size: 7, color: d.c, max: 40 });
      text(ctx, d.info.nameEn, 0, 5, { font: d.font, size: 2.5, color: d.c, max: 40 }); ctx.restore();
      block(ctx, [d.info.title], 34, 6, 51, 12, { font: d.font, size: 2.8, color: d.c });
      contactBlock(ctx, d, 34, 25, 51, 21, { size: 2.7, bottom: true });
    },
  },
  {
    id: 'signature', name: '시그니처', description: '유려한 이니셜, 담백한 작은 글자',
    palette: ['#34261e', '#f0e8df'], display: SERIF,
    front(ctx, d) {
      fillAll(ctx, d.a);
      text(ctx, d.info.company, 5, 8, { font: d.font, size: 2.8, color: d.c, max: 80 });
      if (d.logo) logo(ctx, d.logo, 45, 28, 64, 25, 'center', 'middle');
      else text(ctx, d.initials, 45, 38, { font: d.display, size: 31, color: d.c, max: 70, align: 'center', ls: -1 });
      text(ctx, d.info.web, 85, 46, { font: d.font, size: 2.6, color: d.c, max: 80, align: 'right' });
    },
    back(ctx, d) {
      fillAll(ctx, d.a);
      text(ctx, d.info.name, 5, 15, { font: d.display, size: 9, color: d.c, max: 80 });
      text(ctx, d.info.nameEn, 5, 21, { font: d.font, size: 2.7, color: d.c, max: 80 });
      text(ctx, d.info.title, 85, 30, { font: d.font, size: 2.7, color: d.c, max: 80, align: 'right' });
      splitContacts(ctx, d, 34);
    },
  },
];

function templateStyle(tpl, data) {
  const [c, a] = data.customColors ? [data.c, data.a] : tpl.palette;
  const automatic = !data.font || data.font === 'auto';
  return { ...data, c, a, font: automatic ? SANS : data.font, display: automatic ? tpl.display : data.font };
}

function renderCard(canvas, tpl, side, data, { dpi = 300, bleed = false } = {}) {
  const { W, H, B } = CARD;
  const b = bleed ? B : 0, scale = dpi / 25.4;
  canvas.width = Math.round((W + 2 * b) * scale);
  canvas.height = Math.round((H + 2 * b) * scale);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(scale, 0, 0, scale, b * scale, b * scale);
  tpl[side](ctx, templateStyle(tpl, data));
  return canvas;
}
