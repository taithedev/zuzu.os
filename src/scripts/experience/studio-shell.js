/* ZuzuOS Studio Shell
 * Owns the visible desktop only. The existing account, apps, and windows
 * continue to be powered by the unchanged ZuzuOS application modules.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const ICONS = {
    notes:'notes',files:'files',settings:'settings',browser:'browser',
    cinehub:'cinema',music:'music',paint:'paint',terminal:'terminal',
    calc:'settings',store:'start',ciri:'motion',editor:'notes',
    system:'status',studio:'paint'
  };
  const TITLES = {
    notes:'Notes',files:'File Explorer',settings:'Settings',browser:'Browser',
    cinehub:'Cine Hub',music:'Music',paint:'Paint',terminal:'Terminal',
    store:'App Store',ciri:'CIRI',editor:'Text Editor',calc:'Calculator',
    system:'System Monitor',studio:'Workspace Studio'
  };
  let stage;
  let lastSampleAt = 0;
  let frameCount = 0;
  let fpsHandle = null;

  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('aria-hidden','true');
    svg.setAttribute('focusable','false');
    svg.classList.add('zu-icon');
    const use = document.createElementNS('http://www.w3.org/2000/svg','use');
    use.setAttribute('href','/assets/icons/ui.svg#' + (name || 'start'));
    svg.appendChild(use);
    return svg;
  }
  function node(tag,className,text) {
    const result = document.createElement(tag);
    if(className) result.className = className;
    if(text !== undefined) result.textContent = text;
    return result;
  }
  function launchApp(id) {
    const item = document.querySelector('#os-launch-grid [data-os-launch="' + id + '"]');
    if (item) { item.click(); return true; }
    const app = document.querySelector('#desktop [data-app="' + id + '"]');
    if (app) { app.click(); return true; }
    return false;
  }
  function openUpdates() {
    const button = $('os-team-launch');
    if (button) button.click();
    else $('os-start-button')?.click();
  }
  function lastApp() {
    try {
      const raw = localStorage.getItem('zuzu:recent-app');
      const parsed = JSON.parse(raw || 'null');
      if (typeof parsed === 'string' && Object.hasOwn(TITLES,parsed)) return parsed;
    } catch { /* ignored */ }
    return null;
  }
  function updateRecent() {
    const id = lastApp();
    const title = $('zu-recent-title');
    const caption = $('zu-recent-caption');
    const button = $('zu-resume');
    if (!title || !caption || !button) return;
    title.textContent = id ? TITLES[id] : 'Nothing open yet';
    caption.textContent = id ? 'Jump back in' : 'Open an app to get started';
    button.dataset.zuLaunch = id || 'browser';
  }
  function updateTime() {
    const day = $('zu-day');
    const date = $('zu-date');
    const now = new Date();
    if (day) day.textContent = new Intl.DateTimeFormat(undefined,{weekday:'long'}).format(now).toUpperCase();
    if (date) date.textContent = new Intl.DateTimeFormat(undefined,{month:'long',day:'numeric',year:'numeric'}).format(now).toUpperCase();
    const systemDate = $('zu-system-date');
    if (systemDate) systemDate.textContent = new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'}).format(now);
  }
  function frame(time) {
    if (!stage || !stage.isConnected) return;
    if (!lastSampleAt) lastSampleAt = time;
    frameCount++;
    if (time-lastSampleAt >= 1800) {
      const output = $('zu-fps');
      const fps = Math.round(frameCount*1000/(time-lastSampleAt));
      if (output && !document.hidden) output.textContent = fps + ' FPS';
      lastSampleAt = time;
      frameCount = 0;
    }
    fpsHandle = requestAnimationFrame(frame);
  }
  function installDock() {
    const bar = document.querySelector('#desktop .taskbar');
    if (!bar) return;
    const start = $('os-start-button');
    if (start) {
      start.setAttribute('aria-label','Open Start menu');
      start.setAttribute('title','Start');
      start.replaceChildren(icon('start'));
    }
    const separator = bar.querySelector('.taskbar-separator');
    const order = ['files','browser','notes','cinehub','music','paint','settings'];
    const dockButtons = Array.from(bar.querySelectorAll('.task-app'));
    const lookup = new Map();
    dockButtons.forEach(button => {
      const id = button.dataset.app || button.dataset.osDock || button.dataset.osLaunch;
      if (!id) return;
      if (lookup.has(id)) { button.hidden = true; return; }
      lookup.set(id,button);
      button.replaceChildren(icon(ICONS[id] || 'start'));
      button.setAttribute('aria-label',TITLES[id] || id);
      button.setAttribute('title',TITLES[id] || id);
    });
    if (start) bar.prepend(start);
    if (separator && start) start.insertAdjacentElement('afterend',separator);
    order.forEach(id => {
      const button = lookup.get(id);
      if (button) bar.appendChild(button);
    });
    bar.querySelectorAll('.task-app').forEach(button => {
      const id = button.dataset.app || button.dataset.osDock || button.dataset.osLaunch;
      if (id && !order.includes(id)) button.hidden = true;
    });
  }
  function panel(label,app,ic,style,title,subtitle,extraAction) {
    const section = node('section','zu-rail-group');
    section.appendChild(node('span','zu-overline',label));
    const button = node('button','zu-panel');
    button.type = 'button';
    if (app) button.dataset.zuLaunch = app;
    if (extraAction) button.dataset.zuAction = extraAction;
    const mark = node('span','zu-panel-mark '+(style || ''));
    mark.appendChild(icon(ic));
    const details = node('span','zu-panel-text');
    const strong = node('strong',null,title);
    if (label === 'CONTINUE') strong.id='zu-recent-title';
    const small = node('small',null,subtitle);
    if (label === 'CONTINUE') small.id='zu-recent-caption';
    details.append(strong,small);
    const end = node('span','zu-panel-end');
    end.appendChild(icon('chevron'));
    button.append(mark,details,end);
    if (label === 'CONTINUE') button.id = 'zu-resume';
    section.appendChild(button);
    return section;
  }
  function createStage() {
    const desktop = $('desktop');
    if (!desktop) return;
    desktop.classList.add('zu-scene');
    if ($('zu-stage')) return;
    stage = node('section','zu-stage');
    stage.id = 'zu-stage';
    stage.setAttribute('aria-label','ZuzuOS desktop');
    const brand = node('button','zu-ident');
    brand.type = 'button';
    brand.dataset.zuAction = 'account';
    brand.title = 'Account and sign out';
    brand.setAttribute('aria-label','Account and sign out');
    const monogram = node('span','zu-ident-mark');
    const logo = document.createElement('img');
    logo.src = '/assets/zuzifylogo.png';
    logo.alt = '';
    monogram.appendChild(logo);
    const title = node('span',null,'zuzu.os');
    const edition = node('small',null,'WEB DESKTOP');
    brand.append(monogram,title,edition);
    const time = node('div','zu-time-head');
    const day = node('div','zu-weekday','THURSDAY');
    day.id='zu-day';
    const date = node('div','zu-date','');
    date.id='zu-date';
    time.append(day,date);
    const emblem = node('div','zu-art');
    emblem.setAttribute('aria-hidden','true');
    const artImage = document.createElement('img');
    artImage.alt='';
    artImage.src='/assets/graphics/helix-z.svg';
    emblem.appendChild(artImage);
    const rail = node('aside','zu-rail');
    rail.setAttribute('aria-label','Desktop quick actions');
    rail.appendChild(panel('CONTINUE','browser','browser','is-cyan','Nothing open yet','Open an app to get started'));
    rail.appendChild(panel('QUICK PLAY','music','music','is-green','Music','Your audio player'));
    rail.appendChild(panel('APPEARANCE',null,'motion','is-violet','Wallpapers','Motion, images and video','wallpaper'));
    rail.appendChild(panel('SYSTEM','settings','settings','','Settings','Personalize ZuzuOS'));
    const fps = node('span','zu-badge-fps','-- FPS');
    fps.id = 'zu-fps';
    const footer = node('div','zu-foot-left');
    footer.append(node('span','zu-led'),node('span',null,'ZUZU.OS'),node('em',null,'PERSONAL DESKTOP'));
    const right = node('div','zu-foot-right');
    const systemDate = node('span',null,'');
    systemDate.id='zu-system-date';
    right.append(systemDate,document.createTextNode('  /  BUILD 02'));
    stage.append(brand,time,emblem,rail,fps,footer,right);
    desktop.appendChild(stage);
    updateTime();
    updateRecent();
    installDock();
    stage.addEventListener('click',event => {
      const launch = event.target.closest('[data-zu-launch]');
      const action = event.target.closest('[data-zu-action]');
      if (action) {
        if (action.dataset.zuAction === 'wallpaper') window.ZuzuBackgrounds?.open();
        if (action.dataset.zuAction === 'account') $('account-button')?.click();
        if (action.dataset.zuAction === 'updates') openUpdates();
      } else if (launch) launchApp(launch.dataset.zuLaunch);
    });
    document.addEventListener('click',event => {
      const clicked = event.target.closest('#desktop [data-app], #desktop [data-os-launch]');
      if (!clicked) return;
      const id = clicked.dataset.app || clicked.dataset.osLaunch;
      if (id && id !== 'settings') {
        try { localStorage.setItem('zuzu:recent-app',JSON.stringify(id)); } catch { /* no storage */ }
        updateRecent();
      }
    });
    document.addEventListener('keydown',event => {
      if (event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === 'w') {
        event.preventDefault();
        window.ZuzuBackgrounds?.open();
      }
    });
    document.addEventListener('visibilitychange',() => {
      if (document.hidden) {
        if (fpsHandle != null) cancelAnimationFrame(fpsHandle);
        fpsHandle = null;
      } else if (fpsHandle == null) {
        lastSampleAt = 0;
        frameCount = 0;
        fpsHandle = requestAnimationFrame(frame);
      }
    });
    if (typeof requestAnimationFrame === 'function') fpsHandle = requestAnimationFrame(frame);
    setInterval(updateTime, 30000);
    const shortcuts = desktop.querySelectorAll('.os-desktop-shortcuts,#os-scene-shortcuts,#os-team-shortcut');
    shortcuts.forEach(shortcut => shortcut.remove());
  }

  function enhanceCopy() {
    const authTitle = $('auth-title');
    const authSubtitle = $('auth-subtitle');
    const caption = document.querySelector('#auth-screen .auth-caption');
    if (authTitle && authTitle.textContent.trim() === 'Welcome back.') authTitle.textContent='Sign in to ZuzuOS';
    if (authSubtitle) authSubtitle.textContent='Your account, apps, and workspace.';
    if (caption) caption.textContent='ZUZU.OS   /   WEB DESKTOP   /   v2';
    const topMeta = document.querySelector('meta[name="theme-color"]');
    if (topMeta) topMeta.content='#030405';
  }

  function init() {
    enhanceCopy();
    createStage();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();