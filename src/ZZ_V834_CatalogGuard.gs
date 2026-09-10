/** Native Elaneeru V8.3.4 catalog guards. */

const V834_ORIGINAL_GET_APP_CONFIG = getAppConfig;
getAppConfig = function(){
  ensureTenderCoconutLiveV834_();
  const out = V834_ORIGINAL_GET_APP_CONFIG();
  if(Array.isArray(out.products)){
    out.products.sort((a,b)=>{
      if(s_(a.productId).toUpperCase()==='TC') return -1;
      if(s_(b.productId).toUpperCase()==='TC') return 1;
      return n_(a.displayOrder)-n_(b.displayOrder);
    });
  }
  out.appVersion = '8.3.4';
  return out;
};

const V834_ORIGINAL_B2B_PRODUCTS = b2bProducts_;
b2bProducts_ = function(vendorId){
  ensureTenderCoconutLiveV834_();
  const out = V834_ORIGINAL_B2B_PRODUCTS(vendorId);
  out.sort((a,b)=>{
    if(s_(a.productId).toUpperCase()==='TC') return -1;
    if(s_(b.productId).toUpperCase()==='TC') return 1;
    return s_(a.productName).localeCompare(s_(b.productName));
  });
  return out;
};
