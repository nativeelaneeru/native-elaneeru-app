(function(){
  if(window.NEL_COMING_SOON_B2C_V10430)return;window.NEL_COMING_SOON_B2C_V10430=true;
  function addStyle(){
    if(document.getElementById('nel-coming-soon-style'))return;
    var s=document.createElement('style');s.id='nel-coming-soon-style';
    s.textContent='.nelComingSoon{margin:10px 14px 0;border:1px solid #f0dfa0;border-radius:18px;padding:13px 14px;background:linear-gradient(135deg,#fff9df,#f2faee);display:flex;align-items:center;gap:11px;box-shadow:0 7px 20px rgba(35,74,43,.08)}.nelComingSoonIcon{width:42px;height:42px;flex:0 0 42px;border-radius:13px;background:#fff;display:grid;place-items:center;font-size:23px;box-shadow:0 4px 12px rgba(0,0,0,.06)}.nelComingSoonCopy{min-width:0;flex:1}.nelComingSoonCopy b{display:block;color:#075b34;font-size:14px;margin-bottom:2px}.nelComingSoonCopy span{display:block;color:#526159;font-size:11px;line-height:1.4}.nelComingSoonTag{flex:0 0 auto;background:#075b34;color:#fff;border-radius:999px;padding:6px 8px;font-size:9px;font-weight:900}@media(max-width:430px){.nelComingSoon{align-items:flex-start}.nelComingSoonTag{display:none}}';
    document.head.appendChild(s);
  }
  function mount(){
    if(document.getElementById('nelComingSoonB2C'))return true;
    var main=document.querySelector('.app main')||document.querySelector('main');
    if(!main||!main.parentNode)return false;
    addStyle();
    var el=document.createElement('div');el.id='nelComingSoonB2C';el.className='nelComingSoon';
    el.setAttribute('role','status');
    el.innerHTML='<div class="nelComingSoonIcon">✨</div><div class="nelComingSoonCopy"><b>Coming Soon</b><span>Milk, Grocery & more daily essentials are coming to Native Elaneeru.</span></div><div class="nelComingSoonTag">🥛 Milk · 🛒 Grocery</div>';
    main.parentNode.insertBefore(el,main);
    return true;
  }
  function start(){if(mount())return;var tries=0,t=setInterval(function(){tries++;if(mount()||tries>40)clearInterval(t)},150)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
