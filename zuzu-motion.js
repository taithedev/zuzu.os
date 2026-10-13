/* ZuzuOS Motion Studio — user-controlled, lightweight animated wallpapers. */
(() => {
  'use strict';
  const KEY = 'zuzu:motion-wallpaper';
  const SPEED_KEY = 'zuzu:motion-speed';
  const INTENSITY_KEY = 'zuzu:motion-intensity';
  const PRESETS = new Set(['aurora','nebula','mist','waves','none']);
  const clamp = (n,min,max) => Math.max(min,Math.min(max,Number(n)||min));
  const read = (key,fallback) => { try { const v=localStorage.getItem(key); return v===null?fallback:JSON.parse(v); } catch { return fallback; } };
  const write = (key,value) => { try { localStorage.setItem(key,JSON.stringify(value)); } catch {} };
  const $ = id => document.getElementById(id);
  let current = 'aurora';
  function ensureLayer(){
    const desktop = $('desktop');
    if(!desktop) return;
    let layer = $('zuzu-live-wallpaper');
    if(!layer){
      layer = document.createElement('div');
      layer.id = 'zuzu-live-wallpaper';
      layer.setAttribute('aria-hidden','true');
      layer.innerHTML = '<span class="zuzu-motion-orb zuzu-motion-orb--one"></span><span class="zuzu-motion-orb zuzu-motion-orb--two"></span><span class="zuzu-motion-orb zuzu-motion-orb--three"></span><span class="zuzu-motion-orb zuzu-motion-orb--four"></span><span class="zuzu-motion-grain"></span>';
      desktop.insertBefore(layer,desktop.firstChild);
    }
    return layer;
  }
  function apply(preset,announce=false){
    current = PRESETS.has(preset)?preset:'aurora';
    const desktop = $('desktop');
    const layer = ensureLayer();
    if(desktop) desktop.dataset.motionWallpaper = current;
    document.documentElement.dataset.motionWallpaper = current;
    if(layer) layer.hidden = current === 'none';
    write(KEY,current);
    const select = $('wallpaper-motion-choice');
    if(select && select.value !== current) select.value = current;
    if(announce) window.dispatchEvent(new CustomEvent('zuzu:toast',{detail:'Live wallpaper changed.'}));
  }
  function applyMotionSettings(){
    const speed = clamp(read(SPEED_KEY,85),45,140);
    const intensity = clamp(read(INTENSITY_KEY,70),0,100);
    const duration = Math.round(48 - (speed/100)*24);
    const root = document.documentElement;
    root.style.setProperty('--zuzu-motion-duration-a',duration+'s');
    root.style.setProperty('--zuzu-motion-duration-b',Math.round(duration*1.34)+'s');
    root.style.setProperty('--zuzu-motion-duration-c',Math.round(duration*.91)+'s');
    root.style.setProperty('--zuzu-motion-opacity',(intensity/100).toFixed(2));
    const speedInput = $('wallpaper-motion-speed');
    const intensityInput = $('wallpaper-motion-intensity');
    const speedValue = $('wallpaper-speed-value');
    const intensityValue = $('wallpaper-intensity-value');
    if(speedInput) speedInput.value = String(speed);
    if(intensityInput) intensityInput.value = String(intensity);
    if(speedValue) speedValue.textContent = speed+'%';
    if(intensityValue) intensityValue.textContent = intensity+'%';
  }
  function hydrateControls(){
    const select = $('wallpaper-motion-choice');
    if(select) select.value = current;
    applyMotionSettings();
  }
  function init(){
    current = PRESETS.has(read(KEY,'aurora'))?read(KEY,'aurora'):'aurora';
    ensureLayer();
    apply(current);
    applyMotionSettings();
    document.addEventListener('change',event=>{
      const t=event.target;
      if(t.id==='wallpaper-motion-choice') apply(t.value,true);
      if(t.id==='wallpaper-motion-speed'){write(SPEED_KEY,clamp(t.value,45,140));applyMotionSettings();}
      if(t.id==='wallpaper-motion-intensity'){write(INTENSITY_KEY,clamp(t.value,0,100));applyMotionSettings();}
    });
    document.addEventListener('input',event=>{
      const t=event.target;
      if(t.id==='wallpaper-motion-speed'){write(SPEED_KEY,clamp(t.value,45,140));applyMotionSettings();}
      if(t.id==='wallpaper-motion-intensity'){write(INTENSITY_KEY,clamp(t.value,0,100));applyMotionSettings();}
    });
    // Settings are rendered when opened; hydrate controls whenever that dynamic panel appears.
    const observer=new MutationObserver(records=>{
      if(records.some(r=>r.addedNodes.length)) {
        if($('wallpaper-motion-choice') || $('wallpaper-motion-speed')) hydrateControls();
        if(!$('zuzu-live-wallpaper') && $('desktop')) ensureLayer();
      }
    });
    observer.observe(document.body,{childList:true,subtree:true});
    document.addEventListener('zuzu:motion:refresh',hydrateControls);
    window.zuzuMotion = {apply,refresh:hydrateControls,get preset(){return current;}};
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();