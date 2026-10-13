/* Account-scoped desktop sync. Only user_data rows owned by the signed-in user are written. */
(() => {
  'use strict';
  const KEYS = [
    'zuzu:theme-preset', 'zuzu:wallpaper', 'zuzu:accent', 'zuzu:shell-style',
    'zuzu:desktop-ui:v1', 'zuzu:os-vfs:v1', 'zuzu:os-wallpaper',
    'zuzu:os-label', 'zuzu:os-welcome'
  ];
  const client = () => window.zuzuOSAuth?.client || null;
  let userId = null;
  let ready = false;
  let restoring = false;
  let saveTimer = 0;
  let chain = Promise.resolve();

  function snapshot() {
    const out = {};
    for (const key of KEYS) {
      const value = localStorage.getItem(key);
      if (value !== null) out[key] = value;
    }
    return out;
  }
  function notify(message) {
    const node = document.getElementById('sync-description');
    if (node) node.textContent = message;
    const title = document.getElementById('sync-title');
    if (title) title.textContent = message.includes('failed') ? 'Sync needs attention' : 'Desktop sync';
    const label = document.getElementById('connection-label');
    if (label) label.textContent = message.includes('failed') ? 'Sync issue' : 'Cloud sync';
  }
  async function persist(id) {
    const db = client();
    if (!db || !id || id !== userId || !ready) return;
    const value = snapshot();
    chain = chain.then(async () => {
      const { error } = await db.from('user_data').upsert({
        user_id: id, namespace: 'desktop', item_key: 'state', value,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,namespace,item_key' });
      if (error) throw error;
    }).catch(error => {
      console.warn('ZuzuOS desktop sync failed:', error?.message || error);
      notify('Some desktop changes could not sync. Check your connection.');
    });
    await chain;
    if (id === userId) notify('Desktop preferences synced to your account.');
  }
  async function syncUser(user) {
    const db = client();
    if (!db || !user?.id) return;
    userId = user.id;
    ready = false;
    try {
      const { data, error } = await db.from('user_data').select('value')
        .eq('user_id', user.id).eq('namespace', 'desktop').eq('item_key', 'state').maybeSingle();
      if (error) throw error;
      if (userId !== user.id) return;
      const cloud = data?.value;
      if (cloud && typeof cloud === 'object' && !Array.isArray(cloud)) {
        restoring = true;
        for (const key of KEYS) {
          if (typeof cloud[key] === 'string') localStorage.setItem(key, cloud[key]);
          else localStorage.removeItem(key);
        }
        restoring = false;
        // Re-apply settings that are read by the UI scripts after login.
        const style = JSON.parse(localStorage.getItem('zuzu:shell-style') || '"windows"');
        document.getElementById('desktop')?.setAttribute('data-shell-style', style);
        document.documentElement.dataset.shellStyle = style;
        document.body.dataset.shellStyle = style;
        const theme = JSON.parse(localStorage.getItem('zuzu:theme-preset') || '"cine"');
        const wallpaper = JSON.parse(localStorage.getItem('zuzu:wallpaper') || '"none"');
        document.documentElement.dataset.themePreset = theme;
        document.body.dataset.themePreset = theme;
        const accents = JSON.parse(localStorage.getItem('zuzu:accent') || 'null');
        if (accents) document.documentElement.style.setProperty('--accent', accents);
        if (typeof window.zuzuApplySyncedDesktop === 'function') window.zuzuApplySyncedDesktop({style, theme, wallpaper, accent:accents});
      } else {
        ready = true;
        await persist(user.id);
      }
      ready = true;
      notify('Desktop preferences synced to your account.');
    } catch (error) {
      restoring = false;
      console.warn('ZuzuOS desktop sync unavailable:', error?.message || error);
      ready = true;
      notify('Desktop sync unavailable. Local changes are still saved.');
    }
  }
  window.zuzuApplySyncedDesktop = function({style, theme, wallpaper, accent} = {}) {
    const safeStyle = ['cine','windows','macos'].includes(style) ? style : 'windows';
    document.getElementById('desktop')?.setAttribute('data-shell-style', safeStyle);
    document.documentElement.dataset.shellStyle = safeStyle;
    document.body.dataset.shellStyle = safeStyle;
    const startMark = document.querySelector('#os-start-button .os-start-mark');
    if (startMark) {
      startMark.classList.toggle('os-windows-logo', safeStyle === 'windows');
      startMark.innerHTML = safeStyle === 'windows' ? '<i></i><i></i><i></i><i></i>' : 'z.';
    }
    if (accent) document.documentElement.style.setProperty('--accent', accent);
    const desk = document.getElementById('desktop');
    const wallpaperName = ['silent-shore','aurora','obsidian','afterglow'].includes(wallpaper) ? wallpaper : 'none';
    if (desk && wallpaperName !== 'none') {
      const img = 'url("assets/wallpapers/' + wallpaperName + '.svg")';
      desk.style.backgroundImage = 'linear-gradient(180deg,#07111b22 0%,#07111b05 40%,#03070d45 100%),' + img;
      desk.style.backgroundSize = 'cover';
      desk.style.backgroundAttachment = 'fixed';
    }
  };
  const originalSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function(key, value) {
    originalSetItem.call(this, key, value);
    if (this !== localStorage || restoring || !KEYS.includes(String(key)) || !ready || !userId) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { void persist(userId); }, 450);
  };
  const originalRemoveItem = Storage.prototype.removeItem;
  Storage.prototype.removeItem = function(key) {
    originalRemoveItem.call(this, key);
    if (this !== localStorage || restoring || !KEYS.includes(String(key)) || !ready || !userId) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { void persist(userId); }, 450);
  };
  function start() {
    const db = client();
    if (!db) return;
    db.auth.onAuthStateChange((event, session) => {
      setTimeout(() => {
        if (session?.user) void syncUser(session.user);
        else { userId = null; ready = false; }
      }, 0);
    });
    db.auth.getSession().then(({data}) => {
      if (data?.session?.user) void syncUser(data.session.user);
    }).catch(() => {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
