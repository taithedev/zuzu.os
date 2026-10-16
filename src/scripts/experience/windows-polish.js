/* Windows 11-inspired icons and desktop shortcuts, without replacing ZuzuOS app handlers. */
(() => {
'use strict';
const ns='http://www.w3.org/2000/svg';
const specs={
files:['#f5be40','<path fill="#ffdc73" d="M2 8V5a2 2 0 0 1 2-2h7l3 3h8v3z"/><path fill="#f0b62b" d="M2 8h20v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z"/>'],
browser:['#439deb','<circle cx="12" cy="12" r="10" fill="#1687d5"/><path d="M3 13c2-8 11-12 18-5-4-2-9 0-10 5 2 5 6 6 10 3-4 8-16 8-18-3z" fill="#35c5ad"/><circle cx="12" cy="12" r="4.5" fill="#dffaff"/>'],
notes:['#ffce61','<rect x="5" y="2" width="15" height="20" rx="2" fill="#ffe5a4"/><rect x="5" y="2" width="4" height="20" fill="#e7af37"/><path d="M11 8h6M11 12h6M11 16h5" stroke="#98691e" stroke-width="1.2"/>'],
settings:['#91a3b8','<path fill="#9ba7b7" d="m10 1 4 0 1 3 2 1 3-1 3 4-2 2v4l2 2-3 4-3-1-2 1-1 3h-4l-1-3-2-1-3 1-3-4 2-2v-4L1 8l3-4 3 1 2-1z"/><circle cx="12" cy="12" r="4" fill="#303948"/><circle cx="12" cy="12" r="2" fill="#a6d5fb"/>'],
music:['#e59cf3','<circle cx="12" cy="12" r="10" fill="#8a54cf"/><path d="M11 7v9a2.2 2.2 0 1 1-2-2.2c.5 0 .8.1 1 .2V8l7-2v8a2.2 2.2 0 1 1-2-2.2c.4 0 .7 0 1 .2V5z" fill="#fff"/>'],
paint:['#ff9a6e','<path d="M12 2a10 10 0 1 0 0 20h2a2 2 0 0 0 1-4 2 2 0 0 1 2-3h2a4 4 0 0 0 3-4C22 6 18 2 12 2z" fill="#f3cb7e"/><circle cx="6" cy="11" r="2" fill="#4fa5fc"/><circle cx="11" cy="6" r="2" fill="#ff6969"/><circle cx="17" cy="8" r="2" fill="#79c776"/>'],
cinehub:['#cf9cf7','<rect x="2" y="5" width="20" height="14" rx="4" fill="#6741b8"/><path d="m10 8 7 4-7 4z" fill="#fff"/>'],
terminal:['#7fc9a4','<rect x="2" y="3" width="20" height="18" rx="3" fill="#20262e"/><path d="m6 8 4 4-4 4M12 16h6" stroke="#78e3ab" fill="none" stroke-width="2"/>'],
calc:['#9bc7e9','<rect x="4" y="2" width="16" height="20" rx="3" fill="#6689bb"/><rect x="7" y="5" width="10" height="4" rx="1" fill="#e7f4ff"/><path d="M8 13h2m4 0h2m-8 4h2m4 0h2" stroke="#fff" stroke-width="2"/>'],
editor:['#95c7f9','<rect x="4" y="3" width="16" height="18" rx="2" fill="#e6f3fe"/><path d="M8 8h8M8 12h8M8 16h6" stroke="#479adc" stroke-width="1.7"/>'],
store:['#81c9ec','<rect x="3" y="8" width="18" height="14" rx="2" fill="#348dc9"/><path d="M8 9V6a4 4 0 0 1 8 0v3" stroke="#bfeaff" stroke-width="2" fill="none"/>'],
system:['#a2bbd2','<rect x="2" y="3" width="20" height="17" rx="2" fill="#425d7d"/><path d="M5 15h3l2-7 3 10 2-6h4" stroke="#66ecbd" stroke-width="2" fill="none"/>']
};
function icon(id){const data=specs[id]||specs.store;const el=document.createElementNS(ns,'svg');el.setAttribute('viewBox','0 0 24 24');el.setAttribute('aria-hidden','true');el.classList.add('zu-real-icon');el.innerHTML=data[1];return el}
function upgrade(){
 const desktop=document.getElementById('desktop');if(!desktop||!desktop.classList.contains('zu-scene'))return;
 desktop.querySelectorAll('#os-launch-grid [data-os-launch]').forEach(btn=>{const id=btn.dataset.osLaunch;const slot=btn.querySelector(':scope > span:first-child');if(slot&&!slot.classList.contains('zu-app-icon')){slot.classList.add('zu-app-icon');slot.replaceChildren(icon(id));}});
 desktop.querySelectorAll('.taskbar .task-app[data-app]').forEach(btn=>{if(btn.dataset.zuRealIcon)return;btn.dataset.zuRealIcon='1';btn.querySelectorAll('svg').forEach(el=>el.remove());btn.prepend(icon(btn.dataset.app));});
 if(document.getElementById('zu-desktop-shortcuts'))return;
 const stage=document.getElementById('zu-stage');if(!stage)return;
 const shortcuts=document.createElement('div');shortcuts.id='zu-desktop-shortcuts';shortcuts.className='zu-desktop-shortcuts';shortcuts.setAttribute('aria-label','Desktop shortcuts');
 [['files','File Explorer'],['browser','Browser'],['notes','Notes'],['settings','Settings'],['music','Music'],['paint','Paint'],['cinehub','Cine Hub']].forEach(([id,label])=>{
  const b=document.createElement('button');b.type='button';b.className='zu-desktop-shortcut';b.title='Open '+label;b.append(icon(id));const text=document.createElement('span');text.textContent=label;b.append(text);b.addEventListener('click',()=>{const launch=desktop.querySelector('#os-launch-grid [data-os-launch="'+id+'"]')||desktop.querySelector('.taskbar [data-app="'+id+'"]');launch?.click();});shortcuts.append(b);
 });
 const games=document.createElement('button');games.type='button';games.className='zu-desktop-shortcut';games.title='Open Arcade';games.append(icon('cinehub'));const title=document.createElement('span');title.textContent='Arcade';games.append(title);games.addEventListener('click',()=>window.ZuzuArcade?.open());shortcuts.append(games);
 stage.append(shortcuts);
}
function init(){upgrade();setTimeout(upgrade,700);document.addEventListener('click',e=>{if(e.target.closest('#os-start-button'))requestAnimationFrame(upgrade)});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
