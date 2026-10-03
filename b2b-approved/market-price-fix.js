/* Market-price safety: show only verified per-piece values, never weight-derived guesses. */
(function(){
  function num(v){const n=Number(v);return Number.isFinite(n)&&n>0?n:null}
  function explicitPerPiece(r){
    if(!r||typeof r!=='object') return null;
    for(const k of ['perPiece','pricePerPiece','per_piece','price_per_piece','perCoconut','pricePerCoconut']){
      const n=num(r[k]); if(n) return n;
    }
    const unit=String(r.rateUnit||r.unit||r.uom||'').trim().toLowerCase();
    const n=num(r.modal??r.modalPrice??r.price??r.rate??r.value);
    if(!n) return null;
    if(/100\s*(piece|pc|pcs|nos|coconut)/.test(unit)) return n/100;
    if(/(^|\b)(piece|pc|pcs|nos|each|coconut)(\b|$)/.test(unit)) return n;
    return null;
  }

  window.toPerPiece=function(n,unit){return explicitPerPiece({price:n,unit})||0};
  window.rateValues=function(){
    return (HOME?.marketRates||HOME?.marketPrices||[])
      .map(explicitPerPiece)
      .filter(x=>x!=null&&x>0&&x<500);
  };
  window.marketText=function(){
    const a=window.rateValues();
    if(!a.length) return '';
    const lo=Math.round(Math.min(...a)),hi=Math.round(Math.max(...a));
    return lo===hi?money(lo):money(lo)+' - '+Math.round(hi).toLocaleString('en-IN');
  };

  const baseRenderHome=window.renderHome;
  window.renderHome=function(){
    if(typeof baseRenderHome==='function') baseRenderHome();
    if(!HOME) return;
    const vals=window.rateValues();
    const md=document.getElementById('marketDate');
    const mp=document.getElementById('marketPrice');
    const mu=document.getElementById('marketUnit');
    const live=document.querySelector('.market .live');
    if(!vals.length){
      if(mp) mp.textContent='Updating';
      if(mu) mu.textContent='verified market rate';
      if(md) md.textContent='Waiting for a verified per-coconut source';
      if(live){live.textContent='VERIFYING';live.classList.add('verifying')}
    }else{
      if(mu) mu.textContent='per piece';
      if(live){live.textContent='● LIVE';live.classList.remove('verifying')}
      if(md){
        const dt=HOME.marketRatesUpdatedAt;
        const loc=(HOME.marketLocation||HOME.marketName||'Verified market reference');
        md.textContent=dt?loc+' · '+String(dt).slice(0,10):loc+' · per coconut';
      }
    }
  };

  /* Ask NE must never say “— per piece”. Give a clear verified-status answer instead. */
  const baseAnswer=window.answerAsk;
  if(typeof baseAnswer==='function'){
    window.answerAsk=async function(type,question){
      const resolved=typeof routeAskType==='function'?routeAskType(type,question):type;
      if(resolved==='price' && window.rateValues().length===0){
        const p=typeof primaryProduct==='function'?primaryProduct():null;
        const your=p&&p.price?money(p.price):'not available';
        const moq=p&&typeof moqOf==='function'?moqOf(p):'';
        const q=question||"What is today’s price?";
        const dyn=document.getElementById('chatDynamic');
        const quick=document.getElementById('quickBlock');
        if(quick) quick.classList.add('hidden');
        if(dyn){
          dyn.innerHTML=(typeof userBubble==='function'?userBubble(q):'')+
            (typeof botBubble==='function'?botBubble('<b>Today’s verified market reference is being updated.</b><br>I will not show an unverified or weight-converted rate.<br><br><b>Your Native Elaneeru price:</b> '+your+' per piece'+(moq?' · MOQ '+moq+' pieces':'')+'.'):'');
          dyn.scrollIntoView({block:'end',behavior:'smooth'});
        }
        return;
      }
      return baseAnswer.apply(this,arguments);
    };
  }
})();