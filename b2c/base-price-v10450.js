(function(){
  if(window.NEL_B2C_BASE_PRICE_V10450)return;window.NEL_B2C_BASE_PRICE_V10450=true;

  function num(v){var n=Number(v);return isFinite(n)?n:0}
  function money(v){return '₹'+num(v).toLocaleString('en-IN',{maximumFractionDigits:2})}
  function products(){try{return window.S&&S.cfg&&Array.isArray(S.cfg.products)?S.cfg.products:[]}catch(e){return []}}
  function key(v){return String(v||'').trim().toLowerCase()}
  function findProduct(card){
    var name='';
    var pn=card.querySelector('.pname');if(pn)name=pn.textContent;
    if(!name){var fb=card.querySelector('.favBody b');if(fb)name=fb.textContent}
    if(!name){var b=card.querySelector('b');if(b)name=b.textContent}
    name=key(name);if(!name)return null;
    return products().find(function(p){return key(p.productName)===name})||null;
  }
  function style(){
    if(document.getElementById('nelB2CBasePriceStyle'))return;
    var s=document.createElement('style');s.id='nelB2CBasePriceStyle';
    s.textContent='.nelBasePriceRow{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:5px;min-height:16px;font-size:10px;line-height:1.2}.nelBasePriceStrike{color:#7b837e;text-decoration:line-through;text-decoration-thickness:1.5px;font-weight:750}.nelBasePriceSave{color:#087443;background:#e8f7ee;border-radius:999px;padding:3px 6px;font-weight:900}.fav .nelBasePriceRow{margin-top:5px}.product .nelBasePriceRow{margin-top:6px}';
    document.head.appendChild(s);
  }
  function decorateCard(card){
    var p=findProduct(card),priceEl=card.querySelector('.price'),row=card.querySelector('.nelBasePriceRow');
    if(!p||!priceEl){if(row)row.remove();return}
    var sell=num(p.price),base=num(p.basePrice),show=base>sell&&sell>0;
    if(!show){if(row)row.remove();return}
    var unit=String(p.unit||'pc'),sig=[base,sell,unit].join('|');
    if(!row){row=document.createElement('div');row.className='nelBasePriceRow';priceEl.parentNode.insertBefore(row,priceEl)}
    if(row.dataset.sig===sig)return;
    row.dataset.sig=sig;
    row.innerHTML='<span class="nelBasePriceStrike">'+money(base)+'</span><span class="nelBasePriceSave">Save '+money(base-sell)+'/'+unit+'</span>';
  }
  function decorate(){style();document.querySelectorAll('.product,.fav').forEach(decorateCard)}
  function start(){
    decorate();
    var target=document.body||document.documentElement;
    if(target){var ob=new MutationObserver(function(){decorate()});ob.observe(target,{childList:true,subtree:true})}
    window.addEventListener('nel:catalog',decorate);window.addEventListener('nel:base-price-refresh',decorate);
    setInterval(decorate,2500);
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();