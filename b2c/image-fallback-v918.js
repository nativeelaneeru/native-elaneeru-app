(function(){
  if(window.__NEL_B2C_IMAGE_FALLBACK_V918)return;
  window.__NEL_B2C_IMAGE_FALLBACK_V918=true;

  document.addEventListener('error',function(event){
    var img=event&&event.target;
    if(!img||!img.tagName||String(img.tagName).toUpperCase()!=='IMG')return;
    var parent=img.parentNode;
    if(!parent)return;

    // Product/deal images may carry older inline onerror handlers that remove
    // the image before reading parentNode. Neutralise that handler first so a
    // broken image can never throw an uncaught exception in production.
    if(img.hasAttribute&&img.hasAttribute('onerror')){
      try{img.onerror=null;img.removeAttribute('onerror')}catch(e){}
    }

    var visual=parent.classList&&(
      parent.classList.contains('visual')||
      parent.classList.contains('favVisual')||
      parent.classList.contains('productVisual')
    );
    if(!visual)return;

    try{img.remove()}catch(e){try{parent.removeChild(img)}catch(ignore){}}
    if(!parent.querySelector||!parent.querySelector('img'))parent.textContent='🥥';
  },true);
})();
