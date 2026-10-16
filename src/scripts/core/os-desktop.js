(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const storeKey = 'zuzu:desktop-ui:v1';
  const state = { quickOpen:false, notificationsOpen:false, contextOpen:false, showAll:false, saved:{} };
  const notificationItems = [];
  let unreadNotifications = 0;
  let lastToastMessage = '';
  let currentWorkspace = 1;
  let workspaceCount = 2;
  const getPrefs = () => { try { return JSON.parse(localStorage.getItem(storeKey) || '{}') || {}; } catch { return {}; } };
  const savePrefs = () => { try { localStorage.setItem(storeKey, JSON.stringify(state.saved)); } catch {} };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function toast(text) {
    const node = $('toast');
    if (!node) return;
    node.textContent = text;
    node.classList.remove('hidden');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.add('hidden'), 2300);
  }
  function launch(id) {
    const item = document.querySelector('#os-start-menu [data-os-launch="' + CSS.escape(id) + '"]');
    if (item) { item.click(); return true; }
    const app = document.querySelector('#desktop [data-app="' + CSS.escape(id) + '"]');
    if (app) { app.click(); return true; }
    return false;
  }
  function activeWindow() {
    const windows = [...document.querySelectorAll('#desktop .os-window:not(.os-minimized):not(.os-other-workspace), #desktop #app-window:not(.hidden):not(.os-other-workspace)')];
    return windows.sort((a,b) => (Number.parseInt(getComputedStyle(a).zIndex,10)||0) - (Number.parseInt(getComputedStyle(b).zIndex,10)||0)).at(-1) || null;
  }
  function closeActiveWindow() {
    const win = activeWindow();
    if (!win) return false;
    if (win.id === 'app-window') $('close-window')?.click();
    else win.querySelector('[data-close]')?.click();
    return true;
  }
  function setWindowMode(mode) {
    const win = activeWindow();
    if (!win) return toast('Open an app window first.');
    if (mode === 'restore') {
      win.classList.remove('os-maximized');
      win.style.left = '';
      win.style.top = '';
      win.style.width = '';
      win.style.height = '';
      win.style.transform = '';
      win.dataset.osSnap = '';
      return;
    }
    win.classList.remove('os-maximized');
    win.style.transform = 'none';
    if (innerWidth < 700 && (mode === 'left' || mode === 'right')) {
      win.classList.add('os-maximized');
      return;
    }
    const gap = 10;
    const top = 58;
    const bottom = 82;
    if (mode === 'maximize') {
      win.classList.add('os-maximized');
      return;
    }
    const half = Math.max(320, Math.floor((innerWidth - gap * 3) / 2));
    const height = Math.max(260, innerHeight - top - bottom);
    win.style.top = top + 'px';
    win.style.height = height + 'px';
    win.style.width = half + 'px';
    if (mode === 'left') win.style.left = gap + 'px';
    if (mode === 'right') win.style.left = (innerWidth - half - gap) + 'px';
    if (mode === 'left' || mode === 'right') win.dataset.osSnap = mode;
  }
  function ensurePanels() {
    const desktop = $('desktop');
    if (!desktop || $('os-system-tray')) return;
    const taskbar = desktop.querySelector('.taskbar');
    if (taskbar && !$('os-task-view')) {
      const taskView = document.createElement('button');
      taskView.id = 'os-task-view';
      taskView.className = 'task-app os-task-view-button';
      taskView.type = 'button';
      taskView.title = 'Task view · virtual desktops';
      taskView.setAttribute('aria-expanded','false');
      taskView.textContent = '▣';
      $('os-start-button')?.insertAdjacentElement('afterend',taskView);
    }
    const overlay = document.createElement('div');
    overlay.id = 'os-brightness-overlay';
    overlay.className = 'os-brightness-overlay';
    desktop.appendChild(overlay);

    const tray = document.createElement('div');
    tray.id = 'os-system-tray';
    tray.className = 'os-system-tray';
    tray.innerHTML = '<button id="os-quick-settings-toggle" aria-expanded="false" title="Quick settings">☷ <span>Quick settings</span></button><button id="os-notifications-toggle" aria-expanded="false" title="Notifications">♧<span id="os-notification-count" class="hidden">0</span></button><button id="os-tray-clock" title="Date and time"><span id="os-tray-time">--:--</span><small id="os-tray-date">---</small></button>';
    desktop.appendChild(tray);

    const quick = document.createElement('section');
    quick.id = 'os-quick-settings';
    quick.className = 'os-flyout hidden';
    quick.setAttribute('aria-label','ZuzuOS quick settings');
    quick.innerHTML = '<div class="os-flyout-heading"><div><strong>Quick settings</strong><small>Controls for this web desktop</small></div><button data-panel-close="quick" aria-label="Close quick settings">×</button></div><div class="os-quick-grid"><button data-quick-toggle="blur"><span>◈</span><strong>Transparency</strong><small id="os-quick-blur-state">On</small></button><button data-quick-toggle="motion"><span>◌</span><strong>Motion</strong><small id="os-quick-motion-state">On</small></button><button data-quick-toggle="wallpaper"><span>▧</span><strong>Wallpaper</strong><small>Personalize</small></button><button data-quick-toggle="theme"><span>◐</span><strong>Theme</strong><small id="os-quick-theme-state">Cinematic</small></button></div><label class="os-range-row"><span>Desktop brightness</span><input id="os-desktop-brightness" type="range" min="55" max="100" step="5" value="100"><output id="os-brightness-value">100%</output></label><div class="os-quick-footer"><span><i></i> ZuzuOS web controls</span><span>Changes stay on this device</span></div>';
    desktop.appendChild(quick);

    const notifications = document.createElement('section');
    notifications.id = 'os-notification-center';
    notifications.className = 'os-flyout os-notification-center hidden';
    notifications.setAttribute('aria-label','Notification center');
    notifications.innerHTML = '<div class="os-flyout-heading"><div><strong>Notifications</strong><small>From this ZuzuOS session</small></div><button id="os-notifications-clear">Clear</button></div><div id="os-notification-list" class="os-notification-list"></div><div class="os-notification-empty"><span>✓</span><strong>You’re all caught up</strong><p>Notifications from ZuzuOS will appear here.</p></div><div class="os-calendar-mini"><div><span id="os-calendar-day">MON</span><strong id="os-calendar-date">12</strong><small id="os-calendar-month">OCTOBER</small></div><p>Today on your desktop<br><small id="os-calendar-full">Local date</small></p></div>';
    desktop.appendChild(notifications);

    const context = document.createElement('div');
    context.id = 'os-desktop-context';
    context.className = 'os-context-menu hidden';
    context.innerHTML = '<button data-context="start"><span>⊞</span> Open Start</button><button data-context="explorer"><span>▧</span> Open File Explorer <kbd>Win+E</kbd></button><div></div><button data-context="newfile"><span>＋</span> New text file</button><button data-context="newfolder"><span>▰</span> New folder</button><div></div><button data-context="refresh"><span>⟳</span> Refresh desktop</button><button data-context="personalize"><span>◈</span> Personalize</button><button data-context="settings"><span>⚙</span> Settings</button>';
    desktop.appendChild(context);

    const taskViewPanel = document.createElement('section');
    taskViewPanel.id = 'os-task-view-panel';
    taskViewPanel.className = 'os-task-view-panel hidden';
    taskViewPanel.setAttribute('aria-label','Virtual desktops');
    taskViewPanel.innerHTML = '<div class="os-task-view-heading"><div><strong>Task view</strong><small>Switch between separate browser workspaces</small></div><button id="os-task-view-close" aria-label="Close task view">×</button></div><div id="os-workspace-cards" class="os-workspace-cards"></div><div class="os-task-view-footer"><span>Open windows stay in their workspace.</span><button id="os-new-workspace">＋ New desktop</button></div>';
    desktop.appendChild(taskViewPanel);
    renderWorkspaces();

    context.addEventListener('click', (event) => {
      const button = event.target.closest('[data-context]');
      if (!button) return;
      context.classList.add('hidden');
      const action = button.dataset.context;
      if (action === 'start') $('os-start-button')?.click();
      if (action === 'explorer') launch('files');
      if (action === 'personalize') launch('studio');
      if (action === 'settings') launch('settings');
      if (action === 'refresh') {
        document.querySelectorAll('.os-window.os-minimized').forEach(win => win.classList.remove('os-minimized'));
        toast('Desktop refreshed.');
      }
      if (action === 'newfile' || action === 'newfolder') {
        launch('files');
        setTimeout(() => document.querySelector(action === 'newfile' ? '[data-new-file]' : '[data-new-folder]')?.click(), 80);
      }
    });

    $('os-task-view').addEventListener('click', () => toggleTaskView());
    $('os-task-view-close').addEventListener('click', () => toggleTaskView(false));
    $('os-new-workspace').addEventListener('click', () => {
      if (workspaceCount >= 4) { toast('You can use up to four desktops in this session.'); return; }
      workspaceCount++;
      state.saved.workspaceCount = workspaceCount;
      savePrefs();
      switchWorkspace(workspaceCount);
      renderWorkspaces();
      toast('Desktop ' + workspaceCount + ' created.');
    });
    $('os-workspace-cards').addEventListener('click', event => {
      const card = event.target.closest('[data-workspace]');
      if (!card) return;
      switchWorkspace(Number(card.dataset.workspace));
      toggleTaskView(false);
    });
    $('os-quick-settings-toggle').addEventListener('click', () => togglePanel('quick'));
    $('os-notifications-toggle').addEventListener('click', () => togglePanel('notifications'));
    $('os-tray-clock').addEventListener('click', () => togglePanel('notifications'));
    quick.querySelector('[data-panel-close]').addEventListener('click', () => togglePanel('quick',false));
    notifications.querySelector('[data-panel-close]')?.addEventListener('click', () => togglePanel('notifications',false));
    $('os-notifications-clear').addEventListener('click', () => { notificationItems.length = 0; unreadNotifications = 0; renderNotifications(); });
    quick.querySelectorAll('[data-quick-toggle]').forEach(button => button.addEventListener('click', () => quickToggle(button.dataset.quickToggle)));
    $('os-desktop-brightness').addEventListener('input', event => setBrightness(Number(event.target.value)));
    desktop.addEventListener('contextmenu', event => {
      if (event.target.closest('button,input,textarea,select,a,.os-window,.os-flyout,.os-start-menu,.os-context-menu,.app-window,.account-menu')) return;
      event.preventDefault();
      togglePanel('quick',false);
      togglePanel('notifications',false);
      context.classList.remove('hidden');
      const maxX = Math.max(8, innerWidth - context.offsetWidth - 8);
      const maxY = Math.max(56, innerHeight - context.offsetHeight - 80);
      context.style.left = Math.max(8,Math.min(event.clientX,maxX))+'px';
      context.style.top = Math.max(52,Math.min(event.clientY,maxY))+'px';
    });
    document.addEventListener('pointerdown', event => {
      if (!event.target.closest('#os-desktop-context')) context.classList.add('hidden');
      if (!event.target.closest('#os-task-view-panel,#os-task-view')) toggleTaskView(false);
      if (!event.target.closest('#os-quick-settings,#os-quick-settings-toggle') && state.quickOpen) togglePanel('quick',false);
      if (!event.target.closest('#os-notification-center,#os-notifications-toggle,#os-tray-clock') && state.notificationsOpen) togglePanel('notifications',false);
    });
    const layer = $('os-window-layer');
    if (layer) {
      new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        const windows = node.matches?.('.os-window') ? [node] : [...(node.querySelectorAll?.('.os-window') || [])];
        windows.forEach(win => {
          if (!win.dataset.osWorkspace) win.dataset.osWorkspace = String(currentWorkspace);
          win.classList.toggle('os-other-workspace',Number(win.dataset.osWorkspace) !== currentWorkspace);
        });
      }))).observe(layer,{childList:true,subtree:true});
    }
    const appWindow = $('app-window');
    if (appWindow) {
      new MutationObserver(() => {
        if (!appWindow.classList.contains('hidden') && !appWindow.dataset.osWorkspace) {
          appWindow.dataset.osWorkspace = String(currentWorkspace);
          appWindow.classList.remove('os-other-workspace');
        }
      }).observe(appWindow,{attributes:true,attributeFilter:['class']});
    }
    document.addEventListener('click', event => {
      if (!event.target.closest('[data-app]')) return;
      setTimeout(() => {
        const win = $('app-window');
        if (win && !win.classList.contains('hidden')) {
          win.dataset.osWorkspace = String(currentWorkspace);
          win.classList.remove('os-other-workspace');
        }
      },0);
    });
    const toastNode = $('toast');
    if (toastNode) {
      new MutationObserver(() => {
        const message = toastNode.textContent.trim();
        if (!toastNode.classList.contains('hidden') && message && message !== lastToastMessage) {
          lastToastMessage = message;
          notificationItems.unshift({message, at:new Date()});
          if (notificationItems.length > 12) notificationItems.length = 12;
          unreadNotifications++;
          renderNotifications();
        }
        if (toastNode.classList.contains('hidden')) lastToastMessage = '';
      }).observe(toastNode,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});
    }
    const updateClock = () => {
      const now = new Date();
      $('os-tray-time').textContent = now.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
      $('os-tray-date').textContent = now.toLocaleDateString([], {month:'numeric',day:'numeric',year:'numeric'});
      $('os-calendar-day').textContent = now.toLocaleDateString([], {weekday:'short'}).toUpperCase();
      $('os-calendar-date').textContent = now.getDate();
      $('os-calendar-month').textContent = now.toLocaleDateString([], {month:'long'}).toUpperCase();
      $('os-calendar-full').textContent = now.toLocaleDateString([], {weekday:'long',month:'long',day:'numeric',year:'numeric'});
    };
    updateClock();
    setInterval(updateClock,30000);
    const prefs = getPrefs();
    state.saved = {...prefs};
    if (Number.isInteger(prefs.workspaceCount)) workspaceCount = Math.max(2,Math.min(4,prefs.workspaceCount));
    renderWorkspaces();
    if (prefs.blur === false) quickToggle('blur',false);
    if (prefs.motion === false) quickToggle('motion',false);
    if (Number.isFinite(prefs.brightness)) setBrightness(prefs.brightness);
    if (prefs.accent) setAccent(prefs.accent);
  }
  function renderNotifications() {
    const list = $('os-notification-list');
    if (!list) return;
    const empty = document.querySelector('#os-notification-center .os-notification-empty');
    if (empty) empty.classList.toggle('hidden',notificationItems.length > 0);
    list.innerHTML = notificationItems.map(item => '<article class="os-notification-item"><span>•</span><div><strong>' + esc(item.message) + '</strong><small>' + esc(item.at.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})) + '</small></div></article>').join('');
    const badge = $('os-notification-count');
    if (badge) {
      badge.textContent = unreadNotifications > 9 ? '9+' : String(unreadNotifications);
      badge.classList.toggle('hidden',unreadNotifications < 1);
    }
  }
  function renderWorkspaces() {
    const cards = $('os-workspace-cards');
    if (!cards) return;
    cards.innerHTML = Array.from({length:workspaceCount},(_,i)=>i+1).map(number =>
      '<button class="os-workspace-card' + (number === currentWorkspace ? ' is-active' : '') + '" data-workspace="' + number + '" type="button"><span class="os-workspace-preview"><i></i><i></i><i></i></span><strong>Desktop ' + number + '</strong><small>' + (number === currentWorkspace ? 'Current desktop' : 'Switch to desktop') + '</small></button>'
    ).join('');
    const add = $('os-new-workspace');
    if (add) { add.disabled = workspaceCount >= 4; add.textContent = workspaceCount >= 4 ? 'Maximum desktops reached' : '＋ New desktop'; }
  }
  function toggleTaskView(force) {
    const panel = $('os-task-view-panel');
    if (!panel) return;
    const open = force ?? panel.classList.contains('hidden');
    panel.classList.toggle('hidden',!open);
    $('os-task-view')?.setAttribute('aria-expanded',String(open));
    if (open) {
      togglePanel('quick',false);
      togglePanel('notifications',false);
      renderWorkspaces();
    }
  }
  function switchWorkspace(number) {
    const target = Math.max(1,Math.min(workspaceCount,Number(number)||1));
    if (currentWorkspace !== target) showDesktopSnapshot = null;
    currentWorkspace = target;
    document.querySelectorAll('#desktop .os-window, #desktop #app-window').forEach(win => {
      if (!win.dataset.osWorkspace) win.dataset.osWorkspace = String(target);
      win.classList.toggle('os-other-workspace',Number(win.dataset.osWorkspace) !== target);
    });
    renderWorkspaces();
  }
  function togglePanel(panel, force) {
    const opening = force ?? (panel === 'quick' ? !state.quickOpen : !state.notificationsOpen);
    if (panel === 'quick') {
      state.quickOpen = opening;
      $('os-quick-settings')?.classList.toggle('hidden',!opening);
      $('os-quick-settings-toggle')?.setAttribute('aria-expanded',String(opening));
      if (opening) {state.notificationsOpen=false;$('os-notification-center')?.classList.add('hidden');}
    } else {
      state.notificationsOpen = opening;
      $('os-notification-center')?.classList.toggle('hidden',!opening);
      $('os-notifications-toggle')?.setAttribute('aria-expanded',String(opening));
      if (opening) {state.quickOpen=false;$('os-quick-settings')?.classList.add('hidden');unreadNotifications=0;renderNotifications();}
    }
  }
  function quickToggle(kind, persist = true) {
    if (kind === 'blur') {
      const reduced = !document.documentElement.classList.contains('os-reduced-transparency');
      document.documentElement.classList.toggle('os-reduced-transparency',reduced);
      state.saved.blur = !reduced;
      $('os-quick-blur-state').textContent = reduced ? 'Off' : 'On';
    } else if (kind === 'motion') {
      const reduced = !document.documentElement.classList.contains('os-reduced-motion');
      document.documentElement.classList.toggle('os-reduced-motion',reduced);
      state.saved.motion = !reduced;
      $('os-quick-motion-state').textContent = reduced ? 'Reduced' : 'On';
    } else if (kind === 'wallpaper') {
      togglePanel('quick',false);
      launch('studio');
    } else if (kind === 'theme') {
      state.saved.accent = state.saved.accent === 'blue' ? 'violet' : state.saved.accent === 'violet' ? 'mint' : 'blue';
      setAccent(state.saved.accent);
    }
    if (persist) savePrefs();
  }
  function setBrightness(value) {
    const v = Math.max(55,Math.min(100,value));
    $('os-brightness-value').textContent = v + '%';
    $('os-desktop-brightness').value = v;
    const overlay = $('os-brightness-overlay');
    if (overlay) overlay.style.background = 'rgba(0,0,0,' + ((100-v)/100*0.58).toFixed(3) + ')';
    state.saved.brightness = v;
    savePrefs();
  }
  function setAccent(accent) {
    const safe = ['blue','violet','mint'].includes(accent) ? accent : 'blue';
    document.documentElement.dataset.osAccent = safe;
    state.saved.accent = safe;
    const label = $('os-quick-theme-state');
    if (label) label.textContent = safe[0].toUpperCase()+safe.slice(1);
    savePrefs();
  }
  let showDesktopSnapshot = null;
  function toggleShowDesktop() {
    if (showDesktopSnapshot) {
      showDesktopSnapshot.forEach(({win, minimized, hidden}) => {
        if (!win.isConnected) return;
        win.classList.toggle('os-minimized',minimized);
        if (win.id === 'app-window') win.classList.toggle('hidden',hidden);
      });
      showDesktopSnapshot = null;
      return;
    }
    const wins = [...document.querySelectorAll('#desktop .os-window,#desktop #app-window')];
    const visible = wins.filter(win => !win.classList.contains('os-other-workspace') && (win.id === 'app-window' ? !win.classList.contains('hidden') : !win.classList.contains('os-minimized')));
    if (!visible.length) return;
    showDesktopSnapshot = visible.map(win => ({win,minimized:win.classList.contains('os-minimized'),hidden:win.classList.contains('hidden')}));
    visible.forEach(win => {
      if (win.id === 'app-window') win.classList.add('hidden');
      else win.classList.add('os-minimized');
    });
  }
  function enableKeyboardShortcuts() {
    document.addEventListener('keydown', event => {
      const key = event.key.toLowerCase();
      const editing = event.target.closest('input,textarea,select,[contenteditable=true]');
      const winKey = event.metaKey;
      if ((event.ctrlKey || event.metaKey) && key === 'k') return;
      if (event.altKey && key === 'f4') {
        if (closeActiveWindow()) { event.preventDefault(); return; }
      }
      if (event.ctrlKey && event.altKey && key === 'e' || winKey && key === 'e') {
        event.preventDefault(); launch('files'); return;
      }
      if (event.ctrlKey && event.altKey && key === 't') {
        event.preventDefault(); launch('terminal'); return;
      }
      if (event.ctrlKey && event.altKey && key === 'pageup') {
        event.preventDefault(); switchWorkspace(currentWorkspace > 1 ? currentWorkspace - 1 : workspaceCount); return;
      }
      if (event.ctrlKey && event.altKey && key === 'pagedown') {
        event.preventDefault(); switchWorkspace(currentWorkspace < workspaceCount ? currentWorkspace + 1 : 1); return;
      }
      if (event.ctrlKey && event.altKey && key === 's') {
        event.preventDefault(); togglePanel('quick'); return;
      }
      if (event.ctrlKey && event.shiftKey && key === 'n') {
        event.preventDefault(); togglePanel('notifications'); return;
      }
      if ((winKey && key === 'd') || (event.ctrlKey && event.altKey && key === 'd')) {
        event.preventDefault();
        toggleShowDesktop();
        return;
      }
      if (winKey && ['arrowleft','arrowright','arrowup','arrowdown'].includes(key)) {
        event.preventDefault();
        if (key === 'arrowleft') setWindowMode('left');
        if (key === 'arrowright') setWindowMode('right');
        if (key === 'arrowup') setWindowMode('maximize');
        if (key === 'arrowdown') setWindowMode('restore');
        return;
      }
      if (event.key === 'Escape') {
        toggleTaskView(false);
        togglePanel('quick',false);
        togglePanel('notifications',false);
        $('os-desktop-context')?.classList.add('hidden');
        return;
      }
      if (editing) return;
      if (event.ctrlKey && event.altKey && key === 'p') { event.preventDefault(); launch('studio'); }
    });
  }
  function boot() {
    if (!$('desktop')) return;
    ensurePanels();
    enableKeyboardShortcuts();
    const desktop = $('desktop');
    new MutationObserver(() => {
      const visible = !desktop.classList.contains('hidden');
      ['os-system-tray','os-quick-settings','os-notification-center'].forEach(id=>{const n=$(id);if(n)n.classList.toggle('os-ui-ready',visible)});
    }).observe(desktop,{attributes:true,attributeFilter:['class']});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();