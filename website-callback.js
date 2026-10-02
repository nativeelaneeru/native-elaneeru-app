(function(){
  'use strict';
  var API='https://script.google.com/macros/s/AKfycbwWt1gjknt21us91HbFVbFdr5DbkEta-ZmETke-axuepZYp8fQRwAiGTnlgiKrxthb3/exec';

  function callBackend(method,args){
    return new Promise(function(resolve,reject){
      var callback='__nelVendorCallback'+Date.now()+Math.random().toString(36).slice(2);
      var script=document.createElement('script');
      var timer;
      function cleanup(){clearTimeout(timer);delete window[callback];if(script.parentNode)script.parentNode.removeChild(script);}
      window[callback]=function(payload){
        cleanup();
        if(payload&&payload.ok===true) resolve(payload.result);
        else reject(new Error(payload&&payload.error ? payload.error : 'Backend rejected request'));
      };
      script.onerror=function(){cleanup();reject(new Error('Unable to reach Apps Script callback service'))};
      var request={method:method,args:Array.isArray(args)?args:[],requestId:'web-callback-'+Date.now()};
      script.src=API+'?jsonp=1&callback='+encodeURIComponent(callback)+'&payload='+encodeURIComponent(JSON.stringify(request))+'&_='+Date.now();
      timer=setTimeout(function(){cleanup();reject(new Error('Apps Script callback timed out after 15 seconds'))},15000);
      document.head.appendChild(script);
    });
  }

  function install(){
    var form=document.getElementById('leadForm');
    var phoneEl=document.getElementById('phone');
    var areaEl=document.getElementById('area');
    var status=document.getElementById('status');
    if(!form||!phoneEl||!areaEl||!status)return false;
    form.onsubmit=function(e){
      e.preventDefault();
      var phone=String(phoneEl.value||'').replace(/\D/g,'').slice(-10);
      var area=String(areaEl.value||'').trim();
      if(!/^[6-9]\d{9}$/.test(phone)){status.textContent='Please enter a valid 10-digit mobile number.';return;}
      if(!area){status.textContent='Please enter your area or use your location.';return;}
      var btn=form.querySelector('button[type="submit"]');
      if(btn)btn.disabled=true;
      status.textContent='Submitting your callback request…';
      callBackend('saveCallbackRequest',[{name:'Website Vendor',mobile:phone,area:area,requestType:'VENDOR_CALLBACK',source:'NATIVE ELANEERU WEBSITE'}])
        .then(function(result){
          if(!result||result.success!==true) throw new Error(result&&result.message ? result.message : 'Callback was not saved');
          status.textContent='Thank you. Your callback request has been submitted successfully.';
          phoneEl.value='';areaEl.value='';
        })
        .catch(function(err){
          console.error('Native Elaneeru callback error:',err);
          status.textContent='Callback error: '+String(err&&err.message||err||'Unknown error');
        })
        .finally(function(){if(btn)btn.disabled=false;});
    };
    return true;
  }
  var n=0,t=setInterval(function(){n++;if(install()||n>40)clearInterval(t);},250);
})();
