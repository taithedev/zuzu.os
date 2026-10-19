/* Consistent, dependency-free SVG icon system for ZuzuOS. */
(() => {
 'use strict';
 const icons={
  notes:'<path d="M7 3.8h8l3 3V20H7z"/><path d="M15 3.8v3.5h3M10 11h5M10 14.5h5M10 18h3"/>',
  files:'<path d="M3.5 7.5h6l2 2h9v10h-17z"/><path d="M3.5 7.5v-3h7l2 3"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.1 1.8-1.8 3.1-2.1-.4a8 8 0 0 1-1.5.9l-.8 2h-3.6l-.8-2a8 8 0 0 1-1.5-.9l-2.1.4-1.8-3.1L5.7 15a8 8 0 0 1 0-1.8l-1.1-1.8 1.8-3.1 2.1.4a8 8 0 0 1 1.5-.9l.8-2h3.6l.8 2a8 8 0 0 1 1.5.9l2.1-.4 1.8 3.1-1.1 1.8a8 8 0 0 1-.1 1.8Z" transform="translate(0 -1) scale(1 .92)"/>',
  browser:'<circle cx="12" cy="12" r="9"/><path d="M3.5 9h17M8 4.1c2.8 3.2 2.8 12.6 0 15.8M16 4.1c-2.8 3.2-2.8 12.6 0 15.8M4.3 16h15.4"/>',
  cinehub:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3z"/>',
  music:'<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  paint:'<path d="m4 16 11.8-11.8a2.1 2.1 0 0 1 3 3L7 19H4z"/><path d="m13.5 6.5 4 4M4 21h16"/>',
  terminal:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3M13 15h4"/>',
  ciri:'<path d="m12 3 1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  store:'<path d="M4 8h16l1 12H3z"/><path d="M8 8V6a4 4 0 0 1 8 0v2M12 12v5M9.5 14.5h5"/>',
  home:'<path d="m3 10 9-7 9 7v10h-6v-6H9v6H3z"/>',
  account:'<circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2z"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
  image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/>',
  wifi:'<path d="M3 9a14 14 0 0 1 18 0M6 12a9 9 0 0 1 12 0M9.5 15.5a4 4 0 0 1 5 0M12 19h.01"/>',
  battery:'<rect x="3" y="7" width="17" height="10" rx="2"/><path d="M22 10v4M6 10h10v4H6z"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  calculator:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2m4 0h2m-8 4h2m4 0h2"/>',
  editor:'<path d="M4 4h16v16H4zM8 8h8M8 12h8M8 16h5"/>',
  monitor:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  power:'<path d="M12 2v10M6 5.5a8 8 0 1 0 12 0"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
  default:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8M8 12h8M8 15h5"/>'
 };
 const appIcon={chat:'chat',games:'games',trash:'trash',notes:'notes',files:'files',settings:'settings',browser:'browser',cinehub:'cinehub',music:'music',paint:'paint',terminal:'terminal',ciri:'ciri',store:'store',editor:'editor',calc:'calculator',system:'monitor',studio:'image'};
 const customIconPaths={"files":"/assets/icons/apps/files.svg","settings":"/assets/icons/apps/settings.svg","browser":"/assets/icons/apps/browser.svg","store":"/assets/icons/apps/store.svg","terminal":"/assets/icons/apps/terminal.svg","music":"/assets/icons/apps/music.svg","chat":"/assets/icons/apps/chat.svg","games":"/assets/icons/apps/games.svg","trash":"/assets/icons/apps/trash.svg"};
 function svg(name){if(customIconPaths[name])return '<img class="zuzu-icon zuzu-icon-image" src="'+customIconPaths[name]+'" alt="" aria-hidden="true" draggable="false">';return '<svg class="zuzu-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+(icons[name]||icons.default)+'</svg>'}
 function replace(node,name){if(!node||node.dataset.iconReady==='1')return;node.dataset.iconReady='1';node.innerHTML=svg(name);if(!node.hasAttribute('aria-label')&&node.closest('button')?.title)node.setAttribute('aria-label',node.closest('button').title)}
 function scan(root=document){
  root.querySelectorAll('.app-icon').forEach(n=>replace(n,appIcon[n.closest('[data-app]')?.dataset.app]||'default'));
  root.querySelectorAll('.task-app').forEach(n=>{if(n.querySelector('.zu-icon'))return;const id=n.dataset.app;const first=n.firstChild;if(first&&first.nodeType===3)first.textContent='';if(!n.querySelector('.zuzu-icon'))n.insertAdjacentHTML('afterbegin',svg(appIcon[id]||'default'))});
  root.querySelectorAll('.os-launch-item').forEach(n=>{const s=n.querySelector(':scope > span:first-child');replace(s,appIcon[n.dataset.osLaunch]||'default')});
  root.querySelectorAll('.os-shortcut').forEach(n=>replace(n.querySelector(':scope > span:first-child'),appIcon[n.dataset.osLaunch]||'default'));
  root.querySelectorAll('.os-scene-shortcut').forEach(n=>replace(n.querySelector('.os-scene-shortcut-icon'),appIcon[n.dataset.osLaunch]||'default'));
  root.querySelectorAll('.os-widget-icon').forEach(n=>replace(n,n.classList.contains('os-widget-music')?'music':'calendar'));
  root.querySelectorAll('.os-widget-chevron,.tile-arrow').forEach(n=>replace(n,'arrow'));
  root.querySelectorAll('#task-account').forEach(n=>{if(!n.querySelector('.zuzu-icon'))n.innerHTML=svg('account')});
  root.querySelectorAll('.panel-icon').forEach(n=>replace(n,n.closest('.note-panel')?'paint':'account'));
  root.querySelectorAll('#window-icon').forEach(n=>{const title=document.getElementById('window-title')?.textContent?.toLowerCase()||'';const aliases={ 'my files':'files','file explorer':'files','web':'browser','web browser':'browser','app store':'store','system monitor':'system','workspace studio':'studio','text editor':'editor','calculator':'calc','cine hub':'cinehub' };const id=aliases[title]||Object.keys(appIcon).find(k=>title.includes(k))||'default';if(n.dataset.iconName!==id){n.dataset.iconReady='';n.dataset.iconName=id;replace(n,id)}});
 }
 function boot(){scan();const observer=new MutationObserver(records=>{for(const r of records){if(r.type==='childList'){if(r.target?.id==='window-icon')scan(r.target.parentElement);r.addedNodes.forEach(n=>{if(n.nodeType===1)scan(n)})}else if(r.type==='characterData'){const p=r.target.parentElement;if(p?.id==='window-icon'){p.dataset.iconReady='';scan(p)}}}});observer.observe(document.body,{childList:true,subtree:true,characterData:true});document.addEventListener('click',e=>{const b=e.target.closest('[data-app], [data-os-launch]');if(b)requestAnimationFrame(()=>scan(document.getElementById('desktop')||document))});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
