(() => {
  const NS='http://www.w3.org/2000/svg';
  const path=(d,extra='')=>`<path d="${d}" ${extra}/>`;
  const icon=(name)=>{
    const base='viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
    const p={
      home:`${path('M3 10.5 12 3l9 7.5')}${path('M5 9.5V21h14V9.5')}${path('M9 21v-7h6v7')}`,
      grid:`<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>`,
      cart:`${path('M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 8H7')}${path('M10 20h.01M18 20h.01')}`,
      orders:`<rect x="5" y="3" width="14" height="18" rx="2"/>${path('M9 7h6M9 11h6M9 15h4')}`,
      gift:`<rect x="3" y="9" width="18" height="12" rx="2"/><path d="M12 9v12M3 13h18M8.5 9C6.6 9 5 7.7 5 6.2S6.3 4 7.7 4C10 4 12 9 12 9M15.5 9C17.4 9 19 7.7 19 6.2S17.7 4 16.3 4C14 4 12 9 12 9"/>`,
      user:`<circle cx="12" cy="8" r="4"/><path d="M4.5 21c.8-4.2 3.5-6 7.5-6s6.7 1.8 7.5 6"/>`,
      bell:`${path('M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9')}${path('M10 21h4')}`,
      clock:`<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`,
      tag:`${path('M20 13 13 20 4 11V4h7z')}${path('M8.5 8.5h.01')}`,
      sparkle:`${path('M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z')}${path('M18.5 15.5 19 17l1.5.5L19 18l-.5 1.5L18 18l-1.5-.5L18 17z')}`,
      robot:`<rect x="5" y="7" width="14" height="11" rx="4"/><path d="M12 4v3M9 12h.01M15 12h.01M8 16h8"/><circle cx="12" cy="3" r="1"/>`,
      back:`${path('M15 18 9 12l6-6')}`,
      arrow:`${path('M5 12h14')}${path('m13 6 6 6-6 6')}`
    };
    return `<svg ${base}>${p[name]||p.grid}</svg>`;
  };

  function lockHero(){
    const h=document.getElementById('heroBanner'); if(!h) return;
    const title=h.querySelector('h2'); if(title) title.innerHTML='Fresh Elaneeru<br>Healthier Communities';
    const copy=h.querySelector('p'); if(copy) copy.textContent='Built for local coconut vendors';
    const img=h.querySelector('img'); if(img){img.src='../b2c/images/tender-coconut-v2.webp';img.alt='Fresh tender coconut';}
  }

  function replaceIcons(){
    const bell=document.querySelector('.bell'); if(bell) bell.innerHTML=icon('bell');
    const back=document.querySelector('.back'); if(back) back.innerHTML=icon('back');
    const q={products:'grid',schemes:'gift',orders:'orders',account:'user'};
    document.querySelectorAll('.quick button[data-go] .qicon').forEach(el=>{const b=el.closest('button');el.innerHTML=icon(q[b?.dataset.go]||'grid')});
    const n={home:'home',products:'grid',cart:'cart',orders:'orders',schemes:'gift'};
    document.querySelectorAll('.nav button[data-v]').forEach(b=>{const s=b.querySelector('span');if(s)s.innerHTML=icon(n[b.dataset.v]||'grid')});
    const benefits=['clock','tag','sparkle'];document.querySelectorAll('.benefitIcon').forEach((el,i)=>el.innerHTML=icon(benefits[i]||'sparkle'));
    const bot=document.querySelector('#askFab .bot'); if(bot) bot.innerHTML=icon('robot');
    const botIcon=document.querySelector('.botIcon'); if(botIcon) botIcon.innerHTML=icon('robot');
    const sh=document.querySelector('.schemeHero');
    if(sh&&!sh.querySelector('.schemeGift')){const x=document.createElement('span');x.className='schemeGift';x.innerHTML=icon('gift');sh.appendChild(x)}
    const heroTitle=document.querySelector('.schemeHero b');if(heroTitle)heroTitle.textContent='Grow Together';
  }

  function fixFallbackProducts(root=document){
    root.querySelectorAll('.pimg').forEach(el=>{
      const hasImg=el.querySelector('img');
      if(hasImg) return;
      if((el.textContent||'').trim()){
        el.textContent='';
        const wrap=document.createElement('span');wrap.className='fallbackCoconut';
        wrap.innerHTML='<img src="../b2c/images/tender-coconut-v2.webp" alt="Tender coconut">';
        el.appendChild(wrap);
      }
    });
  }

  function cleanSchemeEmoji(){
    document.querySelectorAll('.schemeBox h4').forEach(h=>{h.textContent=(h.textContent||'').replace(/[🎁🎯]/gu,'').trim()});
  }

  const oldRenderHome=window.renderHome;
  if(typeof oldRenderHome==='function') window.renderHome=function(){const r=oldRenderHome.apply(this,arguments);lockHero();replaceIcons();fixFallbackProducts();return r};
  const oldRenderProducts=window.renderProducts;
  if(typeof oldRenderProducts==='function') window.renderProducts=function(){const r=oldRenderProducts.apply(this,arguments);replaceIcons();fixFallbackProducts();return r};
  const oldRenderCart=window.renderCart;
  if(typeof oldRenderCart==='function') window.renderCart=function(){const r=oldRenderCart.apply(this,arguments);replaceIcons();fixFallbackProducts();return r};
  const oldRenderSchemes=window.renderSchemes;
  if(typeof oldRenderSchemes==='function') window.renderSchemes=function(){const r=oldRenderSchemes.apply(this,arguments);cleanSchemeEmoji();replaceIcons();return r};
  const oldOpenAsk=window.openAsk;
  if(typeof oldOpenAsk==='function') window.openAsk=function(){const r=oldOpenAsk.apply(this,arguments);replaceIcons();return r};

  const apply=()=>{lockHero();replaceIcons();fixFallbackProducts();cleanSchemeEmoji()};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply); else apply();
  const observer=new MutationObserver(()=>{lockHero();replaceIcons();fixFallbackProducts();cleanSchemeEmoji()});
  observer.observe(document.body,{subtree:true,childList:true});
})();