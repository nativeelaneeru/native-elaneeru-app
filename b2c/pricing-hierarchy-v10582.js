(function(){
  if(window.NEL_PRICING_HIERARCHY_V10582)return;window.NEL_PRICING_HIERARCHY_V10582=true;
  function n(v){var x=Number(v);return isFinite(x)?x:0}
  function key(v){return String(v||'').trim().toLowerCase()}
  function money(v){return '₹'+n(v).toLocaleString('en-IN',{maximumFractionDigits:2})}
  function moneyFromText(v){var m=String(v||'').replace(/,/g,'').match(/₹\s*([0-9]+(?:\.[0-9]+)?)/);return m?n(m[1]):0}
  function products(){try{return window.S&&S.cfg&&Array.isArray(S.cfg.products)?S.cfg.products:[]}catch(e){return []}}
  function productForCard(card){
    var name='',node=card.querySelector('.pname')||card.querySelector('.favBody b')||card.querySelector('b');
    if(node)name=key(node.textContent);if(!name)return null;
    return products().find(function(p){return key(p.productName)===name})||null;
  }
  function bundleOffer(p){
    var sell=n(p&&p.price);if(!(sell>0))return null;
    var candidates=[
      {qty:Math.floor(n(p&&p.offerQty2)),total:n(p&&p.offerPrice2)},
      {qty:Math.floor(n(p&&p.offerQty1)),total:n(p&&p.offerPrice1)}
    ];
    for(var i=0;i<candidates.length;i++){
      var c=candidates[i],regular=sell*c.qty;
      if(c.qty>0&&c.total>0&&c.total<regular){
        return {qty:c.qty,total:c.total,regular:regular,unit:c.total/c.qty,save:regular-c.total};
      }
    }
    return null;
  }
  function style(){
    if(document.getElementById('nelPricingHierarchy10582Style'))return;
    var s=document.createElement('style');s.id='nelPricingHierarchy10582Style';s.textContent=`
      .nelOfferPrice10582 .price::before{content:'Offer ';font-size:9px;font-weight:900;color:#087443;margin-right:3px}
      .nelOfferPrice10582 .nelBasePriceRow::before{content:'Normal ';font-size:9px;font-weight:850;color:#7b837e}
      .nelBundleOffer10582{margin-top:6px;padding:7px 8px;border-radius:10px;background:#eef9f2;color:#075b34;font-size:9px;font-weight:850;line-height:1.35}
      .nelBundleOffer10582 .lbl{font-weight:950}.nelBundleOffer10582 s{color:#7b837e;margin:0 4px}.nelBundleOffer10582 b{font-size:11px}.nelBundleOffer10582 small{display:block;color:#617067;font-size:8px;font-weight:800;margin-top:2px}
      .nel-plan .nel-plan-price::before{content:'Plan ';display:block;font-size:8px;line-height:1.1;color:#6f7f74;font-weight:850}
      .nel-plan .nel-plan-old::before{content:'Offer ';font-size:8px;text-decoration:none;color:#7b837e;font-weight:850}
      .nelOfferVsSub10582{font-size:10px;color:#087443;font-weight:900;margin-top:7px;line-height:1.45}.nelOfferVsSub10582 s{color:#7b837e;font-weight:750;margin-right:3px}.nelOfferVsSub10582 b{font-size:11px}.nelOfferVsSub10582 small{display:block;color:#087443;font-size:9px;font-weight:850;margin-top:2px}
    `;document.head.appendChild(s)
  }
  function decorateProduct(card){
    var p=productForCard(card);if(!p)return;
    var nativePrice=card.querySelector('.nelNativePrice10600');
    var sell=n(p.price),base=n(p.basePrice),unitDiscount=base>sell&&sell>0,offer=bundleOffer(p);
    if(nativePrice){card.classList.remove('nelOfferPrice10582');var oldBase=card.querySelector('.nelBasePriceRow');if(oldBase)oldBase.remove();}
    if(!nativePrice)card.classList.toggle('nelOfferPrice10582',unitDiscount);
    var row=card.querySelector('.nelBundleOffer10582');
    if(!offer){if(row)row.remove();return}
    var sig=[sell,offer.qty,offer.total].join('|');
    if(!row){
      row=document.createElement('div');row.className='nelBundleOffer10582';
      var price=card.querySelector('.price');
      if(price)price.insertAdjacentElement('afterend',row);else card.appendChild(row);
    }
    if(row.dataset.sig===sig)return;
    row.dataset.sig=sig;
    row.innerHTML='<span class="lbl">Offer for '+offer.qty+':</span> <s>'+money(offer.regular)+'</s> <b>'+money(offer.total)+'</b><small>'+money(offer.unit)+'/pc · Save '+money(offer.save)+'</small>';
  }
  function decorateProducts(){document.querySelectorAll('.product,.fav').forEach(decorateProduct)}
  function decoratePlans(){
    document.querySelectorAll('.nel-plan[data-scheme]').forEach(function(card){
      var plan=card.querySelector('.nel-plan-price'),offer=card.querySelector('.nel-plan-old');
      if(!plan||!offer)return;
      var meta=card.querySelector('.nel-plan-head .meta'),qtyMatch=String(meta&&meta.textContent||'').match(/([0-9]+(?:\.[0-9]+)?)\s+coconuts?/i),qty=qtyMatch?n(qtyMatch[1]):0;
      var planUnit=moneyFromText(plan.textContent),offerUnit=moneyFromText(offer.textContent),offerTotal=qty*offerUnit,planTotal=qty*planUnit,save=Math.max(0,offerTotal-planTotal);
      var sig=[planUnit,offerUnit,qty].join('|'),note=card.querySelector('.nelOfferVsSub10582');
      var old=card.querySelector('.nelOfferVsSub10581');if(old)old.remove();
      if(note&&note.dataset.sig===sig)return;
      if(!note){note=document.createElement('div');note.className='nelOfferVsSub10582';var head=card.querySelector('.nel-plan-head');if(head)head.insertAdjacentElement('afterend',note);else card.appendChild(note)}
      note.dataset.sig=sig;
      if(qty&&offerTotal>0&&planTotal>0){note.innerHTML='Offer total <s>'+money(offerTotal)+'</s> → <b>Plan '+money(planTotal)+'</b>'+(save>0?'<small>Save '+money(save)+' / delivery versus the current offer</small>':'')}
      else{note.innerHTML='<s>'+offer.textContent.replace(/^offer\s*/i,'')+'</s> → <b>'+plan.textContent.replace(/^plan\s*/i,'')+' plan</b>'}
    });
  }
  var scheduled=false;
  function decorate(){scheduled=false;style();decorateProducts();decoratePlans()}
  function schedule(){if(scheduled)return;scheduled=true;(window.requestAnimationFrame||function(fn){return setTimeout(fn,0)})(decorate)}
  function boot(){decorate();var t=document.body||document.documentElement;if(t)new MutationObserver(schedule).observe(t,{childList:true,subtree:true});window.addEventListener('nel:catalog',schedule);window.addEventListener('nel:base-price-refresh',schedule);window.addEventListener('focus',schedule)}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
