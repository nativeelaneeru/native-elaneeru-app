(function(){
  if(window.NEL_REFERRAL_REWARD_V10340)return;
  window.NEL_REFERRAL_REWARD_V10340=true;

  var RULE='Refer a friend. Their first delivered order unlocks 2 FREE Tender Coconuts for you.';
  var SUPPORT='917411807675';

  function text(el,value){if(el&&el.textContent!==value)el.textContent=value}
  function statValue(label){
    var stats=Array.prototype.slice.call(document.querySelectorAll('#nelReferralCard .nel-growth-stat'));
    var hit=stats.find(function(x){return String(x.querySelector('small')&&x.querySelector('small').textContent||'').toUpperCase().indexOf(label)>=0});
    return hit?Number(String(hit.querySelector('b')&&hit.querySelector('b').textContent||'0').replace(/\D/g,''))||0:0;
  }
  function referralCode(){
    var strong=document.querySelector('#nelReferralCard .nel-growth-code strong');
    return strong?String(strong.textContent||'').trim().toUpperCase():'';
  }
  function shareUrl(code){
    return location.origin+location.pathname.replace(/\/?$/,'/')+'?ref='+encodeURIComponent(code);
  }
  function shareText(code){
    return 'Order fresh Tender Coconuts from Native Elaneeru. Use my referral code '+code+'. After your first delivered order, I get 2 Tender Coconuts FREE. '+shareUrl(code);
  }
  function toastMsg(v){try{if(typeof window.toast==='function')window.toast(v)}catch(e){}}

  function apply(){
    var offer=document.getElementById('nelReferralOffer');
    if(offer){
      var offerMeta=offer.querySelector('.meta');
      text(offerMeta,'Invite a friend. After their first delivered order, you earn 2 FREE Tender Coconuts.');
    }

    var card=document.getElementById('nelReferralCard');
    if(!card)return;
    var headMeta=card.querySelector('.nel-growth-head .meta');
    text(headMeta,RULE);

    var stats=Array.prototype.slice.call(card.querySelectorAll('.nel-growth-stat'));
    stats.forEach(function(s){
      var label=s.querySelector('small');if(!label)return;
      var key=String(label.textContent||'').toUpperCase();
      if(key==='QUALIFIED')text(label,'EARNED');
      if(key==='REWARDED')text(label,'USED');
    });

    var qualified=statValue('EARNED');
    var used=statValue('USED');
    var available=Math.max(0,(qualified-used)*2);
    var summary=card.querySelector('.nel-ref-free-summary');
    if(!summary){
      summary=document.createElement('div');
      summary.className='nel-ref-free-summary';
      summary.style.cssText='margin-top:10px;padding:11px 12px;border-radius:12px;background:#fff8db;color:#5c4300;font-size:11px;font-weight:850;line-height:1.4';
      var actions=card.querySelector('.nel-growth-actions');
      if(actions)card.insertBefore(summary,actions);else card.appendChild(summary);
    }
    text(summary,available>0?'🥥 Available reward: '+available+' FREE Tender Coconut'+(available===1?'':'s')+'.':'🥥 Reward: 2 FREE Tender Coconuts for every successful referral.');
  }

  function copyFallback(value){
    var t=document.createElement('textarea');t.value=value;document.body.appendChild(t);t.select();
    try{document.execCommand('copy');toastMsg('Referral invite copied ✓')}catch(e){toastMsg('Copy failed')}
    t.remove();
  }

  document.addEventListener('click',function(event){
    var button=event.target&&event.target.closest?event.target.closest('button'):null;
    if(!button)return;
    if(button.id!=='nelShareRef'&&button.id!=='nelWhatsAppRef')return;
    var code=referralCode();if(!/^NEL[A-Z0-9]{8}$/.test(code))return;
    event.preventDefault();event.stopImmediatePropagation();
    var message=shareText(code);
    if(button.id==='nelWhatsAppRef'){
      window.open('https://wa.me/?text='+encodeURIComponent(message),'_blank');
      return;
    }
    if(navigator.share){
      navigator.share({title:'Native Elaneeru Refer & Earn',text:message,url:shareUrl(code)}).catch(function(){});
    }else if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(message).then(function(){toastMsg('Referral invite copied ✓')}).catch(function(){copyFallback(message)});
    }else copyFallback(message);
  },true);

  function start(){
    apply();
    var observer=new MutationObserver(function(){apply()});
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
    window.addEventListener('focus',apply);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
