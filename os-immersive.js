(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const SHELL_KEY = 'zuzu:shell-style';
  const LABELS = { cine:'Cine Desktop', windows:'Windows 11 Style', macos:'macOS Style' };
  const shortcutApps = [
    ['files','File Explorer','▧'],['browser','Web Browser','◉'],['notes','Notes','▤'],
    ['paint','Paint','✎'],['cinehub','Cine Hub','▣'],['music','Music','♫'],['settings','Settings','⚙']
  ];
  let activeStyle = 'cine';
  let scene;

  function localRead(key, fallback = null) {
    try { const raw = localStorage.getItem('zuzu:' + key); return raw === null ? fallback : JSON.parse(raw); }
    catch { return fallback; }
  }
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function toast(message) {
    const el = $('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.remove('hidden');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.add('hidden'), 2400);
  }
  function applyShellStyle(value, announce = false) {
    const style = Object.hasOwn(LABELS, value) ? value : 'cine';
    activeStyle = style;
    const desktop = $('desktop');
    if (desktop) desktop.dataset.shellStyle = style;
    document.documentElement.dataset.shellStyle = style;
    document.body.dataset.shellStyle = style;
    try { localStorage.setItem(SHELL_KEY, JSON.stringify(style)); } catch {}
    document.querySelectorAll('[data-shell-style-choice]').forEach(button => {
      const selected = button.dataset.shellStyleChoice === style;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed',String(selected));
    });
    const select = $('shell-layout-choice');
    if (select) select.value = style;
    if (announce) toast(LABELS[style] + ' layout applied.');
  }
  function launchApp(id) {
    const item = document.querySelector('#os-start-menu [data-os-launch="' + CSS.escape(id) + '"]');
    if (item) { item.click(); return true; }
    const app = document.querySelector('#desktop [data-app="' + CSS.escape(id) + '"]');
    if (app) { app.click(); return true; }
    return false;
  }
  function openUpdates() {
    const item = $('os-team-launch');
    if (item) { item.click(); return; }
    const start = $('os-start-button');
    if (start) start.click();
  }
  function createScene() {
    const desktop = $('desktop');
    if (!desktop || $('os-scene')) return;
    scene = document.createElement('div');
    scene.id = 'os-scene';
    scene.className = 'os-scene';
    scene.innerHTML = \`
      <div class="os-scene-day-wrap" aria-live="off">
        <p class="os-scene-overline">YOUR DESKTOP</p>
        <div id="os-scene-day" class="os-scene-day">MONDAY</div>
        <div id="os-scene-full-date" class="os-scene-full-date">Your personal space</div>
      </div>
      <div class="os-scene-left-rail">
        <div class="os-scene-shortcut-title">DESKTOP</div>
        <div id="os-scene-shortcuts" class="os-scene-shortcuts"></div>
      </div>
      <aside class="os-scene-widgets" aria-label="Desktop widgets">
        <div class="os-widget-caption">RECENT ACTIVITY</div>
        <button class="os-scene-widget os-recent-widget" data-scene-action="recent">
          <span class="os-widget-icon os-widget-crystal">◇</span>
          <span class="os-widget-copy"><strong id="os-recent-title">No recent app</strong><small id="os-recent-subtitle">Open an app to get started</small></span>
          <span class="os-widget-chevron">›</span>
        </button>
        <div class="os-widget-caption">YOUR SPACE</div>
        <button class="os-scene-widget" data-scene-action="music">
          <span class="os-widget-icon os-widget-music">♫</span>
          <span class="os-widget-copy"><strong>Music & audio</strong><small>Open your music workspace</small></span>
          <span class="os-widget-chevron">›</span>
        </button>
        <button class="os-scene-widget os-update-widget" data-scene-action="updates">
          <span class="os-widget-copy"><strong>Update log</strong><small>Roadmap and latest changes</small></span>
          <span class="os-widget-chevron">›</span>
        </button>
      </aside>
      <button id="os-scene-account" class="os-scene-account" title="Account menu" aria-label="Account menu"><span id="os-scene-avatar">Z</span><span class="os-scene-account-copy"><strong id="os-scene-account-name">Zuzu account</strong><small id="os-scene-account-role">Personal workspace</small></span><span>⌄</span></button>
      <div class="os-scene-bottom-left"><span class="os-scene-live-dot"></span><span>zuzu.os</span><span class="os-scene-bottom-divider"></span><span id="os-scene-state">PERSONAL DESKTOP</span></div>
    \`;
    desktop.appendChild(scene);
    const shortcuts = $('os-scene-shortcuts');
    shortcuts.innerHTML = shortcutApps.map(([id,name,icon]) =>
      '<button class="os-scene-shortcut" type="button" data-os-launch="' + id + '" title="' + esc(name) + '"><span class="os-scene-shortcut-icon">' + icon + '</span><span>' + esc(name) + '</span></button>'
    ).join('');
    const taskbar = desktop.querySelector('.taskbar');
    if (taskbar) {
      const moreApps = [['browser','◉','Browser'],['cinehub','▣','Cine Hub'],['music','♫','Music'],['paint','✎','Paint']];
      moreApps.forEach(([id,icon,name]) => {
        if (taskbar.querySelector('[data-os-dock="' + id + '"]')) return;
        const button = document.createElement('button');
        button.className = 'task-app os-extra-dock-app';
        button.type = 'button';
        button.dataset.osLaunch = id;
        button.dataset.osDock = id;
        button.title = name;
        button.setAttribute('aria-label',name);
        button.textContent = icon;
        const settings = taskbar.querySelector('[data-app="settings"]');
        const anchor = settings || taskbar.querySelector('[data-app="files"]');
        if (anchor) anchor.insertAdjacentElement('afterend',button);
        else taskbar.appendChild(button);
      });
    }
    scene.querySelectorAll('[data-scene-action]').forEach(button => {
      button.addEventListener('click', () => {
        const action = button.dataset.sceneAction;
        if (action === 'music') launchApp('music');
        if (action === 'updates') openUpdates();
        if (action === 'recent') {
          const recent = localRead('recent-app', null);
          if (recent && Object.hasOwn(LABELS, recent)) applyShellStyle(recent, true);
          else if (recent && shortcutApps.some(app => app[0] === recent)) launchApp(recent);
          else $('os-start-button')?.click();
        }
      });
    });
    $('os-scene-account').addEventListener('click', () => $('account-button')?.click());
    document.addEventListener('click', event => {
      const launch = event.target.closest('[data-os-launch]');
      if (launch && launch.dataset.osLaunch) {
        try { localStorage.setItem('zuzu:recent-app', JSON.stringify(launch.dataset.osLaunch)); } catch {}
        setRecentApp(launch.dataset.osLaunch);
      }
      const normalApp = event.target.closest('#desktop [data-app]');
      if (normalApp && normalApp.dataset.app) {
        try { localStorage.setItem('zuzu:recent-app', JSON.stringify(normalApp.dataset.app)); } catch {}
        setRecentApp(normalApp.dataset.app);
      }
    });
    updateDate();
    updateRecentApp();
    setInterval(updateDate, 30000);
    setInterval(updateRecentApp, 2000);
  }
  function setRecentApp(id) {
    const map = {
      files:['File Explorer','Browse files'],editor:['Text Editor','Write a document'],
      calc:['Calculator','Quick calculations'],system:['System Monitor','Desktop information'],
      studio:['Workspace Studio','Personalize this device'],notes:['Notes','Your saved notes'],
      settings:['Settings','Account and appearance'],browser:['Web Browser','Browse the web'],
      cinehub:['Cine Hub','Discover something to watch'],music:['Music','Listen to audio'],
      paint:['Paint','Draw a sketch'],terminal:['Terminal','Safe command simulator'],
      store:['App Store','Explore apps'],ciri:['CIRI','Desktop helper'],updates:['Update log','Roadmap and releases']
    };
    const item = map[id] || [id,'Recently opened'];
    if ($('os-recent-title')) $('os-recent-title').textContent = item[0];
    if ($('os-recent-subtitle')) $('os-recent-subtitle').textContent = item[1];
  }
  function updateRecentApp() {
    const recent = localRead('recent-app', null);
    if (recent) setRecentApp(recent);
  }
  function updateDate() {
    const now = new Date();
    if ($('os-scene-day')) $('os-scene-day').textContent = now.toLocaleDateString([], {weekday:'long'}).toUpperCase();
    if ($('os-scene-full-date')) $('os-scene-full-date').textContent = now.toLocaleDateString([], {month:'long',day:'numeric',year:'numeric'});
  }
  function renderAccount() {
    const name = $('account-name')?.textContent?.trim() || 'Zuzu account';
    if ($('os-scene-account-name')) $('os-scene-account-name').textContent = name;
    if ($('os-scene-avatar')) $('os-scene-avatar').textContent = $('avatar')?.textContent?.trim() || 'Z';
    if ($('os-scene-account-role')) {
      const badge = $('os-role-badge');
      $('os-scene-account-role').textContent = badge?.textContent || 'Personal workspace';
    }
  }
  function bindStylePicker() {
    document.addEventListener('click', event => {
      const button = event.target.closest('[data-shell-style-choice]');
      if (button) {
        event.preventDefault();
        applyShellStyle(button.dataset.shellStyleChoice, false);
      }
    });
    document.addEventListener('change', event => {
      if (event.target?.id === 'shell-layout-choice') applyShellStyle(event.target.value, true);
    });
    const account = $('account-name');
    if (account) new MutationObserver(renderAccount).observe(account,{childList:true,characterData:true,subtree:true});
    const role = $('os-role-badge');
    if (role) new MutationObserver(renderAccount).observe(role,{childList:true,characterData:true,subtree:true,attributes:true});
  }
  function boot() {
    if (!$('desktop')) return;
    applyShellStyle(localRead('shell-style','cine'), false);
    createScene();
    bindStylePicker();
    renderAccount();
    new MutationObserver(renderAccount).observe($('desktop'),{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();