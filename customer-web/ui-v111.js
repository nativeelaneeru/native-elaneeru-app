(function(){
  if(window.NEL_UI_V111)return;window.NEL_UI_V111=true;

  var BRAND='./icons/native-elaneeru.svg?v=1110';
  var editingProfile=false;

  function el(id){return document.getElementById(id)}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
  function profile(){try{return JSON.parse(localStorage.getItem('nel_profile_v9')||'{}')}catch(e){return {}}}

  function ensureStyle(){
    if(el('nel111style'))return;
    var s=document.createElement('style');s.id='nel111style';s.textContent='\
      .nel111-profile{margin:0 14px 10px;background:#fff;border:1px solid var(--line);border-radius:18px;padding:14px;box-shadow:0 6px 18px #172d1f0d}\
      .nel111-profile-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}.nel111-profile-head b{font-size:15px}.nel111-edit{border:1px solid #cfe0d5;background:#edf7f0;color:var(--g);border-radius:10px;padding:8px 10px;font-size:10px;font-weight:900}\
      .nel111-profile-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.nel111-row{background:#f7faf8;border:1px solid #e3ebe6;border-radius:12px;padding:10px}.nel111-row.wide{grid-column:1/-1}.nel111-row small{display:block;color:#7a867e;font-size:9px;margin-bottom:3px}.nel111-row strong{display:block;font-size:13px;line-height:1.35;word-break:break-word}.nel111-gps{margin-top:9px;font-size:9px;color:#657069}\
      #accountPage .card.form.nel111-hidden{display:none!important}#accountPage .card.form.nel111-editing{display:grid!important}\
      #accountPage .card.form .nel111-cancel{background:#fff!important;color:var(--g)!important;border:1px solid #cfe0d5!important}\
      .tabs .tab.on{background:#fff!important;color:var(--g)!important;box-shadow:0 7px 18px #001b1028!important}\
      .brandRow .logo{object-fit:contain!important;background:#fff!important;padding:2px!important}\
      @media(max-width:430px){.nel111-profile-grid{grid-template-columns:1fr}}';document.head.appendChild(s);
  }

  function fixLogo(){
    document.querySelectorAll('.brandRow img.logo').forEach(function(img){
      if(img.getAttribute('src')!==BRAND)img.setAttribute('src',BRAND);
      img.style.objectFit='contain';img.style.background='#fff';
    });
  }

  function setTopActive(btn){
    var tabs=document.querySelectorAll('.tabs .tab');
    tabs.forEach(function(x){x.classList.remove('on')});
    if(btn)btn.classList.add('on');
  }

  function wireTopTabs(){
    var tabs=document.querySelectorAll('.tabs .tab');
    if(!tabs.length)return;
    tabs.forEach(function(btn){
      if(btn.dataset.nel111)return;btn.dataset.nel111='1';
      btn.addEventListener('click',function(){setTopActive(btn)},true);
    });
  }

  function currentField(id){var x=el(id);return x?String(x.value||'').trim():''}
  function profileValues(){
    var p=profile();
    return {
      mobile:currentField('mobile')||p.mobile||localStorage.getItem('nel_b2c_session_mobile')||'',
      name:currentField('name')||p.name||'',
      area:currentField('area')||p.area||'',
      pincode:currentField('pincode')||p.pincode||'',
      address:currentField('address')||p.address||'',
      gps:(el('gpsText')&&el('gpsText').textContent)||((p.latitude&&p.longitude)?'GPS saved':'GPS not saved')
    };
  }

  function renderProfileView(){
    var account=el('accountPage'),form=account&&account.querySelector('.card.form');if(!account||!form)return;
    var v=profileValues(),view=el('nel111ProfileView');
    if(!view){view=document.createElement('div');view.id='nel111ProfileView';view.className='nel111-profile';form.parentNode.insertBefore(view,form)}
    view.innerHTML='<div class="nel111-profile-head"><b>Profile details</b><button type="button" class="nel111-edit" id="nel111EditProfile">Edit profile</button></div>'+
      '<div class="nel111-profile-grid">'+
      '<div class="nel111-row"><small>Mobile</small><strong>'+esc(v.mobile||'—')+'</strong></div>'+
      '<div class="nel111-row"><small>Name</small><strong>'+esc(v.name||'—')+'</strong></div>'+
      '<div class="nel111-row"><small>Area</small><strong>'+esc(v.area||'—')+'</strong></div>'+
      '<div class="nel111-row"><small>Pincode</small><strong>'+esc(v.pincode||'—')+'</strong></div>'+
      '<div class="nel111-row wide"><small>Delivery address</small><strong>'+esc(v.address||'—')+'</strong></div></div>'+
      '<div class="nel111-gps">'+esc(v.gps||'')+'</div>';
    var b=el('nel111EditProfile');if(b)b.onclick=function(){openProfileEdit()};
    if(!editingProfile){view.style.display='block';form.classList.add('nel111-hidden');form.classList.remove('nel111-editing')}
  }

  function openProfileEdit(){
    var account=el('accountPage'),form=account&&account.querySelector('.card.form');if(!form)return;editingProfile=true;
    var view=el('nel111ProfileView');if(view)view.style.display='none';form.classList.remove('nel111-hidden');form.classList.add('nel111-editing');
    var m=el('mobile');if(m){m.readOnly=true;m.setAttribute('aria-readonly','true');m.style.background='#f3f7f4';m.style.color='#66736b'}
    var saveBtn=Array.prototype.slice.call(form.querySelectorAll('button')).find(function(b){return /save profile/i.test(b.textContent||'')});
    if(saveBtn){saveBtn.textContent='Save changes';saveBtn.id='nel111SaveProfile'}
    if(!el('nel111CancelProfile')){
      var cancel=document.createElement('button');cancel.type='button';cancel.id='nel111CancelProfile';cancel.className='btn nel111-cancel';cancel.textContent='Cancel';cancel.onclick=function(){closeProfileEdit(false)};
      var grid=saveBtn&&saveBtn.parentElement;if(grid&&grid.classList.contains('grid2'))grid.appendChild(cancel);else form.appendChild(cancel);
    }
  }

  function closeProfileEdit(refresh){
    editingProfile=false;var form=el('accountPage')&&el('accountPage').querySelector('.card.form');if(form){form.classList.add('nel111-hidden');form.classList.remove('nel111-editing')}
    if(refresh)setTimeout(renderProfileView,120);else renderProfileView();
  }

  function patchSave(){
    var base=window.saveProfile;if(typeof base!=='function'||base.__nel111)return;
    var wrapped=async function(){var before='';try{before=localStorage.getItem('nel_profile_v9')||''}catch(e){};var r=await base.apply(this,arguments);var after='';try{after=localStorage.getItem('nel_profile_v9')||''}catch(e){};if(after!==before||after){closeProfileEdit(true)}return r};wrapped.__nel111=true;window.saveProfile=wrapped;try{saveProfile=wrapped}catch(e){}
  }

  function patchGo(){
    var base=window.go;if(typeof base!=='function'||base.__nel111)return;
    var wrapped=function(p){var r=base.apply(this,arguments);if(p==='account')setTimeout(renderProfileView,40);return r};wrapped.__nel111=true;window.go=wrapped;try{go=wrapped}catch(e){}
  }

  function install(){
    if(location.pathname.indexOf('/login/')>=0)return;
    ensureStyle();fixLogo();wireTopTabs();patchSave();patchGo();
    [100,400,900,1800,3500].forEach(function(ms){setTimeout(function(){fixLogo();wireTopTabs();patchSave();patchGo();if(!editingProfile)renderProfileView()},ms)});
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install,{once:true}):install();
})();
