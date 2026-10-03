/* Market price safety patch: only display verified per-piece values. */
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
    const isHundred=/100\s*(piece|pc|pcs|nos|coconut)/.test(unit);
    if(isHundred) return n/100;
    const isPiece=/(^|\b)(piece|pc|pcs|nos|each|coconut)(\b|$)/.test(unit);
    if(isPiece) return n;
    return null;
  }

  window.toPerPiece=function(n,unit){
    const r={price:n,unit:unit};
    return explicitPerPiece(r)||0;
  };

  window.rateValues=function(){
    return (HOME?.marketRates||HOME?.marketPrices||[])
      .map(explicitPerPiece)
      .filter(x=>x!=null&&x>0&&x<500);
  };

  window.marketText=function(){
    const a=window.rateValues();
    if(!a.length) return '—';
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
    if(!vals.length){
      if(mp) mp.textContent='—';
      if(md) md.textContent='Verified per-piece market rate pending';
    } else if(md){
      const dt=HOME.marketRatesUpdatedAt;
      const loc=(HOME.marketLocation||HOME.marketName||'Verified market reference');
      md.textContent=dt?loc+' · '+String(dt).slice(0,10):loc+' · per coconut';
    }
  };
})();