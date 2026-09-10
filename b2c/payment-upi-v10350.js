(function(){
  if(window.NEL_DIRECT_UPI_V10350)return;
  window.NEL_DIRECT_UPI_V10350=true;

  var state={cfg:null,method:'COD',intent:null,payloadKey:'',loading:false};
  function el(id){return document.getElementById(id)}
  function money(v){return '₹'+Number(v||0).toLocaleString('en-IN',{minimumFractionDigits:0,maximumFractionDigits:2})}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function toast(v){try{if(typeof window.toast==='function')window.toast(v)}catch(e){}}
  function total(){try{return typeof window.cartTotal==='function'?Number(window.cartTotal()||0):0}catch(e){return 0}}
  function payloadKey(payload){
    try{
      var p=payload||{};
      return JSON.stringify({mobile:p.mobile,items:p.items,fulfilmentType:p.fulfilmentType,address:p.address,area:p.area,pincode:p.pincode,latitude:p.latitude,longitude:p.longitude,timeSlot:p.timeSlot,cashbackUsed:p.cashbackUsed||0});
    }catch(e){return String(Date.now())}
  }

  function addStyle(){
    if(el('nelUpiStyle'))return;
    var s=document.createElement('style');s.id='nelUpiStyle';
    s.textContent='\
      #nelPaymentBox{margin:11px 0 0;padding:12px;border:1px solid #dfe8e2;border-radius:14px;background:#fff}\
      .nelPayTitle{font-size:12px;font-weight:950;color:#172019;margin-bottom:8px}.nelPayMethods{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.nelPayMethod{border:1.5px solid #dfe8e2;background:#fff;color:#405047;border-radius:12px;padding:10px;font-size:11px;font-weight:900;text-align:left;cursor:pointer}.nelPayMethod.on{border-color:#075b34;background:#edf8f1;color:#075b34}.nelPayMethod small{display:block;font-size:9px;font-weight:650;color:#748078;margin-top:3px}.nelUpiPanel{margin-top:10px;padding:11px;border-radius:12px;background:#f5faf6;border:1px solid #dfeae2}.nelUpiLine{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:5px 0;font-size:10px}.nelUpiLine b{font-size:11px;overflow-wrap:anywhere}.nelUpiActions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px}.nelUpiBtn{display:block;text-align:center;text-decoration:none;border:0;border-radius:10px;padding:9px;background:#075b34;color:#fff;font-size:10px;font-weight:900;cursor:pointer}.nelUpiBtn.alt{background:#e5f2e9;color:#075b34}.nelUtr{width:100%;border:1px solid #cfdad2;border-radius:10px;padding:10px;margin-top:9px;font-size:11px;background:#fff}.nelUpiNote{font-size:9px;line-height:1.45;color:#66736b;margin-top:7px}.nelUpiAmount{font-size:20px;font-weight:950;color:#075b34}\
    ';
    document.head.appendChild(s);
  }

  function ensureUi(){
    addStyle();
    var host=el('checkout');if(!host||el('nelPaymentBox'))return;
    var box=document.createElement('div');box.id='nelPaymentBox';
    var place=el('placeBtn');
    if(place&&place.parentNode===host)host.insertBefore(box,place);else host.appendChild(box);
    render();
  }

  function render(){
    ensureUi();var box=el('nelPaymentBox');if(!box)return;
    var upi=!!(state.cfg&&state.cfg.upiEnabled&&state.cfg.upiId);
    var methods='<button type="button" class="nelPayMethod '+(state.method==='COD'?'on':'')+'" data-pay="COD">Cash on Delivery<small>Pay when your order arrives</small></button>';
    if(upi)methods+='<button type="button" class="nelPayMethod '+(state.method==='UPI'?'on':'')+'" data-pay="UPI">Pay via UPI<small>Direct to Native Elaneeru</small></button>';
    var panel='';
    if(upi&&state.method==='UPI'){
      if(state.intent){
        panel='<div class="nelUpiPanel"><div class="nelUpiLine"><span>Pay exactly</span><span class="nelUpiAmount">'+money(state.intent.amount)+'</span></div><div class="nelUpiLine"><span>UPI ID</span><b>'+esc(state.intent.upiId)+'</b></div><div class="nelUpiLine"><span>Account</span><b>'+esc(state.intent.upiName)+'</b></div><div class="nelUpiActions"><button type="button" class="nelUpiBtn alt" id="nelCopyUpi">Copy UPI ID</button><a class="nelUpiBtn" id="nelOpenUpi" href="'+esc(state.intent.upiUri)+'">Open UPI app</a></div><input class="nelUtr" id="nelUpiUtr" inputmode="numeric" autocomplete="off" placeholder="Enter UTR / transaction ID after payment"><div class="nelUpiNote">Payment will remain <b>Verification Pending</b> until we verify the UTR. Do not pay twice if the app is slow.</div></div>';
      }else{
        panel='<div class="nelUpiPanel"><div class="nelUpiLine"><span>Merchant UPI ID</span><b>'+esc(state.cfg.upiId)+'</b></div><div class="nelUpiNote">Tap <b>Prepare UPI payment</b> below. We will first confirm the live cart amount on the server, then show the exact amount to pay.</div></div>';
      }
    }
    box.innerHTML='<div class="nelPayTitle">Payment method</div><div class="nelPayMethods">'+methods+'</div>'+panel;
    Array.prototype.forEach.call(box.querySelectorAll('[data-pay]'),function(b){b.onclick=function(){select(String(b.getAttribute('data-pay')||'COD'))}});
    var copy=el('nelCopyUpi');if(copy)copy.onclick=function(){
      var value=state.intent&&state.intent.upiId||'';
      if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(value).then(function(){toast('UPI ID copied ✓')}).catch(function(){fallbackCopy(value)});else fallbackCopy(value);
    };
    refreshButton();
  }

  function fallbackCopy(value){
    var t=document.createElement('textarea');t.value=value;document.body.appendChild(t);t.select();
    try{document.execCommand('copy');toast('UPI ID copied ✓')}catch(e){toast('Copy failed')}
    t.remove();
  }

  function select(method){
    method=String(method||'COD').toUpperCase();
    if(method==='UPI'&&!(state.cfg&&state.cfg.upiEnabled))return;
    if(method!==state.method){state.method=method;state.intent=null;state.payloadKey=''}
    render();
  }

  function reset(){state.method='COD';state.intent=null;state.payloadKey='';render()}

  function refreshButton(){
    var b=el('placeBtn');if(!b||b.dataset.nel127Busy==='1')return;
    var t=total();
    if(state.method==='UPI'&&state.cfg&&state.cfg.upiEnabled){
      b.textContent=(state.intent?'I\'ve paid · Submit order · ':'Prepare UPI payment · ')+money(t);
    }else b.textContent='Place order · '+money(t);
  }

  async function loadConfig(){
    if(state.loading||state.cfg)return state.cfg;
    state.loading=true;
    try{
      if(typeof window.rpc!=='function')throw new Error('RPC unavailable');
      var cfg=await window.rpc('getB2CPaymentConfigV913',[]);
      state.cfg=cfg&&cfg.ok!==false?cfg:{upiEnabled:false,methods:['COD']};
    }catch(e){state.cfg={upiEnabled:false,methods:['COD']}}
    finally{state.loading=false;render()}
    return state.cfg;
  }

  async function beforeOrder(payload){
    await loadConfig();
    if(state.method!=='UPI')return {method:'COD'};
    if(!(state.cfg&&state.cfg.upiEnabled&&state.cfg.upiId))throw new Error('UPI payment is not configured yet. Please choose Cash on Delivery.');
    var key=payloadKey(payload);
    if(!state.intent||state.payloadKey!==key){
      var intent=await window.rpc('prepareB2CUpiPaymentV913',[payload]);
      if(!intent||!intent.paymentId||!intent.upiUri)throw new Error('Could not prepare UPI payment. Please use Cash on Delivery.');
      state.intent=intent;state.payloadKey=key;render();
      toast('UPI payment ready. Pay '+money(intent.amount)+' and enter the UTR.');
      return {stop:true,prepared:true,paymentId:intent.paymentId};
    }
    var utr=String(el('nelUpiUtr')&&el('nelUpiUtr').value||'').replace(/\s+/g,'');
    if(!/^[A-Za-z0-9-]{6,40}$/.test(utr))throw new Error('After paying, enter the UPI transaction/UTR number.');
    return {method:'UPI',paymentId:state.intent.paymentId,utr:utr,amount:Number(state.intent.amount||0)};
  }

  function start(){
    ensureUi();
    var tries=0;(function wait(){
      ensureUi();
      if(typeof window.rpc==='function'){loadConfig();return}
      if(++tries<160)setTimeout(wait,100);
    })();
    document.addEventListener('click',function(){setTimeout(refreshButton,0)});
    window.addEventListener('focus',refreshButton);
  }

  window.NEL_PAYMENT={beforeOrder:beforeOrder,reset:reset,refreshButton:refreshButton,getMethod:function(){return state.method},getConfig:function(){return state.cfg},getIntent:function(){return state.intent}};
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();
