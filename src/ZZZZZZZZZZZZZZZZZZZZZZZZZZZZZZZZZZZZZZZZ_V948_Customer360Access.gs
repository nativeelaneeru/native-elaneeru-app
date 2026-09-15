/** Native Elaneeru V9.4.8 — private Customer 360 access for Admin + selected staff. */
const V948_CUSTOMER_360_ACCESS_VERSION='9.4.8';

const V948_PREVIOUS_APP_CONFIG_=v917AppConfig_;
v917AppConfig_=function(app){
  app=s_(app).toUpperCase();
  if(app==='CUSTOMER_360')return {value:'CUSTOMER_360',label:'Customer 360'};
  return V948_PREVIOUS_APP_CONFIG_(app);
};

function v948RequireCustomer360_(login,pin){
  login=s_(login);pin=s_(pin);
  if(adminOk_(login,pin))return {accessType:'ADMIN',name:'Admin',login:login};
  const staff=staffAppLoginV917_(digits_(login),pin,'CUSTOMER_360');
  return {accessType:'STAFF',staffId:staff.staffId,name:staff.name,mobile:staff.mobile,role:staff.role,allowedApps:staff.allowedApps};
}

function customer360LoginV948(login,pin){
  const user=v948RequireCustomer360_(login,pin);
  return {success:true,version:V948_CUSTOMER_360_ACCESS_VERSION,user:user};
}

function setCustomer360StaffAccessV948(email,pin,staffId,enabled){
  requireAdmin_(email,pin);staffId=s_(staffId);
  const row=rows_(V8.SHEETS.STAFF).find(function(r){return s_(r['Staff ID'])===staffId;});
  if(!row)throw new Error('Staff user not found.');
  let apps=v917AppsForRow_(row).filter(function(x){return x!=='CUSTOMER_360';});
  if(enabled===true)apps.push('CUSTOMER_360');
  if(!apps.length)throw new Error('Keep at least one staff app permission.');
  updateObj_(V8.SHEETS.STAFF,row._row,{'Allowed App':apps.join(','),'Updated At':now_()});
  audit_('STAFF ACCESS',enabled===true?'GRANT CUSTOMER 360':'REVOKE CUSTOMER 360','STAFF',staffId,email,'',apps.join(','));
  return {success:true,staffId:staffId,customer360:enabled===true,allowedApps:apps};
}

const V948_PREVIOUS_GET_STAFF_ACCESS_ADMIN_=getStaffAccessAdminV917;
getStaffAccessAdminV917=function(email,pin){
  const out=V948_PREVIOUS_GET_STAFF_ACCESS_ADMIN_(email,pin)||{};
  out.version=V948_CUSTOMER_360_ACCESS_VERSION;
  out.apps=Array.isArray(out.apps)?out.apps:[];
  if(!out.apps.some(function(x){return x&&x.value==='CUSTOMER_360';}))out.apps.push({value:'CUSTOMER_360',label:'Customer 360'});
  out.customer360AccessManaged=true;
  return out;
};

const V948_PREVIOUS_STAFF_ACCESS_HEALTH_=getStaffAccessHealthV917;
getStaffAccessHealthV917=function(){
  const out=V948_PREVIOUS_STAFF_ACCESS_HEALTH_()||{};
  out.version=V948_CUSTOMER_360_ACCESS_VERSION;
  out.apps=Array.isArray(out.apps)?out.apps:[];
  if(out.apps.indexOf('CUSTOMER_360')===-1)out.apps.push('CUSTOMER_360');
  out.customer360AccessManaged=true;
  return out;
};

