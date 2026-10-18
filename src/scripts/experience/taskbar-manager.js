/* ZuzuOS taskbar layout manager: one icon per slot, stable order, no overlap. */
(() => {
  'use strict';
  const getDock=()=>document.querySelector('#desktop.zu-scene .taskbar');
  let queued=false;
  function refresh() {
    const dock=getDock();
    if (!dock)return;
    const buttons=Array.from(dock.querySelectorAll(':scope > button.task-app, :scope > button#os-start-button'));
    const seen=new Set();
    for (const button of buttons) {
      const identity=button.id==='os-start-button'?'system:start':
        (button.dataset.app?'app:'+button.dataset.app:
         button.dataset.osDock?'dock:'+button.dataset.osDock:
         button.id==='zuzu-chat-task'?'system:chat':
         button.id==='os-task-view'?'system:taskview':
         button.dataset.zuzuGameDock?'system:arcade':'');
      if (identity && seen.has(identity)) {
        button.hidden=true;
        continue;
      }
      if (identity) seen.add(identity);
      if (button.hidden) continue;
      const graphics=Array.from(button.querySelectorAll('svg, img.zu-custom-app-icon'));
      if(graphics.length>1) {
        const winner=graphics.find(icon=>icon.matches('img.zu-custom-app-icon')) ||
          graphics.find(icon=>icon.classList.contains('zu-real-icon')) || graphics[0];
        graphics.filter(icon=>icon!==winner).forEach(icon=>icon.remove());
      }
      if(!button.getAttribute('aria-label')){
        button.setAttribute('aria-label',button.title || button.dataset.app || 'Open app');
      }
      if(!button.title)button.title=button.getAttribute('aria-label');
    }
    const visible=Array.from(dock.children).filter(el=>{
      if(el.hidden || el.classList.contains('hidden'))return false;
      if(el.classList.contains('taskbar-spacer')||el.classList.contains('task-clock')||
         el.classList.contains('task-account')||el.id==='home-button')return false;
      if(el.classList.contains('taskbar-separator'))return true;
      return el.matches('button');
    });
    const count=visible.filter(el=>el.matches('button')).length;
    const width= Math.max(64,count*49 + (count?12:0) +
        (visible.some(el=>el.classList.contains('taskbar-separator'))?15:0));
    dock.style.setProperty('--zu-dock-natural',width+'px');
  }
  function queue(){
    if (queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;refresh();});
  }
  function boot(){
    const dock=getDock();
    if(!dock)return;
    dock.setAttribute('aria-label','ZuzuOS application taskbar');
    const observer=new MutationObserver(queue);
    observer.observe(dock,{childList:true,subtree:false});
    dock.addEventListener('focusin',event=>{
      if (event.target.matches(':scope > button'))event.target.scrollIntoView({block:'nearest',inline:'nearest'});
    });
    window.addEventListener('resize',queue,{passive:true});
    queue();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();