/** Native Elaneeru V9.2.0 — Admin-managed B2C delivery + B2B driver access. */
const V920_DELIVERY_ACCESS_VERSION='9.2.0';

const V920_PREVIOUS_ROLE_CONFIG_=v917RoleConfig_;
v917RoleConfig_=function(role){
  role=s_(role).toUpperCase();
  const extra={
    DELIVERY_PARTNER:{role:'DELIVERY_PARTNER',label:'B2C Delivery Partner',defaultApps:['B2C_DELIVERY']},
    DRIVER:{role:'DRIVER',label:'B2B Driver',defaultApps:['B2B_DRIVER']},
    DELIVERY_DRIVER:{role:'DELIVERY_DRIVER',label:'B2C + B2B Delivery',defaultApps:['B2C_DELIVERY','B2B_DRIVER']}
  };
  return extra[role]||V920_PREVIOUS_ROLE_CONFIG_(role);
};

const V920_PREVIOUS_APP_CONFIG_=v917AppConfig_;
v917AppConfig_=function(app){
  app=s_(app).toUpperCase();
  const extra={
    B2C_DELIVERY:{value:'B2C_DELIVERY',label:'B2C Delivery'},
    B2B_DRIVER:{value:'B2B_DRIVER',label:'B2B Driver'}
  };
  return extra[app]||V920_PREVIOUS_APP_CONFIG_(app);
};

function v920DeliveryTypeFromApps_(apps){
  apps=Array.isArray(apps)?apps:[];
  const b2c=apps.indexOf('B2C_DELIVERY')>=0,b2b=apps.indexOf('B2B_DRIVER')>=0;
  return b2c&&b2b?'BOTH':(b2c?'B2C':(b2b?'B2B':''));
}

function v920EnsureDriverColumns_(){
  const sh=sh_(V8.SHEETS.DRIVERS);
  let last=sh.getLastColumn();
  let headers=last>0?sh.getRange(1,1,1,last).getValues()[0].map(s_):[];
  const required=['Driver ID','Driver Name','Mobile','PIN Hash','Delivery Type','Vehicle Number','Status','Last Login','Staff ID','Access Source','Created At','Updated At'];
  required.forEach(function(name){
    if(headers.indexOf(name)===-1){headers.push(name);sh.getRange(1,headers.length).setValue(name);}
  });
}

function v920SyncDriverAccess_(staff,staffPin,statusOverride){
  staff=staff||{};
  const mobile=digits_(staff.mobile),staffId=s_(staff.staffId),name=s_(staff.name)||'Delivery Partner';
  if(!/^[6-9]\d{9}$/.test(mobile))return null;
  v920EnsureDriverColumns_();
  const staffRow=rows_(V8.SHEETS.STAFF).find(function(r){return s_(r['Staff ID'])===staffId;});
  const apps=staffRow?v917AppsForRow_(staffRow):(Array.isArray(staff.allowedApps)?staff.allowedApps:[]);
  const deliveryType=v920DeliveryTypeFromApps_(apps);
  const existing=rows_(V8.SHEETS.DRIVERS).find(function(r){return digits_(r.Mobile)===mobile;});
  if(!deliveryType){
    if(existing&&(s_(existing['Access Source'])==='STAFF_ACCESS_V920'||s_(existing['Staff ID'])===staffId)){
      updateObj_(V8.SHEETS.DRIVERS,existing._row,{Status:'INACTIVE','Updated At':now_()});
    }
    return null;
  }
  const now=now_(),driverId=existing?(s_(existing['Driver ID'])||id_('DRV-')):id_('DRV-');
  const status=s_(statusOverride||staff.status||'ACTIVE').toUpperCase()==='INACTIVE'?'INACTIVE':'ACTIVE';
  const obj={
    'Driver ID':driverId,'Driver Name':name,Mobile:mobile,'Delivery Type':deliveryType,Status:status,
    'Staff ID':staffId,'Access Source':'STAFF_ACCESS_V920','Updated At':now
  };
  if(staffPin)obj['PIN Hash']=hashV8_(staffPin);
  if(existing)updateObj_(V8.SHEETS.DRIVERS,existing._row,obj);
  else append_(V8.SHEETS.DRIVERS,Object.assign(obj,{'PIN Hash':hashV8_(staffPin),'Created At':now}));
  return {driverId:driverId,deliveryType:deliveryType,status:status};
}

