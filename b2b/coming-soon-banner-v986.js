(function(){
  if(window.NEL_COMING_SOON_B2B_V986)return;window.NEL_COMING_SOON_B2B_V986=true;
  function addStyle(){
    if(document.getElementById('nel-b2b-coming-soon-style'))return;
    var s=document.createElement('style');s.id='nel-b2b-coming-soon-style';
    s.textContent='.nelB2BComingSoon{margin:0 0 11px;border:1px solid #ead7a0;border-radius:18px;padding:13px 14px;background:linear-gradient(135deg,#fff9e8,#edf5f7);display:flex;align-items:center;gap:11px;box-shadow:0 8px 22px rgba(18,58,90,.08)}.nelB2BComingSoonIcon{width:42px;height:42px;flex:0 0 42px;border-radius:13px;background:#fff;display:grid;place-items:center;font-size:22px;box-shadow:0 4px 12px rgba(12,41,64,.08)}.nelB2BComingSoonCopy{min-width:0;flex:1}.nelB2BComingSoonCopy b{display:block;color:#123a5a;font-size:14px;margin-bottom:2px}.nelB2BComingSoonCopy span{display:block;color:#60717d;font-size:11px;line-height:1.4}.nelB2BComingSoonTag{flex:0 0 auto;background:#123a5a;color:#fff;border-radius:999px;padding:6px 8px;font-size:9px;font-weight:900}@media(max-width:430px){.nelB2BComingSoon{align-items:flex-start}.nelB2BComingSoonTag{display:none}}';
    document.head.appendChild(s);
  }
  function mount(){
    if(document.getElementById('nelComingSoonB2B'))return true;
    var wrap=document.querySelector('main.wrap')||document.querySelector('main');
    if(!wrap)return false;
    addStyle();
    var el=document.createElement('div');el.id='nelComingSoonB2B';el.className='nelB2BComingSoon';
    el.setAttribute('role','status');
    el.innerHTML='<div class="nelB2BComingSoonIcon">🚀</div><div class="nelB2BComingSoonCopy"><b>Operations Commencing Soon</b><span>Native Elaneeru Business is preparing to begin supply and delivery operations shortly. We are getting everything ready for a reliable launch.</span></div><div class="nelB2BComingSoonTag">LAUNCHING SOON</div>';
    wrap.insertBefore(el,wrap.firstChild);
    return true;
  }
  function start(){if(mount())return;var tries=0,t=setInterval(function(){tries++;if(mount()||tries>40)clearInterval(t)},150)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
