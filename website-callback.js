(function(){
  'use strict';
  var API='https://script.google.com/macros/s/AKfycbwWt1gjknt21us91HbFVbFdr5DbkEta-ZmETke-axuepZYp8fQRwAiGTnlgiKrxthb3/exec';
  var pending={};
  var bridgeFrame=null;

  window.addEventListener('message',function(ev){
    var data=ev.data;
    if(!data||data.nelBridge!==true||!data.payload)return;
    var payload=data.payload;
    var id=String(payload.requestId||'');
    var job=pending[id];
    if(!job)return;
    clearTimeout(job.timer);
    delete pending[id];
    if(payload.ok===true) job.resolve(payload.result);
    else job.reject(new Error(payload.error||'Backend rejected request'));
  });

  function callBackend(method,args){
    return new Promise(function(resolve,reject){
      var requestId='web-callback-'+Date.now()+'-'+Math.random().toString(36).slice(2);
      var request={method:method,args:Array.isArray(args)?args:[],requestId:requestId};

      if(bridgeFrame&&bridgeFrame.parentNode) bridgeFrame.parentNode.removeChild(bridgeFrame);
      var iframe=document.createElement('iframe');
      bridgeFrame=iframe;
      iframe.name='nelCallbackBridge_'+Date.now();
      iframe.style.display='none';
      document.body.appendChild(iframe);

      var form=document.createElement('form');
      form.method='POST';
      form.action=API+'?bridge=1';
      form.target=iframe.name;
      form.style.display='none';

      var input=document.createElement('input');
      input.type='hidden';
      input.name='payload';
      input.value=JSON.stringify(request);
      form.appendChild(input);
      document.body.appendChild(form);

      var timer=setTimeout(function(){
        delete pending[requestId];
        if(form.parentNode)form.parentNode.removeChild(form);
        if(iframe.parentNode)iframe.parentNode.removeChild(iframe);
        reject(new Error('Apps Script callback timed out after 20 seconds'));
      },20000);
      pending[requestId]={resolve:resolve,reject:reject,timer:timer};

      try{form.submit();}
      catch(err){
        clearTimeout(timer);delete pending[requestId];
        if(form.parentNode)form.parentNode.removeChild(form);
        if(iframe.parentNode)iframe.parentNode.removeChild(iframe);
        reject(err);return;
      }
      setTimeout(function(){if(form.parentNode)form.parentNode.removeChild(form);},1000);
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

      callBackend('saveCallbackRequest',[{
        name:'Website Vendor',mobile:phone,area:area,
        requestType:'VENDOR_CALLBACK',source:'NATIVE ELANEERU WEBSITE'
      }]).then(function(result){
        if(!result||result.success!==true)throw new Error(result&&result.message?result.message:'Callback was not saved');
        status.textContent='Thank you. Your callback request has been submitted successfully.';
        phoneEl.value='';areaEl.value='';
      }).catch(function(err){
        console.error('Native Elaneeru callback error:',err);
        status.textContent='Callback error: '+String(err&&err.message||err||'Unknown error');
      }).finally(function(){if(btn)btn.disabled=false;});
    };
    return true;
  }

  var n=0,t=setInterval(function(){n++;if(install()||n>40)clearInterval(t);},250);
})();
