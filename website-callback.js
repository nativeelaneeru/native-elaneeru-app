(function(){
  'use strict';
  var WHATSAPP_NUMBER='917411807675';
  var capturedMapLink='';

  function install(){
    var form=document.getElementById('leadForm');
    var phoneEl=document.getElementById('phone');
    var areaEl=document.getElementById('area');
    var status=document.getElementById('status');
    if(!form||!phoneEl||!areaEl||!status)return false;

    var btn=form.querySelector('button[type="submit"]');
    if(btn)btn.textContent='Request Callback on WhatsApp';

    var locBtn=form.querySelector('.locBtn');
    if(locBtn&&!locBtn.dataset.neMapsBound){
      locBtn.dataset.neMapsBound='1';
      locBtn.addEventListener('click',function(){
        if(!navigator.geolocation){
          status.textContent='Location is not supported on this device. You can enter your area manually.';
          return;
        }
        status.textContent='Getting your location…';
        navigator.geolocation.getCurrentPosition(function(pos){
          var lat=Number(pos.coords.latitude).toFixed(6);
          var lng=Number(pos.coords.longitude).toFixed(6);
          capturedMapLink='https://www.google.com/maps?q='+lat+','+lng;
          if(!String(areaEl.value||'').trim())areaEl.value='Current location';
          status.textContent='Location captured. Your Google Maps link will be included in WhatsApp.';
        },function(){
          capturedMapLink='';
          status.textContent='Could not capture location. Please allow location access or enter your area manually.';
        },{enableHighAccuracy:true,timeout:15000,maximumAge:60000});
      });
    }

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

      var lines=[
        'Hi Native Elaneeru,',
        '',
        'I am interested in tender coconut supply for my business.',
        'Mobile: '+phone,
        'Area / Location: '+area
      ];
      if(capturedMapLink)lines.push('Google Maps: '+capturedMapLink);
      lines.push('','Please call me back.');

      var url='https://wa.me/'+WHATSAPP_NUMBER+'?text='+encodeURIComponent(lines.join('\n'));
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
