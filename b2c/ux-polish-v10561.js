(function(){
  if(window.NEL_UX_POLISH_V10561)return;
  window.NEL_UX_POLISH_V10561=true;

  function el(id){return document.getElementById(id)}
  function addStyle(){
    if(el('nelUx10561Style'))return;
    var s=document.createElement('style');
    s.id='nelUx10561Style';
    s.textContent=`
      :root{--nel-touch:44px}
      body{font-size:14px;padding-bottom:92px}
      button,a,input,select,textarea{-webkit-tap-highlight-color:transparent}
      button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid #ffd54a;outline-offset:2px}
      .top{padding:calc(8px + env(safe-area-inset-top)) 14px 12px}
      .offerTop{font-size:12px;margin-bottom:9px;gap:10px}
      .closeOffer,.close,.cashbar .x{min-width:var(--nel-touch);min-height:var(--nel-touch)}
      .brandRow{gap:10px}.logo{width:42px;height:42px;border-radius:12px}.brand{font-size:18px}.sub{font-size:11px;line-height:1.35}.support{min-height:var(--nel-touch);display:flex;align-items:center;padding:8px 10px;font-size:11px}
      .tabs{display:none!important}
      .searchWrap{padding:0 14px 11px}.search{height:52px;border-radius:14px}.search input{font-size:14px}.freshBadge{font-size:20px}
      .filters{gap:7px;padding:10px 12px;border-bottom:1px solid #edf0ee}.filter{min-height:40px;padding:9px 12px;border:1px solid #e0e7e2;border-radius:999px;font-size:11px;border-bottom-width:1px}.filter.on{background:#eaf7ee;color:var(--g);border-color:#b9dbc6}
      .promo{margin-top:0;min-height:176px;padding:21px 18px;border-radius:0 0 24px 24px}.promo:after{font-size:88px;right:14px;top:22px}.promo h1{font-size:28px;line-height:1.03;margin:7px 0;width:67%}.promo p{font-size:13px;line-height:1.5;width:67%;margin:8px 0}.promo .cta{min-height:var(--nel-touch);align-items:center;padding:10px 14px;font-size:12px;border-radius:12px;cursor:pointer}
      .dealRail{grid-auto-columns:44%;gap:9px;padding:12px 14px 5px}.deal{height:118px;padding:13px}.deal b{font-size:16px}.deal span{font-size:34px}
      .section{margin:18px 0 9px}.section h2{font-size:18px}.section button{min-height:40px;font-size:12px;padding:6px 8px}
      .meta{font-size:11px;line-height:1.5}.price{font-size:18px}.pname{font-size:14px;line-height:1.35;min-height:38px}.product{padding:9px;border-radius:16px}.visual{height:126px}.add{min-height:var(--nel-touch);font-size:13px}.qty{height:44px;grid-template-columns:44px 1fr 44px}.qty button{min-width:44px;min-height:44px}.qty span{padding-top:11px}
      .field{min-height:48px;font-size:14px}.btn{min-height:48px;font-size:13px}.mini{min-height:40px;font-size:11px}.status{font-size:10px;padding:6px 9px}
      .cashbar.nel-inline-rewards{position:static;transform:none;width:auto;margin:12px 14px 4px;border-radius:16px;padding:13px;box-shadow:none;cursor:pointer}.cashbar.nel-inline-rewards .x{display:none}.cashbar.nel-inline-rewards b{font-size:13px}.cashbar.nel-inline-rewards small{font-size:11px;line-height:1.4}
      .cartBar{bottom:calc(68px + env(safe-area-inset-bottom));width:min(740px,calc(100% - 18px));padding:11px 12px;border-radius:14px}.cartBar button{min-height:42px;padding:9px 12px;font-size:12px}
      .nav{box-shadow:0 -6px 22px #10291b12}.navIn{grid-template-columns:repeat(5,1fr)}.nav button{min-height:62px;padding:8px 2px 6px;font-size:11px}.nav b{font-size:21px;margin-bottom:2px}.offersDot{background:#fff!important;color:#78827b!important;border-radius:0!important;margin:0!important}.nav .offersDot.on{color:var(--g)!important}
      .sheetBox{padding:14px 14px calc(20px + env(safe-area-inset-bottom));border-radius:24px 24px 0 0}.sheetHead h3{font-size:18px}.toast{font-size:12px;padding:10px 13px}
      #accountPage>.section:first-child h2{font-size:20px}
      #nelSubscriptionCard,#nelNECashCard{margin-bottom:12px!important}.nel954 h3{font-size:16px!important}.nel954 .meta,.nel954-note{font-size:11px!important}.nel954-box small,.nel954-wallet small{font-size:10px!important}.nel954-box b{font-size:14px!important}.nel954-actions{gap:8px!important}.nel954-actions button{min-height:44px!important;padding:10px 13px!important;font-size:11px!important}.nel954-day{min-height:40px!important;padding:8px 10px!important;font-size:10px!important}.nel954-warning{font-size:11px!important}.nel954-target strong{font-size:13px!important}.nel954-target span{font-size:11px!important}
      @media(max-width:430px){.promo h1{font-size:26px}.dealRail{grid-auto-columns:49%}.favRail{grid-auto-columns:62%}}
      @media(max-width:360px){.products{grid-template-columns:1fr}.visual{height:170px}.pname{min-height:auto}.dealRail{grid-auto-columns:68%}}
      @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
    `;
    document.head.appendChild(s);
  }

  function simplifyHeader(){
    var badge=document.querySelector('.freshBadge');
    if(badge){badge.textContent='🥥';badge.setAttribute('aria-label','Tender coconut');badge.title='Tender coconut'}
    var search=el('searchInput');
    if(search){search.setAttribute('aria-label','Search products');search.setAttribute('autocomplete','off')}
    var filters=document.querySelector('.filters');
    if(filters&&!el('nelQuickFilter')){
      var quick=document.createElement('button');
      quick.id='nelQuickFilter';quick.type='button';quick.className='filter';quick.innerHTML='⚡ QUICK DELIVERY';
      quick.onclick=function(){if(typeof window.filterProducts==='function')window.filterProducts('quick',quick)};
      var first=filters.firstElementChild;
      if(first&&first.nextSibling)filters.insertBefore(quick,first.nextSibling);else filters.appendChild(quick);
    }
  }

  function makeHeroUseful(){
    var cta=document.querySelector('.promo .cta');
    if(!cta)return;
    cta.textContent='ORDER FRESH COCONUTS →';
    cta.setAttribute('role','button');cta.setAttribute('tabindex','0');cta.setAttribute('aria-label','Shop fresh coconuts');
    function openShop(){if(typeof window.go==='function')window.go('shop')}
    cta.onclick=openShop;
    cta.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();openShop()}};
  }

  function moveRewardsTeaser(){
    var cash=el('cashbar'),home=el('homePage');
    if(!cash||!home)return;
    var rail=home.querySelector('.dealRail');
    if(rail&&cash.previousElementSibling!==rail)rail.insertAdjacentElement('afterend',cash);
    cash.classList.add('nel-inline-rewards');
    var b=cash.querySelector('b'),small=cash.querySelector('small');
    if(b)b.textContent='Unlock NE Cash with your coconut targets';
    if(small)small.textContent='Track weekly and monthly progress in Account & Plans';
    cash.setAttribute('role','button');cash.setAttribute('tabindex','0');cash.setAttribute('aria-label','View NE Cash rewards and subscriptions');
    function openAccount(){if(typeof window.go==='function')window.go('account')}
    cash.onclick=openAccount;
    cash.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();openAccount()}};
  }

  function reorderBottomNav(){
    var nav=document.querySelector('.navIn');
    if(!nav)return;
    var offers=nav.querySelector('[data-page="offers"]'),account=nav.querySelector('[data-page="account"]');
    if(offers&&account&&offers.nextElementSibling!==account)nav.insertBefore(offers,account);
    nav.querySelectorAll('button').forEach(function(b){
      b.type='button';
      var page=b.getAttribute('data-page');
      if(page)b.setAttribute('aria-label',page.charAt(0).toUpperCase()+page.slice(1));
    });
  }

  function labelFormControls(){
    document.querySelectorAll('input,select,textarea').forEach(function(node){
      if(node.getAttribute('aria-label'))return;
      var label=node.getAttribute('placeholder')||node.id||node.name;
      if(label)node.setAttribute('aria-label',String(label).replace(/[-_]/g,' '));
    });
  }

  function positionGrowthCards(){
    var account=el('accountPage');if(!account)return;
    var sub=el('nelSubscriptionCard'),cash=el('nelNECashCard');
    var form=account.querySelector('.card.form');
    var heading=account.querySelector(':scope > .section');
    if(heading){var h=heading.querySelector('h2');if(h&&h.textContent!=='Account & plans')h.textContent='Account & plans'}
    if(!form)return;
    if(cash&&cash.parentNode===account&&cash.nextElementSibling!==form)account.insertBefore(cash,form);
    if(sub&&sub.parentNode===account){
      var target=(cash&&cash.parentNode===account)?cash:form;
      if(sub.nextElementSibling!==target)account.insertBefore(sub,target);
    }
  }

  function settleGrowthCards(){
    positionGrowthCards();
    [80,350,1200,3000].forEach(function(ms){setTimeout(function(){positionGrowthCards();labelFormControls()},ms)});
  }

  function boot(){
    addStyle();simplifyHeader();makeHeroUseful();moveRewardsTeaser();reorderBottomNav();labelFormControls();settleGrowthCards();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
