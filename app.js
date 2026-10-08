const STORAGE_KEY = 'luna-namecard-v1';

const PALETTES = [
  ['#1f3a5f', '#d9a441'],
  ['#0f5c4c', '#9fd3a8'],
  ['#8c1c2b', '#e9c46a'],
  ['#222222', '#ff7a1a'],
  ['#4b2e83', '#f2a7c3'],
  ['#0a6c8a', '#7fd1e3'],
  ['#5a4636', '#c9a77c'],
];

const DEFAULT_STATE = {
  template: 'classic',
  c: PALETTES[0][0],
  a: PALETTES[0][1],
  font: 'Noto Sans KR',
  info: {
    name: '홍길동', nameEn: 'Gildong Hong', title: '대표이사 / CEO', company: '한빛테크',
    phone: '010-1234-5678', tel: '02-123-4567', email: 'gildong@hanbit.co.kr',
    web: 'www.hanbit.co.kr', address: '서울특별시 강남구 테헤란로 123, 4층',
  },
  logoMode: 'maker',
  logo: {
    symbol: 'initials', initials: 'HB', shape: 'rounded', style: 'fill', layout: 'horizontal',
    font: 'Noto Sans KR', word: '한빛테크', color: '#1f3a5f', inner: '#ffffff', wordColor: '#1d1d1f',
  },
  upload: null,       // dataURL
  uploadWhite: false,
};

let state = load();
let uploadImg = null;
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) return { ...DEFAULT_STATE, ...saved, info: { ...DEFAULT_STATE.info, ...saved.info }, logo: { ...DEFAULT_STATE.logo, ...saved.logo } };
  } catch {}
  return structuredClone(DEFAULT_STATE);
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { // 업로드 이미지가 너무 크면 이미지만 빼고 저장
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, upload: null })); } catch {}
  }
}

// ───────── 폰트 준비 (한글 웹폰트는 글자 단위로 분할 로드되므로 실제 문자열로 요청) ─────────
async function prepFonts() {
  const sample = [...Object.values(state.info), state.logo.word, state.logo.initials, 'MTEWA·0123456789'].join('');
  const fonts = new Set([state.font, state.logo.font, 'Noto Sans KR']);
  const jobs = [];
  for (const f of fonts) for (const w of [400, 500, 700]) jobs.push(document.fonts.load(`${w} 16px "${f}"`, sample));
  await Promise.race([Promise.allSettled(jobs), new Promise((r) => setTimeout(r, 3000))]);
}

// ───────── 로고 ─────────
function currentLogos() {
  if (state.logoMode === 'none') return { logo: null, logoWhite: null };
  if (state.logoMode === 'upload') {
    if (!uploadImg) return { logo: null, logoWhite: null };
    return { logo: uploadImg, logoWhite: state.uploadWhite ? whiteSilhouette(uploadImg) : uploadImg };
  }
  return { logo: makeLogo(state.logo, 'color'), logoWhite: makeLogo(state.logo, 'white') };
}

function paintLogoPreview(canvas, img) {
  const r = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, r.width * dpr);
  canvas.height = Math.max(1, r.height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!img) return;
  const pad = 14 * dpr;
  const k = Math.min((canvas.width - pad * 2) / img.width, (canvas.height - pad * 2) / img.height);
  ctx.drawImage(img, (canvas.width - img.width * k) / 2, (canvas.height - img.height * k) / 2, img.width * k, img.height * k);
}

// ───────── 렌더링 ─────────
function cardData(logos) {
  return { info: state.info, c: state.c, a: state.a, font: state.font, ...logos };
}
const tplById = (id) => TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];

function previewDpi(canvas) {
  const w = canvas.getBoundingClientRect().width || 500;
  return Math.min(600, ((w * (window.devicePixelRatio || 1)) / CARD.W) * 25.4);
}

let rendering = null;
async function render() {
  await prepFonts();
  const logos = currentLogos();
  const data = cardData(logos);
  const tpl = tplById(state.template);
  for (const side of ['front', 'back']) {
    const cv = $('#' + side);
    renderCard(cv, tpl, side, data, { dpi: previewDpi(cv) });
  }
  paintLogoPreview($('#logoPreview'), logos.logo);
  paintLogoPreview($('#logoPreviewDark'), logos.logoWhite);
  $$('.tpl').forEach((btn) => {
    const cv = btn.querySelector('canvas');
    renderCard(cv, tplById(btn.dataset.id), 'front', data, { dpi: 120 });
    btn.classList.toggle('active', btn.dataset.id === state.template);
  });
}
function scheduleRender() {
  clearTimeout(rendering);
  rendering = setTimeout(() => { save(); render(); }, 80);
}

