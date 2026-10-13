(() => {
  'use strict';

  const SUPABASE_URL = 'https://wfqudstuncdldsvxqveu.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_LsAzcgmeAp3fBCtdU6eQzw_u5PPJjar';
  const hasConfig = Boolean(window.supabase && SUPABASE_URL.startsWith('https://') && SUPABASE_KEY.startsWith('sb_publishable_'));
  const db = hasConfig ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  }) : null;
  const $ = (id) => document.getElementById(id);
  const state = { user: null, profile: null, mode: 'signin', activeApp: null, noteTimer: null };

  const local = {
    get(key, fallback = null) {
      try { const value = localStorage.getItem('zuzu:' + key); return value === null ? fallback : JSON.parse(value); }
      catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('zuzu:' + key, JSON.stringify(value)); return true; }
      catch { return false; }
    }
  };

  function message(text, error = false) {
    $('auth-message').textContent = text || '';
    $('auth-message').classList.toggle('error', Boolean(error));
  }
  function toast(text) {
    const el = $('toast');
    el.textContent = text;
    el.classList.remove('hidden');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.add('hidden'), 2800);
  }
  function showAuth() {
    $('auth-screen').classList.remove('hidden');
    $('desktop').classList.add('hidden');
    $('account-menu').classList.add('hidden');
    $('app-window').classList.add('hidden');
  }
  function showDesktop() {
    $('auth-screen').classList.add('hidden');
    $('desktop').classList.remove('hidden');
    renderProfile();
    loadQuickNote();
  }
  function initials(text) {
    const parts = String(text || 'Z').trim().split(/[\s._-]+/).filter(Boolean);
    return (parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2)).toUpperCase();
  }
  function renderProfile() {
    const user = state.user;
    if (!user) return;
    const name = state.profile?.display_name || user.user_metadata?.display_name || user.email?.split('@')[0] || 'Zuzu User';
    const email = user.email || '';
    $('account-name').textContent = name;
    $('account-name').title = email;
    $('avatar').textContent = initials(name);
    $('menu-avatar').textContent = initials(name);
    $('menu-name').textContent = name;
    $('menu-email').textContent = email;
    $('profile-email').textContent = email;
    $('welcome-title').textContent = 'Good to see you, ' + name.split(' ')[0] + '.';
    $('greeting').textContent = 'Your space, your pace.';
    $('sync-title').textContent = 'Account connected';
    $('sync-description').textContent = 'Signed in and ready to sync your data.';
    $('connection-label').textContent = 'Secure session';
  }
  async function fetchProfile() {
    if (!db || !state.user) return;
    const { data, error } = await db.from('profiles').select('id,username,display_name,avatar_url,created_at').eq('id', state.user.id).maybeSingle();
    if (error) {
      console.warn('Profile read:', error.message);
      return;
    }
    state.profile = data;
    if (!data) {
      const displayName = state.user.user_metadata?.display_name || state.user.email?.split('@')[0] || 'Zuzu User';
      const result = await db.from('profiles').upsert({ id: state.user.id, display_name: displayName }, { onConflict: 'id' }).select().maybeSingle();
      if (!result.error) state.profile = result.data;
    }
  }
  function setMode(mode) {
    state.mode = mode;
    const signup = mode === 'signup';
    $('auth-title').textContent = signup ? 'Make it yours.' : 'Welcome back.';
    $('auth-subtitle').textContent = signup ? 'Create your personal zuzu.os account.' : 'Sign in to continue to your desktop.';
    $('auth-submit').textContent = signup ? 'Create account' : 'Sign in';
    $('name-field').classList.toggle('hidden', !signup);
    $('display-name').required = signup;
    $('password').autocomplete = signup ? 'new-password' : 'current-password';
    $('switch-copy').textContent = signup ? 'Already have an account?' : 'New to zuzu.os?';
    $('switch-mode').textContent = signup ? 'Sign in' : 'Create an account';
    $('forgot-password').classList.toggle('hidden', signup);
    message('');
  }
  async function submitAuth(event) {
    event.preventDefault();
    if (!db) { message('Authentication is not configured. Check the project connection in app.js.', true); return; }
    const email = $('email').value.trim().toLowerCase();
    const password = $('password').value;
    const submit = $('auth-submit');
    submit.disabled = true;
    submit.textContent = state.mode === 'signup' ? 'Creating account…' : 'Signing in…';
    message('');
    try {
      if (state.mode === 'signup') {
        const displayName = $('display-name').value.trim();
        const { data, error } = await db.auth.signUp({ email, password, options: { data: { display_name: displayName } } });
        if (error) throw error;
        if (data.session) {
          state.user = data.user;
          await fetchProfile();
          showDesktop();
          toast('Your account is ready.');
        } else {
          message('Account created. Check your email to confirm your address, then sign in.');
          setMode('signin');
          $('email').value = email;
        }
      } else {
        const { data, error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;
        state.user = data.user;
        await fetchProfile();
        showDesktop();
      }
    } catch (error) {
      message(error.message || 'Could not complete authentication. Try again.', true);
    } finally {
      submit.disabled = false;
      submit.textContent = state.mode === 'signup' ? 'Create account' : 'Sign in';
    }
  }
  async function forgotPassword() {
    if (!db) return message('Authentication is not configured.', true);
    const email = $('email').value.trim().toLowerCase();
    if (!email) return message('Enter your email address first.', true);
    const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    message(error ? error.message : 'If that email belongs to an account, a reset link has been sent.');
  }
  async function signOut() {
    if (db) {
      const { error } = await db.auth.signOut();
      if (error) toast('Sign-out issue: ' + error.message);
    }
    state.user = null;
    state.profile = null;
    $('account-menu').classList.add('hidden');
    showAuth();
    $('password').value = '';
    message('You have signed out.');
  }
  async function readUserData(namespace, key) {
    if (!db || !state.user) return null;
    const { data, error } = await db.from('user_data').select('value').eq('user_id', state.user.id).eq('namespace', namespace).eq('item_key', key).maybeSingle();
    if (error) { console.warn('Cloud data read:', error.message); return null; }
    return data?.value ?? null;
  }
  async function writeUserData(namespace, key, value) {
    if (!db || !state.user) return { error: new Error('Sign in to sync your data.') };
    return db.from('user_data').upsert({
      user_id: state.user.id, namespace, item_key: key, value, updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,namespace,item_key' });
  }
  async function loadQuickNote() {
    const localNote = local.get('quick-note', '');
    $('quick-note').value = localNote;
    $('note-status').textContent = state.user ? 'Loading your synced note…' : 'Saved to this device';
    if (state.user) {
      const cloudNote = await readUserData('notes', 'quick-note');
      if (typeof cloudNote === 'string') {
        $('quick-note').value = cloudNote;
        local.set('quick-note', cloudNote);
      }
      $('note-status').textContent = 'Private note · account sync';
    }
  }
  async function saveQuickNote() {
    const value = $('quick-note').value;
    local.set('quick-note', value);
    if (state.user) {
      $('note-status').textContent = 'Syncing…';
      const { error } = await writeUserData('notes', 'quick-note', value);
      $('note-status').textContent = error ? 'Saved on device · sync failed' : 'Saved and synced to your account';
      if (error) toast('Local save worked; cloud sync failed.');
      else toast('Note saved.');
    } else {
      $('note-status').textContent = 'Saved to this device';
      toast('Saved on this device. Sign in to sync.');
    }
  }
  async function updateProfile(event) {
    event.preventDefault();
    const displayName = $('profile-display-name').value.trim();
    const username = $('profile-username').value.trim() || null;
    if (!displayName) return toast('Enter a display name.');
    const { data, error } = await db.from('profiles').upsert({
      id: state.user.id, display_name: displayName, username, updated_at: new Date().toISOString()
    }, { onConflict: 'id' }).select().single();
    if (error) return toast(error.message);
    state.profile = data;
    renderProfile();
    toast('Profile updated.');
  }
  function openApp(name) {
    const title = ({notes:'Notes',files:'My files',settings:'Settings',browser:'Web',cinehub:'Cine Hub',music:'Music',paint:'Paint',terminal:'Terminal',ciri:'CIRI',store:'App Store'})[name];
    if (!title) return;
    state.activeApp = name;
    $('window-title').textContent = title;
    $('window-icon').textContent = ({notes:'▤',files:'▧',settings:'⚙',browser:'◉',cinehub:'▣',music:'♫',paint:'✎',terminal:'⌘',ciri:'✧',store:'＋'})[name];
    $('window-body').innerHTML = '';
    $('app-window').classList.remove('hidden');
    if (name === 'settings') renderSettings();
    if (name === 'notes') renderNotesApp();
    if (name === 'files') renderFilesApp();
    if (name === 'browser') renderBrowserApp();
    if (name === 'cinehub') renderCineHubApp();
    if (name === 'music') renderMusicApp();
    if (name === 'paint') renderPaintApp();
    if (name === 'terminal') renderTerminalApp();
    if (name === 'ciri') renderCiriApp();
    if (name === 'store') renderStoreApp();
  }
  function renderSettings() {
    const name = state.profile?.display_name || state.user.user_metadata?.display_name || '';
    const username = state.profile?.username || '';
    $('window-body').innerHTML = `
      <p class="app-lead">Your account, your preferences. Changes to your profile are stored securely with your account.</p>
      <section class="setting-section"><h3>Personal profile</h3>
        <form id="profile-form" class="app-form">
          <label>Display name<input id="profile-display-name" maxlength="48" required value="${escapeHTML(name)}"></label>
          <label>Username <span class="muted">(optional, 3–24 characters)</span><input id="profile-username" maxlength="24" pattern="[A-Za-z0-9_.-]{3,24}" value="${escapeHTML(username)}" placeholder="your.handle"></label>
          <button class="primary" type="submit">Save profile</button>
        </form>
      </section>
      <section class="setting-section"><h3>Account details</h3><div class="setting-row"><div><strong>${escapeHTML(state.user.email || '')}</strong><p>Email address used to sign in.</p></div><span class="sync-check">✓</span></div><div class="setting-row"><div><strong>Cloud sync</strong><p>Your saved notes and settings are linked to this account.</p></div><span class="sync-check">✓</span></div></section>
      <section class="setting-section"><h3>Appearance</h3><div class="setting-row"><div><strong>Accent color</strong><p>Choose the color used for highlights.</p></div><label><select id="accent-choice"><option value="#9bc4ff">Sky blue</option><option value="#b5a4ff">Lavender</option><option value="#8ee0bd">Mint</option><option value="#f0c58c">Amber</option></select></label></div></section>
      <div class="app-actions"><button id="settings-signout" class="secondary">Sign out</button></div>`;
    $('profile-form').addEventListener('submit', updateProfile);
    $('settings-signout').addEventListener('click', signOut);
    $('accent-choice').value = local.get('accent', '#9bc4ff');
    $('accent-choice').addEventListener('change', (e) => {
      local.set('accent', e.target.value);
      document.documentElement.style.setProperty('--accent', e.target.value);
      document.documentElement.style.setProperty('--accent-strong', e.target.value);
      toast('Appearance updated.');
    });
  }
  function renderNotesApp() {
    $('window-body').innerHTML = `<p class="app-lead">A simple place for ideas. This is the same quick note shown on your desktop.</p><form id="notes-form" class="app-form"><label>Your note<textarea id="app-note" maxlength="10000" placeholder="Start writing…"></textarea></label><div class="app-actions"><button class="primary" type="submit">Save note</button><button class="secondary" id="reload-note" type="button">Reload saved note</button></div></form>`;
    $('app-note').value = $('quick-note').value;
    $('notes-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      $('quick-note').value = $('app-note').value;
      await saveQuickNote();
    });
    $('reload-note').addEventListener('click', () => { $('app-note').value = $('quick-note').value; });
  }
  async function renderFilesApp() {
    $('window-body').innerHTML = `<p class="app-lead">Your personal files area. The quick note is available here; cloud files can be added as storage features are enabled.</p><div class="app-list"><div class="list-item"><div><strong>quick-note.txt</strong><small>Personal note · ${state.user ? 'account sync enabled' : 'device only'}</small></div><button id="open-note-file">Open</button></div><div class="list-item"><div><strong>account-profile.json</strong><small>Profile information · private</small></div><button id="open-profile-file">View</button></div></div>`;
    $('open-note-file').addEventListener('click', () => openApp('notes'));
    $('open-profile-file').addEventListener('click', () => {
      const content = JSON.stringify({ display_name: state.profile?.display_name || '', username: state.profile?.username || null, email: state.user.email }, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'account-profile.json'; a.click();
      URL.revokeObjectURL(url);
    });
  }
  function renderBrowserApp() {
    $('window-body').innerHTML = `<p class="app-lead">Open a website in a new browser tab. For your safety, links are opened outside this desktop.</p><form id="browser-form" class="app-form"><label>Website address<input id="browser-url" type="url" placeholder="https://example.com" value="https://"></label><div class="app-actions"><button class="primary" type="submit">Open website ↗</button></div></form><div class="app-actions"><button class="secondary quick-link" data-url="https://www.wikipedia.org">Wikipedia</button><button class="secondary quick-link" data-url="https://developer.mozilla.org">MDN Web Docs</button></div>`;
    $('browser-form').addEventListener('submit', (e) => {
      e.preventDefault();
      let url;
      try { url = new URL($('browser-url').value); } catch { return toast('Enter a valid website URL.'); }
      if (!['http:', 'https:'].includes(url.protocol)) return toast('Only HTTP and HTTPS links are supported.');
      window.open(url.href, '_blank', 'noopener,noreferrer');
    });
    document.querySelectorAll('.quick-link').forEach(btn => btn.addEventListener('click', () => window.open(btn.dataset.url, '_blank', 'noopener,noreferrer')));
  }

  function renderCineHubApp() {
    $('window-body').innerHTML = `<p class="app-lead">A small discovery shelf. Availability varies by country and subscription; these links open a search in a new tab.</p><div class="app-list"><div class="list-item"><div><strong>Trending picks</strong><small>Browse current streaming options</small></div><button data-cine="https://www.justwatch.com/us">Explore</button></div><div class="list-item"><div><strong>Science fiction</strong><small>Space, futures and strange worlds</small></div><button data-cine="https://www.justwatch.com/us/movies?genres=science-fiction">Browse</button></div><div class="list-item"><div><strong>Animation</strong><small>Animated films and series</small></div><button data-cine="https://www.justwatch.com/us/movies?genres=animation">Browse</button></div></div>`;
    $('window-body').querySelectorAll('[data-cine]').forEach(btn => btn.addEventListener('click', () => window.open(btn.dataset.cine, '_blank', 'noopener,noreferrer')));
  }
  function renderMusicApp() {
    $('window-body').innerHTML = `<p class="app-lead">Play audio files from your device. Files are not uploaded to your account.</p><label class="field">Choose an audio file<input id="music-file" type="file" accept="audio/*"></label><audio id="music-audio" controls style="width:100%;margin-top:12px"></audio><p id="music-status" class="muted" style="font-size:11px">No track selected.</p>`;
    $('music-file').addEventListener('change', () => {
      const file = $('music-file').files?.[0];
      if (!file) return;
      const audio = $('music-audio');
      if (audio.dataset.objectUrl) URL.revokeObjectURL(audio.dataset.objectUrl);
      const url = URL.createObjectURL(file);
      audio.dataset.objectUrl = url;
      audio.src = url;
      $('music-status').textContent = file.name + ' · ' + Math.round(file.size / 1024) + ' KB · local playback';
      audio.play().catch(() => {});
    });
  }
  function renderPaintApp() {
    $('window-body').innerHTML = `<p class="app-lead">A simple canvas for quick sketches. Use your mouse or touch screen, then export your drawing as a PNG.</p><div class="app-actions" style="margin:0 0 12px"><label class="setting-row" style="margin:0;gap:8px">Color <input id="paint-color" type="color" value="#9bc4ff" style="width:45px;height:34px;padding:2px"></label><label class="setting-row" style="margin:0;gap:8px">Brush <input id="paint-size" type="range" min="1" max="28" value="5" style="width:100px"></label><button id="paint-clear" class="secondary">Clear</button><button id="paint-save" class="primary">Export PNG</button></div><canvas id="paint-canvas" width="900" height="430" style="display:block;width:100%;height:auto;max-height:52vh;border:1px solid var(--line);border-radius:12px;background:#f7f9ff;touch-action:none"></canvas>`;
    const canvas=$('paint-canvas'), ctx=canvas.getContext('2d');
    ctx.fillStyle='#f7f9ff'; ctx.fillRect(0,0,canvas.width,canvas.height);
    let drawing=false, last=null;
    const point=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height};};
    canvas.addEventListener('pointerdown',e=>{drawing=true;last=point(e);canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{if(!drawing)return;const p=point(e);ctx.strokeStyle=$('paint-color').value;ctx.lineWidth=Number($('paint-size').value);ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p;});
    canvas.addEventListener('pointerup',()=>{drawing=false;last=null;});
    canvas.addEventListener('pointercancel',()=>{drawing=false;last=null;});
    $('paint-clear').addEventListener('click',()=>{ctx.fillStyle='#f7f9ff';ctx.fillRect(0,0,canvas.width,canvas.height);});
    $('paint-save').addEventListener('click',()=>{const a=document.createElement('a');a.href=canvas.toDataURL('image/png');a.download='zuzu-sketch.png';a.click();});
  }
  function renderTerminalApp() {
    $('window-body').innerHTML = `<p class="app-lead">A safe desktop command simulator, not a system shell. It cannot run commands on your computer.</p><div id="terminal-output" style="background:#080d14;border:1px solid var(--line);border-radius:12px;padding:14px;min-height:170px;max-height:34vh;overflow:auto;color:#a9d8c5;font:12px/1.7 ui-monospace,monospace;white-space:pre-wrap">zuzu.os [web shell] · type help to see commands\n</div><form id="terminal-form" style="display:flex;gap:8px;margin-top:10px"><input id="terminal-input" aria-label="Command" autocomplete="off" spellcheck="false" placeholder="help" style="flex:1;min-width:0;background:#0b1420;color:var(--text);border:1px solid #344258;border-radius:10px;padding:11px;font:12px ui-monospace,monospace"><button class="primary" type="submit">Run</button></form>`;
    const output=$('terminal-output');
    $('terminal-form').addEventListener('submit',e=>{e.preventDefault();const cmd=$('terminal-input').value.trim().toLowerCase();$('terminal-input').value='';let result='';if(cmd==='help')result='help  about  date  apps  clear  whoami';else if(cmd==='about')result='zuzu.os — a personal web desktop.';else if(cmd==='date')result=new Date().toString();else if(cmd==='apps')result='Notes, My files, Settings, Web, Cine Hub, Music, Paint, CIRI, App Store';else if(cmd==='whoami')result=state.user?.email||'guest';else if(cmd==='clear'){output.textContent='';return;}else if(cmd==='')return;else result='Unknown command. Type help.';output.textContent+='\n> '+cmd+'\n'+result+'\n';output.scrollTop=output.scrollHeight;});
  }
  function renderCiriApp() {
    $('window-body').innerHTML = `<p class="app-lead">CIRI is a lightweight local helper. It does not send your prompts to an AI service.</p><div id="ciri-history" class="app-list" style="margin-bottom:14px"><div class="list-item"><div><strong>CIRI</strong><small>Hi. Ask me for a quick idea, a focus tip, or help using this desktop.</small></div></div></div><form id="ciri-form" class="app-form"><label>Message<input id="ciri-input" maxlength="500" placeholder="What can you help me with?"></label><button class="primary" type="submit">Ask CIRI</button></form>`;
    $('ciri-form').addEventListener('submit',e=>{e.preventDefault();const input=$('ciri-input'),q=input.value.trim();if(!q)return;const low=q.toLowerCase();let answer='I can help you use zuzu.os. Try Notes to save a thought, Settings to update your profile, or Paint for a sketch.';if(low.includes('focus')||low.includes('study'))answer='Try choosing one small task, setting a short timer, and putting unrelated tabs away until that task is done.';else if(low.includes('note'))answer='Open Notes or use the quick-capture panel on the desktop. Signed-in notes can sync to your account.';else if(low.includes('account')||low.includes('password'))answer='Open Settings to update your profile. Use “Forgot password?” on the sign-in screen to request a reset email.';else if(low.includes('time'))answer='The current time is '+new Date().toLocaleTimeString()+'.';const history=$('ciri-history');const user=document.createElement('div');user.className='list-item';user.innerHTML='<div><strong>You</strong><small></small></div>';user.querySelector('small').textContent=q;history.append(user);const reply=document.createElement('div');reply.className='list-item';reply.innerHTML='<div><strong>CIRI</strong><small></small></div>';reply.querySelector('small').textContent=answer;history.append(reply);input.value='';});
  }
  function renderStoreApp() {
    const apps=[['Notes','Capture and sync a quick note','notes'],['Paint','Draw and export a sketch','paint'],['Music','Play audio from your device','music'],['Cine Hub','Browse streaming discovery links','cinehub'],['Terminal','Try safe desktop commands','terminal'],['CIRI','Use the local helper','ciri']];
    $('window-body').innerHTML='<p class="app-lead">Small tools included with your desktop. No downloads or paid subscriptions required.</p><div class="app-list">'+apps.map(([name,desc,id])=>'<div class="list-item"><div><strong>'+escapeHTML(name)+'</strong><small>'+escapeHTML(desc)+'</small></div><button data-install="'+id+'">Open</button></div>').join('')+'</div>';
    $('window-body').querySelectorAll('[data-install]').forEach(btn=>btn.addEventListener('click',()=>openApp(btn.dataset.install)));
  }
  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }
  function updateClock() {
    const now = new Date();
    $('clock-time').textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    $('task-clock').textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    $('clock-date').textContent = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  }
  async function boot() {
    $('auth-form').addEventListener('submit', submitAuth);
    $('switch-mode').addEventListener('click', () => setMode(state.mode === 'signin' ? 'signup' : 'signin'));
    $('forgot-password').addEventListener('click', forgotPassword);
    $('save-note').addEventListener('click', saveQuickNote);
    $('quick-note').addEventListener('input', () => {
      local.set('quick-note', $('quick-note').value);
      $('note-status').textContent = 'Saved to this device';
      clearTimeout(state.noteTimer);
      state.noteTimer = setTimeout(() => {
        if (state.user) saveQuickNote();
      }, 1200);
    });
    $('account-button').addEventListener('click', () => $('account-menu').classList.toggle('hidden'));
    $('task-account').addEventListener('click', () => $('account-menu').classList.toggle('hidden'));
    $('menu-settings').addEventListener('click', () => { $('account-menu').classList.add('hidden'); openApp('settings'); });
    $('open-settings').addEventListener('click', () => openApp('settings'));
    $('edit-shortcuts').addEventListener('click', () => openApp('settings'));
    $('sign-out').addEventListener('click', signOut);
    $('home-button').addEventListener('click', () => { $('app-window').classList.add('hidden'); $('account-menu').classList.add('hidden'); });
    $('close-window').addEventListener('click', () => $('app-window').classList.add('hidden'));
    document.querySelectorAll('[data-app]').forEach(button => button.addEventListener('click', () => openApp(button.dataset.app)));
    $('cookie-accept').addEventListener('click', () => { local.set('cookie-consent', true); $('cookie-notice').classList.add('hidden'); });
    const accent = local.get('accent');
    if (accent) document.documentElement.style.setProperty('--accent', accent);
    if (!local.get('cookie-consent', false)) $('cookie-notice').classList.remove('hidden');
    updateClock();
    setInterval(updateClock, 15000);
    setMode('signin');
    if (!db) {
      message('Could not load account services. Refresh this page or check the project settings.', true);
      return;
    }
    const { data: { session } } = await db.auth.getSession();
    if (session?.user) {
      state.user = session.user;
      await fetchProfile();
      showDesktop();
    } else {
      showAuth();
    }
    db.auth.onAuthStateChange((_event, sessionNow) => {
      if (sessionNow?.user) {
        state.user = sessionNow.user;
        setTimeout(async () => { await fetchProfile(); showDesktop(); }, 0);
      } else if (state.user) {
        state.user = null;
        state.profile = null;
        showAuth();
      }
    });
  }
  document.addEventListener('DOMContentLoaded', boot);
})();