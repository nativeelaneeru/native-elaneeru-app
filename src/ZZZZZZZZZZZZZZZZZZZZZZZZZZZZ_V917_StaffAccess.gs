/** Native Elaneeru V9.1.9 — Admin-managed staff roles + scoped app access. */
const V917_ACCESS_VERSION='9.1.9';

function v917RoleConfig_(role){
  role=s_(role).toUpperCase();
  const map={
    SALES:{role:'SALES',label:'Sales Executive',defaultApps:['VENDOR_ONBOARDING']},
    SALES_MANAGER:{role:'SALES_MANAGER',label:'Sales Manager',defaultApps:['VENDOR_ONBOARDING']},
    OPERATIONS:{role:'OPERATIONS',label:'Operations',defaultApps:['VENDOR_ONBOARDING']},
    FIELD_EXECUTIVE:{role:'FIELD_EXECUTIVE',label:'Field Executive',defaultApps:['VENDOR_ONBOARDING']},
    PICKER:{role:'PICKER',label:'Picker',defaultApps:['PICKER']}
  };
  return map[role]||null;
}

function v917AppConfig_(app){
  app=s_(app).toUpperCase();
  const map={
    VENDOR_ONBOARDING:{value:'VENDOR_ONBOARDING',label:'Vendor Onboarding'},
    PICKER:{value:'PICKER',label:'Picker'}
  };
  return map[app]||null;
}

function v917AllowedApps_(value){
  const raw=Array.isArray(value)?value:String(value||'').split(/[;,|]/);
  const out=[];
  raw.forEach(function(x){
    const a=s_(x).toUpperCase();
    if(a&&v917AppConfig_(a)&&out.indexOf(a)===-1)out.push(a);
  });
  return out;
}

function v917AppsForRow_(row){
  let apps=v917AllowedApps_(row&&row['Allowed App']);
  if(!apps.length){
    const cfg=v917RoleConfig_(row&&row.Role);
    apps=cfg&&Array.isArray(cfg.defaultApps)?cfg.defaultApps.slice():[];
  }
  return apps;
}

/**
 * Authenticate an active staff user by mobile + PIN and require a specific app permission.
 * Role is descriptive; permission is enforced from Allowed App. This prevents a SALES role
 * from inheriting Admin privileges and lets Admin explicitly grant Vendor Onboarding to
 * other operational roles when needed.
 */
function staffAppLoginV917_(mobile,pin,requiredApp){
  requiredApp=s_(requiredApp).toUpperCase();
  if(!v917AppConfig_(requiredApp))throw new Error('Unsupported staff app permission.');
  const u=staffLoginV81_(mobile,pin,'');
  const row=rows_(V8.SHEETS.STAFF).find(function(r){return s_(r['Staff ID'])===s_(u.staffId);});
  if(!row)throw new Error('Staff access record was not found.');
  const apps=v917AppsForRow_(row);
  if(apps.indexOf(requiredApp)===-1)throw new Error('This staff login is not authorized for '+v917AppConfig_(requiredApp).label+'.');
  return {staffId:u.staffId,name:u.name,mobile:u.mobile,role:s_(row.Role).toUpperCase(),allowedApps:apps};
}

function getStaffAccessAdminV917(email,pin){
  requireAdmin_(email,pin);
  const list=rows_(V8.SHEETS.STAFF).map(function(r){
    const apps=v917AppsForRow_(r);
    return {
      staffId:s_(r['Staff ID']),name:s_(r.Name),mobile:digits_(r.Mobile),role:s_(r.Role).toUpperCase(),
      allowedApp:apps.join(','),allowedApps:apps,status:s_(r.Status).toUpperCase()||'INACTIVE',
      lastLogin:fmtDT_(r['Last Login']),createdAt:fmtDT_(r['Created At']),updatedAt:fmtDT_(r['Updated At'])
    };
  }).sort(function(a,b){if(a.status!==b.status)return a.status==='ACTIVE'?-1:1;return a.name.localeCompare(b.name);});
  return {
    ok:true,version:V917_ACCESS_VERSION,rows:list,
    roles:[
      {value:'SALES',label:'Sales Executive'},
      {value:'SALES_MANAGER',label:'Sales Manager'},
      {value:'OPERATIONS',label:'Operations'},
      {value:'FIELD_EXECUTIVE',label:'Field Executive'},
      {value:'PICKER',label:'Picker'}
    ],
    apps:[
      {value:'VENDOR_ONBOARDING',label:'Vendor Onboarding'},
      {value:'PICKER',label:'Picker'}
    ],
    storageSheet:V8.SHEETS.STAFF,pinStoredAsHash:true,adminAccessSeparate:true
  };
}

function grantStaffAccessV917(email,pin,payload){
  requireAdmin_(email,pin);payload=payload||{};
  const name=s_(payload.name),mobile=digits_(payload.mobile),staffPin=s_(payload.staffPin),cfg=v917RoleConfig_(payload.role);
  if(!name)throw new Error('Staff name is required.');
  if(!/^[6-9]\d{9}$/.test(mobile))throw new Error('Enter a valid 10 digit staff mobile number.');
  if(!cfg)throw new Error('Choose a supported staff role.');
  if(!/^\d{4,8}$/.test(staffPin))throw new Error('Set a 4–8 digit numeric PIN.');
  let apps=v917AllowedApps_(payload.allowedApps||payload.allowedApp);
  if(!apps.length)apps=cfg.defaultApps.slice();
  if(!apps.length)throw new Error('Choose at least one staff app permission.');
  return lockRun_(function(){
    const existing=rows_(V8.SHEETS.STAFF).find(function(r){return digits_(r.Mobile)===mobile;});
    const now=now_(),staffId=existing?(s_(existing['Staff ID'])||id_('STF-')):id_('STF-');
    const obj={'Staff ID':staffId,Name:name,Mobile:mobile,Role:cfg.role,'Allowed App':apps.join(','),'PIN Hash':hashV8_(staffPin),Status:'ACTIVE','Updated At':now};
    if(existing)updateObj_(V8.SHEETS.STAFF,existing._row,obj);else append_(V8.SHEETS.STAFF,Object.assign(obj,{'Created At':now}));
    return {success:true,staffId:staffId,name:name,mobile:mobile,role:cfg.role,allowedApp:apps.join(','),allowedApps:apps,status:'ACTIVE',updatedExisting:!!existing};
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

function getStaffAccessHealthV917(){
  return {
    ok:true,version:V917_ACCESS_VERSION,adminManaged:true,storageSheet:'Staff_Users',pinStoredAsHash:true,adminAccessSeparate:true,
    roles:['SALES','SALES_MANAGER','OPERATIONS','FIELD_EXECUTIVE','PICKER'],
    apps:['VENDOR_ONBOARDING','PICKER']
  };
}
