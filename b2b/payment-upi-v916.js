(function(){
  if(window.NEL_B2B_PAYMENT_UPI_V916)return;
  window.NEL_B2B_PAYMENT_UPI_V916=true;
  var patched=false,intent=null;

  function el(id){return document.getElementById(id)}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
  function money(n){return '₹'+Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}
  function note(){
    var select=el('payment');if(!select)return;
    var host=el('nelB2BPaymentNote');
    if(!host){host=document.createElement('div');host.id='nelB2BPaymentNote';host.className='muted';host.style.cssText='margin-top:6px;padding:8px 9px;border-radius:10px;background:#edf4f7';select.insertAdjacentElement('afterend',host)}
    var value=String(select.value||'').toUpperCase();
    host.textContent=value==='UPI'?'Direct UPI: pay the exact server amount and submit the UTR. Payment stays verification-pending until Admin confirms it.':value==='CREDIT'?'Credit uses your approved available credit limit.':'Cash on Delivery: payment is collected against the order.';
  }
  function syncMethods(){
    var select=el('payment');if(!select)return;
    var cfg=null;try{cfg=DATA&&DATA.payment}catch(e){}
    var methods=cfg&&Array.isArray(cfg.methods)&&cfg.methods.length?cfg.methods:['COD'];
    var current=String(select.value||'').toUpperCase();
    var preferred=cfg?String(cfg.preferredMethod||'').toUpperCase():'';
    select.innerHTML=methods.map(function(x){return '<option value="'+esc(x)+'">'+esc(x==='UPI'?'UPI · Pay online':x)+'</option>'}).join('');
    if(methods.indexOf(current)>=0)select.value=current;else if(methods.indexOf(preferred)>=0)select.value=preferred;else select.value=methods[0];
    if(!select.__nel916){select.addEventListener('change',note);select.__nel916=true}
    note();
  }
  function installSheet(){
    if(el('nelB2BUpiSheet'))return;
    var style=document.createElement('style');
    style.textContent='.nel916Sheet{position:fixed;inset:0;background:#0009;z-index:150;display:none;align-items:flex-end}.nel916Sheet.show{display:flex}.nel916Box{width:100%;max-width:820px;margin:auto;background:#fff;border-radius:24px 24px 0 0;padding:14px 15px calc(18px + env(safe-area-inset-bottom));max-height:88vh;overflow:auto}.nel916Row{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid #dbe3ea}.nel916Upi{font-size:18px;font-weight:950;color:#123a5a;word-break:break-all}.nel916Warn{font-size:11px;line-height:1.45;background:#fff7db;border:1px solid #f0dfa4;color:#745400;border-radius:11px;padding:9px;margin:10px 0}.nel916Actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}@media(max-width:460px){.nel916Actions{grid-template-columns:1fr}}';
    document.head.appendChild(style);
    var sheet=document.createElement('div');sheet.id='nelB2BUpiSheet';sheet.className='nel916Sheet';
    sheet.innerHTML='<div class="nel916Box"><div class="grab"></div><div class="sectionHead" style="margin-top:0"><h2>Pay via UPI</h2><button id="nel916Close" class="mini">Close</button></div><div class="nel916Row"><span class="muted">Amount</span><b id="nel916Amount"></b></div><div class="nel916Row"><span class="muted">Pay to</span><div style="text-align:right"><div id="nel916Name" style="font-weight:900"></div><div id="nel916Upi" class="nel916Upi"></div></div></div><div class="nel916Actions"><button id="nel916Copy" class="secondary">Copy UPI ID</button><a id="nel916Open" class="primary" style="text-decoration:none;text-align:center" href="#">Open UPI App</a></div><div class="nel916Warn">After payment, enter the UTR / transaction reference below. Native Elaneeru will keep this payment as <b>Verification Pending</b> until Admin verifies it.</div><label class="muted">UPI transaction / UTR number</label><input id="nel916Utr" class="field" inputmode="text" autocomplete="off" placeholder="Enter transaction reference" style="margin-top:5px"><button id="nel916Submit" class="primary" style="width:100%;margin-top:10px">Submit payment & place order</button><div id="nel916Msg" class="muted" style="margin-top:8px"></div></div>';
    document.body.appendChild(sheet);
    el('nel916Close').onclick=closeSheet;
    el('nel916Copy').onclick=function(){var text=intent&&intent.upiId||'';if(!text)return; if(navigator.clipboard)navigator.clipboard.writeText(text).then(function(){if(typeof toast==='function')toast('UPI ID copied')});else prompt('Copy UPI ID',text)};
    el('nel916Submit').onclick=submitUpi;
  }
  function closeSheet(){var s=el('nelB2BUpiSheet');if(s)s.classList.remove('show')}
  function payload(){
    var items=[];try{items=Object.values(CART||{}).map(function(x){return {productId:x.product.productId,quantity:x.qty}})}catch(e){}
    return {items:items,deliverySlot:el('slot')?el('slot').value:'',deliveryAddress:DATA&&DATA.vendor?DATA.vendor.address:'',area:DATA&&DATA.vendor?DATA.vendor.area:''};
  }
  async function startUpi(){
    var p=payload();if(!p.items.length){if(typeof toast==='function')toast('Cart is empty');return}
    var btn=null;try{btn=el('cartSheet').querySelector('.primary[onclick="placeOrder()"]')}catch(e){}
    if(btn)btn.disabled=true;
    try{
      var r=await rpc('prepareB2BUpiPaymentV916',[TOKEN,p]);
      intent={paymentId:r.paymentId,amount:r.amount,upiId:r.upiId,upiName:r.upiName,upiUri:r.upiUri,payload:p};
      installSheet();el('nel916Amount').textContent=money(r.amount);el('nel916Name').textContent=r.upiName||'';el('nel916Upi').textContent=r.upiId||'';el('nel916Open').href=r.upiUri||'#';el('nel916Utr').value='';el('nel916Msg').textContent='Payment reference: '+r.paymentId;el('nelB2BUpiSheet').classList.add('show');
    }catch(e){if(typeof toast==='function')toast(e.message||String(e))}finally{if(btn)btn.disabled=false}
  }
  async function submitUpi(){
    if(!intent)return;
    var utr=String(el('nel916Utr').value||'').replace(/\s+/g,'');
    if(utr.length<6){el('nel916Msg').textContent='Enter a valid UPI transaction / UTR number.';return}
    var b=el('nel916Submit');b.disabled=true;b.textContent='Submitting…';
    try{
      var r=await rpc('submitB2BUpiOrderV916',[TOKEN,intent.paymentId,utr,intent.payload]);
      try{CART={}}catch(e){}
      try{if(window.NEL_B2B_DB&&typeof window.NEL_B2B_DB.clearCart==='function')await window.NEL_B2B_DB.clearCart()}catch(e){}
      try{localStorage.removeItem('nel_b2b_cart_v113')}catch(e){}
      closeSheet();if(typeof closeCart==='function')closeCart();if(typeof toast==='function')toast('Order placed · payment verification pending');
      if(typeof refresh==='function')await refresh();if(typeof showView==='function')showView('orders');intent=null;
    }catch(e){el('nel916Msg').textContent=e.message||String(e);if(typeof toast==='function')toast(e.message||String(e))}finally{b.disabled=false;b.textContent='Submit payment & place order'}
  }
  function patch(){
    if(patched)return true;
    if(typeof window.renderCart!=='function'||typeof window.placeOrder!=='function')return false;
    var baseRender=window.renderCart;
    var renderWrapped=function(){var r=baseRender.apply(this,arguments);setTimeout(syncMethods,0);return r};
    renderWrapped.__nel916=true;window.renderCart=renderWrapped;try{renderCart=renderWrapped}catch(e){}
    var basePlace=window.placeOrder;
    var placeWrapped=function(){var pay=String(el('payment')&&el('payment').value||'COD').toUpperCase();if(pay==='UPI')return startUpi();return basePlace.apply(this,arguments)};
    placeWrapped.__nel916=true;window.placeOrder=placeWrapped;try{placeOrder=placeWrapped}catch(e){}
    patched=true;setTimeout(syncMethods,0);return true;
  }
  function start(){installSheet();var tries=0;(function wait(){if(!patch()&&++tries<240)setTimeout(wait,50)})();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();