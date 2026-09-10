/**
 * Native Elaneeru V8.4.2 — fast B2C customer profile persistence.
 * Avoids scanning the full Customers sheet and performs a single-row write.
 */
function v842CustomerColumns_(){
  const sh=sh_(V8.SHEETS.CUSTOMERS);
  const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(s_);
  const columns={}; headers.forEach((h,i)=>{if(h&&!columns[h])columns[h]=i;});
  return {sh,headers,columns};
}
function v842FindCustomerRow_(sh,mobileColumn,mobile){
  const last=sh.getLastRow();
  if(last<2) return 0;
  const hit=sh.getRange(2,mobileColumn+1,last-1,1)
    .createTextFinder(String(mobile)).matchEntireCell(true).findNext();
  return hit?hit.getRow():0;
}
saveCustomerProfile=function(p){
  p=p||{};
  const mobile=digits_(p.mobile), name=s_(p.name), address=s_(p.address), area=s_(p.area);
  if(!/^[6-9]\d{9}$/.test(mobile)||!name||!address||!area) throw new Error('Name, mobile, address and area are required.');
  return lockRun_(function(){
    const meta=v842CustomerColumns_(), sh=meta.sh, c=meta.columns;
    const row=v842FindCustomerRow_(sh,c.Mobile,mobile);
    const latitude=p.latitude===''||p.latitude==null?'':Number(p.latitude);
    const longitude=p.longitude===''||p.longitude==null?'':Number(p.longitude);
    let result;
    if(row){
      const values=sh.getRange(row,1,1,meta.headers.length).getValues()[0];
      const put=function(key,value){if(c[key]!==undefined) values[c[key]]=value;};
      put('Name',name); put('Address',address); put('Area',area); put('Pincode',s_(p.pincode));
      put('Latitude',latitude); put('Longitude',longitude); put('Status','ACTIVE'); put('Updated At',now_());
      sh.getRange(row,1,1,meta.headers.length).setValues([values]);
      result={exists:true,customerId:s_(values[c['Customer ID']]),mobile:mobile,name:name,address:address,area:area,landmark:s_(values[c.Landmark]),latitude:latitude,longitude:longitude};
    }else{
      const values=Array(meta.headers.length).fill('');
      const put=function(key,value){if(c[key]!==undefined) values[c[key]]=value;};
      put('Customer ID','CUST-'+mobile); put('Name',name); put('Mobile',mobile); put('WhatsApp',mobile);
      put('Address',address); put('Area',area); put('Pincode',s_(p.pincode)); put('Latitude',latitude); put('Longitude',longitude);
      put('Cashback Balance',0); put('Weekly Qty',0); put('Monthly Qty',0); put('Status','ACTIVE'); put('Created At',now_()); put('Updated At',now_());
      sh.getRange(sh.getLastRow()+1,1,1,meta.headers.length).setValues([values]);
      result={exists:true,customerId:'CUST-'+mobile,mobile:mobile,name:name,address:address,area:area,landmark:'',latitude:latitude,longitude:longitude};
    }
    return result;
  });
};