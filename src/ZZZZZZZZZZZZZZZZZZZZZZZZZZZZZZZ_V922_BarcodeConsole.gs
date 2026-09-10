/** Native Elaneeru V9.2.4 — resilient Barcode console catalogue + static RPC bridge. */
const V922_BARCODE_CONSOLE_VERSION='9.2.4';

function v923EnsureProductHeaders_(){
  const sh=sh_(V8.SHEETS.PRODUCTS);
  const required=[
    'Product ID','Product Name','Category','Unit','B2C Price','B2B Default Price',
    'B2C MOQ','B2B MOQ','Qty Step','Bundle Qty 1','Bundle Price 1',
    'Bundle Qty 2','Bundle Price 2','Barcode Required','B2C Status','B2B Status',
    'Sort Order','Image URL','Description','Created At','Updated At'
  ];
  if(sh.getLastColumn()===0||sh.getLastRow()===0){
    sh.getRange(1,1,1,required.length).setValues([required]);
    sh.setFrozenRows(1);
    return sh;
  }
  const existing=sh.getRange(1,1,1,Math.max(1,sh.getLastColumn())).getValues()[0].map(s_);
  required.forEach(function(h){
    if(existing.indexOf(h)===-1){
      sh.getRange(1,sh.getLastColumn()+1).setValue(h);
      existing.push(h);
    }
  });
  return sh;
}

function v923EnsureTenderCoconut_(){
  return lockRun_(function(){
    v923EnsureProductHeaders_();
    const all=productRows_();
    const tc=all.find(function(p){return s_(p['Product ID']).toUpperCase()==='TC';});
    if(tc){
      const patch={};
      if(!s_(tc['Product Name']))patch['Product Name']='Tender Coconut';
      if(!s_(tc.Category))patch.Category='Coconuts';
      if(!s_(tc.Unit))patch.Unit='pc';
      if(!n_(tc['B2C MOQ']))patch['B2C MOQ']=1;
      if(!n_(tc['B2B MOQ']))patch['B2B MOQ']=20;
      if(!n_(tc['Qty Step']))patch['Qty Step']=1;
      if(!s_(tc['Barcode Required']))patch['Barcode Required']='YES';
      if(s_(tc['B2C Status']).toUpperCase()!=='LIVE')patch['B2C Status']='LIVE';
      if(s_(tc['B2B Status']).toUpperCase()!=='LIVE')patch['B2B Status']='LIVE';
      if(!n_(tc['Sort Order']))patch['Sort Order']=1;
      if(Object.keys(patch).length){
        patch['Updated At']=now_();
        updateObj_(V8.SHEETS.PRODUCTS,tc._row,patch);
      }
      return {created:false,repaired:Object.keys(patch).length>0};
    }
    append_(V8.SHEETS.PRODUCTS,{
      'Product ID':'TC','Product Name':'Tender Coconut','Category':'Coconuts','Unit':'pc',
      'B2C Price':50,'B2B Default Price':39,'B2C MOQ':1,'B2B MOQ':20,'Qty Step':1,
      'Bundle Qty 1':5,'Bundle Price 1':240,'Bundle Qty 2':10,'Bundle Price 2':475,
      'Barcode Required':'YES','B2C Status':'LIVE','B2B Status':'LIVE','Sort Order':1,
      'Created At':now_(),'Updated At':now_()
    });
    return {created:true,repaired:true};
  });
}

function v924BarcodeJsonSafe_(value){
  if(value==null)return value;
  if(value instanceof Date)return Utilities.formatDate(value,'Asia/Kolkata',"yyyy-MM-dd'T'HH:mm:ssXXX");
  if(Array.isArray(value))return value.map(v924BarcodeJsonSafe_);
  if(typeof value==='object'){
    const out={};
    Object.keys(value).forEach(function(k){
      const v=value[k];
      if(typeof v!=='function'&&v!==undefined)out[k]=v924BarcodeJsonSafe_(v);
    });
    return out;
  }
  return value;
}

/**
 * Static Apps Script bridge for the Barcode page.
 * google.script.run is not a normal JavaScript object, so client-side dynamic
 * method access/apply can silently produce an undefined success result.
 * Keep the client call static and dispatch only this strict admin-safe allowlist.
 */
function barcodeRpcV924(method,args){
  method=s_(method);
  args=Array.isArray(args)?args:[];
  let result;
  switch(method){
    case 'getBarcodeConsoleV922':
      result=getBarcodeConsoleV922(args[0],args[1]);
      break;
    case 'createBatchV81':
      result=createBatchV81(args[0],args[1],args[2]||{});
      break;
    case 'assignBatchV81':
      result=assignBatchV81(args[0],args[1],args[2]||{});
      break;
    case 'markBatchPrintedV81':
      result=markBatchPrintedV81(args[0],args[1],args[2]);
      break;
    default:
      throw new Error('Barcode method is not allowed: '+method);
  }
  return v924BarcodeJsonSafe_(result);
}

function getBarcodeConsoleV922(email,pin){
  requireAdmin_(email,pin);
  const repair=v923EnsureTenderCoconut_();
  const all=productRows_();
  let products=all.filter(function(p){
    const id=s_(p['Product ID']).toUpperCase();
    return !!id && (active_(p['B2C Status'])||active_(p['B2B Status'])||id==='TC');
  });
  if(!products.length){
    products=all.filter(function(p){return !!s_(p['Product ID'])&&!!s_(p['Product Name']);});
  }
  products=products.map(function(p){
    return {
      id:s_(p['Product ID']),
      name:s_(p['Product Name'])||s_(p['Product ID']),
      barcodeRequired:s_(p['Barcode Required'])||'YES',
      b2cStatus:s_(p['B2C Status']),
      b2bStatus:s_(p['B2B Status'])
    };
  }).filter(function(p){return !!p.id;});

  const batches=rows_(V8.SHEETS.BATCHES);
  const assignments=rows_(V8.SHEETS.ASSIGNMENTS);
  return {
    ok:true,
    version:V922_BARCODE_CONSOLE_VERSION,
    productMasterRepair:repair,
    products:products,
    batches:Array.isArray(batches)?batches.slice(-250).reverse():[],
    assignments:Array.isArray(assignments)?assignments.slice(-250).reverse():[]
  };
}

function getBarcodeConsoleHealthV922(){
  v923EnsureProductHeaders_();
  const all=productRows_();
  const selectable=all.filter(function(p){
    const id=s_(p['Product ID']).toUpperCase();
    return !!id&&(active_(p['B2C Status'])||active_(p['B2B Status'])||id==='TC');
  });
  return {ok:true,version:V922_BARCODE_CONSOLE_VERSION,productRows:all.length,selectableProducts:selectable.length,tenderCoconutForcedSelectable:true};
}
