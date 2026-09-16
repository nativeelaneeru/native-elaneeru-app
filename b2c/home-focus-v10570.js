(function(){
  if(window.NEL_HOME_FOCUS_V10570)return;
  window.NEL_HOME_FOCUS_V10570=true;

  var DATA=null,loading=false;
  function el(id){return document.getElementById(id)}
  function digits(v){return String(v||'').replace(/\D/g,'').slice(-10)}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
  function money(v){return '₹'+Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}
  function mobile(){var p={};try{p=JSON.parse(localStorage.getItem('nel_profile_v9')||'{}')}catch(e){}return digits(localStorage.getItem('nel_b2c_session_mobile')||p.mobile||'')}
  function labelFreq(v){return String(v||'').replace(/_/g,' ').replace(/\b\w/g,function(x){return x.toUpperCase()})}

  function addStyle(){
    if(el('nelHomeFocus10570Style'))return;
    var s=document.createElement('style');s.id='nelHomeFocus10570Style';
    s.textContent=`
      .nel-home-plan{margin:12px 14px 8px;border:1px solid #dce7df;background:linear-gradient(135deg,#f7fbf8,#fff8e8);border-radius:20px;padding:15px;box-shadow:0 8px 24px #0d3d2410}
      .nel-home-plan-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
      .nel-home-plan-kicker{font-size:10px;font-weight:950;letter-spacing:.45px;color:#0b8f50;text-transform:uppercase}
      .nel-home-plan h2{font-size:19px;line-height:1.1;margin:4px 0 5px;letter-spacing:-.25px}
      .nel-home-plan p{font-size:12px;line-height:1.45;color:#68746b;margin:0}
      .nel-home-plan-badge{background:#eaf7ee;color:#075b34;border-radius:999px;padding:6px 9px;font-size:10px;font-weight:950;white-space:nowrap}
      .nel-home-plan-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
      .nel-home-plan-stat{background:#fff;border:1px solid #e5ece7;border-radius:13px;padding:10px}
      .nel-home-plan-stat small{display:block;font-size:9px;color:#78827b;font-weight:850;letter-spacing:.2px}
      .nel-home-plan-stat b{display:block;font-size:13px;color:#183123;margin-top:3px;line-height:1.25}
      .nel-home-plan-action{margin-top:12px;width:100%;min-height:46px;border:0;border-radius:13px;background:#075b34;color:#fff;font-weight:950;font-size:13px}
      .nel-home-plan-link{margin-top:8px;text-align:center;font-size:10px;color:#6d786f}
      #homePage.nel-home-focused>.section.nel-primary-section{margin-top:14px}
      #homePage.nel-home-focused .nel-primary-section h2{font-size:19px}
      #homePage.nel-home-focused #homeProducts{margin-bottom:4px}
      #homePage.nel-home-focused>.promo{margin-top:16px;border-radius:22px;margin-left:14px;margin-right:14px;min-height:150px;padding:18px}
      #homePage.nel-home-focused>.promo:after{font-size:74px;top:22px}
      #homePage.nel-home-focused>.promo h1{font-size:25px;width:68%}
      #homePage.nel-home-focused>.promo p{font-size:12px;width:68%}
      #homePage.nel-home-focused>.dealRail{padding-top:10px}
      .nel-home-reward-summary{font-weight:950;color:#fff}
      @media(max-width:430px){.nel-home-plan{margin-top:10px}.nel-home-plan-grid{grid-template-columns:1fr 1fr}#homePage.nel-home-focused>.promo{margin-left:12px;margin-right:12px}.nel-home-plan h2{font-size:18px}}
      @media(max-width:340px){.nel-home-plan-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  function goAccount(){
    if(typeof window.go==='function')window.go('account');
    setTimeout(function(){var a=el('nelSubscriptionCard');if(a&&a.scrollIntoView)a.scrollIntoView({behavior:'smooth',block:'start'})},120);
  }

  function ensurePlanCard(){
    var home=el('homePage');if(!home)return null;
    var card=el('nelHomePlanCard');
    if(!card){card=document.createElement('section');card.id='nelHomePlanCard';card.className='nel-home-plan';home.insertBefore(card,home.firstChild)}
    return card;
  }

  function renderPlan(){
    var card=ensurePlanCard();if(!card)return;
    var sub=DATA&&DATA.subscription;
    var valid=sub&&String(sub.status||'').toUpperCase()!=='CANCELLED';
    if(valid){
      var active=String(sub.status||'ACTIVE').toUpperCase();
      var next=sub.nextDeliveryDate||'Schedule ready';
      card.innerHTML='<div class="nel-home-plan-top"><div><div class="nel-home-plan-kicker">Your Coconut Plan</div><h2>'+(active==='PAUSED'?'Subscription paused':'Next delivery · '+esc(next))+'</h2><p>'+Number(sub.quantity||0)+' coconuts · '+esc(labelFreq(sub.frequency||''))+' · '+esc(sub.preferredSlot||'Preferred slot')+'</p></div><span class="nel-home-plan-badge">'+esc(active)+'</span></div><div class="nel-home-plan-grid"><div class="nel-home-plan-stat"><small>NEXT DELIVERY</small><b>'+esc(next)+'</b></div><div class="nel-home-plan-stat"><small>QUANTITY</small><b>'+Number(sub.quantity||0)+' coconuts</b></div></div><button class="nel-home-plan-action" id="nelHomePlanAction">Manage subscription</button><div class="nel-home-plan-link">Pause, skip, change quantity or use vacation mode anytime.</div>';
    }else{
      card.innerHTML='<div class="nel-home-plan-top"><div><div class="nel-home-plan-kicker">Smart Coconut Subscription</div><h2>Set your coconut routine once</h2><p>Choose daily, alternate days, weekly or your own delivery days. Pause or skip whenever you need.</p></div><span class="nel-home-plan-badge">FLEXIBLE</span></div><div class="nel-home-plan-grid"><div class="nel-home-plan-stat"><small>YOU CONTROL</small><b>Days & quantity</b></div><div class="nel-home-plan-stat"><small>FLEXIBILITY</small><b>Pause / Skip anytime</b></div></div><button class="nel-home-plan-action" id="nelHomePlanAction">Start subscription</button><div class="nel-home-plan-link">No automatic order is created while launch safety remains OFF.</div>';
    }
    var b=el('nelHomePlanAction');if(b)b.onclick=goAccount;
  }

  function reorderHome(){
    var home=el('homePage'),products=el('homeProducts');if(!home||!products)return;
    addStyle();home.classList.add('nel-home-focused');
    var plan=ensurePlanCard();
    var productSection=products.previousElementSibling;
    if(productSection&&productSection.classList.contains('section')){
      productSection.classList.add('nel-primary-section');
      var h=productSection.querySelector('h2');if(h)h.textContent='Order fresh tender coconuts';
      var btn=productSection.querySelector('button');if(btn)btn.textContent='View all';
    }
    var reward=el('cashbar');
    var promo=home.querySelector(':scope > .promo');
    var dealRail=home.querySelector(':scope > .dealRail');
    var favRail=el('favProducts');
    var favSection=favRail&&favRail.previousElementSibling&&favRail.previousElementSibling.classList.contains('section')?favRail.previousElementSibling:null;

    var anchor=plan;
    if(productSection){anchor.insertAdjacentElement('afterend',productSection);anchor=productSection}
    anchor.insertAdjacentElement('afterend',products);anchor=products;
    if(reward){anchor.insertAdjacentElement('afterend',reward);anchor=reward}
    if(promo){anchor.insertAdjacentElement('afterend',promo);anchor=promo}
    if(dealRail){anchor.insertAdjacentElement('afterend',dealRail);anchor=dealRail}
    if(favSection){anchor.insertAdjacentElement('afterend',favSection);anchor=favSection}
    if(favRail){anchor.insertAdjacentElement('afterend',favRail)}
  }

  function updateRewardTeaser(){
    var reward=el('cashbar');if(!reward)return;
    var b=reward.querySelector('b'),small=reward.querySelector('small');
    var c=DATA&&DATA.neCash;
    if(!c){
      if(b)b.textContent='Earn NE Cash with your coconut targets';
      if(small)small.textContent='Weekly & monthly rewards appear here after you sign in.';
      return;
    }
    if(b){b.classList.add('nel-home-reward-summary');b.textContent='NE Cash balance · '+money(c.balance||0)}
    var t=c.weekly||c.monthly;
    if(small&&t){
      if(t.credited)small.textContent='Target reward credited ✓ · Use NE Cash on future orders';
      else if(t.completed)small.textContent=money(t.reward||0)+' earned · awaiting cashback activation';
      else small.textContent=Number(t.achieved||0)+' / '+Number(t.target||0)+' coconuts · '+Number(t.remaining||0)+' more to unlock '+money(t.reward||0);
    }
  }

  async function loadPlan(){
    var m=mobile();renderPlan();updateRewardTeaser();
    if(loading||!m||typeof window.rpc!=='function')return;
    loading=true;
    try{DATA=await window.rpc('getB2CSubscriptionCashbackV954',[m]);renderPlan();updateRewardTeaser();reorderHome()}
    catch(e){}
    finally{loading=false}
  }

  function boot(){
    addStyle();reorderHome();renderPlan();updateRewardTeaser();
    setTimeout(function(){reorderHome();loadPlan()},60);
    window.addEventListener('focus',function(){loadPlan()});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
