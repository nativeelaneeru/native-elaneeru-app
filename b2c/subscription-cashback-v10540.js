(function(){
  if(window.NEL_SUB_CASH_V10540)return;
  window.NEL_SUB_CASH_V10540=true;

  var DATA=null,loading=false,editing=false;
  var DAYS=['SUN','MON','TUE','WED','THU','FRI','SAT'];
  function el(id){return document.getElementById(id)}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
  function digits(v){return String(v||'').replace(/\D/g,'').slice(-10)}
  function mobile(){var p={};try{p=JSON.parse(localStorage.getItem('nel_profile_v9')||'{}')}catch(e){}return digits(localStorage.getItem('nel_b2c_session_mobile')||p.mobile||'')}
  function money(v){return '₹'+Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}
  function toast(v){try{if(typeof window.toast==='function')window.toast(v);else console.log(v)}catch(e){}}
  function defaultDate(){var d=new Date();d.setDate(d.getDate()+1);return d.toISOString().slice(0,10)}
  function labelFreq(v){return String(v||'').replace(/_/g,' ').replace(/\b\w/g,function(x){return x.toUpperCase()})}
  function pct(a,b){return !Number(b)?0:Math.max(0,Math.min(100,Math.round(Number(a||0)*100/Number(b))))}

  function addStyle(){
    if(el('nelV10540Style'))return;
    var s=document.createElement('style');s.id='nelV10540Style';
    s.textContent='.nel954{margin:0 14px 10px;background:#fff;border:1px solid #e1e9e3;border-radius:20px;padding:15px;box-shadow:0 7px 22px #12351f0d}.nel954 h3{margin:0;font-size:16px}.nel954-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.nel954-badge{font-size:9px;font-weight:950;border-radius:999px;padding:6px 9px;background:#eaf7ee;color:#075b34}.nel954-note{font-size:9px;color:#6d786f;line-height:1.5;margin-top:8px}.nel954-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:11px}.nel954-box{border:1px solid #e4ebe6;background:#f8faf8;border-radius:13px;padding:10px}.nel954-box small{font-size:8px;color:#78837b;display:block}.nel954-box b{display:block;margin-top:3px;font-size:13px}.nel954-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:11px}.nel954-actions button{border:0;border-radius:11px;padding:9px 11px;font-size:10px;font-weight:950;background:#075b34;color:#fff}.nel954-actions button.alt{background:#edf7f0;color:#075b34}.nel954-form{display:grid;gap:9px;margin-top:11px}.nel954-days{display:flex;gap:6px;flex-wrap:wrap}.nel954-day{border:1px solid #d7e4da;background:#fff;color:#567061;border-radius:9px;padding:7px 8px;font-size:9px;font-weight:900}.nel954-day.on{background:#075b34;color:#fff;border-color:#075b34}.nel954-progress{height:8px;background:#e7eee9;border-radius:999px;overflow:hidden;margin:8px 0}.nel954-progress>i{display:block;height:100%;background:linear-gradient(90deg,#0b8f50,#45c879);border-radius:999px}.nel954-target{border:1px solid #e2e9e4;border-radius:14px;padding:11px;margin-top:10px}.nel954-target-head{display:flex;justify-content:space-between;gap:10px}.nel954-target strong{font-size:12px}.nel954-target span{font-size:10px;font-weight:900;color:#075b34}.nel954-wallet{background:linear-gradient(135deg,#063d26,#0b8f50);color:#fff;border-radius:15px;padding:13px;margin-top:10px;display:flex;align-items:center;justify-content:space-between}.nel954-wallet small{font-size:9px;color:#d6ebde}.nel954-wallet b{font-size:23px}.nel954-warning{background:#fff7df;border:1px solid #f1d77b;color:#6a5600;padding:9px;border-radius:11px;font-size:9px;line-height:1.45;margin-top:10px}.nel954-vac{display:grid;grid-template-columns:1fr 1fr;gap:8px}@media(max-width:430px){.nel954-grid,.nel954-vac{grid-template-columns:1fr}}';
    document.head.appendChild(s);
  }

  function ensureHosts(){
    addStyle();
    var account=el('accountPage');
    if(!account)return;
    var old=el('nelSubscriptionCard');
    if(old){old.className='nel954';}
    if(!el('nelNECashCard')){
      var cash=document.createElement('div');cash.id='nelNECashCard';cash.className='nel954';
      if(old&&old.nextSibling)account.insertBefore(cash,old.nextSibling);else account.appendChild(cash);
    }
  }

  function dayButtons(selected){
    selected=Array.isArray(selected)?selected:[];
    return DAYS.map(function(d){return '<button type="button" class="nel954-day '+(selected.indexOf(d)>=0?'on':'')+'" data-day="'+d+'">'+d.slice(0,3)+'</button>'}).join('');
  }
  function selectedDays(){return Array.prototype.slice.call(document.querySelectorAll('#nel954Days .nel954-day.on')).map(function(b){return b.dataset.day})}
  function bindDays(){var host=el('nel954Days');if(!host)return;host.querySelectorAll('.nel954-day').forEach(function(b){b.onclick=function(){b.classList.toggle('on');validateDayCount()}});validateDayCount()}
  function validateDayCount(){
    var f=el('nel954Frequency'),host=el('nel954DaysWrap');if(!f||!host)return;
    var needs=['WEEKLY','3X_WEEKLY','CUSTOM_DAYS'].indexOf(f.value)>=0;host.style.display=needs?'block':'none';
    var note=el('nel954DayHint');if(!note)return;
    if(f.value==='WEEKLY')note.textContent='Choose exactly 1 delivery day.';
    else if(f.value==='3X_WEEKLY')note.textContent='Choose exactly 3 delivery days.';
    else if(f.value==='CUSTOM_DAYS')note.textContent='Choose the days you want deliveries.';
    else note.textContent='';
  }

  function renderSubscription(){
    var host=el('nelSubscriptionCard');if(!host)return;
    var sub=DATA&&DATA.subscription,flags=DATA&&DATA.flags||{};
    if(editing||!sub){
      var f=sub&&sub.frequency||'WEEKLY',qty=sub&&sub.quantity||5,start=sub&&sub.startDate||defaultDate(),slot=sub&&sub.preferredSlot||'07:00-09:00',days=sub&&sub.deliveryDays||[];
      host.innerHTML='<div class="nel954-top"><div><h3>🥥 Smart Coconut Subscription</h3><div class="meta">Set it once. Change, pause or skip anytime.</div></div><span class="nel954-badge">'+(sub?esc(sub.status):'NEW')+'</span></div>'+
      '<div class="nel954-form"><div class="nel954-grid"><label><div class="meta">Frequency</div><select class="field" id="nel954Frequency"><option value="DAILY">Daily</option><option value="ALTERNATE_DAYS">Alternate Days</option><option value="3X_WEEKLY">3x Weekly</option><option value="WEEKLY">Weekly</option><option value="CUSTOM_DAYS">Choose Days</option></select></label><label><div class="meta">Coconuts / delivery</div><input class="field" id="nel954Qty" type="number" min="1" max="100" value="'+Number(qty)+'"></label><label><div class="meta">Start date</div><input class="field" id="nel954Start" type="date" min="'+defaultDate()+'" value="'+esc(start)+'"></label><label><div class="meta">Preferred slot</div><select class="field" id="nel954Slot"><option>07:00-09:00</option><option>09:00-12:00</option><option>12:00-15:00</option><option>15:00-18:00</option></select></label></div><div id="nel954DaysWrap"><div class="meta">Delivery days</div><div id="nel954Days" class="nel954-days">'+dayButtons(days)+'</div><div id="nel954DayHint" class="nel954-note"></div></div></div>'+
      '<div class="nel954-actions"><button id="nel954Save">'+(sub?'Save schedule':'Start subscription')+'</button>'+(sub?'<button class="alt" id="nel954CancelEdit">Cancel</button>':'')+'</div>'+
      '<div class="nel954-note">Your recurring schedule is saved. Automatic production-order creation is currently OFF, so this setup cannot place an order by itself.</div>';
      el('nel954Frequency').value=f;el('nel954Slot').value=slot;el('nel954Frequency').onchange=validateDayCount;bindDays();
      el('nel954Save').onclick=saveSubscription;if(el('nel954CancelEdit'))el('nel954CancelEdit').onclick=function(){editing=false;renderSubscription()};
      return;
    }
    var days=(sub.deliveryDays||[]).join(', ')||'—';
    host.innerHTML='<div class="nel954-top"><div><h3>🥥 Smart Coconut Subscription</h3><div class="meta">'+Number(sub.quantity)+' coconuts · '+esc(labelFreq(sub.frequency))+'</div></div><span class="nel954-badge">'+esc(sub.status)+'</span></div>'+
      '<div class="nel954-grid"><div class="nel954-box"><small>NEXT DELIVERY</small><b>'+esc(sub.nextDeliveryDate||'—')+'</b></div><div class="nel954-box"><small>DELIVERY DAYS</small><b>'+esc(days)+'</b></div><div class="nel954-box"><small>TIME SLOT</small><b>'+esc(sub.preferredSlot||'—')+'</b></div><div class="nel954-box"><small>VACATION</small><b>'+(sub.vacationFrom?esc(sub.vacationFrom+' → '+sub.vacationTo):'Not set')+'</b></div></div>'+
      '<div class="nel954-actions"><button id="nel954Edit">Edit</button>'+(String(sub.status).toUpperCase()==='PAUSED'?'<button class="alt" data-substatus="ACTIVE">Resume</button>':'<button class="alt" data-substatus="PAUSED">Pause</button>')+'<button class="alt" id="nel954Skip">Skip next</button><button class="alt" id="nel954Vacation">Vacation mode</button><button class="alt" data-substatus="CANCELLED">Cancel</button></div>'+
      '<div class="nel954-note">Automatic subscription ordering: <b>'+(flags.subscriptionAutoOrderEnabled?'ON':'OFF')+'</b>. Your schedule is ready, but no production order is created automatically while this remains OFF.</div>';
    el('nel954Edit').onclick=function(){editing=true;renderSubscription()};
    el('nel954Skip').onclick=skipNext;el('nel954Vacation').onclick=vacationPrompt;
    host.querySelectorAll('[data-substatus]').forEach(function(b){b.onclick=function(){setStatus(b.dataset.substatus)}});
  }

  function targetCard(t){
    if(!t)return '';
    var p=pct(t.achieved,t.target),status='';
    if(t.credited)status='Reward credited ✓';
    else if(t.completed)status=money(t.reward)+' earned · awaiting credit activation';
    else status=Number(t.remaining)+' more to unlock '+money(t.reward)+' NE Cash';
    return '<div class="nel954-target"><div class="nel954-target-head"><strong>'+esc(t.type==='WEEKLY'?'Weekly Target':'Monthly Target')+'</strong><span>'+Number(t.achieved)+' / '+Number(t.target)+' 🥥</span></div><div class="nel954-progress"><i style="width:'+p+'%"></i></div><div class="nel954-note">'+esc(status)+'</div></div>';
  }

  function renderCash(){
    var host=el('nelNECashCard');if(!host)return;
    var c=DATA&&DATA.neCash;
    if(!c){host.innerHTML='<h3>💚 NE Cash Rewards</h3><div class="nel954-note">Loading your targets…</div>';return}
    host.innerHTML='<div class="nel954-top"><div><h3>💚 NE Cash Rewards</h3><div class="meta">Hit your coconut targets. Unlock rewards.</div></div><span class="nel954-badge">TARGETS</span></div>'+
      '<div class="nel954-wallet"><div><small>AVAILABLE NE CASH</small><b>'+money(c.balance)+'</b></div><div style="text-align:right"><small>USE ON FUTURE ORDERS</small><b style="font-size:14px">Up to '+Number(c.maxUsePercent||0)+'%</b></div></div>'+targetCard(c.weekly)+targetCard(c.monthly)+
      (!c.autoCreditEnabled?'<div class="nel954-warning">Reward progress is live. Automatic NE Cash crediting is still OFF for launch safety, so testing cannot change a real customer wallet.</div>':'<div class="nel954-note">Completed targets are credited automatically once, using an idempotent reward key.</div>');
  }

  function render(){ensureHosts();renderSubscription();renderCash()}

  async function load(force){
    if(loading||typeof window.rpc!=='function')return;
    var m=mobile();if(!/^[6-9]\d{9}$/.test(m))return;
    if(DATA&&!force){render();return}
    loading=true;ensureHosts();renderCash();
    try{DATA=await window.rpc('getB2CSubscriptionCashbackV954',[m]);render()}
    catch(e){var h=el('nelNECashCard');if(h)h.innerHTML='<h3>💚 NE Cash Rewards</h3><div class="nel954-note">Could not load right now. Please retry.</div>'}
    finally{loading=false}
  }

  async function saveSubscription(){
    var m=mobile(),b=el('nel954Save');if(!/^[6-9]\d{9}$/.test(m))return toast('Login with your mobile number first.');
    if(b){b.disabled=true;b.textContent='Saving…'}
    try{
      var result=await window.rpc('saveB2CSubscriptionV954',[m,{productId:'TC',quantity:Number(el('nel954Qty').value||0),frequency:el('nel954Frequency').value,startDate:el('nel954Start').value,preferredSlot:el('nel954Slot').value,deliveryDays:selectedDays()}]);
      DATA=DATA||{};DATA.subscription=result.subscription;editing=false;render();toast('Subscription schedule saved ✓');
    }catch(e){toast(String(e&&e.message||e))}
    finally{if(b)b.disabled=false}
  }

  async function setStatus(status){
    if(status==='CANCELLED'&&!confirm('Cancel your coconut subscription?'))return;
    try{await window.rpc('setB2CSubscriptionStatusV954',[mobile(),status]);await load(true);toast(status==='ACTIVE'?'Subscription resumed ✓':status==='PAUSED'?'Subscription paused ✓':'Subscription cancelled')}
    catch(e){toast(String(e&&e.message||e))}
  }

  async function skipNext(){
    var sub=DATA&&DATA.subscription;if(!sub||!confirm('Skip the next scheduled delivery'+(sub.nextDeliveryDate?' on '+sub.nextDeliveryDate:'')+'?'))return;
    try{var r=await window.rpc('skipNextB2CSubscriptionV954',[mobile()]);await load(true);toast('Skipped '+r.skippedDate+' · next '+r.nextDeliveryDate)}catch(e){toast(String(e&&e.message||e))}
  }

  function vacationPrompt(){
    var host=el('nelSubscriptionCard'),sub=DATA&&DATA.subscription;if(!host||!sub)return;
    var today=defaultDate(),from=sub.vacationFrom||today,to=sub.vacationTo||today;
    host.innerHTML='<div class="nel954-top"><div><h3>🌴 Vacation Mode</h3><div class="meta">Pause scheduled deliveries while you are away.</div></div><span class="nel954-badge">SUBSCRIPTION</span></div><div class="nel954-form"><div class="nel954-vac"><label><div class="meta">Away from</div><input class="field" id="nel954VacFrom" type="date" value="'+esc(from)+'"></label><label><div class="meta">Until</div><input class="field" id="nel954VacTo" type="date" value="'+esc(to)+'"></label></div></div><div class="nel954-actions"><button id="nel954VacSave">Save vacation</button>'+(sub.vacationFrom?'<button class="alt" id="nel954VacClear">Clear vacation</button>':'')+'<button class="alt" id="nel954VacBack">Back</button></div>';
    el('nel954VacSave').onclick=saveVacation;if(el('nel954VacClear'))el('nel954VacClear').onclick=clearVacation;el('nel954VacBack').onclick=renderSubscription;
  }
  async function saveVacation(){try{await window.rpc('setB2CSubscriptionVacationV954',[mobile(),el('nel954VacFrom').value,el('nel954VacTo').value]);await load(true);toast('Vacation mode saved ✓')}catch(e){toast(String(e&&e.message||e))}}
  async function clearVacation(){try{await window.rpc('clearB2CSubscriptionVacationV954',[mobile()]);await load(true);toast('Vacation mode cleared ✓')}catch(e){toast(String(e&&e.message||e))}}

  function patchGo(){
    var base=window.go;if(typeof base!=='function'||base.__nelSubCashV10540)return typeof base==='function';
    var wrapped=function(page){var out=base.apply(this,arguments);if(page==='account'||page==='offers'||page==='orders')setTimeout(function(){load(true)},120);return out};
    try{Object.keys(base).forEach(function(k){wrapped[k]=base[k]})}catch(e){}wrapped.__nelSubCashV10540=true;wrapped.__base=base;window.go=wrapped;try{go=wrapped}catch(e){};return true;
  }

  function start(){
    ensureHosts();var tries=0;(function wait(){patchGo();if(typeof window.rpc==='function'){setTimeout(function(){load(true)},250);return}if(++tries<240)setTimeout(wait,50)})();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  window.NEL_SUB_CASH_V954_REFRESH=function(){return load(true)};
})();
