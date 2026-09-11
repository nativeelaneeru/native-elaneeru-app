(function(){
  if(window.NEL_PRODUCT_IMAGES_V10390)return;window.NEL_PRODUCT_IMAGES_V10390=true;

  var style=document.createElement('style');
  style.textContent='.favVisual img,.visual img{object-fit:contain!important;background:#fff;padding:4px}.favVisual,.visual{background:linear-gradient(145deg,#eef7f1,#fff8e8)}.nelImageFallback{display:grid;place-items:center;width:100%;height:100%;font-size:52px;color:#075b34}';
  (document.head||document.documentElement).appendChild(style);

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
  function directImageUrl(value){
    var url=String(value||'').trim();
    if(!/^https?:\/\//i.test(url))return '';
    var match=url.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/i)||url.match(/[?&]id=([A-Za-z0-9_-]+)/i);
    if(match)return 'https://drive.google.com/uc?export=view&id='+encodeURIComponent(match[1]);
    return url;
  }
  function fallback(productName){
    return '<span class="nelImageFallback" aria-label="'+esc(productName||'Product image unavailable')+'">🥥</span>';
  }
  function imageHtml(p){
    var url=directImageUrl(p&&p.imageUrl);
    if(!url)return fallback(p&&p.productName);
    return '<img src="'+esc(url)+'" alt="'+esc(p&&p.productName||'Product')+'" loading="lazy" decoding="async" referrerpolicy="no-referrer">';
  }
  function install(){
    if(typeof window.renderProducts!=='function')return false;
    window.img=imageHtml;
    try{window.renderProducts()}catch(e){}
    return true;
  }
  var attempts=0,timer=setInterval(function(){attempts++;if(install()||attempts>200)clearInterval(timer)},25);
  window.addEventListener('load',function(){setTimeout(install,0)});
})();