// ───────── UI 바인딩 ─────────
function bindUI() {
  $$('.tab').forEach((t) => t.addEventListener('click', () => {
    $$('.tab').forEach((x) => x.classList.toggle('active', x === t));
    $$('.tab-body').forEach((b) => b.classList.toggle('active', b.id === 'tab-' + t.dataset.tab));
    scheduleRender();
  }));

  $$('[data-info]').forEach((el) => {
    el.value = state.info[el.dataset.info] || '';
    el.addEventListener('input', () => {
      const key = el.dataset.info;
      // 로고 문구가 회사명과 같았다면 함께 갱신
      if (key === 'company' && state.logo.word === state.info.company) {
        state.logo.word = el.value;
        $('[data-logo="word"]').value = el.value;
      }
      state.info[key] = el.value;
      scheduleRender();
    });
  });

  $$('[data-logo]').forEach((el) => {
    el.value = state.logo[el.dataset.logo];
    el.addEventListener('input', () => { state.logo[el.dataset.logo] = el.value; scheduleRender(); });
  });

  const setMode = (m) => {
    state.logoMode = m;
    $$('#logoMode button').forEach((b) => b.classList.toggle('active', b.dataset.mode === m));
    $('#logoMaker').hidden = m !== 'maker';
    $('#logoUpload').hidden = m !== 'upload';
    scheduleRender();
  };
  $$('#logoMode button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  setMode(state.logoMode);

  $('#logoFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { state.upload = reader.result; loadUpload().then(scheduleRender); };
    reader.readAsDataURL(file);
  });
  $('#uploadWhite').checked = state.uploadWhite;
  $('#uploadWhite').addEventListener('change', (e) => { state.uploadWhite = e.target.checked; scheduleRender(); });

  // 템플릿 썸네일
  const grid = $('#tplGrid');
  TEMPLATES.forEach((t) => {
    const btn = document.createElement('button');
    btn.className = 'tpl';
    btn.dataset.id = t.id;
    btn.innerHTML = `<canvas></canvas><span>${t.name}</span>`;
    btn.addEventListener('click', () => { state.template = t.id; scheduleRender(); });
    grid.appendChild(btn);
  });

  // 색상
  const sw = $('#swatches');
  const syncColors = () => {
    $('#mainColor').value = state.c;
    $('#accentColor').value = state.a;
    $$('.swatch').forEach((s) => s.classList.toggle('active', s.dataset.c === state.c && s.dataset.a === state.a));
  };
  PALETTES.forEach(([c, a]) => {
    const s = document.createElement('button');
    s.className = 'swatch';
    s.dataset.c = c; s.dataset.a = a;
    s.title = `${c} / ${a}`;
    s.style.background = `linear-gradient(135deg, ${c} 0 60%, ${a} 60%)`;
    s.addEventListener('click', () => {
      // 로고 색이 메인 색을 따라가고 있었다면 함께 변경
      if (state.logo.color === state.c) { state.logo.color = c; $('[data-logo="color"]').value = c; }
      state.c = c; state.a = a; syncColors(); scheduleRender();
    });
    sw.appendChild(s);
  });
  $('#mainColor').addEventListener('input', (e) => { state.c = e.target.value; syncColors(); scheduleRender(); });
  $('#accentColor').addEventListener('input', (e) => { state.a = e.target.value; syncColors(); scheduleRender(); });
  syncColors();

  $('#cardFont').value = state.font;
  $('#cardFont').addEventListener('input', (e) => { state.font = e.target.value; scheduleRender(); });

  // 다운로드
  $('#dlLogo').addEventListener('click', () => downloadCanvas(makeLogo(state.logo, 'color'), 'logo.png', 'image/png'));
  $('#dlLogoWhite').addEventListener('click', () => downloadCanvas(makeLogo(state.logo, 'white'), 'logo-white.png', 'image/png'));
  $('#dlFrontJpg').addEventListener('click', (e) => withBusy(e.target, () => exportJpg('front')));
  $('#dlBackJpg').addEventListener('click', (e) => withBusy(e.target, () => exportJpg('back')));
  $('#dlPrintPdf').addEventListener('click', (e) => withBusy(e.target, exportPrintPdf));
  $('#dlA4Pdf').addEventListener('click', (e) => withBusy(e.target, exportA4Pdf));

  window.addEventListener('resize', scheduleRender);
}

function loadUpload() {
  if (!state.upload) { uploadImg = null; return Promise.resolve(); }
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      // SVG는 naturalWidth가 0일 수 있어 큰 래스터로 변환
      const w = img.naturalWidth || 1200, h = img.naturalHeight || 600;
      const k = Math.max(1, 1600 / Math.max(w, h));
      const c = document.createElement('canvas');
      c.width = Math.round(w * k); c.height = Math.round(h * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      uploadImg = c;
      res();
    };
    img.onerror = () => { uploadImg = null; res(); };
    img.src = state.upload;
  });
}

// ───────── 내보내기 ─────────
async function withBusy(btn, fn) {
  btn.disabled = true;
  const label = btn.textContent;
  btn.textContent = '만드는 중…';
  try { await fn(); }
  catch (err) { console.error(err); alert('파일을 만드는 중 문제가 생겼습니다: ' + err.message); }
  finally { btn.disabled = false; btn.textContent = label; }
}

