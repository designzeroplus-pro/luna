// Preview-only finishes. The print renderer and exported artwork stay flat.
const MOCKUP_FINISHES = {
  air: 'deboss', atelier: 'deboss', column: 'deboss',
  grove: 'silk', poster: 'silk', nocturne: 'silk',
};
const FINISH_LABELS = { deboss: '음각', silk: '실크 코팅' };

function applyDebossPreview(canvas, side) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const image = ctx.getImageData(0, 0, width, height);
  const pixels = image.data;
  const paper = [...pixels.slice(0, 3)];
  const mask = new Float32Array(width * height);
  // Extract the actual live artwork, including custom logos and edited text.
  for (let p = 0; p < mask.length; p++) {
    const i = p * 4;
    const difference = Math.max(Math.abs(pixels[i] - paper[0]),
      Math.abs(pixels[i + 1] - paper[1]), Math.abs(pixels[i + 2] - paper[2]));
    mask[p] = Math.min(1, difference / 70);
  }
  const depth = Math.max(1, Math.round(width / 420));
  const softness = side === 'front' ? 0.62 : 0.28;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = y * width + x, i = p * 4, ink = mask[p];
    const before = x >= depth && y >= depth ? mask[(y - depth) * width + x - depth] : 0;
    const after = x + depth < width && y + depth < height ? mask[(y + depth) * width + x + depth] : 0;
    // Dark inner upper edge and a lit lower lip give an inset impression.
    const light = (before - ink) * 32 + (ink - after) * 22;
    for (let c = 0; c < 3; c++) {
      pixels[i + c] = Math.max(0, Math.min(255,
        pixels[i + c] * (1 - softness * ink) + paper[c] * softness * ink + light));
    }
  }
  ctx.putImageData(image, 0, 0);
}
