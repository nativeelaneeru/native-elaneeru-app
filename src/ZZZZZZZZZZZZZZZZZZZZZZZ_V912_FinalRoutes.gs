/**
 * Native Elaneeru V9.1.2 — final Apps Script route owner.
 *
 * Older compatibility files also touched doGet(). This late wrapper makes the
 * current production routes deterministic while preserving the existing JSONP
 * catalogue/health endpoint.
 *
 * Important: HtmlOutput.addMetaTag() only supports Apps Script's permitted
 * meta names. Page-specific theme-color tags belong inside each HTML template.
 */
const V912_PREVIOUS_DO_GET = doGet;

function doGetV912_(e){
  const params=e&&e.parameter?e.parameter:{};
  const jsonp=String(params.jsonp||'')==='1';
  if(jsonp)return V912_PREVIOUS_DO_GET(e);

  const isBridge=String(params.bridge||'')==='1';
  if(isBridge)return bridgeHtml_({ok:false,error:'POST required.',requestId:''});

  const p=String(params.page||'').toLowerCase();
  const routes={
    '':'index','home':'index','b2c':'index','b2b':'B2B',
    'admin':'Admin','dashboard':'CumulativeDashboard','cumulative':'CumulativeDashboard','controltower':'CumulativeDashboard',
    'payments':'PaymentVerification','paymentverification':'PaymentVerification','upiverification':'PaymentVerification',
    'sales':'Sales','picker':'Picker','barcode':'Barcode','inventory':'Inventory',
    'vendor':'VendorOnboardingV910','vendoronboarding':'VendorOnboardingV910',
    'approvals':'VendorApproval','vendorapproval':'VendorApproval',
    'b2bdriver':'Driver','driver':'Driver',
    'b2cdelivery':'Delivery','delivery':'Delivery',
    'routeplanner':'Admin'
  };
  const page=routes[p]||'index';
  const out=HtmlService.createTemplateFromFile(page).evaluate();
  if(page!=='index'){
    try{out.append(HtmlService.createTemplateFromFile('SharedUX').evaluate().getContent());}catch(err){}
  }
  if(page==='Admin'){
    try{out.append(HtmlService.createTemplateFromFile('AdminFixesV915').evaluate().getContent());}catch(err){}
    try{out.append(HtmlService.createTemplateFromFile('AdminAccessV917').evaluate().getContent());}catch(err){}
    try{out.append(HtmlService.createTemplateFromFile('AdminAccessDeliveryV920').evaluate().getContent());}catch(err){}
    try{out.append(HtmlService.createTemplateFromFile('AdminBarcodeV926').evaluate().getContent());}catch(err){}
  }
  if(page==='VendorApproval'){
    try{out.append(HtmlService.createTemplateFromFile('VendorApprovalFixV916').evaluate().getContent());}catch(err){}
  }
  if(page==='VendorOnboardingV910'){
    try{out.append(HtmlService.createTemplateFromFile('VendorOnboardingFixV918').evaluate().getContent());}catch(err){}
  }
  if(page==='Delivery'){
    try{out.append(HtmlService.createTemplateFromFile('DeliveryFixV918').evaluate().getContent());}catch(err){}
  }
  if(page==='Barcode'){
    try{out.append(HtmlService.createTemplateFromFile('BarcodeFixV922').evaluate().getContent());}catch(err){}
    try{out.append(HtmlService.createTemplateFromFile('BarcodeTabsV925').evaluate().getContent());}catch(err){}
  }
  return out
    .setTitle(V8.BRAND+' - '+(page==='index'?'B2C':page))
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport','width=device-width, initial-scale=1, viewport-fit=cover');
}

doGet=doGetV912_;