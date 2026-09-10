(function(){
  function removeBusinessSwitch(){
    var a=document.getElementById('nel113Business')||document.querySelector('.brandRow a[href="./business/"],.brandRow a[href="../b2b/"]');
    if(a&&a.parentNode)a.parentNode.removeChild(a);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',removeBusinessSwitch,{once:true});else removeBusinessSwitch();
  var tries=0,t=setInterval(function(){removeBusinessSwitch();if(++tries>40)clearInterval(t);},100);
})();
