(function(){
  if(window.NEL_PRICING_HIERARCHY_V10581)return;window.NEL_PRICING_HIERARCHY_V10581=true;
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
  function style(){
    if(document.getElementById('nelPricingHierarchy10581Style'))return;
    var s=document.createElement('style');s.id='nelPricingHierarchy10581Style';s.textContent=`
      .nelOfferPrice10581 .price::before{content:'Offer ';font-size:9px;font-weight:900;color:#087443;margin-right:3px}.nelOfferPrice10581 .nelBasePriceRow::before{content:'Normal ';font-size:9px;font-weight:850;color:#7b837e}.nel-plan .nel-plan-price::before{content:'Plan ';display:block;font-size:8px;line-height:1.1;color:#6f7f74;font-weight:850}.nel-plan .nel-plan-old::before{content:'Offer ';font-size:8px;text-decoration:none;color:#7b837e;font-weight:850}.nelOfferVsSub10581{font-size:10px;color:#087443;font-weight:900;margin-top:7px;line-height:1.45}.nelOfferVsSub10581 s{color:#7b837e;font-weight:750;margin-right:3px}.nelOfferVsSub10581 b{font-size:11px}.nelOfferVsSub10581 small{display:block;color:#087443;font-size:9px;font-weight:850;margin-top:2px}
    `;document.head.appendChild(s)
  }
  function decorateProducts(){
    document.querySelectorAll('.product,.fav').forEach(function(card){
      var p=productForCard(card);if(!p)return;
      var sell=n(p.price),base=n(p.basePrice);
      card.classList.toggle('nelOfferPrice10581',base>sell&&sell>0);
    });
  }
  function decoratePlans(){
    document.querySelectorAll('.nel-plan[data-scheme]').forEach(function(card){
      var plan=card.querySelector('.nel-plan-price'),offer=card.querySelector('.nel-plan-old');
      if(!plan||!offer)return;
      var meta=card.querySelector('.nel-plan-head .meta'),qtyMatch=String(meta&&meta.textContent||'').match(/([0-9]+(?:\.[0-9]+)?)\s+coconuts?/i),qty=qtyMatch?n(qtyMatch[1]):0;
      var planUnit=moneyFromText(plan.textContent),offerUnit=moneyFromText(offer.textContent),offerTotal=qty*offerUnit,planTotal=qty*planUnit,save=Math.max(0,offerTotal-planTotal);
      var sig=[planUnit,offerUnit,qty].join('|'),note=card.querySelector('.nelOfferVsSub10581');
      if(note&&note.dataset.sig===sig)return;
      if(!note){note=document.createElement('div');note.className='nelOfferVsSub10581';var head=card.querySelector('.nel-plan-head');if(head)head.insertAdjacentElement('afterend',note);else card.appendChild(note)}
      note.dataset.sig=sig;
      if(qty&&offerTotal>0&&planTotal>0){note.innerHTML='Offer total <s>'+money(offerTotal)+'</s> → <b>Plan '+money(planTotal)+'</b>'+(save>0?'<small>Save '+money(save)+' / delivery versus the current offer</small>':'')}
      else{note.innerHTML='<s>'+offer.textContent.replace(/^offer\s*/i,'')+'</s> → <b>'+plan.textContent.replace(/^plan\s*/i,'')+' plan</b>'}
    });
  }
  var scheduled=false;
  function decorate(){scheduled=false;style();decorateProducts();decoratePlans()}
  function schedule(){if(scheduled)return;scheduled=true;(window.requestAnimationFrame||setTimeout)(decorate,0)}
  function boot(){decorate();var t=document.body||document.documentElement;if(t)new MutationObserver(schedule).observe(t,{childList:true,subtree:true});window.addEventListener('nel:catalog',schedule);window.addEventListener('nel:base-price-refresh',schedule);window.addEventListener('focus',schedule)}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
