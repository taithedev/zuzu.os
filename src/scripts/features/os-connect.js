(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let db, user, channel, people = [], selected = '', pc = null, localStream = null, activeCall = null, pendingIce = [];
  let batteryManager = null;
  const title = 'Chat & Calls';

  function toast(text) {
    const node = $('toast');
    if (!node) return;
    node.textContent = text;
    node.classList.remove('hidden');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.add('hidden'), 3000);
  }

  function mountBattery() {
    const topbar = document.querySelector('#desktop .topbar');
    if (!topbar || $('zuzu-battery')) return;
    const status = document.createElement('div');
    status.id = 'zuzu-battery';
    status.className = 'zuzu-battery';
    status.innerHTML = '<span class="zuzu-battery-icon" aria-hidden="true"><i></i></span><span class="zuzu-battery-text">Battery status unavailable</span>';
    const account = $('account-button');
    if (account) topbar.insertBefore(status, account);
    else topbar.append(status);
    if (!('getBattery' in navigator)) return;
    navigator.getBattery().then(manager => {
      batteryManager = manager;
      const update = () => {
        const percent = Math.round(manager.level * 100);
        const text = status.querySelector('.zuzu-battery-text');
        const fill = status.querySelector('.zuzu-battery-icon i');
        if (text) text.textContent = percent + '%' + (manager.charging ? ' · Charging' : ' battery');
        if (fill) fill.style.width = percent + '%';
        status.title = (manager.charging ? 'Charging · ' : '') + percent + '% battery remaining';
        status.classList.toggle('is-low', percent <= 15 && !manager.charging);
        status.classList.toggle('is-charging', manager.charging);
      };
      ['levelchange','chargingchange','chargingtimechange','dischargingtimechange'].forEach(event => manager.addEventListener(event, update));
      update();
    }).catch(() => {
      const text = status.querySelector('.zuzu-battery-text');
      if (text) text.textContent = 'Battery info unavailable';
    });
  }

  function mountLaunchers() {
    const grid = document.querySelector('#desktop .app-grid');
    if (grid && !$('zuzu-chat-tile')) {
      const tile = document.createElement('button');
      tile.id = 'zuzu-chat-tile';
      tile.className = 'app-tile zuzu-chat-tile';
      tile.innerHTML = '<span class="app-icon">↗</span><span><strong>Chat & Calls</strong><small>Private messages and voice/video</small></span><span class="tile-arrow">↗</span>';
      tile.addEventListener('click', openWindow);
      grid.append(tile);
    }
    const taskbar = document.querySelector('#desktop .taskbar');
    if (taskbar && !$('zuzu-chat-task')) {
      const btn = document.createElement('button');
      btn.id = 'zuzu-chat-task';
      btn.className = 'task-app zuzu-chat-dock';
      btn.type = 'button';
      btn.title = 'Messages & Calls';
      btn.setAttribute('aria-label','Open messages and calls');
      btn.innerHTML = '<svg class="zu-icon" viewBox="0 0 24 24" aria-hidden="true"><use href="/assets/icons/ui.svg#headphones"></use></svg>';
      btn.addEventListener('click', openWindow);
      const spacer = taskbar.querySelector('.taskbar-spacer');
      taskbar.insertBefore(btn, spacer || null);
    }
  }

  function openWindow() {
    if (!$('desktop') || $('desktop').classList.contains('hidden')) return toast('Sign in to use Chat & Calls.');
    let win = $('zuzu-connect-window');
    if (!win) {
      win = document.createElement('section');
      win.id = 'zuzu-connect-window';
      win.className = 'os-window zuzu-connect-window';
      win.setAttribute('role','dialog');
      win.setAttribute('aria-label',title);
      win.innerHTML = `
        <header class="os-window-bar"><div class="os-window-title"><span>↗</span><strong>Chat & Calls</strong></div><div class="os-window-controls"><button type="button" data-connect-min aria-label="Minimize">−</button><button type="button" data-connect-close aria-label="Close">×</button></div></header>
        <div class="zuzu-connect-layout">
          <aside class="zuzu-connect-sidebar"><div class="zuzu-connect-heading"><span class="zuzu-connect-kicker">YOUR PEOPLE</span><h2>Messages</h2><p>Private conversations between ZuzuOS accounts.</p></div><label class="zuzu-contact-label" for="zuzu-contact">Start a conversation</label><select id="zuzu-contact"><option value="">Loading accounts…</option></select><div id="zuzu-people-list" class="zuzu-people-list"></div></aside>
          <section class="zuzu-chat-panel"><div class="zuzu-chat-head"><div><strong id="zuzu-chat-title">Choose a person</strong><small id="zuzu-chat-subtitle">Messages are private to the two participants.</small></div><div class="zuzu-call-actions"><button id="zuzu-voice-call" type="button" disabled>Voice call</button><button id="zuzu-video-call" type="button" disabled>Video call</button></div></div>
            <div id="zuzu-call-stage" class="zuzu-call-stage hidden"><div class="zuzu-video-grid"><video id="zuzu-remote-video" autoplay playsinline></video><video id="zuzu-local-video" autoplay muted playsinline></video></div><audio id="zuzu-remote-audio" autoplay></audio><div class="zuzu-call-status" id="zuzu-call-status">Connecting…</div><button id="zuzu-hangup" type="button" class="zuzu-hangup">End call</button></div>
            <div id="zuzu-chat-messages" class="zuzu-chat-messages"><div class="zuzu-chat-empty">Select a person to see your conversation.</div></div>
            <form id="zuzu-chat-form" class="zuzu-chat-form"><input id="zuzu-chat-input" maxlength="4000" placeholder="Write a message…" autocomplete="off" disabled aria-label="Message"><button type="submit" disabled id="zuzu-send">Send</button></form>
            <p id="zuzu-connect-status" class="zuzu-connect-status" role="status">Loading your account…</p>
          </section>
        </div>`;
      $('desktop').append(win);
      win.querySelector('[data-connect-close]').addEventListener('click', () => win.classList.add('hidden'));
      win.querySelector('[data-connect-min]').addEventListener('click', () => win.classList.add('hidden'));
      $('zuzu-contact').addEventListener('change', e => choosePerson(e.target.value));
      $('zuzu-chat-form').addEventListener('submit', sendMessage);
      $('zuzu-voice-call').addEventListener('click', () => startCall(false));
      $('zuzu-video-call').addEventListener('click', () => startCall(true));
      $('zuzu-hangup').addEventListener('click', hangup);
    }
    win.classList.remove('hidden');
    init().catch(err => setStatus(err.message || 'Could not load Chat & Calls.'));
  }

  function setStatus(text, error = false) {
    const node = $('zuzu-connect-status');
    if (!node) return;
    node.textContent = text;
    node.classList.toggle('is-error', error);
  }

  async function init() {
    db = window.zuzuOSAuth?.client;
    if (!db) return setStatus('Account service is unavailable. Refresh and try again.', true);
    const { data: { user: currentUser }, error } = await db.auth.getUser();
    if (error || !currentUser) return setStatus('Sign in to use private chat and calls.', true);
    user = currentUser;
    await loadPeople();
    await loadMessages();
    subscribeRealtime();
    setStatus('Connected. Calls require microphone/camera permission and both people online.');
  }

  async function loadPeople() {
    const { data, error } = await db.from('zuzuos_profiles').select('id, username, display_name, avatar_url').neq('id', user.id).order('display_name').limit(100);
    if (error) throw new Error('Could not load accounts: ' + error.message);
    people = data || [];
    const select = $('zuzu-contact');
    select.innerHTML = '<option value="">Choose an account…</option>' + people.map(p => '<option value="' + esc(p.id) + '">' + esc(p.display_name || p.username || 'ZuzuOS user') + (p.username ? ' · @' + esc(p.username) : '') + '</option>').join('');
    const list = $('zuzu-people-list');
    list.innerHTML = people.length ? people.map(p => '<button class="zuzu-person" type="button" data-person="' + esc(p.id) + '"><span class="zuzu-person-avatar">' + esc((p.display_name || p.username || 'Z').slice(0,1).toUpperCase()) + '</span><span><strong>' + esc(p.display_name || p.username || 'ZuzuOS user') + '</strong><small>' + esc(p.username ? '@' + p.username : 'ZuzuOS account') + '</small></span></button>').join('') : '<p class="zuzu-chat-empty">No other accounts yet. A friend needs a ZuzuOS account to chat.</p>';
    list.querySelectorAll('[data-person]').forEach(btn => btn.addEventListener('click', () => choosePerson(btn.dataset.person)));
  }

  async function choosePerson(id) {
    selected = id;
    $('zuzu-contact').value = id;
    const person = people.find(p => p.id === id);
    $('zuzu-chat-title').textContent = person ? (person.display_name || person.username || 'ZuzuOS user') : 'Choose a person';
    $('zuzu-chat-subtitle').textContent = person?.username ? '@' + person.username + ' · private conversation' : 'Messages are private to the two participants.';
    $('zuzu-chat-input').disabled = !id;
    $('zuzu-send').disabled = !id;
    $('zuzu-voice-call').disabled = !id;
    $('zuzu-video-call').disabled = !id;
    document.querySelectorAll('.zuzu-person').forEach(b => b.classList.toggle('selected', b.dataset.person === id));
    await loadMessages();
  }

  async function loadMessages() {
    const list = $('zuzu-chat-messages');
    if (!list || !db || !user) return;
    if (!selected) { list.innerHTML = '<div class="zuzu-chat-empty">Select a person to see your conversation.</div>'; return; }
    const { data, error } = await db.from('zuzuos_messages').select('id,sender_id,recipient_id,body,created_at').or('and(sender_id.eq.' + user.id + ',recipient_id.eq.' + selected + '),and(sender_id.eq.' + selected + ',recipient_id.eq.' + user.id + ')').order('created_at',{ascending:true}).limit(150);
    if (error) { list.innerHTML = '<div class="zuzu-chat-empty">Could not load messages. ' + esc(error.message) + '</div>'; return; }
    list.innerHTML = (data || []).map(m => '<article class="zuzu-message ' + (m.sender_id === user.id ? 'mine' : 'theirs') + '"><p>' + esc(m.body) + '</p><time>' + esc(new Date(m.created_at).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})) + '</time></article>').join('') || '<div class="zuzu-chat-empty">No messages yet. Say hello.</div>';
    list.scrollTop = list.scrollHeight;
  }

  async function sendMessage(event) {
    event.preventDefault();
    const input = $('zuzu-chat-input'), body = input.value.trim();
    if (!body || !selected || !user) return;
    $('zuzu-send').disabled = true;
    const { error } = await db.from('zuzuos_messages').insert({sender_id:user.id, recipient_id:selected, body});
    $('zuzu-send').disabled = false;
    if (error) return setStatus('Message not sent: ' + error.message, true);
    input.value = '';
    await loadMessages();
    setStatus('Message sent.');
  }

  function subscribeRealtime() {
    if (channel) db.removeChannel(channel);
    channel = db.channel('zuzu-connect-' + user.id)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'zuzuos_messages'},payload => {
        const m = payload.new;
        if (m && (m.sender_id === user.id || m.recipient_id === user.id) && (m.sender_id === selected || m.recipient_id === selected)) loadMessages();
      })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'zuzuos_call_signals'},payload => handleSignal(payload.new).catch(err => setStatus(err.message || 'Call signal failed.',true)))
      .subscribe();
  }

  async function writeSignal(kind, payload = {}) {
    if (!activeCall) return;
    const { error } = await db.from('zuzuos_call_signals').insert({
      call_id: activeCall.id, caller_id: activeCall.callerId, callee_id: activeCall.calleeId,
      sender_id: user.id, kind, payload
    });
    if (error) throw new Error('Call connection error: ' + error.message);
  }

  async function startCall(video) {
    if (!selected || !user || activeCall) return;
    const person = people.find(p => p.id === selected);
    if (!person) return;
    try {
      activeCall = {id: crypto.randomUUID(), callerId:user.id, calleeId:selected, outgoing:true, video};
      await createPeer(video);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIceGathering();
      await writeSignal('offer',{sdp:pc.localDescription});
      showCallStage(video, 'Calling ' + (person.display_name || person.username || 'user') + '…');
      setStatus('Calling. Keep this window open until the other person answers.');
    } catch (err) {
      await cleanupCall();
      setStatus(err.message || 'Could not start call. Check browser permissions.',true);
    }
  }

  function waitForIceGathering() {
    if (!pc || pc.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise(resolve => {
      const finish = () => { if (pc && pc.iceGatheringState === 'complete') { pc.removeEventListener('icegatheringstatechange', finish); resolve(); } };
      pc.addEventListener('icegatheringstatechange', finish);
      setTimeout(resolve, 7000);
    });
  }

  async function createPeer(video) {
    localStream = await navigator.mediaDevices.getUserMedia({audio:true,video:video ? {width:{ideal:1280},height:{ideal:720}} : false});
    pc = new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
    localStream.getTracks().forEach(track => pc.addTrack(track,localStream));
    // Wait for ICE gathering before sending SDP; this avoids losing candidates when realtime events arrive out of order.
    pc.ontrack = event => {
      const stream = event.streams?.[0];
      if (!stream) return;
      if (video) { $('zuzu-remote-video').srcObject = stream; $('zuzu-remote-video').classList.add('has-stream'); }
      else $('zuzu-remote-audio').srcObject = stream;
      $('zuzu-call-status').textContent = 'Connected';
    };
    pc.onconnectionstatechange = () => {
      if (pc && ['failed','disconnected','closed'].includes(pc.connectionState)) $('zuzu-call-status').textContent = 'Connection ' + pc.connectionState;
    };
    if (video) { $('zuzu-local-video').srcObject = localStream; $('zuzu-local-video').classList.add('has-stream'); }
  }

  function showCallStage(video, text) {
    $('zuzu-call-stage').classList.remove('hidden');
    $('zuzu-call-status').textContent = text;
    $('zuzu-remote-video').style.display = video ? 'block' : 'none';
    $('zuzu-local-video').style.display = video ? 'block' : 'none';
    $('zuzu-remote-audio').style.display = 'none';
    $('zuzu-chat-messages').classList.add('during-call');
  }

  async function handleSignal(signal) {
    if (!signal || !user || signal.sender_id === user.id) return;
    if (signal.kind === 'offer' && signal.callee_id === user.id) {
      if (activeCall) {
        const previous = activeCall;
        activeCall = {id:signal.call_id,callerId:signal.caller_id,calleeId:signal.callee_id,outgoing:false,video:Boolean(signal.payload?.sdp?.sdp?.includes('m=video'))};
        await writeSignal('reject',{reason:'busy'});
        activeCall = previous;
        return;
      }
      const caller = people.find(p => p.id === signal.caller_id);
      const wantsVideo = Boolean(signal.payload?.sdp?.sdp?.includes('m=video'));
      const accepted = window.confirm((caller?.display_name || 'A ZuzuOS user') + ' is calling you ' + (wantsVideo ? 'with video' : 'by voice') + '. Accept?');
      activeCall = {id:signal.call_id,callerId:signal.caller_id,calleeId:signal.callee_id,outgoing:false,video:wantsVideo};
      if (!accepted) { await writeSignal('reject',{reason:'declined'}); activeCall=null; return; }
      try {
        await createPeer(wantsVideo);
        await pc.setRemoteDescription(new RTCSessionDescription(signal.payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await waitForIceGathering();
        await writeSignal('answer',{sdp:pc.localDescription});
        showCallStage(wantsVideo,'Connecting to caller…');
      } catch (err) {
        await cleanupCall();
        setStatus(err.message || 'Could not accept call.',true);
      }
      return;
    }
    if (!activeCall || signal.call_id !== activeCall.id) return;
    if (signal.kind === 'answer' && activeCall.outgoing && pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.payload.sdp));
      for (const candidate of pendingIce.splice(0)) await pc.addIceCandidate(candidate);
      $('zuzu-call-status').textContent = 'Connecting…';
    } else if (signal.kind === 'ice' && pc && signal.payload?.candidate) {
      const candidate = new RTCIceCandidate(signal.payload.candidate);
      if (pc.remoteDescription) await pc.addIceCandidate(candidate); else pendingIce.push(candidate);
    } else if (signal.kind === 'hangup' || signal.kind === 'reject') {
      const reason = signal.kind === 'reject' ? 'Call declined or recipient is busy.' : 'Call ended.';
      await cleanupCall();
      setStatus(reason);
    }
  }

  async function hangup() {
    if (activeCall) {
      try { await writeSignal('hangup'); } catch {}
    }
    await cleanupCall();
    setStatus('Call ended.');
  }

  async function cleanupCall() {
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    if (pc) pc.close();
    localStream=null; pc=null; activeCall=null; pendingIce=[];
    if ($('zuzu-local-video')) { $('zuzu-local-video').srcObject=null; $('zuzu-local-video').classList.remove('has-stream'); }
    if ($('zuzu-remote-video')) { $('zuzu-remote-video').srcObject=null; $('zuzu-remote-video').classList.remove('has-stream'); }
    if ($('zuzu-remote-audio')) $('zuzu-remote-audio').srcObject=null;
    $('zuzu-call-stage')?.classList.add('hidden');
    $('zuzu-chat-messages')?.classList.remove('during-call');
  }

  function boot() {
    mountBattery();
    mountLaunchers();
    const auth = window.zuzuOSAuth?.client;
    if (auth) auth.auth.onAuthStateChange((_event, session) => {
      user = session?.user || null;
      if (user) { mountBattery(); mountLaunchers(); }
      else {
        if (channel) auth.removeChannel(channel);
        channel=null; user=null; people=[]; selected='';
        cleanupCall().catch(()=>{});
        $('zuzu-connect-window')?.classList.add('hidden');
      }
    });
    const observer = new MutationObserver(() => {
      if (!$('desktop')?.classList.contains('hidden')) { mountBattery(); mountLaunchers(); }
    });
    const desktop = $('desktop');
    if (desktop) observer.observe(desktop,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
  }
  document.addEventListener('DOMContentLoaded',boot);
})();