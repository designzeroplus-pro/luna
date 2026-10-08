// 로고 생성기: 옵션을 받아 투명 배경 캔버스를 만든다.
// variant: 'color'(기본) | 'white'(어두운 배경용)

const LOGO_MARK = 360; // 심볼 기준 크기(px)
const LOGO_PAD = 10;

function shapePath(ctx, shape, x, y, s) {
  const cx = x + s / 2, cy = y + s / 2;
  ctx.beginPath();
  switch (shape) {
    case 'circle':
      ctx.arc(cx, cy, s / 2, 0, Math.PI * 2);
      break;
    case 'rounded':
      ctx.roundRect(x, y, s, s, s * 0.22);
      break;
    case 'square':
      ctx.rect(x, y, s, s);
      break;
    case 'hexagon':
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + (i * Math.PI) / 3;
        ctx.lineTo(cx + (s / 2) * Math.cos(a), cy + (s / 2) * Math.sin(a));
      }
      ctx.closePath();
      break;
    case 'diamond':
      ctx.moveTo(cx, y); ctx.lineTo(x + s, cy); ctx.lineTo(cx, y + s); ctx.lineTo(x, cy);
      ctx.closePath();
      break;
    case 'shield':
      ctx.moveTo(x + s * 0.1, y + s * 0.05);
      ctx.lineTo(x + s * 0.9, y + s * 0.05);
      ctx.lineTo(x + s * 0.9, y + s * 0.5);
      ctx.quadraticCurveTo(x + s * 0.88, y + s * 0.85, cx, y + s);
      ctx.quadraticCurveTo(x + s * 0.12, y + s * 0.85, x + s * 0.1, y + s * 0.5);
      ctx.closePath();
      break;
  }
}

