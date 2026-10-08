
/* Progressive enhancement. Autoplay is muted and only runs when visible. */
(()=>{
  'use strict';
  const hero=document.getElementById('home');
  if(!hero)return;
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  const saveData=!!(navigator.connection && navigator.connection.saveData);
  const video=hero.querySelector('.ib-mosaic-tile--video video');
  const playIfAllowed=()=>{
    if(!video)return;
    if(document.hidden || reduce.matches || saveData || !hero.getBoundingClientRect().height){
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
