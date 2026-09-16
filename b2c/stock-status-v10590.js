(function(){
  if(window.NEL_B2C_STOCK_STATUS_V10590)return;window.NEL_B2C_STOCK_STATUS_V10590=true;
  var wrapped=false,patchTimer=null,lastRemoved={};
  function products(){try{return window.S&&S.cfg&&Array.isArray(S.cfg.products)?S.cfg.products:[]}catch(e){return []}}
  function byId(id){id=String(id||'');return products().find(function(p){return String(p.productId||'')===id})||null}
  function isOos(p){return !!(p&&p.stockTracked&&String(p.stockStatus||'').toUpperCase()==='OOS')}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
  function ensureCss(){if(document.getElementById('nelOosStyle'))return;var s=document.createElement('style');s.id='nelOosStyle';s.textContent='.nelOosBadge{margin-top:6px;padding:6px 8px;border-radius:9px;background:#fff1dc;color:#9a4f00;border:1px solid #f1d2a4;font-size:10px;font-weight:950;text-align:center}.nelOosButton{border-color:#c8cec9!important;color:#7b827d!important;background:#f1f3f1!important;cursor:not-allowed!important;opacity:.9}.nelOosPlus{opacity:.4!important;cursor:not-allowed!important}';document.head.appendChild(s)}
  function idFromOnclick(btn){var x=String(btn&&btn.getAttribute('onclick')||''),m=x.match(/(?:add|change)\(['\"]([^'\"]+)['\"]/);return m?m[1]:''}
  function patchCards(){
    ensureCss();
    document.querySelectorAll('button[onclick*="add("],button[onclick*="change("]').forEach(function(btn){
      var id=idFromOnclick(btn),p=byId(id);if(!isOos(p))return;
      var call=String(btn.getAttribute('onclick')||'');
      if(/change\([^,]+,\s*-1\s*\)/.test(call))return;
      btn.disabled=true;
      if(/add\(/.test(call)){btn.textContent='OUT OF STOCK';btn.classList.add('nelOosButton')}else btn.classList.add('nelOosPlus');
      var card=btn.closest('.product,.fav');if(card&&!card.querySelector('.nelOosBadge')){var badge=document.createElement('div');badge.className='nelOosBadge';badge.textContent='OUT OF STOCK';var body=card.querySelector('.favBody')||card;body.appendChild(badge)}
    });
  }
  function schedulePatch(){clearTimeout(patchTimer);patchTimer=setTimeout(patchCards,30)}
  function normalizeCart(){
    try{
      if(!window.S||!S.cart)return;var changed=false;
      products().forEach(function(p){var id=String(p.productId||'');if(!isOos(p)||!Number(S.cart[id]||0))return;delete S.cart[id];changed=true;if(!lastRemoved[id]){lastRemoved[id]=Date.now();try{if(typeof window.toast==='function')window.toast((p.productName||'Product')+' is out of stock and was removed from your cart.')}catch(e){}}});
      if(changed){localStorage.setItem('nel_cart_v9',JSON.stringify(S.cart));if(window.NEL_DB&&typeof window.NEL_DB.setCart==='function')window.NEL_DB.setCart(S.cart).catch(function(){});if(typeof window.updateCartBar==='function')window.updateCartBar()}
    }catch(e){}
  }
  function installWrappers(){
    if(wrapped||typeof window.add!=='function'||typeof window.change!=='function')return false;
    var baseAdd=window.add,baseChange=window.change;
    window.add=function(id){var p=byId(id);if(isOos(p)){try{if(typeof window.toast==='function')window.toast((p.productName||'Product')+' is out of stock.')}catch(e){}return}return baseAdd.apply(this,arguments)};
    window.change=function(id,d){var p=byId(id);if(Number(d)>0&&isOos(p)){try{if(typeof window.toast==='function')window.toast((p.productName||'Product')+' is out of stock.')}catch(e){}return}return baseChange.apply(this,arguments)};
    wrapped=true;return true;
  }
  function refresh(){installWrappers();normalizeCart();schedulePatch()}
  function boot(){ensureCss();refresh();var tries=0,t=setInterval(function(){tries++;refresh();if(wrapped&&tries>8)clearInterval(t);if(tries>60)clearInterval(t)},100);var root=document.querySelector('.app')||document.body;if(root)new MutationObserver(schedulePatch).observe(root,{childList:true,subtree:true})}
  window.addEventListener('nel:catalog',refresh);
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
