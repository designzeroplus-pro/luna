const STORAGE_KEY = 'luna-namecard-v1';

const PALETTES = [
  ['#191918', '#e9e5db'],
  ['#131313', '#ffffff'],
  ['#111c12', '#30dc35'],
  ['#124c38', '#f5f5ef'],
  ['#253fc5', '#f2f1e9'],
  ['#312a48', '#e1dcef'],
  ['#171710', '#eeed9a'],
];

const DEFAULT_STATE = {
  designVersion: 2,
  template: 'horizon',
  c: PALETTES[0][0],
  a: PALETTES[0][1],
  font: 'auto',
  customColors: false,
  useLogo: false,
  info: {
    name: '이월터', nameEn: 'Walter Lee', title: '대표이사 / CEO', titleEn: '', company: 'LUNA', tagline: '',
    phone: '010-1234-5678', tel: '02-123-4567', email: 'walter@luna.co.kr',
    web: 'www.luna.co.kr', address: '서울특별시 강남구 테헤란로 123, 4층',
  },
  logoMode: 'maker',
  logo: {
    symbol: 'initials', initials: 'L', shape: 'rounded', style: 'fill', layout: 'horizontal',
    font: 'Noto Sans KR', word: 'LUNA', color: '#1f3a5f', inner: '#ffffff', wordColor: '#1d1d1f',
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
    if (saved) {
      const merged = { ...DEFAULT_STATE, ...saved, info: { ...DEFAULT_STATE.info, ...saved.info }, logo: { ...DEFAULT_STATE.logo, ...saved.logo } };
      if (saved.designVersion !== 2) {
        // Preserve personal information and logo settings while replacing the old design collection.
        Object.assign(merged, { designVersion: 2, template: 'air', font: 'auto', customColors: false, useLogo: false });
      }
      if (!TEMPLATES.some(t => t.id === merged.template)) merged.template = 'air';
      // 예전 버전의 예시 값이 그대로 남아 있으면 현재 예시 값으로 교체
      const OLD_SAMPLES = {
        info: {
          name: ['홍길동'], nameEn: ['Gildong Hong'], company: ['한빛테크', '루나'],
          email: ['gildong@hanbit.co.kr', 'gildong@luna.co.kr'], web: ['www.hanbit.co.kr'],
        },
        logo: { initials: ['HB'], word: ['한빛테크', '루나'] },
      };
      for (const group of ['info', 'logo'])
        for (const [k, olds] of Object.entries(OLD_SAMPLES[group]))
          if (olds.includes(merged[group][k])) merged[group][k] = DEFAULT_STATE[group][k];
      return merged;
    }
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
  const fonts = new Set([state.font === 'auto' ? SANS : state.font, state.logo.font, SANS, SERIF, 'Pretendard', 'Noto Sans KR', 'Noto Serif KR']);
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
  return {
    info: state.info, c: state.c, a: state.a, font: state.font, customColors: state.customColors,
    initials: state.logo.initials,
    ...(state.useLogo ? logos : { logo: null, logoWhite: null }),
  };
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
  if (currentView() === 'home') { renderGallery(data); return; }
  const tpl = tplById(state.template);
  $('#previewName').textContent = tpl.name;
  $('#previewDescription').textContent = tpl.description;
  for (const side of ['front', 'back']) {
    const cv = $('#' + side);
    renderCard(cv, tpl, side, data, { dpi: previewDpi(cv) });
  }
  paintLogoPreview($('#logoPreview'), logos.logo);
  paintLogoPreview($('#logoPreviewDark'), logos.logoWhite);
  $$('.tpl').forEach((btn) => {
    const template = tplById(btn.dataset.id);
    btn.querySelectorAll('canvas').forEach(cv => {
      renderCard(cv, template, cv.dataset.side, data, { dpi: 100 });
    });
    const selected = btn.dataset.id === state.template;
    btn.classList.toggle('active', selected);
    btn.setAttribute('aria-pressed', String(selected));
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
      $$(`[data-info="${key}"]`).forEach((o) => { if (o !== el) o.value = el.value; });
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
  $('#useLogo').checked = state.useLogo;
  $('#useLogo').addEventListener('change', e => { state.useLogo = e.target.checked; scheduleRender(); });

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
  $('#tplCount').textContent = `${TEMPLATES.length}종`;
  TEMPLATES.forEach((t) => {
    const btn = document.createElement('button');
    btn.className = 'tpl';
    btn.dataset.id = t.id;
    btn.type = 'button';
    btn.setAttribute('aria-label', `${t.name}: ${t.description}`);
    btn.innerHTML = `<div class="tpl-pair"><canvas data-side="front" aria-hidden="true"></canvas><canvas data-side="back" aria-hidden="true"></canvas></div><span>${t.name}</span><small>${t.description}</small>`;
    btn.addEventListener('click', () => { state.template = t.id; syncColors(); scheduleRender(); });
    grid.appendChild(btn);
  });

  // 색상
  const sw = $('#swatches');
  const syncColors = () => {
    const { c, a } = templateStyle(tplById(state.template), cardData({}));
    $('#mainColor').value = c;
    $('#accentColor').value = a;
    $('#recommendedColors').checked = !state.customColors;
    $$('.swatch').forEach((s) => s.classList.toggle('active', s.dataset.c === c && s.dataset.a === a));
  };
  const customizeColors = () => {
    const { c, a } = templateStyle(tplById(state.template), cardData({}));
    state.c = c; state.a = a; state.customColors = true;
  };
  $('#recommendedColors').addEventListener('change', e => {
    if (e.target.checked) state.customColors = false;
    else customizeColors();
    syncColors(); scheduleRender();
  });
  PALETTES.forEach(([c, a]) => {
    const s = document.createElement('button');
    s.className = 'swatch';
    s.dataset.c = c; s.dataset.a = a;
    s.title = `${c} / ${a}`;
    s.setAttribute('aria-label', `색상 ${c} / ${a}`);
    s.style.background = `linear-gradient(135deg, ${c} 0 60%, ${a} 60%)`;
    s.addEventListener('click', () => {
      // 로고 색이 메인 색을 따라가고 있었다면 함께 변경
      if (state.logo.color === state.c) { state.logo.color = c; $('[data-logo="color"]').value = c; }
      state.c = c; state.a = a; state.customColors = true; syncColors(); scheduleRender();
    });
    sw.appendChild(s);
  });
  $('#mainColor').addEventListener('input', (e) => { customizeColors(); state.c = e.target.value; syncColors(); scheduleRender(); });
  $('#accentColor').addEventListener('input', (e) => { customizeColors(); state.a = e.target.value; syncColors(); scheduleRender(); });
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

// ───────── 메인 갤러리 ─────────
const TAGS = {
  horizon: ['minimal', 'classic'],
  air: ['minimal'], serif: ['classic'], signal: ['bold'], monogram: ['minimal'],
  folio: ['minimal'], grove: ['classic'], offset: ['bold'], poster: ['bold'],
  index: ['minimal'], verso: ['bold'], vertical: ['bold'], signature: ['classic'],
};
const CATEGORIES = [['all', '전체'], ['minimal', '미니멀'], ['classic', '클래식'], ['bold', '볼드']];
let category = 'all';

function buildGallery() {
  const chips = $('#chips');
  CATEGORIES.forEach(([id, label]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.dataset.cat = id; b.textContent = label;
    b.addEventListener('click', () => { category = id; filterGallery(); });
    chips.appendChild(b);
  });

  const grid = $('#gallery-grid');
  TEMPLATES.forEach((t) => {
    const a = document.createElement('a');
    a.className = 'gtile';
    a.href = '#edit';
    a.dataset.id = t.id;
    a.setAttribute('aria-label', `${t.name} 템플릿으로 시작: ${t.description}`);
    a.innerHTML = `
      <div class="gstage">
        <canvas data-side="front" aria-hidden="true"></canvas>
        <canvas data-side="back" aria-hidden="true"></canvas>
      </div>
      <div class="gmeta"><span><b>${t.name}</b><small>${t.description}</small></span><em>편집하기 →</em></div>`;
    // 편집기의 템플릿 버튼을 눌러 색상 상태까지 함께 맞춘다
    a.addEventListener('click', () => { $(`.tpl[data-id="${t.id}"]`).click(); openTab('info'); });
    grid.appendChild(a);
  });
  $('#heroCount').textContent = TEMPLATES.length;
  $('#statCount').textContent = TEMPLATES.length;
  filterGallery();
}

function filterGallery() {
  $$('.chip').forEach((c) => c.classList.toggle('active', c.dataset.cat === category));
  $$('.gtile').forEach((t) => { t.hidden = category !== 'all' && !(TAGS[t.dataset.id] || []).includes(category); });
}

function renderGallery(data) {
  $$('.gtile').forEach((tile) => {
    const tpl = tplById(tile.dataset.id);
    tile.querySelectorAll('canvas').forEach((cv) => renderCard(cv, tpl, cv.dataset.side, data, { dpi: previewDpi(cv) }));
  });
}

// ───────── 화면 전환 (#edit = 편집기, 그 외 = 메인) ─────────
function currentView() { return location.hash === '#edit' ? 'edit' : 'home'; }
function openTab(name) { $(`.tab[data-tab="${name}"]`)?.click(); }

function route() {
  const view = currentView();
  $('#homeView').hidden = view !== 'home';
  $('#editorView').hidden = view !== 'edit';
  $('#topCta').hidden = view === 'edit';
  document.body.dataset.view = view;
  if (view === 'edit') window.scrollTo(0, 0);
  else if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
  scheduleRender();
}

// ───────── 시작 ─────────
bindUI();
buildGallery();
$('#heroLogo').addEventListener('click', () => setTimeout(() => openTab('logo')));
window.addEventListener('hashchange', route);
route();
loadUpload().then(render);
document.fonts.ready.then(scheduleRender);
