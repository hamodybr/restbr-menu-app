(() => {
  const primary = document.getElementById('smBgVideo');
  if (!primary || document.getElementById('smBgVideoB')) return;

  const FADE_SECONDS = 0.55;
  const START_BEFORE_END = 0.72;

  const secondary = document.createElement('video');
  secondary.id = 'smBgVideoB';
  secondary.className = primary.className || 'sm-bg-video';
  secondary.muted = true;
  secondary.autoplay = false;
  secondary.loop = false;
  secondary.playsInline = true;
  secondary.preload = 'auto';
  secondary.setAttribute('muted', '');
  secondary.setAttribute('playsinline', '');
  secondary.setAttribute('webkit-playsinline', '');
  secondary.setAttribute('aria-hidden', 'true');
  secondary.style.pointerEvents = 'none';
  secondary.style.opacity = '0';
  secondary.style.transition = `opacity ${FADE_SECONDS}s linear`;

  primary.loop = false;
  primary.preload = 'auto';
  primary.style.opacity = '1';
  primary.style.transition = `opacity ${FADE_SECONDS}s linear`;

  primary.insertAdjacentElement('afterend', secondary);

  let active = primary;
  let standby = secondary;
  let source = '';
  let switching = false;
  let rafId = 0;
  let switchTimer = 0;

  const safePlay = video => {
    try {
      const result = video.play();
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch (_) {}
  };

  const resetVideo = video => {
    try { video.pause(); } catch (_) {}
    try { video.currentTime = 0; } catch (_) {}
    video.loop = false;
  };

  function clearSwitchTimer() {
    if (!switchTimer) return;
    clearTimeout(switchTimer);
    switchTimer = 0;
  }

  function applySource(nextSource) {
    nextSource = String(nextSource || '').trim();
    if (nextSource === source) return;

    source = nextSource;
    switching = false;
    clearSwitchTimer();

    resetVideo(primary);
    resetVideo(secondary);

    active = primary;
    standby = secondary;
    primary.style.opacity = nextSource ? '1' : '0';
    secondary.style.opacity = '0';

    if (!nextSource) {
      secondary.removeAttribute('src');
      secondary.style.display = 'none';
      return;
    }

    secondary.style.display = '';
    secondary.src = nextSource;
    secondary.load();

    // app.js owns the primary source and autoplay. We only make sure its
    // native loop is disabled so the crossfade can own the hand-off.
    primary.loop = false;
    safePlay(primary);
  }

  function prepareStandby() {
    if (!source) return false;

    if (standby.src !== source) {
      standby.src = source;
      standby.load();
    }

    standby.loop = false;
    standby.muted = true;
    standby.playsInline = true;

    try {
      if (standby.currentTime > 0.08) standby.currentTime = 0;
    } catch (_) {}

    return standby.readyState >= 2;
  }

  function finishSwitch(oldActive, newActive) {
    if (active !== oldActive && active !== newActive) return;

    resetVideo(oldActive);
    oldActive.style.opacity = '0';
    newActive.style.opacity = '1';

    active = newActive;
    standby = oldActive;
    switching = false;
    clearSwitchTimer();

    // Keep the next copy warm at frame zero without decoding it continuously.
    try { standby.currentTime = 0; } catch (_) {}
  }

  function crossfade() {
    if (switching || !source) return;
    if (!prepareStandby()) return;

    switching = true;
    const oldActive = active;
    const newActive = standby;

    try { newActive.currentTime = 0; } catch (_) {}
    safePlay(newActive);

    // Give the browser one paint to expose the decoded first frame before
    // fading. This avoids the tiny black/held-frame flash seen with native loop.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        newActive.style.opacity = '1';
        oldActive.style.opacity = '0';
      });
    });

    clearSwitchTimer();
    switchTimer = window.setTimeout(
      () => finishSwitch(oldActive, newActive),
      Math.round((FADE_SECONDS + 0.08) * 1000)
    );
  }

  function tick() {
    if (source && active && !switching) {
      active.loop = false;

      const duration = Number(active.duration);
      const current = Number(active.currentTime);

      if (
        Number.isFinite(duration) &&
        duration > 1.5 &&
        Number.isFinite(current) &&
        current > 0 &&
        duration - current <= START_BEFORE_END
      ) {
        crossfade();
      }
    }

    rafId = requestAnimationFrame(tick);
  }

  function emergencyHandoff(endedVideo) {
    if (endedVideo !== active || switching || !source) return;
    if (!prepareStandby()) {
      try { endedVideo.currentTime = 0; } catch (_) {}
      safePlay(endedVideo);
      return;
    }

    const oldActive = active;
    const newActive = standby;
    try { newActive.currentTime = 0; } catch (_) {}
    newActive.style.opacity = '1';
    oldActive.style.opacity = '0';
    safePlay(newActive);
    finishSwitch(oldActive, newActive);
  }

  primary.addEventListener('ended', () => emergencyHandoff(primary));
  secondary.addEventListener('ended', () => emergencyHandoff(secondary));

  // app.js may change the restaurant background URL at runtime. Mirror every
  // future source change automatically, including disabling the background.
  const observer = new MutationObserver(() => {
    primary.loop = false;
    const nextSource = primary.getAttribute('src') || primary.src || '';
    applySource(nextSource);
  });

  observer.observe(primary, {
    attributes: true,
    attributeFilter: ['src', 'loop']
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !source) return;
    active.loop = false;
    safePlay(active);
  });

  const initialSource = primary.getAttribute('src') || primary.src || '';
  if (initialSource) applySource(initialSource);

  rafId = requestAnimationFrame(tick);

  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(rafId);
    clearSwitchTimer();
  }, { once: true });
})();
