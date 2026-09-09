(function(){
  if(window.NEL_B2B_UI_V120)return;window.NEL_B2B_UI_V120=true;

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
  function money(n){return '₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})}
  function comparableUnit(rateUnit,productUnit){
    var r=String(rateUnit||'').toLowerCase().replace(/\s+/g,''),p=String(productUnit||'').toLowerCase().replace(/\s+/g,'');
    if(!r||!p)return false;
    var piece=['pc','pcs','piece','pieces','no','nos','number','numbers','each'];
    return piece.some(function(x){return r===x||r==='/'+x||r==='per'+x}) && piece.some(function(x){return p===x});
  }
  function latestMarket(){
    try{return (DATA&&Array.isArray(DATA.marketRates)&&DATA.marketRates.length)?DATA.marketRates[0]:null}catch(e){return null}
  }
  function addStyles(){
    if(document.getElementById('nelB2B120Css'))return;
    var s=document.createElement('style');s.id='nelB2B120Css';s.textContent='\
      .nel-market{margin-top:10px;border:1px solid #cfe2e6;background:linear-gradient(135deg,#edf8f8,#f8fbfc);border-radius:16px;padding:11px 12px;display:flex;align-items:center;justify-content:space-between;gap:12px}\
      .nel-market small{display:block;color:#667680;font-size:9px}.nel-market b{display:block;color:#0c2940;font-size:16px;margin-top:2px}.nel-market .rate{font-size:22px;font-weight:950;color:#0f7280;white-space:nowrap}\
      .nel-standard{font-size:10px;color:#7a8790;margin-top:5px}.nel-standard s{margin-left:4px}.nel-your{font-size:20px;font-weight:950;color:#123a5a;margin-top:2px}.nel-save{display:inline-block;margin-top:5px;background:#e8f7ef;color:#087552;border-radius:999px;padding:5px 8px;font-size:9px;font-weight:950}\
      .nel-market-save{display:inline-block;margin-left:5px;background:#fff3d4;color:#8a5900;border-radius:999px;padding:5px 8px;font-size:9px;font-weight:950}.product .visual img{width:100%;height:100%;object-fit:contain;padding:8px}.product .visual{overflow:hidden}\
      @media(max-width:460px){.nel-market{align-items:flex-start}.nel-market .rate{font-size:18px}}';
    document.head.appendChild(s);
  }
  function renderMarketStrip(){
    var hero=document.getElementById('hero');if(!hero)return;
    var old=document.getElementById('nelMarketStrip');if(old)old.remove();
    var r=latestMarket();if(!r)return;
    var box=document.createElement('div');box.id='nelMarketStrip';box.className='nel-market';
    box.innerHTML='<div><small>LIVE MARKET BENCHMARK</small><b>'+esc(r.market||'Tender Coconut Market')+'</b><small>'+esc([r.district,r.state,r.source,r.rateDate].filter(Boolean).join(' · '))+'</small></div><div class="rate">'+money(r.modalRate||r.maxRate||r.minRate)+' <small>'+esc(r.rateUnit||'')+'</small></div>';
    hero.insertAdjacentElement('afterend',box);
  }
  function upgradedProductCard(p){
    var q=0;try{q=(CART[p.productId]&&CART[p.productId].qty)||0}catch(e){}
    var standard=Number(p.standardPrice||p.price||0),your=Number(p.price||0),save=Math.max(0,Number(p.savingsPerUnit||standard-your)),pct=Number(p.savingsPercent||0);
    var market=latestMarket(),marketPrice=0,marketSave=0,marketPct=0;
    if(market&&comparableUnit(market.rateUnit,p.unit)){
      marketPrice=Number(market.modalRate||market.maxRate||market.minRate||0);
      if(marketPrice>your){marketSave=marketPrice-your;marketPct=marketPrice?Math.round(marketSave*1000/marketPrice)/10:0}
    }
    var visual=p.imageUrl?'<img src="'+esc(p.imageUrl)+'" alt="'+esc(p.productName)+'" onerror="this.remove();this.parentNode.textContent=\'🥥\'">':'🥥';
    var standardHtml=standard>your?'<div class="nel-standard">Standard Price <s>'+money(standard)+' / '+esc(p.unit||'pc')+'</s></div>':'<div class="nel-standard">Standard business price</div>';
    var savings=save>0?'<span class="nel-save">Save '+money(save)+' / '+esc(p.unit||'pc')+(pct?' · '+pct+'%':'')+'</span>':'';
    var marketSavings=marketSave>0?'<span class="nel-market-save">'+money(marketSave)+' below market · '+marketPct+'%</span>':'';
    return '<div class="product"><div class="visual">'+visual+'</div><div class="pname">'+esc(p.productName)+'</div>'+standardHtml+'<div class="nel-your">Your Price '+money(your)+' / '+esc(p.unit||'pc')+'</div><div>'+savings+marketSavings+'</div><div class="rules">MOQ '+Number(p.moq||1)+' · Order in steps of '+Number(p.qtyStep||1)+'</div><div class="qty"><input id="q_'+esc(p.productId)+'" inputmode="numeric" value="'+(q||Number(p.moq||1))+'"><button class="add" onclick="addProduct(\''+String(p.productId||'').replace(/'/g,"\\'")+'\')">ADD</button></div></div>';
  }
  function patch(){
    addStyles();
    try{
      if(typeof productCard==='function'&&!productCard.__nel120){
        var pc=upgradedProductCard;pc.__nel120=true;productCard=pc;window.productCard=pc;
      }
      if(typeof render==='function'&&!render.__nel120){
        var base=render;var wrapped=function(){var r=base.apply(this,arguments);try{renderMarketStrip();var host=document.getElementById('products');if(host&&DATA&&Array.isArray(DATA.products))host.innerHTML=DATA.products.map(upgradedProductCard).join('')||'<div class="card">No live B2B products.</div>'}catch(e){}return r};wrapped.__nel120=true;render=wrapped;window.render=wrapped;
      }
      if(typeof refresh==='function'&&!refresh.__nel120){
        var br=refresh;var rw=async function(){var r=await br.apply(this,arguments);try{renderMarketStrip()}catch(e){}return r};rw.__nel120=true;refresh=rw;window.refresh=rw;
      }
      renderMarketStrip();
      if(typeof DATA!=='undefined'&&DATA&&Array.isArray(DATA.products)){var host=document.getElementById('products');if(host)host.innerHTML=DATA.products.map(upgradedProductCard).join('')||'<div class="card">No live B2B products.</div>'}
    }catch(e){}
  }
  window.addEventListener('load',function(){[0,150,500,1200].forEach(function(ms){setTimeout(patch,ms)})},{once:true});
})();
