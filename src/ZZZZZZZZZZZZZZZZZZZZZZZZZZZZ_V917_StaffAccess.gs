/** Native Elaneeru V9.1.7 — Admin-managed staff access. */
const V917_ACCESS_VERSION='9.1.7';

function v917RoleConfig_(role){
  role=s_(role).toUpperCase();
  const map={
    SALES:{role:'SALES',allowedApp:'VENDOR_ONBOARDING',label:'Vendor Onboarding'},
    PICKER:{role:'PICKER',allowedApp:'PICKER',label:'Picker'}
  };
  return map[role]||null;
}

function getStaffAccessAdminV917(email,pin){
  requireAdmin_(email,pin);
  const list=rows_(V8.SHEETS.STAFF).map(function(r){
    return {
      staffId:s_(r['Staff ID']),name:s_(r.Name),mobile:digits_(r.Mobile),role:s_(r.Role).toUpperCase(),
      allowedApp:s_(r['Allowed App']),status:s_(r.Status).toUpperCase()||'INACTIVE',
      lastLogin:fmtDT_(r['Last Login']),createdAt:fmtDT_(r['Created At']),updatedAt:fmtDT_(r['Updated At'])
    };
  }).sort(function(a,b){if(a.status!==b.status)return a.status==='ACTIVE'?-1:1;return a.name.localeCompare(b.name);});
  return {ok:true,version:V917_ACCESS_VERSION,rows:list,roles:[
    {value:'SALES',label:'Sales · Vendor Onboarding'},
    {value:'PICKER',label:'Picker'}
  ],storageSheet:V8.SHEETS.STAFF,pinStoredAsHash:true};
}

function grantStaffAccessV917(email,pin,payload){
  requireAdmin_(email,pin);payload=payload||{};
  const name=s_(payload.name),mobile=digits_(payload.mobile),staffPin=s_(payload.staffPin),cfg=v917RoleConfig_(payload.role);
  if(!name)throw new Error('Staff name is required.');
  if(!/^[6-9]\d{9}$/.test(mobile))throw new Error('Enter a valid 10 digit staff mobile number.');
  if(!cfg)throw new Error('Choose a supported staff role.');
  if(!/^\d{4,8}$/.test(staffPin))throw new Error('Set a 4–8 digit numeric PIN.');
  return lockRun_(function(){
    const existing=rows_(V8.SHEETS.STAFF).find(function(r){return digits_(r.Mobile)===mobile;});
    const now=now_(),staffId=existing?(s_(existing['Staff ID'])||id_('STF-')):id_('STF-');
    const obj={'Staff ID':staffId,Name:name,Mobile:mobile,Role:cfg.role,'Allowed App':cfg.allowedApp,'PIN Hash':hashV8_(staffPin),Status:'ACTIVE','Updated At':now};
    if(existing)updateObj_(V8.SHEETS.STAFF,existing._row,obj);else append_(V8.SHEETS.STAFF,Object.assign(obj,{'Created At':now}));
    return {success:true,staffId:staffId,name:name,mobile:mobile,role:cfg.role,allowedApp:cfg.allowedApp,status:'ACTIVE',updatedExisting:!!existing};
  });
}

function resetStaffPinV917(email,pin,staffId,newPin){
  requireAdmin_(email,pin);staffId=s_(staffId);newPin=s_(newPin);
  if(!/^\d{4,8}$/.test(newPin))throw new Error('Set a 4–8 digit numeric PIN.');
  const row=rows_(V8.SHEETS.STAFF).find(function(r){return s_(r['Staff ID'])===staffId;});
  if(!row)throw new Error('Staff user not found.');
  updateObj_(V8.SHEETS.STAFF,row._row,{'PIN Hash':hashV8_(newPin),'Updated At':now_()});
  return {success:true,staffId:staffId,mobile:digits_(row.Mobile)};
}

function setStaffAccessStatusV917(email,pin,staffId,status){
  requireAdmin_(email,pin);staffId=s_(staffId);status=s_(status).toUpperCase();
  if(!['ACTIVE','INACTIVE'].includes(status))throw new Error('Status must be ACTIVE or INACTIVE.');
  const row=rows_(V8.SHEETS.STAFF).find(function(r){return s_(r['Staff ID'])===staffId;});
  if(!row)throw new Error('Staff user not found.');
  updateObj_(V8.SHEETS.STAFF,row._row,{Status:status,'Updated At':now_()});
  return {success:true,staffId:staffId,status:status};
}

function getStaffAccessHealthV917(){return {ok:true,version:V917_ACCESS_VERSION,adminManaged:true,storageSheet:'Staff_Users',pinStoredAsHash:true,roles:['SALES','PICKER']};}
