(function(){
  function fix(){
    var a=document.getElementById('nel113Retail')||document.querySelector('a[href="../"]');
    if(a){a.href='../b2c/';a.setAttribute('aria-label','Open Native Elaneeru B2C Customer app');}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fix,{once:true});else fix();
  var tries=0,t=setInterval(function(){fix();if(document.getElementById('nel113Retail')||++tries>40)clearInterval(t);},100);
})();
