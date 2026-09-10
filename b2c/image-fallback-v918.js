(function(){
  if(window.__NEL_B2C_IMAGE_FALLBACK_V918)return;
  window.__NEL_B2C_IMAGE_FALLBACK_V918=true;

  document.addEventListener('error',function(event){
    var img=event&&event.target;
    if(!img||!img.tagName||String(img.tagName).toUpperCase()!=='IMG')return;
    var parent=img.parentNode;
    if(!parent)return;

    // Older product cards still contain inline onerror handlers such as
    // `this.remove(); this.parentNode...`. Once remove() runs, parentNode is
    // null and that legacy handler throws. Stop the error event during capture
    // so it never reaches the inline target handler, then render our safe
    // fallback here.
    try{
      if(event.stopImmediatePropagation)event.stopImmediatePropagation();
      else if(event.stopPropagation)event.stopPropagation();
      if(event.preventDefault)event.preventDefault();
    }catch(e){}

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
