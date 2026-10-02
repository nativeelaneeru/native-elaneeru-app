(function(){
  'use strict';
  var WHATSAPP_NUMBER='917411807675';
  var capturedMapLink='';

  function mapsFromCoordsValue(){
    var coordsEl=document.getElementById('coords');
    var raw=coordsEl?String(coordsEl.value||'').trim():'';
    var m=raw.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if(!m)return '';
    return 'https://www.google.com/maps?q='+encodeURIComponent(m[1]+','+m[2]);
  }

  function install(){
    var form=document.getElementById('leadForm');
    var phoneEl=document.getElementById('phone');
    var areaEl=document.getElementById('area');
    var status=document.getElementById('status');
    if(!form||!phoneEl||!areaEl||!status)return false;

    var btn=form.querySelector('button[type="submit"]');
    if(btn)btn.textContent='Request Callback on WhatsApp';

    var locBtn=document.getElementById('locBtn')||form.querySelector('.locBtn');
    if(locBtn&&!locBtn.dataset.neMapsObserver){
      locBtn.dataset.neMapsObserver='1';
      locBtn.addEventListener('click',function(){
        capturedMapLink='';
        var attempts=0;
        var timer=setInterval(function(){
          attempts++;
          var link=mapsFromCoordsValue();
          if(link){
            capturedMapLink=link;
            clearInterval(timer);
          }else if(attempts>=40){
            clearInterval(timer);
          }
        },250);
      });
    }

    form.onsubmit=function(e){
      e.preventDefault();
      var phone=String(phoneEl.value||'').replace(/\D/g,'').slice(-10);
      var area=String(areaEl.value||'').trim();
      var mapLink=capturedMapLink||mapsFromCoordsValue();

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
      if(mapLink)lines.push('Google Maps: '+mapLink);
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
