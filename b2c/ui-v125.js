(function(){
  if(window.NEL_UI_V125)return;window.NEL_UI_V125=true;

  var freshDashboard=null;

  function el(id){return document.getElementById(id)}
  function money(v){return '₹'+Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}

  function style(){
    if(el('nel125Style'))return;
    var s=document.createElement('style');s.id='nel125Style';
    s.textContent='.nel125-history-note{font-size:9px;color:#68766d;padding:0 14px 7px;margin-top:-5px}.nel125-card-meta{font-size:9px;color:#6d766f;margin-top:3px}';
    document.head.appendChild(s);
  }

  function setTruthfulPromo(){
    var span=document.querySelector('.offerTop span');
    if(span)span.textContent='🥥 Fresh stock · Live prices · Cash on Delivery';
  }

  function historyHeading(text,note){
    var host=el('favProducts');if(!host)return;
    var section=host.previousElementSibling;
    if(section&&section.classList&&section.classList.contains('section')){
      var h=section.querySelector('h2');if(h)h.textContent=text;
    }
    var n=el('nel125HistoryNote');
    if(!n){n=document.createElement('div');n.id='nel125HistoryNote';n.className='nel125-history-note';host.parentNode.insertBefore(n,host)}
    n.textContent=note||'';
  }

  function products(){try{return window.S&&S.cfg&&Array.isArray(S.cfg.products)?S.cfg.products:[]}catch(e){return []}}
  function productKey(p){return String(p&&p.productName||'').trim().toLowerCase()}
  function productByOrderItem(it){
    var pid=String(it&&it.productId||'').toUpperCase();
    var name=String(it&&(it.name||it.productName)||'').trim().toLowerCase();
    return products().find(function(p){return (pid&&String(p.productId||'').toUpperCase()===pid)||(name&&productKey(p)===name)})||null;
  }
  function productCard(p,meta){
    var id=String(p.productId||'').replace(/'/g,"\\'");
    var im=p.imageUrl?'<img src="'+esc(p.imageUrl)+'" alt="'+esc(p.productName)+'" loading="lazy" decoding="async" onerror="this.remove();this.parentNode.textContent=\'🥥\'">':'🥥';
    return '<div class="fav"><div class="favVisual">'+im+'</div><div class="favBody"><b>'+esc(p.productName)+'</b><div class="nel125-card-meta">'+esc(meta||'Live catalogue')+'</div><div class="price">'+money(p.price)+' / '+esc(p.unit||'pc')+'</div><button class="add" onclick="add(\''+id+'\')">ADD</button></div></div>';
  }
  function realOrders(d){
    return (d&&Array.isArray(d.orders)?d.orders:[]).filter(function(o){var st=String(o&&o.status||'').toUpperCase();return !/(CANCEL|FAIL|REJECT|UNABLE|RETURN)/.test(st)});
  }

  function renderHistory(){
    var host=el('favProducts');if(!host)return;
    var ps=products();
    if(!freshDashboard){
      historyHeading('Fresh picks','Order history is checked live before we show an “Order again” list.');
      host.innerHTML=ps.slice(0,4).map(function(p){return productCard(p,'Fresh today')}).join('')||'<div class="empty">Loading fresh products…</div>';
      return;
    }
    var orders=realOrders(freshDashboard),seen={},ranked=[];
    orders.forEach(function(o){
      (o.items||[]).forEach(function(it){
        var p=productByOrderItem(it);if(!p)return;
        var k=String(p.productId||productKey(p));if(seen[k])return;
        seen[k]=1;ranked.push(p);
      });
    });
    if(ranked.length){
      historyHeading('Order again','Only products found in your confirmed order history are shown here.');
      host.innerHTML=ranked.slice(0,6).map(function(p){return productCard(p,'Previously ordered')}).join('');
    }else{
      historyHeading('Fresh picks','No previous completed/active orders were found for this account.');
      host.innerHTML=ps.slice(0,4).map(function(p){return productCard(p,'Fresh today')}).join('')||'<div class="empty">No products available.</div>';
    }
  }

  function normalizeLiveCart(){
    try{
      if(!window.S||!S.cart)return false;
      var changed=false,live={};products().forEach(function(p){live[String(p.productId)]=p});
      Object.keys(S.cart).forEach(function(id){
        var p=live[id];if(!p){delete S.cart[id];changed=true;return}
        var q=Number(S.cart[id]||0),min=Math.max(1,Number(p.moq||1)),step=Math.max(1,Number(p.qtyStep||1));
        var next=Math.max(min,Math.floor(q||min));if(step>1&&next%step)next=Math.ceil(next/step)*step;
        if(next!==q){S.cart[id]=next;changed=true}
      });
      if(changed){
        localStorage.setItem('nel_cart_v9',JSON.stringify(S.cart));
        if(window.NEL_DB&&typeof window.NEL_DB.setCart==='function')window.NEL_DB.setCart(S.cart).catch(function(){});
        if(typeof window.updateCartBar==='function')window.updateCartBar();
      }
      return changed;
    }catch(e){return false}
  }

  function start(){
    style();setTruthfulPromo();
    historyHeading('Fresh picks','Order history is checked live before we show an “Order again” list.');
    setTimeout(renderHistory,600);
    setTimeout(renderHistory,2500);
  }

  window.addEventListener('nel:dashboard',function(e){
    var detail=e&&e.detail||{},d=detail.dashboard;
    if(!d)return;
    if(detail.cached===false){freshDashboard=d;renderHistory()}
    else if(!freshDashboard){historyHeading('Fresh picks','Refreshing your real order history…');renderHistory()}
  });
  window.addEventListener('nel:catalog',function(){normalizeLiveCart();renderHistory()});

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();
