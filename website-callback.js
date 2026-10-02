(function(){
  'use strict';
  var WHATSAPP_NUMBER='917411807675';

  function install(){
    var form=document.getElementById('leadForm');
    var phoneEl=document.getElementById('phone');
    var areaEl=document.getElementById('area');
    var status=document.getElementById('status');
    if(!form||!phoneEl||!areaEl||!status)return false;

    var btn=form.querySelector('button[type="submit"]');
    if(btn)btn.textContent='Request Callback on WhatsApp';

    form.onsubmit=function(e){
      e.preventDefault();
      var phone=String(phoneEl.value||'').replace(/\D/g,'').slice(-10);
      var area=String(areaEl.value||'').trim();

      if(!/^[6-9]\d{9}$/.test(phone)){
        status.textContent='Please enter a valid 10-digit mobile number.';
        return;
      }
      if(!area){
        status.textContent='Please enter your area or use your location.';
        return;
      }

      var message=[
        'Hi Native Elaneeru,',
        '',
        'I am interested in tender coconut supply for my business.',
        'Mobile: '+phone,
        'Area / Location: '+area,
        '',
        'Please call me back.'
      ].join('\n');

      var url='https://wa.me/'+WHATSAPP_NUMBER+'?text='+encodeURIComponent(message);
      status.textContent='Opening WhatsApp… Please tap Send to share your callback request.';
      window.open(url,'_blank','noopener,noreferrer');
    };
    return true;
  }

  var n=0,t=setInterval(function(){
    n++;
    if(install()||n>40)clearInterval(t);
  },250);
})();
