(() => {
  const init = () => {
    const desktop = document.getElementById('desktop');
    if (!desktop || desktop.dataset.cineRefInit === '1') return;
    desktop.dataset.cineRefInit = '1';
    desktop.classList.add('cine-v2-shell');

    const hud = document.createElement('div');
    hud.className = 'cine-ref-hud';
    hud.innerHTML = `
      <div class="cine-ref-day" id="cine-ref-day">TODAY</div>
      <div class="cine-ref-emblem" aria-hidden="true"></div>
      <aside class="cine-ref-rail" aria-label="Quick status">
        <section class="cine-ref-section">
          <div class="cine-ref-kicker">JUMP BACK IN!</div>
          <button class="cine-ref-card" type="button" data-cine-open="cinehub">
            <span class="cine-ref-icon game">◆</span>
            <span class="cine-ref-copy"><strong>No Recent Game</strong><small>Zuzu Game Hub</small></span>
          </button>
        </section>
        <section class="cine-ref-section">
          <div class="cine-ref-kicker">QUICK PLAY</div>
          <button class="cine-ref-card" type="button" data-cine-open="music">
            <span class="cine-ref-icon music">♪</span>
            <span class="cine-ref-copy"><strong>Not Playing</strong><small>Music</small></span>
          </button>
        </section>
        <section class="cine-ref-section">
          <div class="cine-ref-kicker">SYSTEM STATUS</div>
          <button class="cine-ref-card" type="button" data-cine-open="settings">
            <span class="cine-ref-copy"><strong>Update Log</strong><small>View latest patches</small></span>
            <span class="cine-ref-arrow">›</span>
          </button>
        </section>
      </aside>
      <div class="cine-ref-fps" id="cine-ref-fps">60 FPS</div>
      <section class="cine-ref-notice" id="cine-ref-notice" aria-label="System notification">
        <div class="cine-ref-notice-head"><span>⌂</span><span>System</span><button class="cine-ref-notice-close" type="button" aria-label="Dismiss notification">×</button></div>
        <strong>Welcome To ZuzuOS</strong>
        <p>Open Settings to customize your desktop.</p>
      </section>
    `;
    desktop.appendChild(hud);

    const day = hud.querySelector('#cine-ref-day');
    const updateDay = () => {
      day.textContent = new Intl.DateTimeFormat(undefined,{weekday:'long'}).format(new Date()).toUpperCase();
    };
    updateDay();

    hud.addEventListener('click', (event) => {
      const close = event.target.closest('.cine-ref-notice-close');
      if (close) {
        const notice = hud.querySelector('#cine-ref-notice');
        if (notice) notice.remove();
        return;
      }
      const launcher = event.target.closest('[data-cine-open]');
      if (!launcher) return;
      const app = launcher.dataset.cineOpen;
      const target = desktop.querySelector('[data-app="' + app + '"]');
      if (target) target.click();
    });

    let frames = 0;
    let last = performance.now();
    const fpsEl = hud.querySelector('#cine-ref-fps');
    const sample = (now) => {
      frames++;
      if (now - last >= 1000) {
        const fps = Math.max(1, Math.round(frames * 1000 / (now - last)));
        if (fpsEl) fpsEl.textContent = fps + ' FPS';
        frames = 0;
        last = now;
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else {
    init();
  }
})();