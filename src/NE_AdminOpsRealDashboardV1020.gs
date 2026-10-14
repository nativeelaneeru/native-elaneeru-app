/**
 * Native Elaneeru Admin Operations V10.2.0 — authenticated, read-only real Sheets.
 * Internal Apps Script Admin only; NEVER expose this through the public bridge or GitHub Pages.
 * Incomplete inventory/payment records are explicitly flagged, not guessed.
 */
const NE_OPS_REAL_V1020='10.2.0';
function neOps1020Read_(sheet){
  const data=rows_(sheet);
  if(!Array.isArray(data))throw new Error('Operations source '+sheet+' is unavailable.');
  return data;
}
function neOps1020Text_(v){return String(v==null?'':v).trim();}
function neOps1020Number_(v){const n=Number(String(v==null?'':v).replace(/[₹,]/g,'').trim());return Number.isFinite(n)?n:0;}
function neOps1020Status_(v){return neOps1020Text_(v).toUpperCase().replace(/\s+/g,' ');}
function neOps1020Date_(v){
  if(!v)return '';
  if(typeof v964DateKey_==='function')return v964DateKey_(v);
  if(Object.prototype.toString.call(v)==='[object Date]'&&!isNaN(v.getTime()))return Utilities.formatDate(v,'Asia/Kolkata','yyyy-MM-dd');
  const s=neOps1020Text_(v),match=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(match)return match[1]+'-'+match[2]+'-'+match[3];
  const d=new Date(s);
  return isNaN(d.getTime())?'':Utilities.formatDate(d,'Asia/Kolkata','yyyy-MM-dd');
}
function neOps1020Money_(v){return Math.max(0,neOps1020Number_(v));}
function neOps1020AddIssue_(items,level,code,title,details,target){
  items.push({severity:level,code:code,title:title,detail:details,target:target||'overview'});
}
function getNEOpsLiveSnapshotV1020(email,pin){
  requireAdmin_(email,pin);
  const ordersB2c=neOps1020Read_(V8.SHEETS.ORDERS),ordersB2b=neOps1020Read_(V8.SHEETS.B2B_ORDERS);
  const poRows=neOps1020Read_('Purchase_Orders'),poItems=neOps1020Read_('Purchase_Order_Items');
  const batchRows=neOps1020Read_(V8.SHEETS.BATCHES),ledgerRows=neOps1020Read_(V8.SHEETS.INVENTORY);
  const collections=neOps1020Read_(V8.SHEETS.COLLECTIONS),paymentLedger=neOps1020Read_(V8.SHEETS.PAYMENTS);
  const routes=neOps1020Read_(V8.SHEETS.ROUTES),stops=neOps1020Read_(V8.SHEETS.STOPS);
  const now=new Date(),today=Utilities.formatDate(now,'Asia/Kolkata','yyyy-MM-dd'),issues=[];
  const used=Object.create(null),duplicates=Object.create(null),orderAll=[],statusCounts=Object.create(null);
  let demoRows=0,duplicateRows=0,flaggedHighValue=0,emptyIds=0,invalidValues=0,booked=0,delivered=0,bookedB2c=0,bookedB2b=0,deliveredB2c=0,deliveredB2b=0;
  let collected=0,paymentPending=0,eligible=0,orderCount=0,deliveredCount=0;
  const sourceOrders=[{channel:'B2C',rows:ordersB2c},{channel:'B2B',rows:ordersB2b}];
  const dupCounter=Object.create(null);
  sourceOrders.forEach(function(source){
    source.rows.forEach(function(r){
      const id=neOps1020Text_(r['Order ID']);
      if(!id||/DEMO|SAMPLE|TEST/i.test(id))return;
      const key=source.channel+':'+id;dupCounter[key]=(dupCounter[key]||0)+1;
    });
  });
  sourceOrders.forEach(function(source){
    source.rows.forEach(function(r){
      const id=neOps1020Text_(r['Order ID']),channel=source.channel;
      if(!id){emptyIds++;return;}
      if(/DEMO|SAMPLE|TEST/i.test(id)){demoRows++;return;}
      const key=channel+':'+id,duplicate=dupCounter[key]>1;
      if(used[key]){duplicateRows++;return;}used[key]=1;
      const date=neOps1020Date_(r['Ordered At']||r['Created At']||r.Date);
      const status=neOps1020Status_(r.Status)||'UNKNOWN';
      const amount=neOps1020Money_(r['Final Amount'])||neOps1020Money_(r['Total Amount']);
      // Flag high-value rows, do not count them as verified business metrics.
      const highValue=amount>500000,invalid=amount<=0;
      const suspicious=duplicate||highValue||invalid;
      if(duplicate)duplicates[key]=1;if(highValue)flaggedHighValue++;if(invalid)invalidValues++;
      const payment=neOps1020Status_(r['Payment Status']||r.Payment)||'UNKNOWN';
      const normalized={id:id,channel:channel,date:date,status:status,amount:amount,paymentStatus:payment,flag:suspicious?(duplicate?'DUPLICATE ID':highValue?'REVIEW HIGH VALUE':'MISSING VALUE'):'',source:'LIVE SHEET'};
      if(!['CANCELLED','REJECTED','REFUNDED','FAILED'].includes(status)&&!suspicious){
        booked+=amount;eligible++;if(channel==='B2B')bookedB2b+=amount;else bookedB2c+=amount;
        if(['DELIVERED','COMPLETED'].includes(status)){delivered+=amount;deliveredCount++;if(channel==='B2B')deliveredB2b+=amount;else deliveredB2c+=amount;}
      }
      if(['PAID','COLLECTED','SUCCESS','COMPLETED'].includes(payment))collected++;
      else if(!['CANCELLED','REJECTED','FAILED','REFUNDED'].includes(status))paymentPending++;
      orderAll.push(normalized);orderCount++;
      statusCounts[status]=(statusCounts[status]||0)+1;
    });
  });
  // Purchase order status must remain as actually recorded; receipt numbers are from PO items only.
  const poTotals=Object.create(null);
  poItems.forEach(function(i){
    const id=neOps1020Text_(i['PO ID']);if(!id)return;
    if(!poTotals[id])poTotals[id]={ordered:0,received:0,lines:0};
    poTotals[id].ordered+=Math.max(0,neOps1020Number_(i.Quantity));
    poTotals[id].received+=Math.max(0,neOps1020Number_(i['Received Qty']));
    poTotals[id].lines++;
  });
  let poOrdered=0,poReceived=0,poPending=0,poMissingExpected=0,poOpen=0,poOverReceived=0,poValue=0;
  const pos=poRows.filter(function(r){return neOps1020Text_(r['PO ID']);}).map(function(r){
    const id=neOps1020Text_(r['PO ID']),t=poTotals[id]||{ordered:0,received:0,lines:0};
    const expected=neOps1020Date_(r['Expected Date']),status=neOps1020Status_(r.Status)||'UNKNOWN';
    const ordered=t.ordered,received=t.received,pending=Math.max(0,ordered-received),isCancelled=status==='CANCELLED';
    if(!isCancelled){poOrdered+=ordered;poReceived+=received;poPending+=pending;poValue+=neOps1020Money_(r['Sub Total']);if(pending>0)poOpen++;}
    if(!expected&&!isCancelled)poMissingExpected++;
    if(received>ordered)poOverReceived++;
    return {id:id,supplier:neOps1020Text_(r['Supplier Name'])||'Supplier not named',status:status,expected:expected,created:neOps1020Date_(r['PO Date']||r['Created At']),ordered:ordered,received:received,pending:pending,value:neOps1020Money_(r['Sub Total']),lineCount:t.lines,missingExpected:!expected};
  }).sort(function(a,b){return b.created.localeCompare(a.created);});
  // Recorded inwarding is distinct from physical verified quantities.
  // If the ledger is empty, no receiving-event truth can be established.
  let ledgerIn=0,ledgerOut=0,ledgerInEvents=0;
  const ledgerMoves=ledgerRows.filter(function(r){return neOps1020Text_(r['Movement ID']);}).map(function(r){
    const type=neOps1020Status_(r['Movement Type']),quantityIn=neOps1020Money_(r['Qty In']),quantityOut=neOps1020Money_(r['Qty Out']);
    ledgerIn+=quantityIn;ledgerOut+=quantityOut;
    if(quantityIn>0)ledgerInEvents++;
    return {id:neOps1020Text_(r['Movement ID']),date:neOps1020Date_(r['Created At']),product:neOps1020Text_(r['Product Name']),batch:neOps1020Text_(r['Batch ID']),reference:neOps1020Text_(r['Reference ID']),type:type,inQty:quantityIn,outQty:quantityOut};
  });
  const inventoryLedgerComplete=ledgerMoves.length>0; // nonempty does NOT prove completeness; review reconciliation flags.
  let batchOriginal=0,batchAvailable=0,batchReserved=0,batchDelivered=0,batchMismatch=0,demoBatches=0;
  const batches=batchRows.filter(function(r){return neOps1020Text_(r['Batch ID']);}).map(function(r){
    const id=neOps1020Text_(r['Batch ID']),original=neOps1020Money_(r['Original Qty']),available=neOps1020Money_(r['Available Qty']),reserved=neOps1020Money_(r['Reserved Qty']),deliveredQty=neOps1020Money_(r['Delivered Qty']);
    const demo=/DEMO|SAMPLE|TEST/i.test(id);
    if(demo){demoBatches++;return null;}
    const variance=original-available-reserved-deliveredQty;
    batchOriginal+=original;batchAvailable+=available;batchReserved+=reserved;batchDelivered+=deliveredQty;if(variance!==0)batchMismatch++;
    return {id:id,product:neOps1020Text_(r['Product Name']),productId:neOps1020Text_(r['Product ID']),status:neOps1020Status_(r.Status),created:neOps1020Date_(r['Created At']),original:original,available:available,reserved:reserved,delivered:deliveredQty,variance:variance};
  }).filter(Boolean);
  const activeRoutes=routes.filter(function(r){return neOps1020Status_(r.Status)==='ACTIVE';}).length;
  const pendingStops=stops.filter(function(r){return ['PENDING','CHECKED_IN','EN_ROUTE','ASSIGNED'].includes(neOps1020Status_(r.Status));}).length;
  const delivery={routeCount:routes.filter(function(r){return neOps1020Text_(r['Route ID']);}).length,activeRoutes:activeRoutes,pendingStops:pendingStops,stopCount:stops.filter(function(r){return neOps1020Text_(r['Stop ID']);}).length};
  if(duplicateRows)neOps1020AddIssue_(issues,'CRITICAL','DUPLICATE_ORDERS','Duplicate sales order IDs',duplicateRows+' additional order row(s) share an existing ID. Excluded duplicated IDs from provisional GMV.','sales');
  if(flaggedHighValue)neOps1020AddIssue_(issues,'CRITICAL','HIGH_VALUE_ORDER','Unverified unusually large orders',flaggedHighValue+' order(s) exceed the ₹5,00,000 review threshold and are excluded from provisional GMV. Check against item quantities.','sales');
  if(invalidValues)neOps1020AddIssue_(issues,'WARN','MISSING_VALUE','Orders missing payable amount',invalidValues+' order(s) have zero or missing order amount and are excluded from provisional GMV.','sales');
  if(poMissingExpected)neOps1020AddIssue_(issues,'WARN','MISSING_ETA','Purchase orders missing expected arrival',poMissingExpected+' PO(s) have no Expected Date. Overdue status cannot be determined.','po');
  if(poOpen)neOps1020AddIssue_(issues,'ACTION','PO_OPEN','Purchase orders awaiting inwarding',poOpen+' PO(s) with '+poPending+' pieces not yet recorded as received.','po');
  if(poOverReceived)neOps1020AddIssue_(issues,'CRITICAL','PO_OVER_RECEIVED','PO items received beyond ordered quantity',poOverReceived+' PO(s) have received quantity greater than ordered.','po');
  if(!inventoryLedgerComplete)neOps1020AddIssue_(issues,'CRITICAL','LEDGER_EMPTY','Inventory movement ledger is empty','There are no inventory movement records, so warehouse stock and PO inwarding cannot be physically reconciled.','stock');
  if(batchMismatch)neOps1020AddIssue_(issues,'CRITICAL','BATCH_MISMATCH','Batch stock quantities do not reconcile',batchMismatch+' batch(es) differ from original = available + reserved + delivered.','stock');
  if(poReceived>0&&ledgerIn===0)neOps1020AddIssue_(issues,'CRITICAL','PO_LEDGER_MISSING','Purchase receipts missing inventory movement',poReceived+' received PO units but no inbound movements in the ledger.','inward');
  if(paymentPending)neOps1020AddIssue_(issues,'WARN','PAYMENT_PENDING','Order payments need reconciliation',paymentPending+' non-cancelled order(s) are not marked paid; do not equate delivered GMV with collections.','sales');
  if(!collections.length&&!paymentLedger.length)neOps1020AddIssue_(issues,'WARN','COLLECTIONS_EMPTY','Collection ledgers have no entries','Both B2B_Collections and Payment_Ledger are empty. Financial settlements cannot be verified.','sales');
  if(pendingStops)neOps1020AddIssue_(issues,'ACTION','STOPS_PENDING','Delivery route stops still open',pendingStops+' stop(s) are pending or active; check route fulfillment status.','delivery');
  // Restrict frontend payload to IDs and operation metadata; no customer contact, bank or location details.
  return {
    success:true,version:NE_OPS_REAL_V1020,live:true,readOnly:true,
    generatedAt:Utilities.formatDate(now,'Asia/Kolkata','yyyy-MM-dd HH:mm:ss')+' IST',asOf:today,
    metrics:{orders:orderCount,bookings:eligible,bookedGmv:booked,deliveredGmv:delivered,bookedB2C:bookedB2c,bookedB2B:bookedB2b,deliveredB2C:deliveredB2c,deliveredB2B:deliveredB2b,deliveredOrders:deliveredCount,paidStatusCount:collected,pendingPaymentCount:paymentPending,duplicateRows:duplicateRows,duplicateIds:Object.keys(duplicates).length,highValueOrders:flaggedHighValue,demoRowsExcluded:demoRows,invalidValues:invalidValues,
      poCount:pos.length,poValue:poValue,poOpen:poOpen,poOrdered:poOrdered,poReceived:poReceived,poPending:poPending,poMissingExpected:poMissingExpected,
      recordedBatchOriginal:batchOriginal,recordedAvailable:batchAvailable,recordedReserved:batchReserved,recordedDelivered:batchDelivered,batchMismatch:batchMismatch,demoBatchesExcluded:demoBatches,
      ledgerMovements:ledgerMoves.length,ledgerQtyIn:ledgerIn,ledgerQtyOut:ledgerOut,ledgerInEvents:ledgerInEvents,
      collectionsCount:collections.length,paymentLedgerCount:paymentLedger.length},
    verification:{sales:'PROVISIONAL · anomalies and uncollected payments',po:'RECORDED PO ITEM COUNTS · no unverified received quantity inferred',inward:inventoryLedgerComplete?'LEDGER ENTRIES PRESENT · reconciliation required':'UNVERIFIED · inventory ledger empty',stock:inventoryLedgerComplete&&batchMismatch===0?'REQUIRES PHYSICAL VERIFICATION':'UNVERIFIED · stock movement reconciliation missing',finance:collections.length+paymentLedger.length?'LEDGER ENTRIES PRESENT · reconcile totals':'UNVERIFIED · payment and collection ledgers empty'},
    sales:{orders:orderAll.sort(function(a,b){return b.date.localeCompare(a.date)}).slice(0,120),statuses:statusCounts},
    procurement:{orders:pos.slice(0,100)},
    inward:{events:ledgerMoves.slice(0,160),recordCount:ledgerMoves.length,verifiable:inventoryLedgerComplete},
    inventory:{batches:batches.slice(0,200)},
    delivery:delivery,
    issues:issues
  };
}
function neOpsRealHealthV1020(){return {ok:true,version:NE_OPS_REAL_V1020,requiresAdmin:true,readOnly:true,publicBridge:false};}
