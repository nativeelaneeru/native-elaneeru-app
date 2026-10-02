(function(){
  function install(){
    var form=document.getElementById('leadForm');
    var phoneEl=document.getElementById('phone');
    var areaEl=document.getElementById('area');
    var status=document.getElementById('status');
    if(!form||!phoneEl||!areaEl||!status) return false;
    form.onsubmit=function(e){
      e.preventDefault();
      var phone=String(phoneEl.value||'').replace(/\D/g,'');
      var area=String(areaEl.value||'').trim();
      if(!/^[6-9]\d{9}$/.test(phone)){status.textContent='Please enter a valid 10-digit mobile number.';return;}
      if(!area){status.textContent='Please enter your area or use your location.';return;}
      var btn=form.querySelector('button[type="submit"]');
      if(btn) btn.disabled=true;
      status.textContent='Submitting your callback request…';
      var api=(window.NEL_CONFIG&&window.NEL_CONFIG.apiUrl)||'';
      if(!api){status.textContent='Callback service is unavailable. Please try again shortly.';if(btn)btn.disabled=false;return;}
      var req={method:'saveCallbackRequest',args:[{name:'Website Vendor',mobile:phone,area:area,requestType:'VENDOR_CALLBACK',source:'NATIVE ELANEERU WEBSITE'}],requestId:'web-callback-'+Date.now()};
      var body=new URLSearchParams({bridge:'1',payload:JSON.stringify(req)});
      fetch(api,{method:'POST',body:body,redirect:'follow'}).then(function(r){if(!r.ok)throw new Error('Request failed');return r.text();}).then(function(text){if(/"ok"\s*:\s*false/i.test(text))throw new Error('Backend rejected request');status.textContent='Thank you. Your callback request has been submitted successfully.';phoneEl.value='';areaEl.value='';}).catch(function(err){console.error(err);status.textContent='We could not submit your request right now. Please try again.';}).finally(function(){if(btn)btn.disabled=false;});
    };
    return true;
  }
  var n=0,t=setInterval(function(){n++;if(install()||n>40)clearInterval(t);},250);
})();
