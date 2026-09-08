/*******************************************************************************
 * NATIVE ELANEERU V9.4 — B2C DELIVERY LOGIN HOTFIX
 *
 * The Delivery.html login flow called refresh() while BUSY was still true.
 * refresh() therefore returned immediately after successful authentication,
 * making Go Online appear broken / leaving the route area empty.
 ******************************************************************************/

function deliveryLoginHotfixV94_(){
  return `<script>(function(){
    if(typeof login!=='function'||typeof refresh!=='function') return;
    window.login=async function(){
      if(BUSY)return;
      MOB=$('mobile').value.trim();
      PIN=$('pin').value.trim();
      if(!MOB||!PIN){try{toast('Enter mobile and PIN')}catch(e){};return;}
      let authenticated=false;
      setBusy(true,'Signing in…');
      try{
        await rpc('driverLoginV8',[MOB,PIN,'B2C']);
        $('login').classList.add('hidden');
        $('app').classList.remove('hidden');
        $('sticky').classList.remove('hidden');
        authenticated=true;
      }catch(e){
        $('msg').textContent=e.message;
        try{toast(e.message)}catch(x){}
      }finally{
        setBusy(false,'Ready');
      }
      if(authenticated){
        try{
          await refresh();
          try{toast('You are online ✓')}catch(e){}
        }catch(e){
          try{toast(e.message)}catch(x){}
        }
      }
    };
  })();</script>`;
}

function doGetV94_(e){
  const out=doGetV93_(e);
  const isBridge=String(e&&e.parameter&&e.parameter.bridge||'')==='1';
  if(isBridge) return out;
  const p=String(e&&e.parameter&&e.parameter.page||'').toLowerCase();
  if(['delivery','b2cdelivery'].includes(p)) out.append(deliveryLoginHotfixV94_());
  return out;
}

doGet=doGetV94_;
