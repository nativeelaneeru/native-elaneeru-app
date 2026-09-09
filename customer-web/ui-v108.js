(function(){
  if(window.NEL_UI_V108)return;window.NEL_UI_V108=true;
  var LANG_KEY='nel_b2c_language';
  function removeAccountPin(){
    var c=document.getElementById('nel107PinCard');
    if(c)c.style.display='none';
  }
  function syncLanguage(){
    var sel=document.getElementById('nelPwaLang');
    if(!sel)return;
    var c='en';
    try{c=localStorage.getItem(LANG_KEY)||'en'}catch(e){}
    if(!['en','kn','te','hi'].includes(c))c='en';
    sel.value=c;
  }
  function install(){
    var style=document.createElement('style');
    style.id='nel108ui';
    style.textContent='#nel107PinCard{display:none!important}';
    document.head.appendChild(style);
    removeAccountPin();syncLanguage();
    document.addEventListener('change',function(e){
      if(e.target&&e.target.id==='nelPwaLang'){
        try{localStorage.setItem(LANG_KEY,e.target.value||'en')}catch(x){}
        setTimeout(syncLanguage,0);
      }
    },true);
    [150,500,1200,3000].forEach(function(ms){setTimeout(function(){removeAccountPin();syncLanguage()},ms)});
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install,{once:true}):install();
})();