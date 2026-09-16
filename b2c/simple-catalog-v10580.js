(function(){
  if(window.NEL_SIMPLE_CATALOG_V10580)return;window.NEL_SIMPLE_CATALOG_V10580=true;
  function text(x){return String(x&&x.textContent||'').replace(/\s+/g,' ').trim().toUpperCase()}
  function simplify(){
    try{if(typeof window.filterProducts==='function')window.filterProducts('all')}catch(e){}
    document.querySelectorAll('.filters').forEach(function(row){
      var t=text(row);if(t.indexOf('ALL')>=0&&(t.indexOf('FRESH TODAY')>=0||t.indexOf('BESTSELLERS')>=0||t.indexOf('BULK ORDER')>=0))row.style.display='none';
    });
    document.querySelectorAll('button').forEach(function(b){
      var p=b.parentElement;if(!p)return;var labels=Array.from(p.querySelectorAll(':scope > button')).map(text).join(' | ');
      if(labels.indexOf('QUICK DELIVERY')>=0&&labels.indexOf('FRESH')>=0&&(labels.indexOf('OFFERS')>=0||labels.indexOf('BULK')>=0))p.style.display='none';
    });
    var q=document.getElementById('nelQuickFilter');if(q)q.remove();
  }
  function boot(){simplify();setTimeout(simplify,150);setTimeout(simplify,800)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
