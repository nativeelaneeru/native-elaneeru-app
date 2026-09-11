(function(){
  if(window.NEL_PRODUCT_IMAGES_V10380)return;window.NEL_PRODUCT_IMAGES_V10380=true;

  var style=document.createElement('style');
  style.textContent='.favVisual img,.visual img{object-fit:contain!important;background:#fff;padding:4px}.favVisual,.visual{background:linear-gradient(145deg,#eef7f1,#fff8e8)}';
  (document.head||document.documentElement).appendChild(style);

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
  function imageHtml(p){
    var url=String(p&&p.imageUrl||'').trim();
    if(!/^https?:\/\//i.test(url))return '📦';
    return '<img src="'+esc(url)+'" alt="'+esc(p&&p.productName||'Product')+'" loading="lazy" decoding="async">';
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