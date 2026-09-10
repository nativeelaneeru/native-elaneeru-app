(function(){
  if(window.NEL_B2B_RUNTIME_GUARD_V918)return;
  window.NEL_B2B_RUNTIME_GUARD_V918=true;

  function normalise(raw){
    var d=raw&&typeof raw==='object'?raw:{};
    d.vendor=d.vendor&&typeof d.vendor==='object'?d.vendor:{};
    d.products=Array.isArray(d.products)?d.products:[];
    d.orders=Array.isArray(d.orders)?d.orders:[];
    d.orders.forEach(function(o){if(o&&typeof o==='object'&&!Array.isArray(o.items))o.items=[]});
    d.banners=Array.isArray(d.banners)?d.banners:[];
    d.marketRates=Array.isArray(d.marketRates)?d.marketRates:[];
    d.target=d.target&&typeof d.target==='object'?d.target:null;
    d.payment=d.payment&&typeof d.payment==='object'?d.payment:{};
    return d;
  }

  function patch(){
    if(typeof window.render!=='function')return false;
    if(window.render.__nel918)return true;
    var base=window.render;
    var wrapped=function(){
      try{DATA=normalise(typeof DATA==='undefined'?null:DATA)}catch(e){}
      return base.apply(this,arguments);
    };
    wrapped.__nel918=true;
    window.render=wrapped;
    try{render=wrapped}catch(e){}
    return true;
  }

  function start(){
    var tries=0;(function wait(){if(patch())return;if(++tries<200)setTimeout(wait,50)})();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();