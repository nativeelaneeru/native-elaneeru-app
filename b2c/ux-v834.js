(function(){
  const TC='TC';
  function loadCss(){
    if(document.querySelector('link[data-nel-v834]')) return;
    const l=document.createElement('link');
    l.rel='stylesheet';l.href='./ux-v834.css?v=834';l.dataset.nelV834='1';
    document.head.appendChild(l);
  }
  function pinTenderCoconut(){
    try{
      if(!window.CFG||!Array.isArray(CFG.products)) return;
      CFG.products.sort((a,b)=>{
        if(String(a.productId).toUpperCase()===TC) return -1;
        if(String(b.productId).toUpperCase()===TC) return 1;
        return Number(a.displayOrder||999)-Number(b.displayOrder||999);
      });
      document.querySelectorAll('.product').forEach(el=>el.classList.remove('tcFeatured'));
      const tc=document.getElementById('p-TC');
      if(tc){
        tc.classList.add('tcFeatured');
        const name=tc.querySelector('.pname');
        if(name && !tc.querySelector('.nelLiveBadge')){
          const badge=document.createElement('div');
          badge.className='nelLiveBadge';badge.textContent='LIVE · B2C';
          name.insertAdjacentElement('afterend',badge);
        }
      }
    }catch(e){}
  }
  function saferRewards(){
    try{
      const box=document.getElementById('rewardBox');
      if(!box) return;
      box.querySelectorAll('.progress i').forEach(i=>{
        const w=parseFloat(i.style.width||'0');
        i.style.width=(isFinite(w)?Math.max(0,Math.min(100,w)):0)+'%';
      });
    }catch(e){}
  }
  function observer(){
    const root=document.querySelector('.app');
    if(!root) return;
    new MutationObserver(()=>{pinTenderCoconut();saferRewards()}).observe(root,{childList:true,subtree:true});
  }
  loadCss();
  window.addEventListener('load',()=>{setTimeout(()=>{pinTenderCoconut();saferRewards();observer()},300)});
})();