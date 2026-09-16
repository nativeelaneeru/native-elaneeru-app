(function(){
  if(window.NEL_CATALOG_FILTER_V10574)return;
  window.NEL_CATALOG_FILTER_V10574=true;

  function yes(v){return v===true||v===1||/^(1|true|yes|live|active)$/i.test(String(v||'').trim())}
  function n(v){var x=Number(v);return isFinite(x)?x:0}
  function text(p){return (String(p&&p.productName||'')+' '+String(p&&p.category||'')+' '+String(p&&p.description||'')).toLowerCase()}
  function allProducts(){try{return S&&S.cfg&&Array.isArray(S.cfg.products)?S.cfg.products:[]}catch(e){return []}}
  function hasOffer(p){
    if(yes(p&&p.onOffer)||yes(p&&p.offerActive))return true;
    var unit=n(p&&p.basePrice)||n(p&&p.price);
    if(unit<=0)return false;
    var q1=n(p&&p.offerQty1),v1=n(p&&p.offerPrice1),q2=n(p&&p.offerQty2),v2=n(p&&p.offerPrice2);
    return (q1>0&&v1>0&&v1<unit*q1)||(q2>0&&v2>0&&v2<unit*q2);
  }
  function isFresh(p){
    if(p&&('freshToday' in p||'isFreshToday' in p||'fresh' in p))return yes(p.freshToday)||yes(p.isFreshToday)||yes(p.fresh);
    var t=text(p);
    if(/dehusked|dry coconut|copra|mature coconut/.test(t))return false;
    return /tender coconut|elaneeru|green coconut|nariyal pani|coconut/.test(t);
  }
  function isBulk(p){
    return yes(p&&p.bulk)||yes(p&&p.bulkEligible)||n(p&&p.moq)>=5||n(p&&p.offerQty1)>=5||n(p&&p.offerQty2)>=5;
  }
  function isQuick(p){
    if(p&&('quickDelivery' in p||'isQuickDelivery' in p))return yes(p.quickDelivery)||yes(p.isQuickDelivery);
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
    if(mode==='offers')return 'No active discounts right now.';
    if(mode==='fresh')return 'No fresh-today products are live right now.';
    if(mode==='bulk')return 'No bulk packs are live right now.';
    if(mode==='quick')return 'Quick-delivery products are not configured yet.';
    if(mode==='best')return 'Bestsellers will appear after enough order history is available.';
    return 'No matching products.';
  }
  function findFilter(mode){
    var words={all:'ALL',fresh:'FRESH TODAY',offers:'OFFERS',best:'BESTSELLERS',bulk:'BULK ORDER',quick:'QUICK DELIVERY'};
    var needle=words[mode]||'';
    return Array.from(document.querySelectorAll('.filters .filter')).find(function(b){return String(b.textContent||'').toUpperCase().includes(needle)})||null;
  }
  function setFilterVisual(mode,btn){
    document.querySelectorAll('.filter').forEach(function(x){x.classList.remove('on')});
    var target=btn||findFilter(mode);
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
  function wireHeaderTabs(){
    var tabs=document.querySelectorAll('.tabs .tab');
    if(tabs&&tabs[0])tabs[0].onclick=function(){applyFilter('fresh',findFilter('fresh'))};
    if(tabs&&tabs[1])tabs[1].onclick=function(){applyFilter('quick',findFilter('quick'))};
    if(tabs&&tabs[2])tabs[2].onclick=function(){applyFilter('offers',findFilter('offers'))};
    if(tabs&&tabs[3])tabs[3].onclick=function(){applyFilter('bulk',findFilter('bulk'))};
  }
  function boot(){
    try{S.filterMode=S.filterMode||'all'}catch(e){}
    window.NEL_PRODUCT_SUBSET_V10574=subset;
    window.filteredProducts=function(){var mode='all';try{mode=S.filterMode||'all'}catch(e){}return subset(mode)};
    window.filterProducts=applyFilter;
    window.renderProducts=renderDistinct;
    wireHeaderTabs();
    renderDistinct();
    setFilterVisual('all',findFilter('all'));
    setTimeout(function(){wireHeaderTabs();renderDistinct()},400);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else setTimeout(boot,0);
})();
