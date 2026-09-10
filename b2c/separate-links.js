(function(){
  function fix(){
    var a=document.getElementById('nel113Business')||document.querySelector('a[href="./business/"]');
    if(a){a.href='../b2b/';a.setAttribute('aria-label','Open Native Elaneeru B2B Business app');}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fix,{once:true});else fix();
  var tries=0,t=setInterval(function(){fix();if(document.getElementById('nel113Business')||++tries>40)clearInterval(t);},100);
})();
