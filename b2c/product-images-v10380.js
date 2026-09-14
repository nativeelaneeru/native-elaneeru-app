(function(){
  if(window.NEL_PRODUCT_IMAGES_V10390)return;window.NEL_PRODUCT_IMAGES_V10390=true;

  var style=document.createElement('style');
  style.textContent='.favVisual img,.visual img{object-fit:contain!important;background:#fff;padding:4px}.favVisual,.visual{background:linear-gradient(145deg,#eef7f1,#fff8e8)}.nelImageFallback{display:grid;place-items:center;width:100%;height:100%;font-size:52px;color:#075b34}';
  (document.head||document.documentElement).appendChild(style);

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
  function directImageUrl(value){
    var url=String(value||'').trim();
    if(!/^https?:\/\//i.test(url))return '';
    if(/your-image-link|example\.com|placeholder/i.test(url))return '';
    var match=url.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/i)||url.match(/[?&]id=([A-Za-z0-9_-]+)/i);
    if(match)return 'https://drive.google.com/uc?export=view&id='+encodeURIComponent(match[1]);
    return url;
  }
  function canonicalImage(p){
    var id=String(p&&p.productId||'').trim().toUpperCase();
    if(id==='TC')return './images/tender-coconut-v2.webp';
    if(id==='DC')return './images/dehusked-coconut-v2.webp';
    return directImageUrl(p&&p.imageUrl);
  }
  function applyCanonicalImages(){
    try{(S&&S.cfg&&Array.isArray(S.cfg.products)?S.cfg.products:[]).forEach(function(p){var url=canonicalImage(p);if(url)p.imageUrl=url})}catch(e){}
  }
  function fallback(productName){
    var name=String(productName||'Product').toLowerCase(),dehusked=/dehusked|dry coconut/.test(name);
    var shell=dehusked?'#b97838':'#50a83f',light=dehusked?'#edd2a8':'#a9dc63';
    return '<span class="nelImageFallback" role="img" aria-label="'+esc(productName||'Product image')+'"><svg viewBox="0 0 240 180" width="100%" height="100%" aria-hidden="true"><rect width="240" height="180" rx="22" fill="#f4fbf4"/><ellipse cx="120" cy="151" rx="69" ry="10" fill="#dcebdc"/><path d="M73 112C66 68 93 31 135 27c41-4 65 31 52 73-11 37-39 56-72 52-25-3-38-17-42-40z" fill="'+shell+'"/><path d="M92 51c20-16 50-17 70-1-13 3-25 12-33 26-12-11-24-19-37-25z" fill="'+light+'"/><path d="M127 29c-2-18 7-27 20-28-4 10-1 18 8 25" fill="none" stroke="#306f2e" stroke-width="8" stroke-linecap="round"/><circle cx="112" cy="80" r="5" fill="#315d2d" opacity=".55"/></svg></span>';
  }
  function imageHtml(p){
    var url=canonicalImage(p);
    if(!url)return fallback(p&&p.productName);
    return '<img src="'+esc(url)+'" alt="'+esc(p&&p.productName||'Product')+'" loading="lazy" decoding="async" referrerpolicy="no-referrer">';
  }
  function install(){
    if(typeof window.renderProducts!=='function')return false;
    applyCanonicalImages();
    window.img=imageHtml;
    try{window.renderProducts()}catch(e){}
    return true;
  }
  var attempts=0,timer=setInterval(function(){attempts++;if(install()||attempts>200)clearInterval(timer)},25);
  window.addEventListener('load',function(){setTimeout(install,0)});
  window.addEventListener('nel:catalog',function(){applyCanonicalImages();setTimeout(install,0)});
})();
