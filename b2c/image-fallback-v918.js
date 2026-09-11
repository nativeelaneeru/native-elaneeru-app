(function(){
  if(window.__NEL_B2C_IMAGE_FALLBACK_V918)return;
  window.__NEL_B2C_IMAGE_FALLBACK_V918=true;

  function isVisual(parent){
    return !!(parent&&parent.classList&&(
      parent.classList.contains('visual')||
      parent.classList.contains('favVisual')||
      parent.classList.contains('productVisual')
    ));
  }

  function showFallback(img){
    if(!img)return;
    var parent=img.parentNode||img.parentElement;
    if(!parent||!isVisual(parent))return;
    try{img.onerror=null;img.removeAttribute('onerror');}catch(e){}
    try{parent.removeChild(img);}catch(e){try{img.remove();}catch(ignore){}}
    try{if(!parent.querySelector('img'))parent.textContent='🥥';}catch(e){}
  }

  function arm(img){
    if(!img||!img.tagName||String(img.tagName).toUpperCase()!=='IMG'||img.__nelSafeImage)return;
    img.__nelSafeImage=true;

    // The legacy main product renderer used:
    //   this.remove(); this.parentNode.textContent='🥥'
    // After remove(), parentNode is null. Strip any inline image error handler
    // before the browser can execute it and use the safe handler below.
    try{
      if(img.hasAttribute&&img.hasAttribute('onerror')){
        img.onerror=null;
        img.removeAttribute('onerror');
      }
    }catch(e){}
    try{img.addEventListener('error',function(){showFallback(img);},{once:true});}catch(e){}
  }

  function scan(root){
    if(!root)return;
    if(root.tagName&&String(root.tagName).toUpperCase()==='IMG')arm(root);
    if(root.querySelectorAll){
      var imgs=root.querySelectorAll('img');
      for(var i=0;i<imgs.length;i++)arm(imgs[i]);
    }
  }

  // Product cards are injected with innerHTML after catalogue load. A mutation
  // observer removes the unsafe inline handler before its asynchronous error
  // event can run.
  try{
    scan(document);
    var observer=new MutationObserver(function(records){
      for(var i=0;i<records.length;i++){
        var nodes=records[i].addedNodes||[];
        for(var j=0;j<nodes.length;j++)scan(nodes[j]);
      }
    });
    observer.observe(document.documentElement||document,{childList:true,subtree:true});
  }catch(e){}

  // Keep a document-level fallback as a second line of defence for browsers
  // where image error events participate in capture.
  document.addEventListener('error',function(event){
    var img=event&&event.target;
    if(!img||!img.tagName||String(img.tagName).toUpperCase()!=='IMG')return;
    try{if(event.stopImmediatePropagation)event.stopImmediatePropagation();}catch(e){}
    showFallback(img);
  },true);

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){scan(document);},{once:true});
})();