const V920_PREVIOUS_GRANT_STAFF_ACCESS_=grantStaffAccessV917;
grantStaffAccessV917=function(email,pin,payload){
  const result=V920_PREVIOUS_GRANT_STAFF_ACCESS_(email,pin,payload);
  const driver=v920SyncDriverAccess_(result,s_(payload&&payload.staffPin),result.status);
  if(driver){result.driverId=driver.driverId;result.deliveryType=driver.deliveryType;}
  return result;
};

const V920_PREVIOUS_RESET_STAFF_PIN_=resetStaffPinV917;
resetStaffPinV917=function(email,pin,staffId,newPin){
  const result=V920_PREVIOUS_RESET_STAFF_PIN_(email,pin,staffId,newPin);
  const row=rows_(V8.SHEETS.STAFF).find(function(r){return s_(r['Staff ID'])===s_(staffId);});
  if(row)v920SyncDriverAccess_({staffId:s_(row['Staff ID']),name:s_(row.Name),mobile:digits_(row.Mobile),status:s_(row.Status)},s_(newPin),s_(row.Status));
  return result;
};

const V920_PREVIOUS_SET_STAFF_STATUS_=setStaffAccessStatusV917;
setStaffAccessStatusV917=function(email,pin,staffId,status){
  const result=V920_PREVIOUS_SET_STAFF_STATUS_(email,pin,staffId,status);
  const row=rows_(V8.SHEETS.STAFF).find(function(r){return s_(r['Staff ID'])===s_(staffId);});
  if(row){
    const driver=rows_(V8.SHEETS.DRIVERS).find(function(r){return digits_(r.Mobile)===digits_(row.Mobile);});
    if(driver&&(s_(driver['Access Source'])==='STAFF_ACCESS_V920'||s_(driver['Staff ID'])===s_(staffId))){
      updateObj_(V8.SHEETS.DRIVERS,driver._row,{Status:s_(status).toUpperCase(),'Updated At':now_()});
    }
  }
  return result;
};

const V920_PREVIOUS_GET_STAFF_ACCESS_ADMIN_=getStaffAccessAdminV917;
getStaffAccessAdminV917=function(email,pin){
  const out=V920_PREVIOUS_GET_STAFF_ACCESS_ADMIN_(email,pin)||{};
  out.version=V920_DELIVERY_ACCESS_VERSION;
  out.roles=[
    {value:'SALES',label:'Sales Executive'},
    {value:'SALES_MANAGER',label:'Sales Manager'},
    {value:'OPERATIONS',label:'Operations'},
    {value:'FIELD_EXECUTIVE',label:'Field Executive'},
    {value:'PICKER',label:'Picker'},
    {value:'DELIVERY_PARTNER',label:'B2C Delivery Partner'},
    {value:'DRIVER',label:'B2B Driver'},
    {value:'DELIVERY_DRIVER',label:'B2C + B2B Delivery'}
  ];
  out.apps=[
    {value:'VENDOR_ONBOARDING',label:'Vendor Onboarding'},
    {value:'PICKER',label:'Picker'},
    {value:'B2C_DELIVERY',label:'B2C Delivery'},
    {value:'B2B_DRIVER',label:'B2B Driver'}
  ];
  const drivers=rows_(V8.SHEETS.DRIVERS);
  (Array.isArray(out.rows)?out.rows:[]).forEach(function(r){
    const d=drivers.find(function(x){return digits_(x.Mobile)===digits_(r.mobile);});
    if(d){r.driverId=s_(d['Driver ID']);r.deliveryType=s_(d['Delivery Type']);r.vehicle=s_(d['Vehicle Number']);}
  });
  out.deliveryAccessManaged=true;
  return out;
};

const V920_PREVIOUS_STAFF_ACCESS_HEALTH_=getStaffAccessHealthV917;
getStaffAccessHealthV917=function(){
  const out=V920_PREVIOUS_STAFF_ACCESS_HEALTH_()||{};
  out.version=V920_DELIVERY_ACCESS_VERSION;
  out.roles=['SALES','SALES_MANAGER','OPERATIONS','FIELD_EXECUTIVE','PICKER','DELIVERY_PARTNER','DRIVER','DELIVERY_DRIVER'];
  out.apps=['VENDOR_ONBOARDING','PICKER','B2C_DELIVERY','B2B_DRIVER'];
  out.deliveryAccessManaged=true;
  out.driverStorageSheet=V8.SHEETS.DRIVERS;
  return out;
};
