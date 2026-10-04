/** Native Elaneeru V9.6.8 — idempotent PO receipt to batch + inventory ledger. */
const V968_RECEIPTS_SHEET='Purchase_Receipts';
const V968_RECEIPT_HEADERS=['Receipt ID','Idempotency Key','PO ID','Line No','Product ID','Product Name','Quantity','Location','Starting Received Qty','Batch ID','Barcode','Status','Received By','Received At','Completed At','Notes'];

function v968ReceiptDto_(receipt,poStatus,remaining,idempotent){
  return {success:true,idempotent:!!idempotent,receiptId:s_(receipt['Receipt ID']),poId:s_(receipt['PO ID']),lineNo:n_(receipt['Line No']),qty:n_(receipt.Quantity),productId:s_(receipt['Product ID']),productName:s_(receipt['Product Name']),location:s_(receipt.Location),batchId:s_(receipt['Batch ID']),barcode:s_(receipt.Barcode),status:s_(receipt.Status),poStatus:poStatus||'',remainingQty:Math.max(0,n_(remaining))};
}

function v968FinalizeReceipt_(receipt){
  const receiptId=s_(receipt['Receipt ID']),poId=s_(receipt['PO ID']),lineNo=n_(receipt['Line No']),qty=n_(receipt.Quantity),productId=s_(receipt['Product ID']);
  const po=rows_(V931_PO_SHEET).find(function(r){return s_(r['PO ID'])===poId;});
  if(!po)throw new Error('Purchase order for this receipt no longer exists.');
  const item=rows_(V931_PO_ITEMS_SHEET).find(function(r){return s_(r['PO ID'])===poId&&n_(r['Line No'])===lineNo;});
  if(!item)throw new Error('Purchase order line for this receipt no longer exists.');
  const product=find_(V8.SHEETS.PRODUCTS,'Product ID',productId);
  if(!product)throw new Error('Product for this receipt no longer exists.');
  const batchId=s_(receipt['Batch ID']),barcode=s_(receipt.Barcode);
  if(!batchId||!barcode)throw new Error('Receipt is missing its batch or barcode identity.');
  const batches=rows_(V8.SHEETS.BATCHES);
  const batch=batches.find(function(r){return s_(r['Batch ID'])===batchId;});
  if(batch){
    if(s_(batch.Barcode)!==barcode||s_(batch['Product ID'])!==productId||n_(batch['Original Qty'])!==qty)throw new Error('Receipt batch identity conflicts with existing stock. Reconciliation is required.');
  }else{
    const now=now_();
    append_(V8.SHEETS.BATCHES,{'Batch ID':batchId,Barcode:barcode,'Product ID':productId,'Product Name':s_(product['Product Name']),'Original Qty':qty,'Available Qty':qty,'Reserved Qty':0,'Delivered Qty':0,Location:s_(receipt.Location)||'HUB','Picker ID':s_(receipt['Received By']),Printed:'NO',Status:'AVAILABLE','Created At':receipt['Received At']||now,'Updated At':now});
  }
  const movements=rows_(V8.SHEETS.INVENTORY);
  const movement=movements.find(function(r){return s_(r['Reference Type'])==='PURCHASE_RECEIPT'&&s_(r['Reference ID'])===receiptId;});
  if(movement){
    if(s_(movement['Batch ID'])!==batchId||s_(movement['Product ID'])!==productId||n_(movement['Qty In'])!==qty)throw new Error('Receipt inventory movement conflicts with its batch. Reconciliation is required.');
  }else{
    append_(V8.SHEETS.INVENTORY,{'Movement ID':id_('MOV-'),'Created At':receipt['Received At']||now_(),'Product ID':productId,'Product Name':s_(product['Product Name']),Location:s_(receipt.Location)||'HUB','Movement Type':'PURCHASE RECEIPT IN','Qty In':qty,'Qty Out':0,'Reference Type':'PURCHASE_RECEIPT','Reference ID':receiptId,'Batch ID':batchId,Reason:'Supplier PO '+poId+' receipt','User ID':s_(receipt['Received By'])});
  }
  const newReceived=n_(receipt['Starting Received Qty'])+qty;
  updateObj_(V931_PO_ITEMS_SHEET,item._row,{'Received Qty':newReceived});
  const poItems=rows_(V931_PO_ITEMS_SHEET).filter(function(r){return s_(r['PO ID'])===poId;});
  const ordered=poItems.reduce(function(sum,r){return sum+n_(r.Quantity);},0);
  const received=poItems.reduce(function(sum,r){return sum+n_(r['Received Qty']);},0);
  const remaining=Math.max(0,ordered-received);
  let poStatus=s_(po.Status).toUpperCase();
  if(poStatus!=='CANCELLED')poStatus=remaining===0?'RECEIVED':'PARTIALLY RECEIVED';
  if(s_(po.Status).toUpperCase()!=='CANCELLED')updateObj_(V931_PO_SHEET,po._row,{Status:poStatus,'Updated At':now_()});
  const receiptRow=rows_(V968_RECEIPTS_SHEET).find(function(r){return s_(r['Receipt ID'])===receiptId;});
  if(receiptRow)updateObj_(V968_RECEIPTS_SHEET,receiptRow._row,{Status:'COMPLETE','Completed At':now_()});
  try{CacheService.getScriptCache().remove('V944:BUNCH_STOCK');}catch(e){}
  receipt.Status='COMPLETE';
  return v968ReceiptDto_(receipt,poStatus,remaining,false);
}

