(function(){
  var base=window.add;if(typeof base!=='function')return;
  var card=window.productCard;if(typeof card==='function')window.productCard=function(p){var html=card.apply(this,arguments);if(p&&p.stockTracked&&p.stockStatus==='OOS')return html.replace('<div class="qty">','<div class="rules" style="color:#b42318;font-weight:900">OUT OF STOCK</div><div class="qty">').replace('<button class="add"','<button class="add" disabled');return html;};
  window.add=function(id){var p=((typeof DATA!=='undefined'&&DATA&&DATA.products)||[]).find(function(x){return x.productId===id;}),input=document.getElementById('qty_'+id),qty=Math.floor(Number(input&&input.value||0));if(p&&p.stockTracked&&p.stockStatus==='OOS')return window.toast('Out of stock');if(p&&p.stockTracked&&qty>Number(p.availableQty||0))return window.toast('Only '+Number(p.availableQty||0)+' available');return base.apply(this,arguments);};
})();