function fileBase() {
  return (state.info.name || 'namecard').replace(/[\\/:*?"<>|\s]+/g, '_');
}

async function highRes(side, dpi, bleed) {
  await prepFonts();
  return renderCard(document.createElement('canvas'), tplById(state.template), side, cardData(currentLogos()), { dpi, bleed });
}

function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function downloadCanvas(canvas, name, type) {
  canvas.toBlob((b) => downloadBlob(b, name), type, 0.95);
}

// JPEG의 JFIF 헤더에 DPI 정보를 기록 (인쇄소에서 실제 크기로 인식되도록)
async function jpegWithDpi(canvas, dpi) {
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.95));
  const buf = new Uint8Array(await blob.arrayBuffer());
  const isJfif = buf[2] === 0xff && buf[3] === 0xe0 && String.fromCharCode(...buf.slice(6, 10)) === 'JFIF';
  if (isJfif) {
    buf[13] = 1;
    buf[14] = dpi >> 8; buf[15] = dpi & 0xff;
    buf[16] = dpi >> 8; buf[17] = dpi & 0xff;
  }
  return new Blob([buf], { type: 'image/jpeg' });
}

async function exportJpg(side) {
  const dpi = +$('#dpi').value;
  const bleed = $('#withBleed').checked;
  const cv = await highRes(side, dpi, bleed);
  downloadBlob(await jpegWithDpi(cv, dpi), `${fileBase()}_${side === 'front' ? '앞면' : '뒷면'}_${dpi}dpi.jpg`);
}

function cropMarks(pdf, x, y, w, h, gap, len) {
  pdf.setDrawColor(0); pdf.setLineWidth(0.1);
  for (const cx of [x, x + w]) {
    pdf.line(cx, y - gap - len, cx, y - gap);
    pdf.line(cx, y + h + gap, cx, y + h + gap + len);
  }
  for (const cy of [y, y + h]) {
    pdf.line(x - gap - len, cy, x - gap, cy);
    pdf.line(x + w + gap, cy, x + w + gap + len, cy);
  }
}

function requirePdf() {
  if (!window.jspdf) throw new Error('PDF 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.');
  return window.jspdf.jsPDF;
}

async function exportPrintPdf() {
  const jsPDF = requirePdf();
  const dpi = +$('#dpi').value;
  const { W, H, B } = CARD;
  const M = 6; // 재단선 여백
  const pw = W + 2 * B + 2 * M, ph = H + 2 * B + 2 * M;
  const pdf = new jsPDF({ unit: 'mm', format: [pw, ph], orientation: 'landscape' });
  let first = true;
  for (const side of ['front', 'back']) {
    if (!first) pdf.addPage([pw, ph], 'landscape');
    first = false;
    const cv = await highRes(side, dpi, true);
    pdf.addImage(cv.toDataURL('image/jpeg', 0.95), 'JPEG', M, M, W + 2 * B, H + 2 * B);
    cropMarks(pdf, M + B, M + B, W, H, B + 0.5, M - B - 1.5);
    pdf.setFontSize(5); pdf.setTextColor(120);
    pdf.text(`${side === 'front' ? 'FRONT' : 'BACK'}  ${W}x${H}mm  bleed ${B}mm  ${dpi}dpi`, M, ph - 1.5);
  }
  pdf.save(`${fileBase()}_인쇄용.pdf`);
}

async function exportA4Pdf() {
  const jsPDF = requirePdf();
  const dpi = +$('#dpi').value;
  const { W, H } = CARD;
  const cols = 2, rows = 5;
  const x0 = (210 - cols * W) / 2, y0 = (297 - rows * H) / 2;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  let first = true;
  for (const side of ['front', 'back']) {
    if (!first) pdf.addPage('a4');
    first = false;
    const img = (await highRes(side, dpi, false)).toDataURL('image/jpeg', 0.92);
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        pdf.addImage(img, 'JPEG', x0 + c * W, y0 + r * H, W, H, `card-${side}`);
    // 바깥 재단선
    pdf.setDrawColor(150); pdf.setLineWidth(0.1);
    for (let c = 0; c <= cols; c++) {
      const x = x0 + c * W;
      pdf.line(x, y0 - 8, x, y0 - 2); pdf.line(x, y0 + rows * H + 2, x, y0 + rows * H + 8);
    }
    for (let r = 0; r <= rows; r++) {
      const y = y0 + r * H;
      pdf.line(x0 - 8, y, x0 - 2, y); pdf.line(x0 + cols * W + 2, y, x0 + cols * W + 8, y);
    }
  }
  pdf.save(`${fileBase()}_A4_10장.pdf`);
}

// ───────── 시작 ─────────
bindUI();
loadUpload().then(render);
document.fonts.ready.then(scheduleRender);
