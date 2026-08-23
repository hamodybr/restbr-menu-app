(() => {
  if (!('ontouchstart' in window)) return;

  const MAX_SCALE = 2.25;
  const RESET_MS = 220;
  const SCALE_DEADZONE = 0.008;

  let active = false;
  let startDistance = 0;
  let lastScale = 1;
  let resetTimer = 0;

  const distance = touches => {
    const a = touches[0];
    const b = touches[1];
    return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
  };

  const midpoint = touches => ({
    x: (touches[0].clientX + touches[1].clientX) / 2 + window.scrollX,
    y: (touches[0].clientY + touches[1].clientY) / 2 + window.scrollY
  });

  const begin = event => {
    if (event.touches.length !== 2) return;

    clearTimeout(resetTimer);
    active = true;
    startDistance = Math.max(1, distance(event.touches));
    lastScale = 1;

    // Lock the zoom anchor once at the beginning of the gesture.
    // We intentionally do NOT follow the fingers' midpoint afterward,
    // because tiny hand movement makes the whole page appear to shake.
    const point = midpoint(event.touches);

    document.body.style.transition = 'none';
    document.body.style.transformOrigin = `${point.x}px ${point.y}px`;
    document.body.style.willChange = 'transform';
    document.body.style.transform = 'scale(1)';

    if (event.cancelable) event.preventDefault();
  };

  const move = event => {
    if (!active || event.touches.length !== 2) return;

    if (event.cancelable) event.preventDefault();

    const rawScale = distance(event.touches) / startDistance;
    const scale = Math.max(1, Math.min(MAX_SCALE, rawScale));

    // Ignore tiny scale changes caused by natural finger tremor.
    if (Math.abs(scale - lastScale) < SCALE_DEADZONE) return;

    lastScale = scale;
    document.body.style.transform = `scale(${scale.toFixed(3)})`;
  };

  const reset = () => {
    if (!active) return;

    active = false;
    startDistance = 0;
    lastScale = 1;

    document.body.style.transition = `transform ${RESET_MS}ms cubic-bezier(.22,.78,.24,1)`;
    document.body.style.transform = 'scale(1)';

    clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => {
      document.body.style.removeProperty('transform');
      document.body.style.removeProperty('transform-origin');
      document.body.style.removeProperty('transition');
      document.body.style.removeProperty('will-change');
    }, RESET_MS + 40);
  };

  document.addEventListener('touchstart', begin, { passive: false });
  document.addEventListener('touchmove', move, { passive: false });
  document.addEventListener('touchend', event => {
    if (active && event.touches.length < 2) reset();
  }, { passive: true });
  document.addEventListener('touchcancel', reset, { passive: true });

  // Prevent Safari's native persistent page zoom; the custom temporary zoom above replaces it.
  document.addEventListener('gesturestart', event => {
    if (event.cancelable) event.preventDefault();
  }, { passive: false });
  document.addEventListener('gesturechange', event => {
    if (event.cancelable) event.preventDefault();
  }, { passive: false });
  document.addEventListener('gestureend', event => {
    if (event.cancelable) event.preventDefault();
    reset();
  }, { passive: false });
})();
