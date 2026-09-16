(function(){
  if(window.NEL_CATALOG_FILTER_V10574)return;
  window.NEL_CATALOG_FILTER_V10574=true;

  function yes(v){return v===true||v===1||/^(1|true|yes|live|active)$/i.test(String(v||'').trim())}
  function n(v){var x=Number(v);return isFinite(x)?x:0}
  function text(p){return (String(p&&p.productName||'')+' '+String(p&&p.category||'')+' '+String(p&&p.description||'')).toLowerCase()}
  function allProducts(){try{return S&&S.cfg&&Array.isArray(S.cfg.products)?S.cfg.products:[]}catch(e){return []}}
  function hasOffer(p){
    return (n(p&&p.offerQty1)>0&&n(p&&p.offerPrice1)>0)||(n(p&&p.offerQty2)>0&&n(p&&p.offerPrice2)>0)||yes(p&&p.onOffer)||yes(p&&p.offerActive);
  }
  function isFresh(p){
    if(p&&('freshToday'in p||'isFreshToday'in p||'fresh'in p))return yes(p.freshToday)||yes(p.isFreshToday)||yes(p.fresh);
    var t=text(p);
    if(/dehusked|dry coconut|copra|mature coconut/.test(t))return false;
    return /tender coconut|elaneeru|green coconut|nariyal pani|coconut/.test(t);
  }
  function isBulk(p){
    return yes(p&&p.bulk)||yes(p&&p.bulkEligible)||n(p&&p.moq)>=5||n(p&&p.offerQty1)>=5||n(p&&p.offerQty2)>=5;
  }
  function isQuick(p){
    if(p&&('quickDelivery'in p||'isQuickDelivery'in p))return yes(p.quickDelivery)||yes(p.isQuickDelivery);
    var mins=n(p&&p.deliveryMinutes)||n(p&&p.deliveryMins);
    return mins>0&&mins<=60;
  }
  function isBest(p){return yes(p&&p.bestseller)||yes(p&&p.bestSeller)||yes(p&&p.isBestseller)}
  function searchMatch(p){
    var q='';try{q=String(S.query||'').trim().toLowerCase()}catch(e){}
    return !q||text(p).includes(q)||String(p&&p.productId||'').toLowerCase().includes(q);
  }
  function subset(mode){
    var list=allProducts().filter(searchMatch);
    if(mode==='fresh')return list.filter(isFresh);
    if(mode==='offers')return list.filter(hasOffer);
    if(mode==='bulk')return list.filter(isBulk);
    if(mode==='quick')return list.filter(isQuick);
    if(mode==='best')return list.filter(isBest);
    return list;
  }
  function label(mode,count){
    if(mode==='fresh')return 'Fresh today · '+count;
    if(mode==='bulk')return 'Bulk packs · '+count;
    if(mode==='quick')return 'Quick delivery · '+count;
    if(mode==='best')return 'Bestsellers · '+count;
    return 'All products · '+count;
  }
  function empty(mode){
    if(mode==='offers')return 'No active offers right now.';
    if(mode==='fresh')return 'No fresh-today products are live right now.';
    if(mode==='bulk')return 'No bulk packs are live right now.';
    if(mode==='quick')return 'Quick-delivery products are not configured yet.';
    if(mode==='best')return 'Bestsellers will appear after enough order history is available.';
    return 'No matching products.';
  }
  function setFilterVisual(mode,btn){
    document.querySelectorAll('.filter').forEach(function(x){x.classList.remove('on')});
    var target=btn||document.querySelector('.filter[onclick*="\''+mode+'\'"]');
    if(target)target.classList.add('on');
    document.body.setAttribute('data-filter-mode',mode);
  }
  function setShopHeading(mode,count){
    var h=document.querySelector('#shopPage .section h2');
    if(h)h.textContent=label(mode,count);
  }
  function renderDistinct(){
    var mode='all';try{mode=S.filterMode||'all'}catch(e){}
    var current=subset(mode);
    var offers=subset('offers');
    var fresh=subset('fresh');
    var shopHtml=current.length?current.map(pcard).join(''):'<div class="empty">'+empty(mode)+'</div>';
    var homeHtml=fresh.length?fresh.map(pcard).join(''):'<div class="empty">'+empty('fresh')+'</div>';
    var offerHtml=offers.length?offers.map(pcard).join(''):'<div class="empty">'+empty('offers')+'</div>';
    if($('products'))$('products').innerHTML=shopHtml;
    if($('homeProducts'))$('homeProducts').innerHTML=homeHtml;
    if($('offerProducts'))$('offerProducts').innerHTML=offerHtml;
    if($('favProducts'))$('favProducts').innerHTML=allProducts().filter(searchMatch).map(favCard).join('')||'<div class="empty">No favourites yet.</div>';
    setShopHeading(mode,current.length);
  }
  function applyFilter(mode,btn){
    mode=String(mode||'all').toLowerCase();
    if(!['all','fresh','offers','best','bulk','quick'].includes(mode))mode='all';
    try{S.filterMode=mode;S.query=''}catch(e){}
    var input=document.getElementById('searchInput');if(input)input.value='';
    setFilterVisual(mode,btn);
    renderDistinct();
    if(mode==='offers')go('offers');else go('shop');
  }
  function wireFreshHeader(){
    var tabs=document.querySelectorAll('.tabs .tab');
    if(tabs&&tabs[0])tabs[0].onclick=function(){applyFilter('fresh',document.querySelector('.filter[onclick*="\'fresh\'"]'))};
    if(tabs&&tabs[1])tabs[1].onclick=function(){applyFilter('quick',document.getElementById('nelQuickFilter'))};
    if(tabs&&tabs[2])tabs[2].onclick=function(){applyFilter('offers',document.querySelector('.filter[onclick*="\'offers\'"]'))};
    if(tabs&&tabs[3])tabs[3].onclick=function(){applyFilter('bulk',document.querySelector('.filter[onclick*="\'bulk\'"]'))};
  }
  function boot(){
    try{S.filterMode=S.filterMode||'all'}catch(e){}
    window.NEL_PRODUCT_SUBSET_V10574=subset;
    window.filteredProducts=function(){var mode='all';try{mode=S.filterMode||'all'}catch(e){}return subset(mode)};
    window.filterProducts=applyFilter;
    window.renderProducts=renderDistinct;
    wireFreshHeader();
    renderDistinct();
    setFilterVisual('all',document.querySelector('.filter[onclick*="\'all\'"]'));
    setTimeout(function(){wireFreshHeader();renderDistinct()},400);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else setTimeout(boot,0);
})();
