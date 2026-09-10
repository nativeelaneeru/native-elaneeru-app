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

  /*
   * Guard cart ownership at the authentication boundary, not at button click.
   * vendorLogin rejects for bad credentials. That means a failed login must
   * never clear an existing vendor cart or change the remembered cart owner.
   * On a successful vendorLogin, clear stale business state before the base
   * login flow receives the token and renders the newly authenticated vendor.
   */
  function patchRpc(){
    var base=window.rpc;
    if(typeof base!=='function'||base.__nelVendorAuthGuard)return typeof base==='function';
    var wrapped=function(method,args){
      var ctx=this,callArgs=arguments;
      if(String(method||'')!=='vendorLogin')return base.apply(ctx,callArgs);
      var entered=digits(args&&args[0]),previous=owner(),hadCart=hasCart();
      return Promise.resolve(base.apply(ctx,callArgs)).then(async function(result){
        if(!result||!result.token)return result;
        if(entered&&((previous&&previous!==entered)||(!previous&&hadCart)))await clearBusinessState();
        if(entered)setOwner(entered);
        return result;
      });
    };
    wrapped.__nelVendorAuthGuard=true;wrapped.__base=base;
    window.rpc=wrapped;try{rpc=wrapped}catch(e){}
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
    var a=patchRpc(),b=patchLogout();
    rememberActiveVendor();
    if(!(a&&b)&&++tries<240)setTimeout(install,75);
  })();
  setInterval(rememberActiveVendor,2000);
})();
