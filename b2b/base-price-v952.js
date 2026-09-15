(function(){
  if(window.NEL_B2B_BASE_PRICE_V952)return;window.NEL_B2B_BASE_PRICE_V952=true;

  function num(v){var n=Number(v);return isFinite(n)?n:0}
  function money(v){return '₹'+num(v).toLocaleString('en-IN',{maximumFractionDigits:2})}
  function products(){try{return typeof DATA!=='undefined'&&DATA&&Array.isArray(DATA.products)?DATA.products:[]}catch(e){return []}}
  function key(v){return String(v||'').trim().toLowerCase()}
  function findProduct(card){
    var n=card.querySelector('.pname'),name=key(n&&n.textContent);if(!name)return null;
    return products().find(function(p){return key(p.productName)===name})||null;
  }
  function style(){
    if(document.getElementById('nelB2BBasePriceStyle'))return;
    var s=document.createElement('style');s.id='nelB2BBasePriceStyle';
    s.textContent='.nelBasePriceRow{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:5px;min-height:16px;font-size:10px;line-height:1.2}.nelBasePriceStrike{color:#7b8791;text-decoration:line-through;text-decoration-thickness:1.5px;font-weight:800}.nelBasePriceSave{color:#0c7a5c;background:#e8f7f0;border-radius:999px;padding:3px 6px;font-weight:950}.nelBasePriceNote{font-size:9px;color:#0c7a5c;font-weight:850;margin-top:2px}';
    document.head.appendChild(s);
  }
  function decorateCard(card){
    var p=findProduct(card),priceEl=card.querySelector('.price'),row=card.querySelector('.nelBasePriceRow'),note=card.querySelector('.nelBasePriceNote');
    if(!p||!priceEl){if(row)row.remove();if(note)note.remove();return}
    var sell=num(p.price),base=num(p.basePrice),show=base>sell&&sell>0,unit=String(p.unit||'pc');
    if(!show){if(row)row.remove();if(note)note.remove()}
    else{
      var sig=[base,sell,unit].join('|');
      if(!row){row=document.createElement('div');row.className='nelBasePriceRow';priceEl.parentNode.insertBefore(row,priceEl)}
      if(row.dataset.sig!==sig){row.dataset.sig=sig;row.innerHTML='<span class="nelBasePriceStrike">'+money(base)+'</span><span class="nelBasePriceSave">Save '+money(base-sell)+'/'+unit+'</span>'}
      if(!note){note=document.createElement('div');note.className='nelBasePriceNote';priceEl.insertAdjacentElement('afterend',note)}
      if(note.textContent!=='Your special price')note.textContent='Your special price';
    }
    var btn=card.querySelector('.add');if(btn&&btn.textContent.trim()==='Update')btn.textContent='Update Qty';
  }
  function decorate(){style();document.querySelectorAll('#products .product').forEach(decorateCard)}
  function patchToast(){
    if(typeof window.toast!=='function'||window.toast.__nel952)return typeof window.toast==='function';
    var base=window.toast,wrapped=function(s){return base.call(this,String(s)==='Cart updated'?'Cart quantity updated':s)};
    wrapped.__nel952=true;wrapped.__base=base;window.toast=wrapped;try{toast=wrapped}catch(e){};return true;
  }
  function start(){
    decorate();patchToast();
    var target=document.getElementById('products')||document.body||document.documentElement;
    if(target){var ob=new MutationObserver(function(){decorate();patchToast()});ob.observe(target,{childList:true,subtree:true})}
    window.addEventListener('nel:base-price-refresh',decorate);
    var tries=0;(function retry(){decorate();if(!patchToast()&&++tries<120)setTimeout(retry,100);else setInterval(decorate,2500)})();
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();