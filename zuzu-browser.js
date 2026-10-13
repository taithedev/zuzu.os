(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  let tabs = [], active = 0, sequence = 0, mounted = false;
  const BOOKMARK_KEY = 'zuzu:browser:bookmarks:v1';
  const HISTORY_KEY = 'zuzu:browser:history:v1';
  const START = 'zuzu://home';
  const safeRead = (key, fallback) => { try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; } };
  const safeWrite = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } };
  const cloudClient = () => window.zuzuOSAuth?.client || null;
  async function saveCloud(itemKey, value) {
    const client = cloudClient();
    if (!client) return;
    try {
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError || !user) return;
      const { error } = await client.from('user_data').upsert({
        user_id: user.id, namespace: 'browser', item_key: itemKey, value
      }, { onConflict: 'user_id,namespace,item_key' });
      if (error) console.warn('Browser cloud sync:', error.message);
    } catch (error) {
      console.warn('Browser cloud sync unavailable:', error?.message || error);
    }
  }
  async function restoreCloud() {
    const client = cloudClient();
    if (!client) return;
    try {
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError || !user) return;
      const { data, error } = await client.from('user_data')
        .select('item_key,value')
        .eq('user_id', user.id)
        .eq('namespace', 'browser')
        .in('item_key', ['bookmarks', 'history']);
      if (error) {
        console.warn('Browser cloud restore:', error.message);
        return;
      }
      const rows = new Map((data || []).map(row => [row.item_key, row.value]));
      for (const [itemKey, storageKey] of [['bookmarks', BOOKMARK_KEY], ['history', HISTORY_KEY]]) {
        const value = rows.get(itemKey);
        // Prevent browser data from a previous local-only session appearing in a different account.
        if (Array.isArray(value)) safeWrite(storageKey, value);
        else safeWrite(storageKey, []);
      }
    } catch (error) {
      console.warn('Browser cloud restore unavailable:', error?.message || error);
    }
  }
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize = (raw) => {
    const value = String(raw || '').trim();
    if (!value || value === START || value === 'zuzu://home') return START;
    if (/^(javascript|data|file|chrome|chrome-extension|about):/i.test(value)) throw new Error('That address type is not supported.');
    if (/^https?:\/\//i.test(value)) { const u = new URL(value); if (!['http:','https:'].includes(u.protocol)) throw new Error('Only web addresses are supported.'); return u.href; }
    if (/^[\w.-]+\.[a-z]{2,}([/:?#]|$)/i.test(value) && !/\s/.test(value)) return 'https://' + value;
    return 'https://duckduckgo.com/?q=' + encodeURIComponent(value);
  };
  const host = (url) => { try { return new URL(url).hostname.replace(/^www\./,''); } catch { return 'New tab'; } };
  function remember(url) {
    if (url === START) return;
    const history = safeRead(HISTORY_KEY, []);
    history.unshift({url, title: host(url), at: Date.now()});
    const trimmed = history.filter((item, i, arr) => arr.findIndex(x => x.url === item.url) === i).slice(0, 80);
    safeWrite(HISTORY_KEY, trimmed);
    void saveCloud('history', trimmed);
  }
  function current() { return tabs[active]; }
  function createTab(url = START) {
    tabs.push({id: ++sequence, url, title: url === START ? 'New tab' : host(url), back: [], forward: []});
    active = tabs.length - 1;
    render();
    if (url !== START) navigate(url);
  }
  function closeTab(id) {
    if (tabs.length === 1) { tabs[0] = {id: ++sequence, url: START, title:'New tab',back:[],forward:[]}; active = 0; render(); return; }
    const idx = tabs.findIndex(t => t.id === id);
    if (idx < 0) return;
    tabs.splice(idx,1);
    if (active >= tabs.length) active = tabs.length - 1;
    else if (idx < active) active--;
    render();
  }
  function go(raw, push = true) {
    let url;
    try { url = normalize(raw); } catch (e) { status(e.message); return; }
    const tab = current();
    if (!tab) return;
    if (push && tab.url !== START && tab.url !== url) tab.back.push(tab.url);
    if (push) tab.forward = [];
    tab.url = url;
    tab.title = url === START ? 'New tab' : host(url);
    remember(url);
    render();
  }
  function navigate(url) {
    if (!current()) return;
    go(url);
  }
  function status(message) {
    const el = $('zb-status-message');
    if (el) el.textContent = message || 'Ready';
  }
  function openExternal(url = current()?.url) {
    if (!url || url === START) { status('Enter a website or search first.'); return; }
    const w = window.open(url, '_blank', 'noopener,noreferrer');
    if (!w) status('The browser blocked the new tab. Allow pop-ups for zuzuos.lol and try again.');
    else status('Opened in a new browser tab.');
  }
  function render() {
    const body = $('window-body');
    if (!body) return;
    body.innerHTML = `
      <section class="zb" aria-label="ZuzuOS Browser">
        <div class="zb-tabrow" id="zb-tabs" role="tablist"></div>
        <div class="zb-toolbar">
          <button class="zb-iconbtn" id="zb-back" aria-label="Go back" title="Back">←</button>
          <button class="zb-iconbtn" id="zb-forward" aria-label="Go forward" title="Forward">→</button>
          <button class="zb-iconbtn" id="zb-reload" aria-label="Reload page" title="Reload">↻</button>
          <form class="zb-address" id="zb-address-form"><span aria-hidden="true">⌕</span><input id="zb-address-input" aria-label="Address or search" autocomplete="url" spellcheck="false" placeholder="Search or enter website address" value="${esc(current()?.url === START ? '' : current()?.url || '')}"><button class="zb-iconbtn" style="min-width:28px;height:27px" type="submit" title="Go">↵</button></form>
          <button class="zb-iconbtn" id="zb-bookmark-current" title="Bookmark this page" aria-label="Bookmark this page">☆</button>
          <button class="zb-iconbtn" id="zb-open-external" title="Open in a new browser tab" aria-label="Open in a new browser tab">↗</button>
          <button class="zb-iconbtn" id="zb-new-tab" title="New tab" aria-label="New tab">＋</button>
        </div>
        <div class="zb-view" id="zb-view"></div>
        <div class="zb-section"><div class="zb-section-title"><span>Bookmarks</span><button class="zb-iconbtn" id="zb-manage-bookmarks" style="height:25px;min-width:28px">Edit</button></div><div class="zb-bookmarks" id="zb-bookmarks"></div></div>
        <div class="zb-status"><span id="zb-status-message">Ready</span><strong id="zb-status-host">ZuzuOS Browser</strong></div>
      </section>`;
    renderTabs();
    renderView();
    renderBookmarks();
    $('zb-address-form').addEventListener('submit', e => { e.preventDefault(); go($('zb-address-input').value); });
    $('zb-back').disabled = !current()?.back.length;
    $('zb-forward').disabled = !current()?.forward.length;
    $('zb-back').onclick = () => { const t=current(); if(t?.back.length){t.forward.push(t.url);t.url=t.back.pop();t.title=host(t.url);render();} };
    $('zb-forward').onclick = () => { const t=current(); if(t?.forward.length){t.back.push(t.url);t.url=t.forward.pop();t.title=host(t.url);render();} };
    $('zb-reload').onclick = () => { const t=current(); if(t?.url === START) renderView(); else { const view=$('zb-view'); const frame=view?.querySelector('iframe'); if(frame) frame.src=frame.src; else renderView(); status('Reload requested.'); } };
    $('zb-new-tab').onclick = () => createTab();
    $('zb-open-external').onclick = () => openExternal();
    $('zb-bookmark-current').onclick = addBookmark;
    $('zb-manage-bookmarks').onclick = manageBookmarks;
    $('zb-address-input').addEventListener('focus', e => e.target.select());
    $('zb-status-host').textContent = current()?.url === START ? 'Private start page' : host(current()?.url);
  }
  function renderTabs() {
    const row = $('zb-tabs'); if (!row) return;
    row.innerHTML = '';
    tabs.forEach((tab, index) => {
      const b = document.createElement('button');
      b.className = 'zb-tab' + (index === active ? ' active' : '');
      b.setAttribute('role','tab'); b.setAttribute('aria-selected',String(index === active));
      const title = document.createElement('span'); title.textContent = tab.title || 'New tab';
      const close = document.createElement('button'); close.type='button'; close.textContent='×'; close.setAttribute('aria-label','Close '+(tab.title||'tab'));
      close.onclick = e => { e.stopPropagation(); closeTab(tab.id); };
      b.append(title, close);
      b.onclick = () => { active = index; render(); };
      row.append(b);
    });
  }
  function renderView() {
    const view = $('zb-view'); if (!view) return;
    const url = current()?.url || START;
    if (url === START) {
      view.innerHTML = `<div class="zb-start"><div class="zb-wordmark">zuzu<span>.</span>os</div><p>A clean place to start browsing.</p><form class="zb-search" id="zb-start-search"><input id="zb-start-query" aria-label="Search the web" placeholder="Search the web or enter a URL" autocomplete="off"><button type="submit">Search</button></form><div class="zb-shortcuts"><button data-quick="https://www.wikipedia.org">▤ <span>Wikipedia</span></button><button data-quick="https://developer.mozilla.org">⌘ <span>MDN Docs</span></button><button data-quick="https://www.youtube.com">▷ <span>YouTube</span></button><button data-quick="https://www.google.com">⌕ <span>Google</span></button></div><p style="margin-top:24px;margin-bottom:0;max-width:440px;line-height:1.6">Some websites do not allow display inside another website. Use ↗ to open those sites in a normal browser tab.</p></div>`;
      $('zb-start-search').addEventListener('submit', e => { e.preventDefault(); go($('zb-start-query').value); });
      view.querySelectorAll('[data-quick]').forEach(b => b.onclick=()=>go(b.dataset.quick));
      status('Ready');
      return;
    }
    const safeUrl = esc(url);
    view.innerHTML = `<iframe class="zb-frame" title="Web page: ${esc(host(url))}" src="${safeUrl}" referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads" loading="eager"></iframe><div class="zb-blocked" id="zb-embed-help" hidden><h3>This site may not allow embedding.</h3><p>Many sites restrict being displayed inside another website. The site may appear blank or show an error even though it works in Chrome. Open it in a regular browser tab to use the full site.</p><div class="zb-toolbar"><button class="zb-primary" id="zb-fallback-open">Open in Chrome ↗</button><button class="zb-action" id="zb-home">Back to start page</button></div></div>`;
    status('Loading ' + host(url) + '…');
    const frame = view.querySelector('iframe');
    frame.addEventListener('load', () => status('Page loaded · if blank, the site may block embedding.'));
    $('zb-fallback-open').onclick = () => openExternal(url);
    $('zb-home').onclick = () => go(START);
  }
  function renderBookmarks() {
    const el = $('zb-bookmarks'); if (!el) return;
    const bookmarks = safeRead(BOOKMARK_KEY, []);
    el.innerHTML = '';
    if (!bookmarks.length) { el.innerHTML = '<span style="font-size:10px;color:#777780">Bookmarks you add will appear here.</span>'; return; }
    bookmarks.slice(0,12).forEach((item,index) => {
      const b = document.createElement('button'); b.className='zb-bookmark';
      const label=document.createElement('span'); label.textContent=item.title || host(item.url);
      const remove=document.createElement('button'); remove.type='button'; remove.textContent='×'; remove.title='Remove bookmark';
      remove.onclick=e=>{e.stopPropagation();const all=safeRead(BOOKMARK_KEY,[]);all.splice(index,1);safeWrite(BOOKMARK_KEY,all);void saveCloud('bookmarks',all);renderBookmarks();};
      b.append(label,remove); b.onclick=()=>go(item.url); el.append(b);
    });
  }
  function addBookmark() {
    const url=current()?.url;
    if(!url || url===START) return status('Open a website before bookmarking it.');
    const all=safeRead(BOOKMARK_KEY,[]);
    if(all.some(x=>x.url===url)) return status('This page is already bookmarked.');
    all.unshift({url,title:host(url)});
    const trimmed = all.slice(0,50);
    if(!safeWrite(BOOKMARK_KEY,trimmed)) return status('Browser storage is full; bookmark could not be saved.');
    void saveCloud('bookmarks',trimmed);
    renderBookmarks(); status('Bookmark saved.');
  }
  function manageBookmarks() {
    const all=safeRead(BOOKMARK_KEY,[]);
    if(!all.length) return status('No bookmarks yet.');
    const history=safeRead(HISTORY_KEY,[]);
    const latest=history.slice(0,5).map(x=>x.title).join(' · ');
    status('Saved on this device · Recent: ' + (latest || 'none'));
  }
  async function mount() {
    const body=$('window-body');
    if(!body || mounted) return;
    mounted=true;
    tabs=[{id:++sequence,url:START,title:'New tab',back:[],forward:[]}]; active=0;
    await restoreCloud();
    render();
  }
  document.addEventListener('click', e => {
    const launch = e.target.closest('[data-app="browser"],[data-os-launch="browser"],[data-install="browser"]');
    if (!launch) return;
    setTimeout(() => {
      if ($('window-title')?.textContent === 'Web' || $('window-body')?.closest('#app-window') && !$('app-window').classList.contains('hidden')) {
        if (launch.matches('[data-app="browser"],[data-os-launch="browser"],[data-install="browser"]')) {
          mounted=false; mount();
        }
      }
    }, 0);
  }, true);
  document.addEventListener('keydown', e => {
    if (!$('app-window') || $('app-window').classList.contains('hidden') || $('window-title')?.textContent !== 'Web') return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='l') { e.preventDefault(); $('zb-address-input')?.focus(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='t') { e.preventDefault(); createTab(); $('zb-address-input')?.focus(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='w') { e.preventDefault(); if(tabs.length>1) closeTab(current().id); }
  });
  // The first click handler runs after the existing app renderer; this also supports Start-menu launches.
  document.addEventListener('click', e => {
    const target=e.target.closest('[data-app="browser"],[data-os-launch="browser"],[data-install="browser"]');
    if(target) setTimeout(()=>{ if($('window-title')?.textContent==='Web') { mounted=false; mount(); } }, 25);
  });
})();