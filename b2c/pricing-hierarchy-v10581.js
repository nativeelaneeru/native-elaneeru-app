(function(){
  if(window.NEL_PRICING_HIERARCHY_V10581)return;window.NEL_PRICING_HIERARCHY_V10581=true;
  function n(v){var x=Number(v);return isFinite(x)?x:0}
  function key(v){return String(v||'').trim().toLowerCase()}
  function products(){try{return window.S&&S.cfg&&Array.isArray(S.cfg.products)?S.cfg.products:[]}catch(e){return []}}
  function productForCard(card){
    var name='',node=card.querySelector('.pname')||card.querySelector('.favBody b')||card.querySelector('b');
    if(node)name=key(node.textContent);if(!name)return null;
    return products().find(function(p){return key(p.productName)===name})||null;
  }
  function style(){
    if(document.getElementById('nelPricingHierarchy10581Style'))return;
    var s=document.createElement('style');s.id='nelPricingHierarchy10581Style';s.textContent=`
      .nelOfferPrice10581 .price::before{content:'Offer ';font-size:9px;font-weight:900;color:#087443;margin-right:3px}.nelOfferPrice10581 .nelBasePriceRow::before{content:'Normal ';font-size:9px;font-weight:850;color:#7b837e}.nel-plan .nel-plan-price::before{content:'Subscription ';display:block;font-size:8px;line-height:1.1;color:#6f7f74;font-weight:850}.nel-plan .nel-plan-old::before{content:'Offer ';font-size:8px;text-decoration:none;color:#7b837e;font-weight:850}.nelOfferVsSub10581{font-size:10px;color:#087443;font-weight:900;margin-top:5px}.nelOfferVsSub10581 s{color:#7b837e;font-weight:750;margin-right:4px}
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
      var sub=card.querySelector('.nel-plan-price'),offer=card.querySelector('.nel-plan-old');
      if(!sub||!offer)return;
      var sig=key(sub.textContent)+'|'+key(offer.textContent),note=card.querySelector('.nelOfferVsSub10581');
      if(note&&note.dataset.sig===sig)return;
      if(!note){note=document.createElement('div');note.className='nelOfferVsSub10581';var head=card.querySelector('.nel-plan-head');if(head)head.insertAdjacentElement('afterend',note);else card.appendChild(note)}
      note.dataset.sig=sig;note.innerHTML='<s>'+offer.textContent.replace(/^offer\s*/i,'')+'</s> → '+sub.textContent.replace(/^subscription\s*/i,'')+' subscription';
    });
  }
  var scheduled=false;
  function decorate(){scheduled=false;style();decorateProducts();decoratePlans()}
  function schedule(){if(scheduled)return;scheduled=true;(window.requestAnimationFrame||setTimeout)(decorate,0)}
  function boot(){decorate();var t=document.body||document.documentElement;if(t)new MutationObserver(schedule).observe(t,{childList:true,subtree:true});window.addEventListener('nel:catalog',schedule);window.addEventListener('nel:base-price-refresh',schedule);window.addEventListener('focus',schedule)}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
