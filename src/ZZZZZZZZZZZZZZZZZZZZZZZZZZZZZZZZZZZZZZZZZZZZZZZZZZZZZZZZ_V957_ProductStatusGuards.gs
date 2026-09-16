/** Native Elaneeru V9.5.7 — server-side product status and stock guards. */
const V957_BASE_B2C_PRODUCTS_=v905B2CProducts_;
v905B2CProducts_=function(productSh){
  const products=V957_BASE_B2C_PRODUCTS_.apply(this,arguments);
  try{
    const rows=v908RowsFromSheet_(productSh),byId={};
    rows.forEach(function(r){byId[s_(r['Product ID'])]=r});
    const stock={};if(typeof getBunchStockV944==='function')getBunchStockV944().forEach(function(x){stock[s_(x.productId)]=x});
    return (products||[]).filter(function(p){
      const id=s_(p.productId),row=byId[id]||{},x=stock[id];
      if(s_(row['B2C Stock Override']).toUpperCase()==='OOS')return false;
      if(x&&x.tracked&&s_(x.stockStatus).toUpperCase()==='OOS')return false;
      return true;
    });
  }catch(e){return products}
};

const V957_BASE_B2B_QUOTE_=v916B2BQuote_;
v916B2BQuote_=function(vendor,payload){
  const quote=V957_BASE_B2B_QUOTE_.apply(this,arguments);
  (quote&&quote.lines||[]).forEach(function(line){
    const p=line&&line.product||{},qty=n_(line&&line.qty);
    if(p.stockTracked&&s_(p.stockStatus).toUpperCase()==='OOS')throw new Error((p.productName||'Product')+' is out of stock.');
    if(p.stockTracked&&n_(p.availableQty)>=0&&qty>n_(p.availableQty))throw new Error('Only '+n_(p.availableQty)+' '+(p.productName||'product')+' available.');
  });
  return quote;
};

function getProductStatusGuardHealthV957(){
  return {ok:true,version:'9.5.7',b2cOosBlockedServerSide:true,b2bOosBlockedServerSide:true,b2bQuantityGuard:true,createsOrder:false};
}
