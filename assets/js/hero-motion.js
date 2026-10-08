
/* Progressive enhancement. Autoplay is muted and only runs when visible. */
(()=>{
  'use strict';
  const hero=document.getElementById('home');
  if(!hero)return;
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  const saveData=!!(navigator.connection && navigator.connection.saveData);
  const video=hero.querySelector('.ib-mosaic-tile--video video');
  const toggle=hero.querySelector('.ib-motion-toggle');
  let userPaused=false;
  if(toggle){
    toggle.addEventListener('click',()=>{
      if(reduce.matches && userPaused)hero.classList.add('ib-motion-opted-in');
      userPaused=!userPaused;
      hero.classList.toggle('ib-collage-paused',userPaused);
      toggle.setAttribute('aria-pressed',String(userPaused));
      toggle.setAttribute('aria-label',userPaused?'Play moving collage':'Pause moving collage');
      const label=toggle.querySelector('.ib-motion-toggle-text');
      const glyph=toggle.querySelector('.ib-motion-toggle-symbol');
      if(label)label.textContent=userPaused?'Play collage':'Pause collage';
      if(glyph)glyph.textContent=userPaused?'▶':'Ⅱ';
      if(video){
        if(userPaused)video.pause();
        else playIfAllowed();
      }
    });
    if(reduce.matches){
      // Respect reduced motion by default; a direct user tap can opt back in.
      userPaused=true;
      hero.classList.add('ib-collage-paused');
      toggle.setAttribute('aria-pressed','true');
      toggle.setAttribute('aria-label','Play collage manually');
      const label=toggle.querySelector('.ib-motion-toggle-text');
      const glyph=toggle.querySelector('.ib-motion-toggle-symbol');
      if(label)label.textContent='Play collage';
      if(glyph)glyph.textContent='▶';
    }
  }
  const playIfAllowed=()=>{
    if(!video)return;
    if(userPaused || document.documentElement.classList.contains('ib-audible-video-playing') || document.hidden || reduce.matches || saveData || !hero.getBoundingClientRect().height){
      video.pause();return;
    }
    const bounds=hero.getBoundingClientRect();
    if(bounds.bottom>0 && bounds.top<window.innerHeight){
      const result=video.play(); if(result && typeof result.catch==='function')result.catch(()=>{});
    }else video.pause();
  };
  if(video){
    video.muted=true;
    if(reduce.matches || saveData){video.pause();video.removeAttribute('autoplay');video.preload='none';}
    else playIfAllowed();
    document.addEventListener('visibilitychange',playIfAllowed,{passive:true});
    window.addEventListener('scroll',playIfAllowed,{passive:true});
    reduce.addEventListener?.('change',playIfAllowed);
  }
  // Listening to a Reel must take priority over the decorative, muted hero loop.
  document.addEventListener('play',event=>{
    const playing=event.target;
    if(!(playing instanceof HTMLVideoElement) || playing===video || playing.muted)return;
    document.documentElement.classList.add('ib-audible-video-playing');
    if(video)video.pause();
    document.querySelectorAll('video').forEach(other=>{
      if(other!==playing && !other.muted)other.pause();
    });
  },true);
  const resetAudioLock=()=>{
    const any=[...document.querySelectorAll('video')].some(el=>!el.muted && !el.paused);
    if(!any)document.documentElement.classList.remove('ib-audible-video-playing');
  };
  document.addEventListener('pause',resetAudioLock,true);
  document.addEventListener('ended',resetAudioLock,true);
  const headings=[...document.querySelectorAll('main h2,main h3')].filter(el=>!el.closest('#home') && !el.closest('summary'));
  if(!reduce.matches && 'IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(entry.isIntersecting){
          entry.target.classList.add('ib-show');
          observer.unobserve(entry.target);
        }
      }
    },{rootMargin:'0px 0px -6% 0px',threshold:.08});
    headings.forEach(el=>{
      el.classList.add('ib-scroll-title');
      if(el.getBoundingClientRect().top<window.innerHeight*.92){
        el.classList.add('ib-show');
      } else observer.observe(el);
    });
    document.documentElement.classList.add('ib-motion-on');
  }
})();