/**
 * Records accepted physical units against one PO line. A single idempotency key
 * creates at most one receipt, barcode batch, and inventory movement. PROCESSING
 * records are safe to retry after a timeout because batch and ledger writes are upserted.
 */
function recordPurchaseOrderReceiptV968(email,pin,payload){
  requireAdmin_(email,pin);payload=payload||{};
  const poId=s_(payload.poId),lineNo=Number(payload.lineNo),qty=Number(payload.qty),location=s_(payload.location)||'HUB';
  const key=s_(payload.idempotencyKey).toUpperCase(),notes=s_(payload.notes).slice(0,250);
  if(!poId)throw new Error('Purchase order is required.');
  if(!Number.isInteger(lineNo)||lineNo<1)throw new Error('Purchase order line is invalid.');
  if(!Number.isInteger(qty)||qty<1)throw new Error('Received quantity must be a whole number greater than zero.');
  if(!/^[A-Z0-9_-]{12,80}$/.test(key))throw new Error('Receipt request key is invalid. Refresh the page and try again.');
  if(location.length>120)throw new Error('Storage location must be 120 characters or fewer.');
  return lockRun_(function(){
    v931Setup_();v931Ensure_(V968_RECEIPTS_SHEET,V968_RECEIPT_HEADERS);
    const receipts=rows_(V968_RECEIPTS_SHEET);
    let receipt=receipts.find(function(r){return s_(r['Idempotency Key']).toUpperCase()===key;});
    if(receipt){
      if(s_(receipt['PO ID'])!==poId||n_(receipt['Line No'])!==lineNo||n_(receipt.Quantity)!==qty||s_(receipt.Location)!==location)throw new Error('This receipt key was already used for different details. Refresh the page and submit again.');
      if(s_(receipt.Status).toUpperCase()==='COMPLETE'){
        const po=rows_(V931_PO_SHEET).find(function(r){return s_(r['PO ID'])===poId;});
        const line=rows_(V931_PO_ITEMS_SHEET).find(function(r){return s_(r['PO ID'])===poId&&n_(r['Line No'])===lineNo;});
        const all=rows_(V931_PO_ITEMS_SHEET).filter(function(r){return s_(r['PO ID'])===poId;});
        const remaining=Math.max(0,all.reduce(function(sum,r){return sum+n_(r.Quantity);},0)-all.reduce(function(sum,r){return sum+n_(r['Received Qty']);},0));
        return v968ReceiptDto_(receipt,po?s_(po.Status):'',remaining,true);
      }
      return v968FinalizeReceipt_(receipt);
    }
    // Recover a timed-out prior write on this PO line before accepting new units.
    const pending=receipts.find(function(r){return s_(r['PO ID'])===poId&&n_(r['Line No'])===lineNo&&s_(r.Status).toUpperCase()==='PROCESSING';});
    if(pending){
      const recovered=v968FinalizeReceipt_(pending);
      if(n_(pending.Quantity)===qty&&s_(pending.Location)===location)return Object.assign({},recovered,{idempotent:true});
    }
    const po=rows_(V931_PO_SHEET).find(function(r){return s_(r['PO ID'])===poId;});
    if(!po)throw new Error('Purchase order not found.');
    const status=s_(po.Status).toUpperCase();
    if(!['ISSUED','PARTIALLY RECEIVED'].includes(status))throw new Error('Only issued or partially received purchase orders can receive stock.');
    const item=rows_(V931_PO_ITEMS_SHEET).find(function(r){return s_(r['PO ID'])===poId&&n_(r['Line No'])===lineNo;});
    if(!item)throw new Error('Purchase order line not found.');
    const ordered=n_(item.Quantity),already=n_(item['Received Qty']),remaining=Math.max(0,ordered-already);
    if(qty>remaining)throw new Error('Received quantity exceeds the '+remaining+' unit(s) remaining on this PO line.');
    const product=find_(V8.SHEETS.PRODUCTS,'Product ID',s_(item['Product ID']));
    if(!product)throw new Error('Product for this PO line no longer exists.');
    const now=now_(),receiptId=id_('RCV-'),batchId=id_('BAT-');
    const barcode='NE-'+s_(product['Product ID'])+'-'+Utilities.formatDate(new Date(),'Asia/Kolkata','yyMMdd')+'-'+receiptId.replace(/[^A-Z0-9]/gi,'').slice(-8).toUpperCase();
    append_(V968_RECEIPTS_SHEET,{'Receipt ID':receiptId,'Idempotency Key':key,'PO ID':poId,'Line No':lineNo,'Product ID':s_(item['Product ID']),'Product Name':s_(item['Product Name'])||s_(product['Product Name']),'Quantity':qty,Location:location,'Starting Received Qty':already,'Batch ID':batchId,Barcode:barcode,Status:'PROCESSING','Received By':String(email||'').toLowerCase(),'Received At':now,'Completed At':'',Notes:notes});
    receipt=rows_(V968_RECEIPTS_SHEET).find(function(r){return s_(r['Receipt ID'])===receiptId;});
    if(!receipt)throw new Error('Receipt started but could not be read back. Retry the same request.');
    return v968FinalizeReceipt_(receipt);
  });
}

function getPurchaseOrderReceivingHealthV968(){
  return {ok:typeof recordPurchaseOrderReceiptV968==='function',version:'9.6.8',atomicLock:true,idempotent:true,createsBatch:true,writesInventoryLedger:true,overReceiptBlocked:true};
}