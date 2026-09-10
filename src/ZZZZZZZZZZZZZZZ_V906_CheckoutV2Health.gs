/** Read-only diagnostics for B2C Checkout Engine V2. */
function getB2COrderEngineHealthV906(){
  const src=String(saveOrderV905_||''),pub=String(saveOrder||'');
  const checks={
    canonicalOrderHandler:pub.indexOf('saveOrderV905_')>=0,
    singleSpreadsheetOpen:(src.match(/SpreadsheetApp\.openById\(/g)||[]).length===1,
    targetedCustomerLookup:src.indexOf('v905CustomerSnapshot_')>=0,
    shortWriteLock:src.indexOf('v905TryWriteLock_')>=0,
    batchItemWrite:src.indexOf('setValues(itemRows)')>=0,
    cachedProducts:src.indexOf('v905B2CProducts_')>=0,
    noFullCustomerRowsScan:src.indexOf('rows_(V8.SHEETS.CUSTOMERS)')<0,
    idempotency:src.indexOf('v905FindExisting_')>=0,
    serverControlledPayment:src.indexOf("'Payment Type':'COD'")>=0
  };
  const ok=Object.keys(checks).every(function(k){return checks[k]===true;});
  return Object.assign({
    ok:ok,
    diagnosticVersion:'9.0.6',
    engineVersion:'9.0.5',
    targetConfirmationSeconds:'1-4'
  },checks);
}
