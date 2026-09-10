(function(){
  if(window.NEL_UI_106)return;window.NEL_UI_106=true;
  function tabs(){return Array.prototype.slice.call(document.querySelectorAll('.tabs .tab'))}
  function setTop(page){var a=tabs();a.forEach(function(x){x.classList.remove('on')});var i=page==='home'?0:page==='offers'?2:page==='shop'?3:-1;if(i>=0&&a[i])a[i].classList.add('on')}
  function install(){
    if(typeof window.go==='function'&&!window.go.__nel106){var old=window.go;var wrapped=function(page){var r=old.apply(this,arguments);setTop(page);return r};wrapped.__nel106=true;window.go=wrapped;try{go=wrapped}catch(e){}}
    tabs().forEach(function(b,i){if(b.__nel106)return;b.__nel106=true;b.addEventListener('click',function(){tabs().forEach(function(x){x.classList.remove('on')});b.classList.add('on')},true)});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.addEventListener('load',function(){install();setTimeout(install,300)},{once:true});
})();
