(() => {
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
      back:`${path('M15 18 9 12l6-6')}`
    };
    return `<svg ${base}>${p[name]||p.grid}</svg>`;
  };

  function setIcon(el,name){
    if(!el || el.dataset.neIcon===name) return;
    el.innerHTML=icon(name);
    el.dataset.neIcon=name;
  }

  function lockHero(){
    const h=document.getElementById('heroBanner'); if(!h) return;
    const title=h.querySelector('h2');
    if(title && title.innerHTML!=='Fresh Elaneeru<br>Healthier Communities') title.innerHTML='Fresh Elaneeru<br>Healthier Communities';
    const copy=h.querySelector('p'); if(copy && copy.textContent!=='Built for local coconut vendors') copy.textContent='Built for local coconut vendors';
    const img=h.querySelector('img'); if(img && !/tender-coconut-v2\.webp(?:$|\?)/.test(img.src)){img.src='../b2c/images/tender-coconut-v2.webp';img.alt='Fresh tender coconut';}
  }

  function replaceIcons(){
    setIcon(document.querySelector('.bell'),'bell');
    setIcon(document.querySelector('.back'),'back');
    const q={products:'grid',schemes:'gift',orders:'orders',account:'user'};
    document.querySelectorAll('.quick button[data-go] .qicon').forEach(el=>{const b=el.closest('button');setIcon(el,q[b?.dataset.go]||'grid')});
    const n={home:'home',products:'grid',cart:'cart',orders:'orders',schemes:'gift'};
    document.querySelectorAll('.nav button[data-v]').forEach(b=>{const s=b.querySelector('span');setIcon(s,n[b.dataset.v]||'grid')});
    const benefits=['clock','tag','sparkle'];document.querySelectorAll('.benefitIcon').forEach((el,i)=>setIcon(el,benefits[i]||'sparkle'));
    setIcon(document.querySelector('#askFab .bot'),'robot');
    setIcon(document.querySelector('.botIcon'),'robot');
    const sh=document.querySelector('.schemeHero');
    if(sh&&!sh.querySelector('.schemeGift')){const x=document.createElement('span');x.className='schemeGift';x.innerHTML=icon('gift');x.dataset.neIcon='gift';sh.appendChild(x)}
    const heroTitle=document.querySelector('.schemeHero b');if(heroTitle&&heroTitle.textContent!=='Grow Together')heroTitle.textContent='Grow Together';
  }

  function fixFallbackProducts(root=document){
    root.querySelectorAll('.pimg').forEach(el=>{
      if(el.querySelector('img')) return;
      if(!(el.textContent||'').trim()) return;
      el.textContent='';
      const wrap=document.createElement('span');wrap.className='fallbackCoconut';
      wrap.innerHTML='<img src="../b2c/images/tender-coconut-v2.webp" alt="Tender coconut">';
      el.appendChild(wrap);
    });
  }

  function cleanSchemeEmoji(){
    document.querySelectorAll('.schemeBox h4').forEach(h=>{
      const cleaned=(h.textContent||'').replace(/[🎁🎯]/gu,'').trim();
      if(h.textContent!==cleaned) h.textContent=cleaned;
    });
  }

  function applyBusinessLinks(){
    const credit=document.querySelector('.businessHub [data-go="credit"]');
    if(credit){
      let enabled=false;
      try{enabled=Number(HOME?.vendor?.creditLimit||0)>0}catch(_){enabled=false}
      credit.style.display=enabled?'':'none';
    }
  }

  function renderCreditSafe(){
    const root=document.getElementById('creditSummary'); if(!root) return;
    let v={};try{v=HOME?.vendor||{}}catch(_){}
    const limit=Number(v.creditLimit||0),outstanding=Number(v.outstanding||0),available=Math.max(0,Number(v.availableCredit ?? (limit-outstanding))||0);
    if(limit<=0){root.innerHTML='<div class="empty">Credit is not enabled for this account.</div>';return;}
    root.innerHTML=`<div class="schemeBox"><h4>Credit Summary</h4><div class="tier"><span>Credit Limit</span><span>${money(limit)}</span></div><div class="tier"><span>Outstanding</span><span>${money(outstanding)}</span></div><div class="tier"><span>Available</span><span>${money(available)}</span></div></div>`;
  }

  function renderDeliverySafe(){
    const root=document.getElementById('deliveryList'); if(!root) return;
    let orders=[];try{orders=DETAIL?.orders||[]}catch(_){}
    if(!orders.length){root.innerHTML='<div class="empty">No active deliveries found.</div>';return;}
    root.innerHTML=orders.slice(0,20).map(o=>`<div class="orderCard"><div><b>${esc(o.orderId||o['Order ID']||'Order')}</b><small>${esc(o.orderedAt||o.date||o.createdAt||'')}</small><b>${money(o.totalAmount||o.amount||0)}</b></div><span class="status ${orderStatusClass(o.status)}">${esc(o.status||'Order Received')}</span></div>`).join('');
  }

  function apply(){lockHero();replaceIcons();fixFallbackProducts();cleanSchemeEmoji();applyBusinessLinks();renderCreditSafe()}

  const patch=(name,after=apply)=>{
    const original=window[name];
    if(typeof original!=='function'||original.__ne1401) return;
    const wrapped=function(){const r=original.apply(this,arguments);after();return r};
    wrapped.__ne1401=true;window[name]=wrapped;
  };
  ['renderHome','renderProducts','renderCart','renderSchemes','openAsk'].forEach(name=>patch(name));
  patch('renderDetails',()=>{renderCreditSafe();renderDeliverySafe();apply()});

  // Resilient Home boot: if an older backend deployment does not expose the
  // lightweight Home method, fall back to the proven full B2B payload instead
  // of leaving Login/restore stuck.
  const baseRpc=window.rpc;
  if(typeof baseRpc==='function'&&!baseRpc.__ne1401){
    const resilientRpc=function(method,args=[]){
      return Promise.resolve(baseRpc(method,args)).catch(err=>{
        if(method==='getB2BHomeFastV1000') return baseRpc('getB2BAppDataV9',args);
        throw err;
      });
    };
    resilientRpc.__ne1401=true;
    window.rpc=resilientRpc;
  }

  // The approved build added Credit and Delivery sections after showView was
  // written. Handle those routes explicitly so their Home/Account buttons do
  // not open a blank screen.
  const baseShowView=window.showView;
  if(typeof baseShowView==='function'&&!baseShowView.__ne1401){
    const extendedShowView=function(v){
      if(v!=='credit'&&v!=='delivery') return baseShowView.apply(this,arguments);
      try{CURRENT=v}catch(_){}
      ['home','products','cart','orders','credit','delivery','schemes','account'].forEach(x=>{
        const el=document.getElementById(x+'View'); if(el) el.classList.toggle('hidden',x!==v);
      });
      document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));
      const askFab=document.getElementById('askFab');if(askFab)askFab.style.display='none';
      if(v==='credit') renderCreditSafe();
      if(v==='delivery'){
        const root=document.getElementById('deliveryList');if(root)root.innerHTML='<div class="empty">Loading delivery status…</div>';
        Promise.resolve(loadDetails()).then(renderDeliverySafe).catch(()=>renderDeliverySafe());
      }
      window.scrollTo({top:0,left:0,behavior:'auto'});
    };
    extendedShowView.__ne1401=true;
    window.showView=extendedShowView;
  }

  const refreshDelivery=document.getElementById('refreshDeliveryBtn');
  if(refreshDelivery&&!refreshDelivery.dataset.neBound){
    refreshDelivery.dataset.neBound='1';
    refreshDelivery.onclick=()=>Promise.resolve(loadDetails(true)).then(renderDeliverySafe);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply,{once:true}); else requestAnimationFrame(apply);
})();
