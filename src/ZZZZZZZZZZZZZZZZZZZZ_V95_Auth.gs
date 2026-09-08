/*******************************************************************************
 * NATIVE ELANEERU V9.5 — UNIFIED AUTH + B2C CUSTOMER LOGIN
 *
 * Soft-launch rules:
 * - B2C customer: registered mobile + device session (no PIN/OTP for soft launch)
 * - B2B / drivers / staff / admin: PIN-based authentication
 ******************************************************************************/

function customerLoginV95(mobile){
  mobile=digits_(mobile);
  if(!/^[6-9]\d{9}$/.test(mobile)) throw new Error('Enter a valid 10 digit mobile number.');
  const c=rows_(V8.SHEETS.CUSTOMERS).find(x=>digits_(x.Mobile)===mobile && active_(x.Status||x['Customer Status']||'ACTIVE'));
  if(!c) return {success:true,exists:false,mobile:mobile};
  return {
    success:true,
    exists:true,
    customerId:s_(c['Customer ID']),
    mobile:mobile,
    profile:{
      mobile:mobile,
      name:s_(c.Name),
      area:s_(c.Area),
      pincode:s_(c.Pincode),
      address:s_(c.Address||c['Primary Address']),
      latitude:c.Latitude===''?'':n_(c.Latitude),
      longitude:c.Longitude===''?'':n_(c.Longitude)
    }
  };
}

/** Single normalized PIN gateway for all non-B2C customer roles. */
function authLoginV95(mode,identifier,pin){
  mode=s_(mode).toUpperCase();
  identifier=s_(identifier);
  pin=s_(pin);
  if(!identifier||pin.length<4) throw new Error('Enter valid login details.');
  switch(mode){
    case 'B2B': return Object.assign({mode:'B2B'},vendorLogin(identifier,pin));
    case 'B2B_DRIVER': return Object.assign({mode:'B2B_DRIVER'},driverLoginV8(identifier,pin,'B2B'));
    case 'B2C_DELIVERY': return Object.assign({mode:'B2C_DELIVERY'},driverLoginV8(identifier,pin,'B2C'));
    case 'PICKER': return Object.assign({mode:'PICKER'},staffLoginV81_(identifier,pin,'PICKER'));
    case 'SALES': return Object.assign({mode:'SALES'},staffLoginV81_(identifier,pin,'SALES'));
    case 'ADMIN':
      if(!adminLogin(identifier,pin)) throw new Error('Invalid admin email or PIN.');
      return {success:true,mode:'ADMIN'};
    default: throw new Error('Unknown login type.');
  }
}

