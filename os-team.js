(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const roleLabels = { owner: 'Owner', developer: 'Developer', user: 'Member' };
  let currentRole = 'user';
  let layer;
  let zIndex = 200;

  function toast(message) {
    const node = $('toast');
    if (!node) return;
    node.textContent = message;
    node.classList.remove('hidden');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.add('hidden'), 2600);
  }
  function client() { return window.zuzuOSAuth?.client || null; }
  async function refreshRole() {
    const db = client();
    if (!db) return currentRole = 'user';
    const { data: auth } = await db.auth.getUser();
    if (!auth?.user) return currentRole = 'user';
    const { data, error } = await db.from('os_roles').select('role').eq('user_id', auth.user.id).maybeSingle();
    if (error) {
      console.warn('ZuzuOS role lookup:', error.message);
      return currentRole = 'user';
    }
    currentRole = data?.role || 'user';
    renderRoleBadge();
    return currentRole;
  }
  function renderRoleBadge() {
    const account = $('account-button');
    if (!account) return;
    let badge = $('os-role-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'os-role-badge';
      badge.className = 'os-role-badge';
      account.insertAdjacentElement('beforebegin', badge);
    }
    badge.textContent = roleLabels[currentRole] || 'Member';
    badge.dataset.role = currentRole;
    badge.title = currentRole === 'owner' ? 'Owner access' : currentRole === 'developer' ? 'Developer access' : 'Standard account';
  }
  function makeMenuEntry() {
    const desktop = $('desktop');
    const grid = $('os-launch-grid');
    if (!desktop || !grid || $('os-team-launch')) return;
    const item = document.createElement('button');
    item.id = 'os-team-launch';
    item.className = 'os-launch-item';
    item.innerHTML = '<span>⌘</span><span><strong>Team & Updates</strong><small>Roles, roadmap and releases</small></span>';
    item.addEventListener('click', () => {
      $('os-start-menu')?.classList.add('hidden');
      openPanel();
    });
    grid.appendChild(item);
    const shortcuts = $('desktop').querySelector('.os-desktop-shortcuts');
    if (shortcuts && !$('os-team-shortcut')) {
      const shortcut = document.createElement('button');
      shortcut.id = 'os-team-shortcut';
      shortcut.className = 'os-shortcut';
      shortcut.innerHTML = '<span>⌘</span><small>Team & Updates</small>';
      shortcut.addEventListener('click', openPanel);
      shortcuts.appendChild(shortcut);
    }
    const appsGrid = desktop.querySelector('.app-grid');
    if (appsGrid && !$('os-team-tile')) {
      const tile = document.createElement('button');
      tile.id = 'os-team-tile';
      tile.className = 'app-tile';
      tile.innerHTML = '<span class="app-icon icon-settings">⌘</span><span><strong>Team & Updates</strong><small>Developer workspace</small></span><span class="tile-arrow">↗</span>';
      tile.addEventListener('click', openPanel);
      appsGrid.appendChild(tile);
    }
  }
  function addDesktopChrome() {
    const desktop = $('desktop');
    if (!desktop || $('os-menubar')) return;
    const bar = document.createElement('div');
    bar.id = 'os-menubar';
    bar.className = 'os-menubar';
    bar.innerHTML = '<button class="os-menu-brand" id="os-menu-home"><span>z.</span><strong>zuzu.os</strong></button><div class="os-menu-divider"></div><span class="os-menu-edition">CINEMATIC DESKTOP</span><div class="os-menu-spacer"></div><span class="os-menu-status"><i></i> ONLINE</span><span id="os-menu-clock">--:--</span>';
    desktop.prepend(bar);
    $('os-menu-home').addEventListener('click', () => {
      const start = $('os-start-button');
      if (start) start.click();
      else document.querySelector('.welcome-row')?.scrollIntoView({behavior:'smooth'});
    });
    const updateClock = () => {
      const now = new Date();
      const clock = $('os-menu-clock');
      if (clock) clock.textContent = now.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'});
    };
    updateClock();
    setInterval(updateClock, 30000);
  }
  function openPanel() {
    const existing = $('os-team-window');
    if (existing) {
      existing.classList.remove('os-minimized');
      existing.style.zIndex = String(++zIndex);
      loadUpdates(existing);
      return;
    }
    layer = $('os-window-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'os-window-layer';
      layer.className = 'os-window-layer';
      $('desktop')?.appendChild(layer);
    }
    const win = document.createElement('section');
    win.id = 'os-team-window';
    win.className = 'os-window os-team-window';
    win.style.zIndex = String(++zIndex);
    win.innerHTML = '<header class="os-window-bar"><div class="os-window-title"><span>⌘</span><strong>Team & Updates</strong></div><div class="os-window-controls"><button data-min title="Minimize">−</button><button data-max title="Maximize">□</button><button data-close title="Close">×</button></div></header><div class="os-window-content"><div class="os-team-hero"><div><span class="os-team-kicker">ZUZU.OS WORKSPACE</span><h2>Team & Updates</h2><p>Plan features, submit work and review the release roadmap.</p></div><span class="os-team-orb">⌘</span></div><div id="os-team-role-card" class="os-team-role-card"><span class="os-role-dot"></span><div><strong>Checking permissions…</strong><small>Verifying your account with Supabase</small></div></div><div id="os-team-admin" class="os-team-admin hidden"><h3>Team access</h3><p>Only an existing owner can grant or remove roles. Enter the email address of an existing ZuzuOS account.</p><form id="os-role-form"><label>Account email<input id="os-role-email" type="email" required placeholder="developer@example.com"></label><label>Role<select id="os-role-select"><option value="developer">Developer</option><option value="owner">Owner</option><option value="user">Remove elevated role</option></select></label><button type="submit">Save role</button></form><div id="os-role-list" class="os-role-list"></div></div><div id="os-team-compose" class="os-team-compose hidden"><h3>Submit an update</h3><form id="os-update-form"><label>Title<input id="os-update-title" required minlength="3" maxlength="120" placeholder="Example: Add window snapping"></label><div class="os-team-form-row"><label>Type<select id="os-update-category"><option value="feature">Feature</option><option value="improvement">Improvement</option><option value="bug">Bug fix</option><option value="design">Design</option></select></label><label>Details<textarea id="os-update-description" required minlength="3" maxlength="4000" rows="3" placeholder="What should change and how should it work?"></textarea></label></div><button type="submit">Submit proposal</button><span id="os-update-message" role="status"></span></form></div><div class="os-team-roadmap-head"><div><h3>Roadmap & release notes</h3><p>Shared with signed-in accounts</p></div><button id="os-update-refresh" type="button">Refresh</button></div><div id="os-update-list" class="os-update-list"><p class="os-team-loading">Loading updates…</p></div><p class="os-team-footnote">Permissions are enforced by Supabase row-level security, not just by hiding buttons in the interface.</p></div><div class="os-resize-grip"></div>';
    layer.appendChild(win);
    win.addEventListener('pointerdown', () => win.style.zIndex = String(++zIndex));
    win.querySelector('[data-close]').onclick = () => win.remove();
    win.querySelector('[data-min]').onclick = () => win.classList.add('os-minimized');
    win.querySelector('[data-max]').onclick = () => win.classList.toggle('os-maximized');
    const grip = win.querySelector('.os-resize-grip');
    grip.addEventListener('pointerdown', (event) => {
      if (win.classList.contains('os-maximized')) return;
      event.preventDefault();
      const rect = win.getBoundingClientRect();
      const startX = event.clientX, startY = event.clientY;
      const move = (e) => {
        win.style.width = Math.max(340, Math.min(innerWidth - rect.left - 8, rect.width + e.clientX - startX)) + 'px';
        win.style.height = Math.max(300, Math.min(innerHeight - rect.top - 78, rect.height + e.clientY - startY)) + 'px';
      };
      const up = () => {
        grip.removeEventListener('pointermove', move);
        grip.removeEventListener('pointerup', up);
        grip.removeEventListener('pointercancel', up);
      };
      grip.addEventListener('pointermove', move);
      grip.addEventListener('pointerup', up, {once:true});
      grip.addEventListener('pointercancel', up, {once:true});
    });
    const head = win.querySelector('.os-window-bar');
    head.addEventListener('pointerdown', (event) => {
      if (event.target.closest('button') || win.classList.contains('os-maximized')) return;
      const rect = win.getBoundingClientRect(), sx = event.clientX, sy = event.clientY;
      const move = (e) => { win.style.left = Math.max(0, rect.left + e.clientX - sx) + 'px'; win.style.top = Math.max(64, rect.top + e.clientY - sy) + 'px'; win.style.transform = 'none'; };
      const up = () => { head.removeEventListener('pointermove', move); head.removeEventListener('pointerup', up); };
      head.addEventListener('pointermove', move);
      head.addEventListener('pointerup', up, {once:true});
    });
    $('os-update-refresh').onclick = () => loadUpdates(win);
    $('os-update-form').onsubmit = async (event) => {
      event.preventDefault();
      const db = client();
      if (!db || !['owner','developer'].includes(currentRole)) return toast('Developer or owner role required.');
      const button = $('os-update-form').querySelector('button[type="submit"]');
      button.disabled = true;
      const { error } = await db.from('os_updates').insert({
        title: $('os-update-title').value.trim(),
        description: $('os-update-description').value.trim(),
        category: $('os-update-category').value
      });
      button.disabled = false;
      if (error) { $('os-update-message').textContent = error.message; return; }
      $('os-update-form').reset();
      $('os-update-message').textContent = 'Proposal submitted.';
      await loadUpdates(win);
    };
    $('os-role-form').onsubmit = async (event) => {
      event.preventDefault();
      if (currentRole !== 'owner') return toast('Owner role required.');
      const db = client();
      const button = $('os-role-form').querySelector('button[type="submit"]');
      button.disabled = true;
      const { data, error } = await db.rpc('owner_set_os_role', {
        target_email: $('os-role-email').value.trim(),
        target_role: $('os-role-select').value
      });
      button.disabled = false;
      if (error) { toast(error.message); return; }
      toast(data || 'Role updated.');
      $('os-role-form').reset();
      await refreshRole();
      await loadTeam(win);
    };
    loadTeam(win);
  }
  async function loadTeam(win) {
    const db = client();
    if (!db) {
      $('os-team-role-card').innerHTML = '<span class="os-role-dot"></span><div><strong>Account service unavailable</strong><small>Could not connect to the configured Supabase client.</small></div>';
      $('os-update-list').innerHTML = '<p class="os-team-error">Team data cannot load until Supabase is connected.</p>';
      return;
    }
    await refreshRole();
    const { data: auth } = await db.auth.getUser();
    const email = auth?.user?.email || 'Signed-in account';
    $('os-team-role-card').innerHTML = '<span class="os-role-dot" data-role="' + esc(currentRole) + '"></span><div><strong>' + esc(roleLabels[currentRole] || 'Member') + ' access</strong><small>' + esc(email) + ' · ' + (currentRole === 'owner' ? 'Manage team and review proposals' : currentRole === 'developer' ? 'Submit development proposals' : 'Read the roadmap') + '</small></div>';
    $('os-team-compose').classList.toggle('hidden', !['owner','developer'].includes(currentRole));
    $('os-team-admin').classList.toggle('hidden', currentRole !== 'owner');
    await loadUpdates(win);
    if (currentRole === 'owner') await loadRoleDirectory();
  }
  async function loadRoleDirectory() {
    const db = client();
    const box = $('os-role-list');
    if (!db || !box) return;
    box.innerHTML = '<p class="os-team-loading">Loading team…</p>';
    const { data: roles, error } = await db.from('os_roles').select('user_id,role,created_at').order('created_at', {ascending:true});
    if (error) { box.innerHTML = '<p class="os-team-error">' + esc(error.message) + '</p>'; return; }
    const ids = (roles || []).map(row => row.user_id);
    let profiles = [];
    if (ids.length) {
      const result = await db.from('profiles').select('id,display_name,username').in('id', ids);
      if (!result.error) profiles = result.data || [];
    }
    const names = new Map(profiles.map(profile => [profile.id, profile.display_name || profile.username || 'Zuzu member']));
    box.innerHTML = '<div class="os-role-list-title">Elevated accounts</div>' + ((roles || []).map(row => '<div class="os-role-row"><div><strong>' + esc(names.get(row.user_id) || 'Zuzu member') + '</strong><small>' + esc(row.user_id) + '</small></div><span class="os-role-pill" data-role="' + esc(row.role) + '">' + esc(roleLabels[row.role] || row.role) + '</span></div>').join('') || '<p class="os-team-loading">No elevated accounts yet. The first owner must be assigned from the Supabase SQL editor.</p>');
  }
  async function loadUpdates(win) {
    const db = client();
    const list = $('os-update-list');
    if (!list) return;
    if (!db) { list.innerHTML = '<p class="os-team-error">Supabase is not connected.</p>'; return; }
    list.innerHTML = '<p class="os-team-loading">Loading updates…</p>';
    const { data, error } = await db.from('os_updates').select('id,title,description,category,status,created_by,created_at,updated_at').order('created_at', {ascending:false}).limit(50);
    if (error) { list.innerHTML = '<p class="os-team-error">' + esc(error.message) + '</p>'; return; }
    if (!data?.length) { list.innerHTML = '<div class="os-update-empty"><span>✧</span><strong>The roadmap starts here</strong><p>Proposed features and shipped changes will appear in this space.</p></div>'; return; }
    list.innerHTML = data.map(item => {
      const controls = currentRole === 'owner' ? '<div class="os-update-controls"><label>Status<select data-status="' + esc(item.id) + '">' + ['proposed','planned','in_progress','shipped','declined'].map(status => '<option value="' + status + '"' + (item.status === status ? ' selected' : '') + '>' + status.replace('_',' ') + '</option>').join('') + '</select></label><button data-delete="' + esc(item.id) + '" type="button">Delete</button></div>' : '';
      return '<article class="os-update-card"><div class="os-update-card-top"><span class="os-update-category">' + esc(item.category) + '</span><span class="os-update-status" data-status="' + esc(item.status) + '">' + esc(item.status.replace('_',' ')) + '</span></div><h4>' + esc(item.title) + '</h4><p>' + esc(item.description).replace(/\n/g,'<br>') + '</p><small>' + esc(new Date(item.created_at).toLocaleDateString()) + '</small>' + controls + '</article>';
    }).join('');
    list.querySelectorAll('[data-status]').forEach(select => {
      if (select.tagName !== 'SELECT') return;
      select.onchange = async () => {
        const { error: updateError } = await db.from('os_updates').update({status:select.value}).eq('id',select.dataset.status);
        if (updateError) toast(updateError.message); else { toast('Roadmap status updated.'); await loadUpdates(win); }
      };
    });
    list.querySelectorAll('[data-delete]').forEach(button => button.onclick = async () => {
      if (!confirm('Delete this roadmap item?')) return;
      const { error: deleteError } = await db.from('os_updates').delete().eq('id',button.dataset.delete);
      if (deleteError) toast(deleteError.message); else { toast('Roadmap item deleted.'); await loadUpdates(win); }
    });
  }
  function boot() {
    addDesktopChrome();
    makeMenuEntry();
    refreshRole().catch(() => {});
    const desktop = $('desktop');
    if (desktop) new MutationObserver(() => {
      if (!desktop.classList.contains('hidden')) {
        makeMenuEntry();
        refreshRole().catch(() => {});
      }
    }).observe(desktop, {attributes:true, attributeFilter:['class']});
    document.addEventListener('zuzu:session-changed', () => refreshRole().catch(() => {}));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();