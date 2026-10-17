(() => {
  'use strict';

  const SUPABASE_URL = 'https://wfqudstuncdldsvxqveu.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_LsAzcgmeAp3fBCtdU6eQzw_u5PPJjar';
  const hasConfig = Boolean(window.supabase && SUPABASE_URL.startsWith('https://') && SUPABASE_KEY.startsWith('sb_publishable_'));
  const db = hasConfig ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  }) : null;
  // The public browser client contains only the publishable key; database RLS enforces all privileged actions.
  window.zuzuOSAuth = { client: db };
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
    $('reset-password-screen')?.classList.add('hidden');
    $('auth-screen').classList.remove('hidden');
    $('desktop').classList.add('hidden');
    $('account-menu').classList.add('hidden');
    $('app-window').classList.add('hidden');
  }

  function showPasswordRecovery() {
    $('auth-screen').classList.add('hidden');
    $('desktop').classList.add('hidden');
    $('setup-screen').classList.add('hidden');
    $('reset-password-screen').classList.remove('hidden');
    $('recovery-message').textContent = '';
    setTimeout(() => $('recovery-password')?.focus(), 50);
  }
  async function submitPasswordRecovery(event) {
    event.preventDefault();
    const password = $('recovery-password').value;
    const confirmation = $('recovery-password-confirm').value;
    if (password.length < 8) return $('recovery-message').textContent = 'Use at least 8 characters.';
    if (password !== confirmation) return $('recovery-message').textContent = 'The passwords do not match.';
    const button = $('recovery-submit');
    button.disabled = true;
    button.textContent = 'Saving…';
    $('recovery-message').textContent = 'Updating your password…';
    try {
      const { error } = await db.auth.updateUser({ password });
      if (error) throw error;
      $('recovery-password-form').reset();
      $('recovery-message').textContent = 'Password updated. You are now signed in.';
      history.replaceState({}, document.title, location.pathname);
      state.user = (await db.auth.getUser()).data.user || state.user;
      await fetchProfile();
      $('reset-password-screen').classList.add('hidden');
      showDesktop();
      toast('Your password has been updated.');
    } catch (error) {
      $('recovery-message').textContent = error.message || 'Could not update the password. Request a new reset email and try again.';
    } finally {
      button.disabled = false;
      button.textContent = 'Save new password';
    }
  }

  let setupStep = 0;
  function renderSetupStep() {
    document.querySelectorAll('[data-setup-page]').forEach((page) => page.classList.toggle('active', Number(page.dataset.setupPage) === setupStep));
    document.querySelectorAll('[data-setup-step]').forEach((step) => {
      const index = Number(step.dataset.setupStep);
      step.classList.toggle('active', index === setupStep);
      step.classList.toggle('done', index < setupStep);
      const number = step.querySelector('span');
      if (number) number.textContent = index < setupStep ? '✓' : String(index + 1);
    });
    document.querySelectorAll('.setup-progress span').forEach((dot, index) => dot.classList.toggle('active', index === setupStep));
    $('setup-back').disabled = setupStep === 0;
    $('setup-next').innerHTML = setupStep === 0 ? 'Get started <span>→</span>' : setupStep === 3 ? 'Open my desktop <span>→</span>' : 'Continue <span>→</span>';
  }
  function showSetupIfNeeded() {
    const recoveryLink = new URLSearchParams(location.hash.replace(/^#/, '')).get('type') === 'recovery' || new URLSearchParams(location.search).has('code');
    if (local.get('setup-complete', false) || recoveryLink) return;
    setupStep = 0;
    renderSetupStep();
    const chosenWallpaper = local.get('wallpaper', 'none');
    document.querySelectorAll('[data-wallpaper-choice]').forEach((button) => button.classList.toggle('selected', button.dataset.wallpaperChoice === chosenWallpaper));
    $('setup-screen').classList.remove('hidden');
  }
  function closeSetup() {
    local.set('setup-complete', true);
    $('setup-screen').classList.add('hidden');
    toast('Welcome to ZuzuOS. Your desktop is ready.');
  }
  async function showDesktop() {
    $('auth-screen').classList.add('hidden');
    $('desktop').classList.add('hidden');
    if (state.user && window.ZuzuGate && !(await window.ZuzuGate.beforeDesktop(state.user))) return;
    $('desktop').classList.remove('hidden');
    renderProfile();
    loadQuickNote();
    showSetupIfNeeded();
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
    const { data, error } = await db.from('zuzuos_profiles').select('id,username,display_name,avatar_url,created_at').eq('id', state.user.id).maybeSingle();
    if (error) {
      console.warn('Profile read:', error.message);
      return;
    }
    state.profile = data;
    if (!data) {
      const displayName = state.user.user_metadata?.display_name || state.user.email?.split('@')[0] || 'Zuzu User';
      const result = await db.from('zuzuos_profiles').upsert({ id: state.user.id, display_name: displayName }, { onConflict: 'id' }).select().maybeSingle();
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
    const { data, error } = await db.from('zuzuos_user_data').select('value').eq('user_id', state.user.id).eq('namespace', namespace).eq('item_key', key).maybeSingle();
    if (error) { console.warn('Cloud data read:', error.message); return null; }
    return data?.value ?? null;
  }
  async function writeUserData(namespace, key, value) {
    if (!db || !state.user) return { error: new Error('Sign in to sync your data.') };
    return db.from('zuzuos_user_data').upsert({
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
    const username = $('profile-username').value.trim().toLowerCase() || null;
    if (!displayName) return toast('Enter a display name.');
    const { data, error } = await db.from('zuzuos_profiles').upsert({
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
      <header class="zuzu-settings-hero"><span class="zuzu-settings-hero-icon" aria-hidden="true">⚙</span><div><h2>Settings</h2><p>Manage your account, appearance, security and ZuzuOS edition.</p></div></header>
      <p class="app-lead">Your account, your preferences. Changes to your profile are stored securely with your account.</p>
      <section class="setting-section"><h3>Personal profile</h3>
        <form id="profile-form" class="app-form">
          <label>Display name<input id="profile-display-name" maxlength="48" required value="${escapeHTML(name)}"></label>
          <label>Username <span class="muted">(optional, 3–24 characters)</span><input id="profile-username" maxlength="24" pattern="[A-Za-z0-9_.-]{3,24}" value="${escapeHTML(username)}" placeholder="your.handle"></label>
          <button class="primary" type="submit">Save profile</button>
        </form>
      </section>
      <section class="setting-section"><h3>Account security</h3>
        <form id="password-change-form" class="app-form">
          <label>Current password<input id="current-password" type="password" autocomplete="current-password" required placeholder="Verify it is you"></label>
          <label>New password<input id="new-password" type="password" minlength="8" autocomplete="new-password" required placeholder="At least 8 characters"></label>
          <label>Confirm new password<input id="confirm-password" type="password" minlength="8" autocomplete="new-password" required placeholder="Enter it again"></label>
          <button class="primary" type="submit">Update password</button>
          <p id="password-status" class="muted" role="status" aria-live="polite"></p>
        </form>
      </section>
      <section class="setting-section"><h3>Change email address</h3>
        <form id="email-change-form" class="app-form">
          <label>New email address<input id="new-email" type="email" autocomplete="email" required placeholder="new-address@example.com"></label>
          <button class="secondary" type="submit">Send email change request</button>
          <p id="email-change-status" class="muted" role="status"></p>
        </form>
      </section>
      <section class="setting-section"><h3>Delete account</h3>
        <p class="muted" style="font-size:12px">Permanently delete your ZuzuOS account, profile, saved data, and uploaded files. This cannot be undone.</p>
        <label>Type DELETE MY ZUZU ACCOUNT to confirm<input id="delete-confirmation" autocomplete="off" placeholder="DELETE MY ZUZU ACCOUNT"></label>
        <button id="delete-account" class="secondary danger-action" type="button">Permanently delete my account</button>
      </section>
      <section class="setting-section"><h3>Account details</h3><div class="setting-row"><div><strong>${escapeHTML(state.user.email || '')}</strong><p>Email address used to sign in.</p></div><span class="sync-check">✓</span></div><div class="setting-row"><div><strong>Cloud sync</strong><p>Your saved notes and settings are linked to this account.</p></div><span class="sync-check">✓</span></div></section>
      <section class="setting-section" id="license-section">
        <h3>ZuzuOS edition & license</h3>
        <p class="muted" style="font-size:12px">Your edition is tied to your signed-in account. License keys are checked by Supabase, not just by the browser.</p>
        <div class="setting-row"><div><strong id="license-current-plan">Checking edition…</strong><p id="license-current-version">Checking version…</p></div><span class="sync-check" id="license-status-mark">…</span></div>
        <form id="license-activate-form" class="app-form">
          <label>Product key<input id="license-key-input" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="80" required placeholder="ZUZU-PRO-XXXX-XXXX-XXXX"></label>
          <button class="primary" type="submit">Activate key</button>
          <p id="license-activate-status" class="muted" role="status" aria-live="polite"></p>
        </form>
        <div id="license-owner-tools" class="hidden">
          <div class="setting-section"><h3>Owner license manager</h3>
            <p class="muted" style="font-size:12px">Generate a key and copy it immediately. Only its hash is stored, so the full key cannot be recovered later.</p>
            <form id="license-generate-form" class="app-form">
              <label>Edition<select id="license-plan"><option value="pro">ZuzuOS Pro</option><option value="developer">Developer</option><option value="lifetime">Lifetime</option></select></label>
              <label>Version entitlement<input id="license-version" maxlength="32" value="1.x" pattern="[A-Za-z0-9._-]+" required></label>
              <label>Maximum activations<input id="license-max-activations" type="number" min="1" max="1000" value="1" required></label>
              <label>Expiration date (optional)<input id="license-expires" type="date"></label>
              <button class="primary" type="submit">Generate product key</button>
              <p id="license-generate-status" class="muted" role="status" aria-live="polite"></p>
              <button id="license-copy-key" class="secondary hidden" type="button">Copy generated key</button>
            </form>
            <div class="section-heading"><h3>Issued keys</h3><button id="license-refresh" class="secondary" type="button">Refresh</button></div>
            <div id="license-key-list" class="app-list"><p class="muted">Load issued keys to manage them.</p></div>
          </div>
        </div>
      </section>
      <section class="setting-section"><h3>Appearance</h3>
        <div class="setting-row"><div><strong>Preset theme</strong><p>Choose a complete dark desktop palette.</p></div><label><select id="theme-preset-choice"><option value="cine">Cinematic Black</option><option value="oled">Pure OLED</option><option value="graphite">Graphite</option><option value="crimson">Crimson Night</option><option value="midnight">Midnight Blue</option></select></label></div>
        <div class="setting-row"><div><strong>Desktop layout</strong><p>Switch between Cine Desktop, Windows-style, and macOS-style layouts.</p></div><label><select id="shell-layout-choice"><option value="cine">Cine Desktop</option><option value="windows">Windows Style</option><option value="macos">macOS Style</option></select></label></div>
        <div class="setting-row"><div><strong>Accent color</strong><p>Choose the color used for highlights.</p></div><label><select id="accent-choice"><option value="#9bc4ff">Sky blue</option><option value="#b5a4ff">Lavender</option><option value="#8ee0bd">Mint</option><option value="#f0c58c">Amber</option></select></label></div>
        <div class="setting-row"><div><strong>Desktop wallpaper</strong><p>Choose the base image for this device.</p></div><label><select id="wallpaper-choice"><option value="none">Default for layout</option><option value="silent-shore">Silent Shore</option><option value="aurora">Aurora</option><option value="obsidian">Obsidian</option><option value="afterglow">Afterglow</option></select></label></div>
        <div class="zuzu-motion-settings">
          <div class="setting-row"><div><strong>Live wallpaper</strong><p>Soft, animated color fields that move behind your windows.</p></div><label><select id="wallpaper-motion-choice"><option value="aurora">Flowing Aurora</option><option value="nebula">Deep Space</option><option value="mist">Blue Mist</option><option value="waves">Liquid Waves</option><option value="none">Off</option></select></label></div>
          <div class="setting-row"><div><strong>Animation speed</strong><p>Control how quickly the background drifts.</p></div><label><input class="zuzu-motion-range" id="wallpaper-motion-speed" type="range" min="45" max="140" step="5" value="85" aria-label="Wallpaper animation speed"><span class="zuzu-motion-value" id="wallpaper-speed-value">85%</span></label></div>
          <div class="setting-row"><div><strong>Motion intensity</strong><p>Adjust the glow and color strength.</p></div><label><input class="zuzu-motion-range" id="wallpaper-motion-intensity" type="range" min="0" max="100" step="5" value="70" aria-label="Wallpaper motion intensity"><span class="zuzu-motion-value" id="wallpaper-intensity-value">70%</span></label></div>
          <p class="muted" style="font-size:11px;line-height:1.55;margin:10px 0 0">Your wallpaper preferences are saved on this device. Turn Motion off in Quick Settings or select Off here to pause the moving background.</p>
        </div>
      </section>
      <div class="app-actions"><button id="settings-signout" class="secondary">Sign out</button></div>`;
    // Group settings while keeping the existing form IDs and event handlers intact.
    const settingsBody = $('window-body');
    settingsBody.classList.add('zu-settings-active');
    const sections = [...settingsBody.querySelectorAll(':scope > .setting-section')];
    const pages = [
      {id:'appearance', label:'Appearance', subtitle:'Themes, wallpapers and desktop layout', icon:'◐'},
      {id:'profile', label:'Profile', subtitle:'Display name and account details', icon:'◉'},
      {id:'security', label:'Security', subtitle:'Password, email and account access', icon:'◇'},
      {id:'license', label:'Edition', subtitle:'Licenses and account entitlement', icon:'▣'}
    ];
    const sectionGroup = title => {
      if (/appearance/i.test(title)) return 'appearance';
      if (/personal profile|account details/i.test(title)) return 'profile';
      if (/license|edition/i.test(title)) return 'license';
      return 'security';
    };
    const shell = document.createElement('div');
    shell.className = 'zu-settings-layout';
    const menu = document.createElement('nav');
    menu.className = 'zu-settings-sidebar';
    menu.setAttribute('aria-label', 'Settings sections');
    const panel = document.createElement('div');
    panel.className = 'zu-settings-main';
    panel.id = 'zu-settings-main';
    for (const page of pages) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'zu-settings-nav';
      button.dataset.settingsPage = page.id;
      button.setAttribute('aria-controls', 'zu-settings-panel-' + page.id);
      button.setAttribute('aria-pressed', 'false');
      const mark = document.createElement('span');
      mark.className = 'zu-settings-nav-icon';
      mark.textContent = page.icon;
      const words = document.createElement('span');
      words.className = 'zu-settings-nav-label';
      const title = document.createElement('strong');
      title.textContent = page.label;
      const sub = document.createElement('small');
      sub.textContent = page.subtitle;
      words.append(title,sub);
      button.append(mark,words);
      menu.appendChild(button);
      const area = document.createElement('section');
      area.id = 'zu-settings-panel-' + page.id;
      area.className = 'zu-settings-page';
      area.dataset.settingsPanel = page.id;
      area.hidden = true;
      const heading = document.createElement('div');
      heading.className = 'zu-settings-page-heading';
      const overline = document.createElement('span');
      overline.textContent = 'ZUZUOS / SETTINGS';
      const h = document.createElement('h3');
      h.textContent = page.label;
      const p = document.createElement('p');
      p.textContent = page.subtitle;
      heading.append(overline,h,p);
      area.appendChild(heading);
      panel.appendChild(area);
    }
    for (const section of sections) {
      const title = section.querySelector('h3')?.textContent || '';
      const target = panel.querySelector('[data-settings-panel="' + sectionGroup(title) + '"]');
      if (target) target.appendChild(section);
    }
    const intro = settingsBody.querySelector('.app-lead');
    intro?.remove();
    const actions = settingsBody.querySelector('.app-actions');
    if (actions) menu.appendChild(actions);
    shell.append(menu,panel);
    settingsBody.appendChild(shell);
    const activate = pageId => {
      if (!pages.some(p=>p.id===pageId)) pageId='appearance';
      menu.querySelectorAll('[data-settings-page]').forEach(b => {
        const current=b.dataset.settingsPage===pageId;
        b.setAttribute('aria-pressed',String(current));
        b.classList.toggle('active',current);
      });
      panel.querySelectorAll('[data-settings-panel]').forEach(p => {p.hidden=p.dataset.settingsPanel!==pageId;});
      panel.scrollTop=0;
      try {sessionStorage.setItem('zuzu:settings:last-page',pageId);} catch {}
    };
    menu.addEventListener('click',event => {
      const button=event.target.closest('[data-settings-page]');
      if (button) activate(button.dataset.settingsPage);
    });
    let initial='appearance';
    try {initial=sessionStorage.getItem('zuzu:settings:last-page')||initial;}catch{}
    activate(initial);
    $('profile-form').addEventListener('submit', updateProfile);
    $('delete-account').addEventListener('click', async () => {
      if ($('delete-confirmation').value.trim() !== 'DELETE MY ZUZU ACCOUNT') return toast('Type the exact confirmation phrase first.');
      if (!window.confirm('Permanently delete your ZuzuOS account and all uploaded files? This cannot be undone.')) return;
      const button = $('delete-account');
      button.disabled = true;
      button.textContent = 'Deleting account…';
      try {
        const { data: { session } } = await db.auth.getSession();
        if (!session?.access_token) throw new Error('Your session expired. Sign in again and retry.');
        const response = await fetch(SUPABASE_URL + '/functions/v1/delete-account', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + session.access_token, 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirmation: 'DELETE MY ZUZU ACCOUNT' })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Account deletion failed.');
        state.user = null; state.profile = null;
        await db.auth.signOut();
        showAuth();
        message('Your ZuzuOS account has been deleted.');
      } catch (error) {
        toast(error.message || 'Account deletion failed.');
        button.disabled = false;
        button.textContent = 'Permanently delete my account';
      }
    });

    $('email-change-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = $('new-email').value.trim().toLowerCase();
      if (!email || email === (state.user.email || '').toLowerCase()) return toast('Enter a different email address.');
      const button = $('email-change-form').querySelector('button[type="submit"]');
      button.disabled = true;
      $('email-change-status').textContent = 'Requesting email change…';
      const { error } = await db.auth.updateUser({ email });
      button.disabled = false;
      if (error) { $('email-change-status').textContent = error.message; return; }
      $('email-change-form').reset();
      $('email-change-status').textContent = 'Check your email for confirmation instructions before the address changes.';
      toast('Email change requested.');
    });
    $('password-change-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const currentPassword = $('current-password').value;
      const password = $('new-password').value;
      const confirmation = $('confirm-password').value;
      if (password.length < 8) { $('password-status').textContent = 'Use at least 8 characters.'; return; }
      if (password !== confirmation) { $('password-status').textContent = 'The new passwords do not match.'; return; }
      if (password === currentPassword) { $('password-status').textContent = 'Choose a different password.'; return; }
      const button = $('password-change-form').querySelector('button[type="submit"]');
      button.disabled = true;
      $('password-status').textContent = 'Verifying your current password…';
      try {
        const { error: verifyError } = await db.auth.signInWithPassword({ email: state.user.email, password: currentPassword });
        if (verifyError) throw new Error('Current password is incorrect. Check it and try again.');
        $('password-status').textContent = 'Updating password…';
        const { error } = await db.auth.updateUser({ password });
        if (error) throw error;
        $('password-change-form').reset();
        $('password-status').textContent = 'Password updated successfully.';
        toast('Your password has been updated.');
      } catch (error) {
        $('password-status').textContent = error.message || 'Could not update your password. Try signing in again.';
      } finally {
        button.disabled = false;
      }
    });
    $('license-activate-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const key = $('license-key-input').value.trim();
      const button = $('license-activate-form').querySelector('button[type="submit"]');
      button.disabled = true;
      $('license-activate-status').textContent = 'Validating product key…';
      try {
        const { data, error } = await db.rpc('zuzuos_activate_license', { p_license_key: key });
        if (error) throw error;
        const entitlement = Array.isArray(data) ? data[0] : data;
        $('license-activate-form').reset();
        $('license-activate-status').textContent = 'Activated: ' + String(entitlement?.plan || 'licensed').toUpperCase() + ' · version ' + (entitlement?.version || '1.x');
        await loadLicensePanel();
        toast('ZuzuOS license activated.');
      } catch (error) {
        $('license-activate-status').textContent = error.message || 'Could not activate that key.';
      } finally { button.disabled = false; }
    });
    $('license-generate-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = $('license-generate-form').querySelector('button[type="submit"]');
      button.disabled = true;
      $('license-generate-status').textContent = 'Generating a secure key…';
      $('license-copy-key').classList.add('hidden');
      try {
        const plan = $('license-plan').value;
        const version = $('license-version').value.trim();
        const max = Number($('license-max-activations').value);
        const date = $('license-expires').value;
        const expires = date ? new Date(date + 'T23:59:59.999Z').toISOString() : null;
        const { data, error } = await db.rpc('zuzuos_generate_license_key', {
          p_plan: plan, p_version: version, p_max_activations: max, p_expires_at: expires
        });
        if (error) throw error;
        const generated = Array.isArray(data) ? data[0] : data;
        if (!generated?.license_key) throw new Error('The server did not return a product key.');
        $('license-generate-status').textContent = 'Copy this key now. The full key is only shown once: ' + generated.license_key;
        $('license-copy-key').dataset.key = generated.license_key;
        $('license-copy-key').classList.remove('hidden');
        await loadOwnerLicenseList();
      } catch (error) {
        $('license-generate-status').textContent = error.message || 'Could not generate a key.';
      } finally { button.disabled = false; }
    });
    $('license-copy-key').addEventListener('click', async () => {
      const key = $('license-copy-key').dataset.key || '';
      if (!key) return;
      try {
        await navigator.clipboard.writeText(key);
        $('license-generate-status').textContent = 'Key copied. Store it somewhere safe; it cannot be displayed again.';
      } catch {
        $('license-generate-status').textContent = 'Select and copy the key shown above, then store it safely.';
      }
    });
    $('license-refresh').addEventListener('click', loadOwnerLicenseList);
    $('license-key-list').addEventListener('click', async (event) => {
      const button = event.target.closest('[data-revoke-license]');
      if (!button) return;
      if (!window.confirm('Revoke this license key? Existing activations will no longer be valid for new activations.')) return;
      button.disabled = true;
      try {
        const { error } = await db.rpc('zuzuos_owner_revoke_license', { p_license_id: button.dataset.revokeLicense });
        if (error) throw error;
        await loadOwnerLicenseList();
        toast('License key revoked.');
      } catch (error) {
        toast(error.message || 'Could not revoke this key.');
        button.disabled = false;
      }
    });
    void loadLicensePanel();
    $('settings-signout').addEventListener('click', signOut);
    applyThemePreset(local.get('theme-preset', 'cine'));
    $('theme-preset-choice').value = local.get('theme-preset', 'cine');
    $('theme-preset-choice').addEventListener('change', (e) => applyThemePreset(e.target.value, true));
    $('shell-layout-choice').value = local.get('shell-style', 'cine');
    $('accent-choice').value = local.get('accent', '#9bc4ff');
    $('wallpaper-choice').value = local.get('wallpaper', 'none');
    $('wallpaper-choice').addEventListener('change', (e) => applyWallpaper(e.target.value));
    $('accent-choice').addEventListener('change', (e) => {
      local.set('accent', e.target.value);
      document.documentElement.style.setProperty('--accent', e.target.value);
      document.documentElement.style.setProperty('--accent-strong', e.target.value);
      toast('Appearance updated.');
    });
  }
  async function loadLicensePanel() {
    if (!db || !state.user || !$('license-section')) return;
    $('license-current-plan').textContent = 'Checking edition…';
    try {
      const [{ data: entitlementData, error: entitlementError }, { data: roleData, error: roleError }] = await Promise.all([
        db.rpc('zuzuos_my_entitlement'),
        db.from('zuzuos_roles').select('role').eq('user_id', state.user.id).maybeSingle()
      ]);
      if (entitlementError) throw entitlementError;
      const entitlement = Array.isArray(entitlementData) ? entitlementData[0] : entitlementData;
      const plan = entitlement?.plan || 'free';
      $('license-current-plan').textContent = ({free:'ZuzuOS Free',pro:'ZuzuOS Pro',developer:'ZuzuOS Developer',lifetime:'ZuzuOS Lifetime'})[plan] || 'ZuzuOS Free';
      $('license-current-version').textContent = 'Version entitlement: ' + (entitlement?.version || '1.x');
      $('license-status-mark').textContent = plan === 'free' ? 'FREE' : 'ACTIVE';
      if (!roleError && roleData?.role === 'owner') {
        $('license-owner-tools').classList.remove('hidden');
        await loadOwnerLicenseList();
      } else {
        $('license-owner-tools').classList.add('hidden');
      }
    } catch (error) {
      $('license-current-plan').textContent = 'Edition status unavailable';
      $('license-current-version').textContent = 'Could not verify license status. ' + (error.message || '');
      $('license-status-mark').textContent = '!';
    }
  }
  async function loadOwnerLicenseList() {
    const list = $('license-key-list');
    if (!list || !$('license-owner-tools') || $('license-owner-tools').classList.contains('hidden')) return;
    list.textContent = 'Loading issued keys…';
    try {
      const { data, error } = await db.rpc('zuzuos_owner_list_licenses');
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      if (!rows.length) { list.textContent = 'No license keys have been generated yet.'; return; }
      list.innerHTML = rows.map(row => {
        const revoked = Boolean(row.revoked_at);
        const expires = row.expires_at ? new Date(row.expires_at).toLocaleDateString() : 'Never';
        return '<div class="list-item"><div><strong>' + escapeHTML(String(row.plan).toUpperCase()) + ' · ' + escapeHTML(row.version) + '</strong><small>' + Number(row.activations || 0) + '/' + Number(row.max_activations) + ' activations · Expires: ' + escapeHTML(expires) + ' · ' + (revoked ? 'REVOKED' : 'Active') + '</small></div>' +
          (revoked ? '<span class="muted">Revoked</span>' : '<button class="secondary danger-action" type="button" data-revoke-license="' + escapeHTML(row.id) + '">Revoke</button>') + '</div>';
      }).join('');
    } catch (error) {
      list.textContent = 'Could not load license keys: ' + (error.message || 'Unknown error');
    }
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
    $('window-body').innerHTML = `
      <p class="app-lead">Private files stored in your ZuzuOS account. Upload documents and images up to 10 MB each. Your files are only accessible while signed in.</p>
      <section class="setting-section">
        <h3>Upload a file</h3>
        <form id="upload-form" class="app-form">
          <label>Choose file<input id="file-picker" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,text/plain,application/pdf" required></label>
          <p class="muted" style="font-size:11px">Allowed: PNG, JPG, WebP, SVG, TXT, PDF. Maximum 10 MB.</p>
          <button class="primary" type="submit">Upload to my files</button>
          <p id="upload-status" class="muted" role="status"></p>
        </form>
      </section>
      <section class="setting-section"><div class="section-heading"><h3>Your uploads</h3><button id="refresh-files" class="secondary">Refresh</button></div><div id="file-list" class="app-list"><p class="muted">Loading your files…</p></div></section>
      <section class="setting-section"><h3>Account export</h3><p class="muted" style="font-size:12px">Download a copy of your profile and quick note as JSON.</p><button id="export-account" class="secondary">Export account data</button></section>`;
    $('upload-form').addEventListener('submit', uploadPrivateFile);
    $('refresh-files').addEventListener('click', listPrivateFiles);
    $('export-account').addEventListener('click', exportAccountData);
    await listPrivateFiles();
  }
  async function uploadPrivateFile(event) {
    event.preventDefault();
    const file = $('file-picker').files?.[0];
    if (!file) return;
    const allowed = ['image/png','image/jpeg','image/webp','image/svg+xml','text/plain','application/pdf'];
    if (!allowed.includes(file.type)) return toast('That file type is not supported.');
    if (file.size > 10 * 1024 * 1024) return toast('Files must be 10 MB or smaller.');
    if (!db || !state.user) return toast('Sign in to upload files.');
    const button = $('upload-form').querySelector('button[type="submit"]');
    button.disabled = true;
    $('upload-status').textContent = 'Uploading securely…';
    const safeName = file.name.normalize('NFKD').replace(/[^A-Za-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(-120) || 'upload';
    const path = state.user.id + '/' + Date.now() + '-' + safeName;
    try {
      const { error } = await db.storage.from('zuzuos_user_files').upload(path, file, {
        cacheControl: '3600', upsert: false, contentType: file.type
      });
      if (error) throw error;
      $('file-picker').value = '';
      $('upload-status').textContent = 'Upload complete.';
      toast('File uploaded.');
      await listPrivateFiles();
    } catch (error) {
      $('upload-status').textContent = 'Upload failed.';
      toast(error.message || 'Upload failed. Check your connection and try again.');
    } finally {
      button.disabled = false;
    }
  }
  async function listPrivateFiles() {
    const list = $('file-list');
    if (!list) return;
    if (!db || !state.user) { list.textContent = 'Sign in to view your private files.'; return; }
    list.textContent = 'Loading…';
    const { data, error } = await db.storage.from('zuzuos_user_files').list(state.user.id, {
      limit: 100, sortBy: { column: 'created_at', order: 'desc' }
    });
    if (error) { list.textContent = 'Could not load files: ' + error.message; return; }
    const files = (data || []).filter(item => item.name && item.id);
    list.innerHTML = '';
    if (!files.length) {
      const empty = document.createElement('p');
      empty.className = 'muted';
      empty.textContent = 'No uploads yet. Your private files will appear here.';
      list.append(empty);
      return;
    }
    for (const file of files) {
      const path = state.user.id + '/' + file.name;
      const row = document.createElement('div');
      row.className = 'list-item';
      const info = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = file.name;
      const meta = document.createElement('small');
      const bytes = Number(file.metadata?.size || 0);
      meta.textContent = (bytes ? (bytes < 1024*1024 ? Math.max(1,Math.round(bytes/1024))+' KB' : (bytes/1024/1024).toFixed(1)+' MB') + ' · ' : '') + new Date(file.created_at || file.updated_at || Date.now()).toLocaleDateString();
      info.append(title,meta);
      const actions = document.createElement('div');
      actions.className = 'app-actions';
      const download = document.createElement('button');
      download.className = 'secondary';
      download.textContent = 'Download';
      download.addEventListener('click', async () => {
        download.disabled = true;
        try {
          const { data, error } = await db.storage.from('zuzuos_user_files').download(path);
          if (error) throw error;
          const url = URL.createObjectURL(data);
          const a = document.createElement('a'); a.href = url; a.download = file.name; a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error) { toast(error.message || 'Download failed.'); }
        finally { download.disabled = false; }
      });
      const remove = document.createElement('button');
      remove.className = 'secondary danger-action';
      remove.textContent = 'Delete';
      remove.addEventListener('click', async () => {
        if (!window.confirm('Delete "' + file.name + '" from your ZuzuOS account? This cannot be undone.')) return;
        remove.disabled = true;
        const { error } = await db.storage.from('zuzuos_user_files').remove([path]);
        if (error) { toast(error.message || 'Could not delete file.'); remove.disabled = false; return; }
        toast('File deleted.');
        await listPrivateFiles();
      });
      actions.append(download,remove);
      row.append(info,actions);
      list.append(row);
    }
  }
  function exportAccountData() {
    const data = {
      product: 'zuzu.os',
      exported_at: new Date().toISOString(),
      account: { email: state.user?.email || null, profile: state.profile || null },
      quick_note: $('quick-note')?.value ?? local.get('quick-note','')
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='zuzuos-account-export.json';a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
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
  const themePresets = {
    cine: { label: 'Cinematic', bg: '#050608', panel: '#101216', accent: '#e5e7eb', glow: '0' },
    oled: { label: 'OLED Black', bg: '#000000', panel: '#090909', accent: '#ffffff', glow: '0' },
    graphite: { label: 'Graphite', bg: '#0c0d0f', panel: '#17191d', accent: '#a7b0bf', glow: '0' },
    crimson: { label: 'Crimson Night', bg: '#090607', panel: '#171012', accent: '#e58b98', glow: '0' },
    midnight: { label: 'Midnight Blue', bg: '#060910', panel: '#101725', accent: '#8cb8ff', glow: '0' }
  };
  function applyThemePreset(value, notify = false) {
    const key = Object.hasOwn(themePresets, value) ? value : 'cine';
    const theme = themePresets[key];
    const root = document.documentElement;
    root.dataset.themePreset = key;
    document.body.dataset.themePreset = key;
    local.set('accent', theme.accent);
    root.style.setProperty('--bg', theme.bg);
    root.style.setProperty('--panel-solid', theme.panel);
    root.style.setProperty('--accent', theme.accent);
    root.style.setProperty('--accent-strong', theme.accent);
    root.style.setProperty('--theme-glow', theme.glow);
    local.set('theme-preset', key);
    const select = $('theme-preset-choice');
    if (select) select.value = key;
    document.querySelectorAll('[data-theme-preset]').forEach((button) => button.classList.toggle('selected', button.dataset.themePreset === key));
    if (notify) toast(theme.label + ' theme applied.');
  }
  function applyWallpaper(value) {
    const wallpaper = ['silent-shore','aurora','obsidian','afterglow'].includes(value) ? value : 'none';
    local.set('wallpaper', wallpaper);
    const desktop = $('desktop');
    if (wallpaper === 'none') {
      document.body.style.backgroundImage = '';
      document.body.style.backgroundSize = '';
      document.body.style.backgroundAttachment = '';
      if (desktop) {
        desktop.style.backgroundImage = '';
        desktop.style.backgroundSize = '';
        desktop.style.backgroundAttachment = '';
      }
    } else {
      const image = 'url("assets/backgrounds/photos/' + wallpaper + '.svg")';
      document.body.style.backgroundImage = image;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundAttachment = 'fixed';
      if (desktop) {
        desktop.style.backgroundImage = 'linear-gradient(180deg,#07111b22 0%,#07111b05 40%,#03070d45 100%),' + image;
        desktop.style.backgroundSize = 'cover';
        desktop.style.backgroundAttachment = 'fixed';
      }
    }
  }
  function updateClock() {
    const now = new Date();
    $('clock-time').textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    $('task-clock').textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    $('clock-date').textContent = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  }
  async function boot() {
    applyWallpaper(local.get('wallpaper', 'none'));
    $('setup-back').addEventListener('click', () => {
      if (setupStep > 0) { setupStep -= 1; renderSetupStep(); }
    });
    $('setup-next').addEventListener('click', () => {
      if (setupStep < 3) { setupStep += 1; renderSetupStep(); }
      else closeSetup();
    });
    document.querySelectorAll('[data-wallpaper-choice]').forEach((button) => {
      button.addEventListener('click', () => {
        document.querySelectorAll('[data-wallpaper-choice]').forEach((item) => item.classList.toggle('selected', item === button));
        applyWallpaper(button.dataset.wallpaperChoice);
      });
    });
    document.querySelectorAll('[data-theme-preset]').forEach((button) => {
      button.addEventListener('click', () => applyThemePreset(button.dataset.themePreset));
    });
    $('auth-form').addEventListener('submit', submitAuth);
    $('reset-password-form').addEventListener('submit', submitPasswordRecovery);
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
    applyThemePreset(local.get('theme-preset', 'cine'));
    if (accent) document.documentElement.style.setProperty('--accent', accent);
    applyWallpaper(local.get('wallpaper', 'none'));
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
      const recoveryLink = new URLSearchParams(location.hash.replace(/^#/, '')).get('type') === 'recovery'
        || new URLSearchParams(location.search).has('code');
      if (recoveryLink) showPasswordRecovery();
      else showDesktop();
    } else {
      showAuth();
    }
    db.auth.onAuthStateChange((event, sessionNow) => {
      if (sessionNow?.user) {
        state.user = sessionNow.user;
        setTimeout(async () => {
          await fetchProfile();
          const recoveryLink = new URLSearchParams(location.hash.replace(/^#/, '')).get('type') === 'recovery' || new URLSearchParams(location.search).has('code');
          if (event === 'PASSWORD_RECOVERY' || recoveryLink) showPasswordRecovery();
          else showDesktop();
        }, 0);
      } else if (state.user) {
        state.user = null;
        state.profile = null;
        showAuth();
      }
    });
  }
  document.addEventListener('DOMContentLoaded', boot);
})();