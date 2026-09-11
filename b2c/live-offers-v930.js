(function(){
  if(window.NEL_LIVE_OFFERS_V930)return;window.NEL_LIVE_OFFERS_V930=true;
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
  function render(cfg){
    var banners=Array.isArray(cfg&&cfg.banners)?cfg.banners:[],products=Array.isArray(cfg&&cfg.products)?cfg.products:[];
    var promo=document.querySelector('.promo');
    if(promo&&banners.length){var b=banners[0];promo.style.backgroundImage=b.imageUrl?'linear-gradient(90deg,#063d26dd,#0a6c3edd),url("'+esc(b.imageUrl)+'")':'';promo.style.backgroundSize='cover';promo.style.backgroundPosition='center';promo.innerHTML='<small>LIVE OFFER</small><h1>'+esc(b.title||'Fresh offers')+'</h1><p>'+esc(b.subtitle||b.offerText||'Fresh from Native Elaneeru')+'</p><span class="cta">'+esc(b.offerText||'SHOP NOW')+'</span>'}
    var rail=document.querySelector('#offersPage .dealRail');
    if(rail){rail.innerHTML=banners.length?banners.map(function(b){return '<div class="deal d3"><b>'+esc(b.title||'Fresh offer')+'</b><small>'+esc(b.subtitle||'')+'</small><span>🥥</span></div>'}).join(''):'<div class="empty">No live offers right now.</div>'}
    var host=document.getElementById('offerProducts');if(host){var ids=new Set(banners.map(function(b){return b.productId}).filter(Boolean)),list=ids.size?products.filter(function(p){return ids.has(p.productId)}):products.filter(function(p){return Number(p.offerQty1)||Number(p.offerQty2)});if(window.pcard)host.innerHTML=list.map(window.pcard).join('')||(banners.length?'<div class="empty">Offer products are being updated.</div>':'<div class="empty">No live offers right now.</div>')}
    var top=document.querySelector('.offerTop span');if(top)top.textContent=banners.length?(banners[0].offerText||banners[0].title||'Fresh offers live now'):'Fresh offers coming soon';
  }
  async function load(){try{var cfg=typeof catalogJsonpV114==='function'?await catalogJsonpV114():null;if(cfg)render(cfg)}catch(e){}}
  var n=0,t=setInterval(function(){n++;if(typeof catalogJsonpV114==='function'){clearInterval(t);load()}else if(n>200)clearInterval(t)},25);
  window.addEventListener('load',function(){setTimeout(load,300)});
})();