function drawSymbol(ctx, sym, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  switch (sym) {
    case 'mountain':
      ctx.moveTo(x, y + s * 0.85);
      ctx.lineTo(x + s * 0.38, y + s * 0.18);
      ctx.lineTo(x + s * 0.6, y + s * 0.56);
      ctx.lineTo(x + s * 0.74, y + s * 0.36);
      ctx.lineTo(x + s, y + s * 0.85);
      ctx.closePath();
      ctx.fill();
      break;
    case 'wave':
      ctx.lineWidth = s * 0.1;
      for (let i = 0; i < 3; i++) {
        const yy = y + s * (0.25 + i * 0.25);
        ctx.moveTo(x + s * 0.05, yy);
        ctx.quadraticCurveTo(x + s * 0.275, yy - s * 0.14, x + s * 0.5, yy);
        ctx.quadraticCurveTo(x + s * 0.725, yy + s * 0.14, x + s * 0.95, yy);
      }
      ctx.stroke();
      break;
    case 'leaf':
      ctx.moveTo(x + s * 0.12, y + s * 0.88);
      ctx.bezierCurveTo(x + s * 0.05, y + s * 0.3, x + s * 0.5, y + s * 0.05, x + s * 0.92, y + s * 0.08);
      ctx.bezierCurveTo(x + s * 0.95, y + s * 0.5, x + s * 0.65, y + s * 0.95, x + s * 0.12, y + s * 0.88);
      ctx.fill();
      break;
    case 'star': {
      const cx = x + s / 2, cy = y + s * 0.53;
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? s * 0.22 : s * 0.5;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'bolt':
      ctx.moveTo(x + s * 0.58, y);
      ctx.lineTo(x + s * 0.18, y + s * 0.58);
      ctx.lineTo(x + s * 0.48, y + s * 0.58);
      ctx.lineTo(x + s * 0.4, y + s);
      ctx.lineTo(x + s * 0.82, y + s * 0.4);
      ctx.lineTo(x + s * 0.52, y + s * 0.4);
      ctx.closePath();
      ctx.fill();
      break;
    case 'orbit':
      ctx.lineWidth = s * 0.1;
      ctx.ellipse(x + s / 2, y + s / 2, s * 0.45, s * 0.2, -Math.PI / 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + s / 2, y + s / 2, s * 0.16, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
}

function drawInitials(ctx, text, cx, cy, size, font, color) {
  const len = [...text].length || 1;
  const k = len === 1 ? 0.56 : len === 2 ? 0.44 : 0.33;
  ctx.font = `700 ${size * k}px "${font}", "Noto Sans KR", sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const m = ctx.measureText(text);
  const asc = m.actualBoundingBoxAscent, desc = m.actualBoundingBoxDescent;
  ctx.fillText(text, cx, cy + (asc - desc) / 2);
}

function drawMark(ctx, o, x, y, S, variant) {
  const white = variant === 'white';
  const markColor = white ? '#ffffff' : o.color;
  const filled = o.style === 'fill' && o.shape !== 'none';
  let contentColor = markColor;
  if (filled) contentColor = white ? o.color : o.inner;

  if (o.shape !== 'none') {
    if (filled) {
      shapePath(ctx, o.shape, x, y, S);
      ctx.fillStyle = markColor;
      ctx.fill();
    } else {
      const lw = S * 0.06;
      shapePath(ctx, o.shape, x + lw / 2, y + lw / 2, S - lw);
      ctx.lineWidth = lw;
      ctx.strokeStyle = markColor;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  }

  const none = o.shape === 'none';
  if (o.symbol === 'initials') {
    drawInitials(ctx, o.initials || '?', x + S / 2, y + S / 2, none ? S * 1.5 : S, o.font, contentColor);
  } else {
    const inner = none ? S * 0.86 : S * 0.48;
    drawSymbol(ctx, o.symbol, x + (S - inner) / 2, y + (S - inner) / 2, inner, contentColor);
  }
}

function makeLogo(o, variant = 'color') {
  const S = LOGO_MARK, P = LOGO_PAD;
  const white = variant === 'white';
  const word = (o.word || '').trim();
  const layout = word ? o.layout : (o.layout === 'text' ? 'text' : 'mark');
  const wordFontSize = layout === 'vertical' ? S * 0.3 : S * 0.42;
  const wordWeight = o.font === 'Black Han Sans' ? 400 : 700;
  const wordFont = `${wordWeight} ${wordFontSize}px "${o.font}", "Noto Sans KR", sans-serif`;

  const m = document.createElement('canvas').getContext('2d');
  m.font = wordFont;
  const wm = m.measureText(word || ' ');
  const tw = Math.ceil(wm.width);
  const tAsc = wm.actualBoundingBoxAscent, tDesc = wm.actualBoundingBoxDescent;
  const gap = S * 0.22;

  let w, h;
  if (layout === 'horizontal') { w = S + gap + tw; h = S; }
  else if (layout === 'vertical') { w = Math.max(S, tw); h = S + gap + tAsc + tDesc; }
  else if (layout === 'text') { w = tw; h = tAsc + tDesc; }
  else { w = S; h = S; }

  const c = document.createElement('canvas');
  c.width = Math.ceil(w + P * 2);
  c.height = Math.ceil(h + P * 2);
  const ctx = c.getContext('2d');
  const wordColor = white ? '#ffffff' : o.wordColor;

  ctx.font = wordFont;
  ctx.textBaseline = 'alphabetic';
  if (layout === 'horizontal') {
    drawMark(ctx, o, P, P, S, variant);
    ctx.font = wordFont; ctx.fillStyle = wordColor; ctx.textAlign = 'left';
    ctx.fillText(word, P + S + gap, P + S / 2 + (tAsc - tDesc) / 2);
  } else if (layout === 'vertical') {
    drawMark(ctx, o, P + (w - S) / 2, P, S, variant);
    ctx.font = wordFont; ctx.fillStyle = wordColor; ctx.textAlign = 'center';
    ctx.fillText(word, P + w / 2, P + S + gap + tAsc);
  } else if (layout === 'text') {
    ctx.fillStyle = wordColor; ctx.textAlign = 'left';
    ctx.fillText(word, P, P + tAsc);
  } else {
    drawMark(ctx, o, P, P, S, variant);
  }
  return c;
}

// 업로드 이미지를 흰색 실루엣으로 변환
function whiteSilhouette(img) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, c.width, c.height);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}
