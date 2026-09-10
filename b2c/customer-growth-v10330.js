(function(){
  if(window.NEL_B2C_GROWTH_V10330)return;
  window.NEL_B2C_GROWTH_V10330=true;

  var DATA=null,loading=false,editing=false;
  var REF_KEY='nel_referral_pending_v910';

  function el(id){return document.getElementById(id)}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
  function digits(v){return String(v||'').replace(/\D/g,'').slice(-10)}
  function mobile(){
    var p={};try{p=JSON.parse(localStorage.getItem('nel_profile_v9')||'{}')}catch(e){}
    return digits(localStorage.getItem('nel_b2c_session_mobile')||p.mobile||'');
  }
  function money(v){return '₹'+Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}
  function toast(v){try{if(typeof window.toast==='function')window.toast(v)}catch(e){}}

  function captureReferral(){
    try{
      var code=String(new URLSearchParams(location.search).get('ref')||'').trim().toUpperCase();
      if(/^NEL[A-Z0-9]{8}$/.test(code))localStorage.setItem(REF_KEY,code);
    }catch(e){}
  }
  captureReferral();

  function style(){
    if(el('nelGrowthStyle'))return;
    var s=document.createElement('style');s.id='nelGrowthStyle';
    s.textContent='.nel-growth-card{margin:0 14px 10px;background:#fff;border:1px solid var(--line);border-radius:18px;padding:14px;box-shadow:0 6px 18px #172d1f0d}.nel-growth-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.nel-growth-head b{font-size:15px}.nel-growth-badge{display:inline-flex;padding:5px 8px;border-radius:999px;background:#eaf7ee;color:var(--g);font-size:9px;font-weight:900}.nel-growth-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.nel-growth-actions button{border:0;border-radius:10px;padding:9px 11px;background:var(--g);color:#fff;font-size:10px;font-weight:900}.nel-growth-actions .alt{background:#edf7f0;color:var(--g)}.nel-growth-form{display:grid;gap:8px;margin-top:11px}.nel-growth-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.nel-growth-code{display:flex;align-items:center;justify-content:space-between;gap:9px;margin-top:10px;padding:11px;border-radius:12px;background:#edf7f0}.nel-growth-code strong{font-size:17px;letter-spacing:.5px;color:var(--g)}.nel-growth-note{font-size:9px;color:#6d786f;line-height:1.45;margin-top:8px}.nel-growth-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:10px}.nel-growth-stat{padding:9px;border:1px solid #e3ebe6;border-radius:11px;background:#f8faf8}.nel-growth-stat small{display:block;color:#78837b;font-size:8px}.nel-growth-stat b{display:block;font-size:15px;margin-top:2px}@media(max-width:430px){.nel-growth-grid{grid-template-columns:1fr}}';
    document.head.appendChild(s);
  }

  function fmtFrequency(v){
    return String(v||'').replace(/_/g,' ').replace(/\b\w/g,function(x){return x.toUpperCase()});
  }
  function defaultDate(){
    var d=new Date();d.setDate(d.getDate()+1);return d.toISOString().slice(0,10);
  }

  function ensureHosts(){
    style();
    var account=el('accountPage');
    if(account&&!el('nelSubscriptionCard')){
      var sub=document.createElement('div');sub.id='nelSubscriptionCard';sub.className='nel-growth-card';
      var help=Array.prototype.slice.call(account.querySelectorAll('.card')).find(function(x){return /Need help/i.test(x.textContent||'')});
      if(help)account.insertBefore(sub,help);else account.appendChild(sub);
    }
    if(account&&!el('nelReferralCard')){
      var ref=document.createElement('div');ref.id='nelReferralCard';ref.className='nel-growth-card';
      var logout=Array.prototype.slice.call(account.querySelectorAll('button')).find(function(x){return /log out/i.test(x.textContent||'')});
      if(logout)account.insertBefore(ref,logout);else account.appendChild(ref);
    }
    var offers=el('offersPage');
    if(offers&&!el('nelReferralOffer')){
      var offer=document.createElement('div');offer.id='nelReferralOffer';offer.className='nel-growth-card';
      var firstSection=offers.querySelector('.section');
      if(firstSection&&firstSection.nextSibling)offers.insertBefore(offer,firstSection.nextSibling);else offers.appendChild(offer);
      offer.innerHTML='<div class="nel-growth-head"><div><b>🎁 Refer & Earn</b><div class="meta">Invite friends to Native Elaneeru.</div></div></div><div class="nel-growth-actions"><button type="button" onclick="window.NEL_GROWTH_V910_OPEN_REFERRAL()">View my referral code</button></div>';
    }
  }

  function renderSubscription(){
    var host=el('nelSubscriptionCard');if(!host)return;
    var sub=DATA&&DATA.subscription;
    if(editing||!sub){
      var frequency=sub&&sub.frequency||'WEEKLY',qty=sub&&sub.quantity||5,start=defaultDate(),slot=sub&&sub.preferredSlot||'07:00-09:00';
      host.innerHTML='<div class="nel-growth-head"><div><b>🥥 Coconut Subscription</b><div class="meta">Set your recurring coconut requirement.</div></div><span class="nel-growth-badge">'+(sub?esc(sub.status):'NEW')+'</span></div>'+
        '<div class="nel-growth-form"><div class="nel-growth-grid"><div><div class="meta">Frequency</div><select id="nelSubFrequency" class="field"><option value="DAILY">Daily</option><option value="ALTERNATE_DAYS">Alternate Days</option><option value="3X_WEEKLY">3x Weekly</option><option value="WEEKLY">Weekly</option></select></div><div><div class="meta">Coconuts / delivery</div><input id="nelSubQty" class="field" type="number" min="1" max="100" value="'+Number(qty)+'"></div><div><div class="meta">Start date</div><input id="nelSubStart" class="field" type="date" min="'+defaultDate()+'" value="'+start+'"></div><div><div class="meta">Preferred slot</div><select id="nelSubSlot" class="field"><option>07:00-09:00</option><option>09:00-12:00</option><option>12:00-15:00</option><option>15:00-18:00</option></select></div></div></div>'+
        '<div class="nel-growth-actions"><button type="button" id="nelSubSave">'+(sub?'Save changes':'Start subscription')+'</button>'+(sub?'<button type="button" class="alt" id="nelSubCancelEdit">Cancel</button>':'')+'</div><div class="nel-growth-note">Your recurring schedule is saved safely. Automatic production orders are not generated yet; Native Elaneeru will enable that only after recurring-order rules are approved.</div>';
      var f=el('nelSubFrequency');if(f)f.value=frequency;
      var sl=el('nelSubSlot');if(sl)sl.value=slot;
      if(el('nelSubSave'))el('nelSubSave').onclick=saveSubscription;
      if(el('nelSubCancelEdit'))el('nelSubCancelEdit').onclick=function(){editing=false;renderSubscription()};
      return;
    }
    host.innerHTML='<div class="nel-growth-head"><div><b>🥥 Coconut Subscription</b><div class="meta">'+Number(sub.quantity)+' coconuts · '+esc(fmtFrequency(sub.frequency))+'</div></div><span class="nel-growth-badge">'+esc(sub.status)+'</span></div><div class="nel-growth-stats"><div class="nel-growth-stat"><small>START</small><b>'+esc(sub.startDate||'—')+'</b></div><div class="nel-growth-stat"><small>NEXT</small><b>'+esc(sub.nextDeliveryDate||'—')+'</b></div><div class="nel-growth-stat"><small>SLOT</small><b style="font-size:11px">'+esc(sub.preferredSlot||'—')+'</b></div></div><div class="nel-growth-actions"><button type="button" id="nelSubEdit">Edit</button>'+(String(sub.status).toUpperCase()==='PAUSED'?'<button type="button" class="alt" data-status="ACTIVE">Resume</button>':'<button type="button" class="alt" data-status="PAUSED">Pause</button>')+'<button type="button" class="alt" data-status="CANCELLED">Cancel subscription</button></div><div class="nel-growth-note">Automatic production orders are currently OFF for subscriptions.</div>';
    if(el('nelSubEdit'))el('nelSubEdit').onclick=function(){editing=true;renderSubscription()};
    host.querySelectorAll('[data-status]').forEach(function(b){b.onclick=function(){setSubscriptionStatus(b.dataset.status)}});
  }

  function renderReferral(){
    var host=el('nelReferralCard');if(!host)return;
    var r=DATA&&DATA.referral;
    if(!r){host.innerHTML='<b>🎁 Refer & Earn</b><div class="meta" style="margin-top:5px">Loading your referral code…</div>';return}
    var reward=r.rewardConfigured?('You earn '+money(r.referrerReward)+(Number(r.referredReward)>0?' · Friend gets '+money(r.referredReward):'')):'Reward amount will appear here when configured by Native Elaneeru.';
    host.innerHTML='<div class="nel-growth-head"><div><b>🎁 Refer & Earn</b><div class="meta">'+esc(reward)+'</div></div><span class="nel-growth-badge">ACTIVE</span></div><div class="nel-growth-code"><div><div class="meta">Your referral code</div><strong>'+esc(r.code)+'</strong></div><button type="button" class="mini" id="nelCopyRef">Copy</button></div><div class="nel-growth-stats"><div class="nel-growth-stat"><small>REFERRED</small><b>'+Number(r.total||0)+'</b></div><div class="nel-growth-stat"><small>QUALIFIED</small><b>'+Number(r.qualified||0)+'</b></div><div class="nel-growth-stat"><small>REWARDED</small><b>'+Number(r.rewarded||0)+'</b></div></div><div class="nel-growth-actions"><button type="button" id="nelShareRef">Share invite</button><button type="button" class="alt" id="nelWhatsAppRef">WhatsApp</button></div>';
    if(el('nelCopyRef'))el('nelCopyRef').onclick=function(){copyText(r.code)};
    if(el('nelShareRef'))el('nelShareRef').onclick=function(){shareReferral(r)};
    if(el('nelWhatsAppRef'))el('nelWhatsAppRef').onclick=function(){window.open('https://wa.me/?text='+encodeURIComponent(referralText(r)),'_blank')};
  }

  function render(){ensureHosts();renderSubscription();renderReferral()}

  function referralText(r){
    var reward=r.rewardConfigured&&Number(r.referredReward)>0?' You can get '+money(r.referredReward)+' after qualifying.':'';
    return 'Order fresh tender coconuts from Native Elaneeru.'+reward+' Use my referral code '+r.code+': '+r.shareUrl;
  }
  function copyText(text){
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){toast('Referral code copied ✓')}).catch(function(){toast('Copy failed')});return}
    var t=document.createElement('textarea');t.value=text;document.body.appendChild(t);t.select();try{document.execCommand('copy');toast('Referral code copied ✓')}catch(e){toast('Copy failed')}t.remove();
  }
  function shareReferral(r){
    var text=referralText(r);
    if(navigator.share){navigator.share({title:'Native Elaneeru',text:text,url:r.shareUrl}).catch(function(){})}
    else copyText(r.shareUrl);
  }

  async function saveSubscription(){
    var m=mobile();if(!/^[6-9]\d{9}$/.test(m))return toast('Login with your mobile number first.');
    var b=el('nelSubSave');if(b){b.disabled=true;b.textContent='Saving…'}
    try{
      var result=await window.rpc('saveB2CSubscriptionV910',[m,{productId:'TC',quantity:Number(el('nelSubQty').value||0),frequency:el('nelSubFrequency').value,startDate:el('nelSubStart').value,preferredSlot:el('nelSubSlot').value}]);
      DATA=DATA||{};DATA.subscription=result.subscription;editing=false;renderSubscription();toast('Subscription saved ✓');
    }catch(e){toast(String(e&&e.message||e))}
    finally{if(b&&!editing){b.disabled=false}}
  }

  async function setSubscriptionStatus(status){
    var m=mobile();
    if(status==='CANCELLED'&&!confirm('Cancel your coconut subscription?'))return;
    try{await window.rpc('setB2CSubscriptionStatusV910',[m,status]);await load(true);toast(status==='ACTIVE'?'Subscription resumed ✓':status==='PAUSED'?'Subscription paused':'Subscription cancelled')}
    catch(e){toast(String(e&&e.message||e))}
  }

  async function registerPendingReferral(){
    var m=mobile(),code='';try{code=localStorage.getItem(REF_KEY)||''}catch(e){}
    if(!/^[6-9]\d{9}$/.test(m)||!/^NEL[A-Z0-9]{8}$/.test(code))return;
    try{
      await window.rpc('registerB2CReferralV910',[m,code]);
      localStorage.removeItem(REF_KEY);
      toast('Referral code applied ✓');
    }catch(e){
      var msg=String(e&&e.message||e||'');
      if(/own referral|not active|invalid referral/i.test(msg))localStorage.removeItem(REF_KEY);
    }
  }

  async function load(force){
    if(loading)return;
    if(DATA&&!force){render();return}
    if(typeof window.rpc!=='function')return;
    var m=mobile();if(!/^[6-9]\d{9}$/.test(m))return;
    loading=true;ensureHosts();renderReferral();
    try{
      await registerPendingReferral();
      DATA=await window.rpc('getB2CCustomerGrowthV910',[m]);
      render();
    }catch(e){
      var host=el('nelReferralCard');if(host)host.innerHTML='<b>🎁 Refer & Earn</b><div class="meta" style="margin-top:5px">Could not load right now. Open Account and retry.</div>';
    }finally{loading=false}
  }

  function openReferral(){
    if(typeof window.go==='function')window.go('account');
    setTimeout(function(){var h=el('nelReferralCard');if(h)h.scrollIntoView({behavior:'smooth',block:'center'});load(false)},80);
  }
  window.NEL_GROWTH_V910_OPEN_REFERRAL=openReferral;

  function inheritFlags(wrapped,base){try{Object.keys(base).forEach(function(k){wrapped[k]=base[k]})}catch(e){}}
  function patchGo(){
    var base=window.go;if(typeof base!=='function'||base.__nelGrowthV910)return typeof base==='function';
    var wrapped=function(page){var result=base.apply(this,arguments);if(page==='account'||page==='offers')setTimeout(function(){ensureHosts();load(false)},40);return result};
    inheritFlags(wrapped,base);wrapped.__nelGrowthV910=true;wrapped.__base=base;window.go=wrapped;try{go=wrapped}catch(e){};return true;
  }

  function start(){
    ensureHosts();
    var tries=0;(function wait(){patchGo();if(typeof window.rpc==='function'){load(false);return}if(++tries<240)setTimeout(wait,50)})();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