function b2cLoginUiV95_(){
  return `<style>
  .nel95-login{position:fixed;inset:0;z-index:999999;background:linear-gradient(155deg,#053d25,#0a7a43 58%,#14a866);display:flex;align-items:center;justify-content:center;padding:22px}
  .nel95-login.hide{display:none!important}.nel95-box{width:min(420px,100%);background:#fff;border-radius:24px;padding:20px;box-shadow:0 28px 80px #002b1b66;color:#142019}
  .nel95-mark{width:66px;height:66px;border-radius:18px;object-fit:cover;background:#fff;box-shadow:0 8px 24px #0002}.nel95-box h2{font-size:27px;margin:14px 0 5px;color:#075b34}.nel95-box p{font-size:12px;color:#6b776e;line-height:1.5;margin:0 0 15px}
  .nel95-input{width:100%;border:1px solid #d8e5dc;border-radius:13px;padding:13px;font:inherit;outline:0}.nel95-input:focus{border-color:#55ad7b;box-shadow:0 0 0 4px #dff4e8}
  .nel95-btn{width:100%;margin-top:10px;border:0;border-radius:13px;padding:13px;background:#075b34;color:#fff;font-weight:900;font:inherit}.nel95-msg{font-size:11px;color:#a03d26;min-height:18px;margin-top:8px}.nel95-fine{font-size:10px;color:#7c877f;text-align:center;margin-top:8px}
  .nel95-logout{width:100%;margin-top:10px;border:1px solid #e4c7c4;border-radius:12px;padding:10px;background:#fff7f6;color:#a52a20;font-weight:850}
  </style>
  <div id="nel95Login" class="nel95-login"><div class="nel95-box"><img class="nel95-mark" src="${NEL_V91_LOGO}" alt="Native Elaneeru"><h2>Welcome to Native Elaneeru</h2><p>Enter your mobile number to continue. No OTP or PIN is required during the small-customer soft launch.</p><input id="nel95Mobile" class="nel95-input" inputmode="numeric" maxlength="10" placeholder="10 digit mobile number"><button id="nel95Btn" class="nel95-btn" type="button" onclick="nel95CustomerLogin()">Continue</button><div id="nel95Msg" class="nel95-msg"></div><div class="nel95-fine">Your device will remember this login. You can log out from Account.</div></div></div>
  <script>(function(){
    const SESSION='nel_b2c_session_mobile';
    function digits(v){return String(v||'').replace(/\\D/g,'').slice(-10)}
    function setMsg(m){const e=document.getElementById('nel95Msg');if(e)e.textContent=m||''}
    function show(){const e=document.getElementById('nel95Login');if(e)e.classList.remove('hide')}
    function hide(){const e=document.getElementById('nel95Login');if(e)e.classList.add('hide')}
    function hydrate(p){
      if(!p)return;
      try{localStorage.setItem('nel_profile_v9',JSON.stringify(p))}catch(e){}
      ['mobile','name','area','pincode','address'].forEach(k=>{const el=document.getElementById(k);if(el)el.value=p[k]||''});
      try{if(typeof S!=='undefined'){S.lat=p.latitude||'';S.lng=p.longitude||''}}catch(e){}
      const g=document.getElementById('gpsText');if(g&&p.latitude&&p.longitude)g.textContent='GPS saved';
    }
    window.nel95CustomerLogin=async function(autoMobile){
      const input=document.getElementById('nel95Mobile'),btn=document.getElementById('nel95Btn');
      const m=digits(autoMobile||(input&&input.value));
      if(!/^[6-9]\\d{9}$/.test(m)){setMsg('Enter a valid 10 digit mobile number.');show();return false}
      if(input)input.value=m;if(btn){btn.disabled=true;btn.textContent='Checking account…'}setMsg('');
      try{
        if(typeof window.rpc!=='function') throw new Error('Customer connection is not ready. Refresh the app once.');
        const r=await window.rpc('customerLoginV95',[m]);
        localStorage.setItem(SESSION,m);
        if(r.exists){hydrate(r.profile);hide();try{await loadCustomer(false)}catch(e){};try{toast('Welcome back'+(r.profile&&r.profile.name?' '+r.profile.name:'')+' ✓')}catch(e){};return true}
        hydrate({mobile:m,name:'',area:'',pincode:'',address:'',latitude:'',longitude:''});hide();try{go('account')}catch(e){};try{toast('New customer — complete your profile to continue.')}catch(e){};return true;
      }catch(e){setMsg(e&&e.message?e.message:String(e));show();return false}
      finally{if(btn){btn.disabled=false;btn.textContent='Continue'}}
    };
    window.nel95CustomerLogout=function(){try{localStorage.removeItem(SESSION);localStorage.removeItem('nel_profile_v9')}catch(e){};const m=document.getElementById('nel95Mobile');if(m)m.value='';show()};
    function addLogout(){const acct=document.getElementById('accountPage');if(!acct||document.getElementById('nel95Logout'))return;const b=document.createElement('button');b.id='nel95Logout';b.className='nel95-logout';b.type='button';b.textContent='Log out of customer account';b.onclick=window.nel95CustomerLogout;acct.appendChild(b)}
    setTimeout(async function(){addLogout();const m=digits(localStorage.getItem(SESSION)||'');if(/^[6-9]\\d{9}$/.test(m)){const i=document.getElementById('nel95Mobile');if(i)i.value=m;await window.nel95CustomerLogin(m)}else show()},250);
  })();</script>`;
}

function doGetV95_(e){
  const out=doGetV93_(e);
  const isBridge=String(e&&e.parameter&&e.parameter.bridge||'')==='1';
  if(isBridge) return out;
  const p=String(e&&e.parameter&&e.parameter.page||'').toLowerCase();
  if(['','home','b2c'].includes(p)) out.append(b2cLoginUiV95_());
  return out;
}

doGet=doGetV95_;
