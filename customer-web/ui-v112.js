(function(){
  if(window.NEL_UI_V112)return;window.NEL_UI_V112=true;

  function value(obj,names,fallback){
    for(var i=0;i<names.length;i++){
      var v=obj&&obj[names[i]];
      if(v!==undefined&&v!==null&&String(v).trim()!=='')return v;
    }
    return fallback||'';
  }

  function ensureStyle(){
    if(document.getElementById('nel112style'))return;
    var s=document.createElement('style');
    s.id='nel112style';
    s.textContent='.nel112-banners{display:grid;grid-auto-flow:column;grid-auto-columns:min(88%,620px);gap:11px;overflow-x:auto;padding:12px 14px 3px;scroll-snap-type:x mandatory;scrollbar-width:none}.nel112-banners::-webkit-scrollbar{display:none}.nel112-banner{scroll-snap-align:start;min-height:148px;border:0;border-radius:20px;padding:19px;text-align:left;background:linear-gradient(135deg,#06452b,#087845 62%,#0b9a59);color:#fff;position:relative;overflow:hidden;box-shadow:0 10px 24px #063d2624}.nel112-banner:nth-child(2n){background:linear-gradient(135deg,#ffe06c,#fff0ae);color:#18351f}.nel112-copy{position:relative;z-index:2;max-width:69%}.nel112-copy b{display:block;font-size:22px;line-height:1.08}.nel112-copy small{display:block;margin-top:7px;font-size:11px;font-weight:750;line-height:1.4}.nel112-offer{display:inline-block;margin-top:11px;padding:6px 9px;border-radius:8px;background:#ffffff2b;font-size:10px;font-weight:950}.nel112-banner:nth-child(2n) .nel112-offer{background:#075b3418}.nel112-banner img{position:absolute;right:3px;bottom:0;width:34%;height:100%;object-fit:contain}';
    document.head.appendChild(s);
  }

  function render(){
    var cfg;
    try{cfg=S&&S.cfg}catch(e){return false}
    if(!cfg)return false;
    var list=Array.isArray(cfg.banners)?cfg.banners:[];
    var home=document.getElementById('homePage');
    if(!home)return false;
    var old=document.getElementById('nel112Banners');
    if(old)old.remove();
    if(!list.length)return true;
    ensureStyle();
    var rail=document.createElement('div');
    rail.id='nel112Banners';rail.className='nel112-banners';
    list.forEach(function(b){
      var card=document.createElement('button');
      card.type='button';card.className='nel112-banner';
      var copy=document.createElement('span');copy.className='nel112-copy';
      var title=document.createElement('b');
      title.textContent=value(b,['title','bannerTitle','headline'],'Native Elaneeru');
      copy.appendChild(title);
      var subtitle=value(b,['subtitle','subTitle','description'],'');
      if(subtitle){var small=document.createElement('small');small.textContent=subtitle;copy.appendChild(small)}
      var offer=value(b,['offerText','offer','ctaText'],'');
      if(offer){var badge=document.createElement('span');badge.className='nel112-offer';badge.textContent=offer;copy.appendChild(badge)}
      card.appendChild(copy);
      var image=value(b,['imageUrl','imageURL','image'],'');
      if(image){var img=document.createElement('img');img.src=image;img.alt='';img.loading='lazy';img.onerror=function(){this.remove()};card.appendChild(img)}
      card.onclick=function(){
        var target=String(value(b,['redirectType','target'],'offers')).toUpperCase();
        if(typeof window.go==='function')window.go(target==='PRODUCT'||target==='SHOP'?'shop':'offers');
      };
      rail.appendChild(card);
    });
    var promo=home.querySelector('.promo');
    if(promo)promo.insertAdjacentElement('afterend',rail);else home.insertBefore(rail,home.firstChild);
    return true;
  }

  function start(){
    var tries=0;
    (function waitForData(){
      if(render())return;
      if(++tries<100)setTimeout(waitForData,120);
    })();
  }
  document.readyState==='complete'?start():window.addEventListener('load',start,{once:true});
})();
