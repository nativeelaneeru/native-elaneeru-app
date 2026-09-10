/** Native Elaneeru V9.2.2 — resilient Barcode console catalogue. */
const V922_BARCODE_CONSOLE_VERSION='9.2.2';

function getBarcodeConsoleV922(email,pin){
  requireAdmin_(email,pin);
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
    products:products,
    batches:Array.isArray(batches)?batches.slice(-250).reverse():[],
    assignments:Array.isArray(assignments)?assignments.slice(-250).reverse():[]
  };
}

function getBarcodeConsoleHealthV922(){
  const all=productRows_();
  const selectable=all.filter(function(p){
    const id=s_(p['Product ID']).toUpperCase();
    return !!id&&(active_(p['B2C Status'])||active_(p['B2B Status'])||id==='TC');
  });
  return {ok:true,version:V922_BARCODE_CONSOLE_VERSION,productRows:all.length,selectableProducts:selectable.length,tenderCoconutForcedSelectable:true};
}
