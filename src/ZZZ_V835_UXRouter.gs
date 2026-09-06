const V835_APP_VERSION = '8.3.5';

function doGet(e){
  const isBridge=String(e&&e.parameter&&e.parameter.bridge||'')==='1';
  if(isBridge){
    return bridgeHtml_({ok:false,error:'POST required.',requestId:''});
  }
  const p=String(e&&e.parameter&&e.parameter.page||'').toLowerCase();
  const routes={
    '':'index','home':'index','b2c':'index','b2b':'B2B',
    'admin':'Admin','sales':'Sales','picker':'Picker','barcode':'Barcode','inventory':'Inventory',
    'vendor':'VendorOnboarding','vendoronboarding':'VendorOnboarding',
    'b2bdriver':'Driver','driver':'Driver',
    'b2cdelivery':'Delivery','delivery':'Delivery',
    'routeplanner':'Admin'
  };
  const page=routes[p]||'index';
  const out=HtmlService.createTemplateFromFile(page).evaluate();
  if(page!=='index'){
    try{ out.append(HtmlService.createTemplateFromFile('SharedUX').evaluate().getContent()); }catch(err){}
  }
  return out
    .setTitle(V8.BRAND+' - '+(page==='index'?'B2C':page))
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport','width=device-width, initial-scale=1')
    .addMetaTag('theme-color','#137333');
}
