// Measure the live word so its underline and spacing follow the actual letters.
(() => {
  const word = document.getElementById('heroWord');
  const toggle = document.getElementById('heroMotionToggle');
  if (!word || !toggle || !Element.prototype.animate) return;

  const content = document.createElement('span');
  content.className = 'hero-word-content';
  word.replaceChildren(content);
  const fitWord = () => { word.style.width = `${content.getBoundingClientRect().width}px`; };
  const sizeObserver = new ResizeObserver(fitWord);
  sizeObserver.observe(content);

  const words = ['나다운', '감각적인', '기억되는', '남다른'];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0;
  let timer;
  let generation = 0;
  let paused = false;
  let visible = false;
  const canRun = () => !paused && visible && !document.hidden && !reducedMotion.matches;

  function setWord(value) {
    content.replaceChildren(...Array.from(value, character => {
      const letter = document.createElement('span');
      letter.className = 'hero-letter';
      letter.textContent = character;
      return letter;
    }));
    fitWord();
  }

  function stop() {
    generation++;
    clearTimeout(timer);
    word.classList.remove('is-changing');
    word.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
  }

  async function animateLetters(entering) {
    const animations = [...content.children].map((letter, position) => letter.animate(
      entering
        ? [{ transform: 'translateY(85%)', opacity: 0, filter: 'blur(4px)' },
           { transform: 'translateY(0)', opacity: 1, filter: 'blur(0)' }]
        : [{ transform: 'translateY(0)', opacity: 1, filter: 'blur(0)' },
           { transform: 'translateY(-75%)', opacity: 0, filter: 'blur(4px)' }],
      { duration: entering ? 460 : 280, delay: position * 45,
        easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' }
    ));
    await Promise.allSettled(animations.map(animation => animation.finished));
    return animations;
  }

  function schedule() {
    if (canRun()) timer = setTimeout(advance, 2400);
  }

  async function advance() {
    if (!canRun()) return;
    const current = generation;
    word.classList.add('is-changing');
    await animateLetters(false);
    if (current !== generation || !canRun()) return;
    index = (index + 1) % words.length;
    setWord(words[index]);
    word.classList.remove('is-changing');
    const animations = await animateLetters(true);
    if (current !== generation || !canRun()) return;
    animations.forEach(animation => animation.cancel());
    schedule();
  }

  function sync() {
    stop();
    if (reducedMotion.matches) { index = 0; setWord(words[0]); }
    toggle.hidden = reducedMotion.matches;
    schedule();
  }

  toggle.addEventListener('click', () => {
    paused = !paused;
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', `텍스트 애니메이션 ${paused ? '재생' : '일시정지'}`);
    sync();
  });
  reducedMotion.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    sync();
  }, { threshold: 0.15 });
  setWord(words[0]);
  observer.observe(word);
})();
