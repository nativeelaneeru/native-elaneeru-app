(function(){
  if(window.NEL_B2B_SESSION_GUARD_V980)return;window.NEL_B2B_SESSION_GUARD_V980=true;

  var OWNER_KEY='nel_b2b_cart_owner_mobile';
  function digits(v){return String(v||'').replace(/\D/g,'').slice(-10)}
  function owner(){try{return digits(localStorage.getItem(OWNER_KEY)||'')}catch(e){return ''}}
  function setOwner(m){try{m=digits(m);if(m)localStorage.setItem(OWNER_KEY,m)}catch(e){}}
  function hasCart(){
    try{
      if(typeof CART!=='undefined'&&CART&&Object.keys(CART).length)return true;
      var raw=localStorage.getItem('nel_b2b_cart_v113');
      if(!raw)return false;
      var c=JSON.parse(raw);return !!(c&&Object.keys(c).length);
    }catch(e){return false}
  }
  async function clearBusinessState(){
    try{if(typeof CART!=='undefined')CART={}}catch(e){}
    try{localStorage.removeItem('nel_b2b_cart_v113')}catch(e){}
    try{
      if(window.NEL_B2B_DB){
        if(typeof window.NEL_B2B_DB.clearBusinessCache==='function')await window.NEL_B2B_DB.clearBusinessCache();
        else if(typeof window.NEL_B2B_DB.clearCart==='function')await window.NEL_B2B_DB.clearCart();
      }
    }catch(e){}
    try{if(typeof renderCart==='function')renderCart()}catch(e){}
    try{if(typeof updateCartBar==='function')updateCartBar()}catch(e){}
  }

  function rememberActiveVendor(){
    try{
      var m=DATA&&DATA.vendor&&DATA.vendor.mobile;
      if(m)setOwner(m);
    }catch(e){}
  }

  function patchLogin(){
    var base=window.login;
    if(typeof base!=='function'||base.__nelVendorGuard)return typeof base==='function';
    var wrapped=async function(){
      var entered=digits(document.getElementById('mobile')&&document.getElementById('mobile').value),previous=owner();
      if(entered&&((previous&&previous!==entered)||(!previous&&hasCart())))await clearBusinessState();
      var result=await base.apply(this,arguments);
      if(entered)setOwner(entered);
      rememberActiveVendor();
      return result;
    };
    wrapped.__nelVendorGuard=true;wrapped.__base=base;
    window.login=wrapped;try{login=wrapped}catch(e){}
    var btn=document.getElementById('loginBtn');if(btn)btn.onclick=wrapped;
    return true;
  }

  function patchLogout(){
    var base=window.logout;
    if(typeof base!=='function'||base.__nelVendorGuard)return typeof base==='function';
    var wrapped=function(){
      rememberActiveVendor();
      return base.apply(this,arguments);
    };
    wrapped.__nelVendorGuard=true;wrapped.__base=base;
    window.logout=wrapped;try{logout=wrapped}catch(e){}
    var btn=document.getElementById('logoutBtn');if(btn)btn.onclick=wrapped;
    return true;
  }

  var tries=0;
  (function install(){
    var a=patchLogin(),b=patchLogout();
    rememberActiveVendor();
    if(!(a&&b)&&++tries<240)setTimeout(install,75);
  })();
  setInterval(rememberActiveVendor,2000);
})();
