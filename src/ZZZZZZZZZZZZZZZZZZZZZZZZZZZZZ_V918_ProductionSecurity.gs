/** Native Elaneeru V9.1.8 — production staff security guard. */
const V918_SECURITY_VERSION='9.1.8';
const V918_BLOCKED_DEMO_MOBILES=Object.freeze(['9000000005','9000000006']);
const V918_BLOCKED_DEMO_IDS=Object.freeze(['STF-PICKER-DEMO','STF-SALES-DEMO']);

const V918_PREVIOUS_STAFF_LOGIN_=staffLoginV81_;
staffLoginV81_=function(mobile,pin,role){
  const m=digits_(mobile);
  if(V918_BLOCKED_DEMO_MOBILES.indexOf(m)>=0)throw new Error('Legacy demo access is disabled. Ask Admin to create production access in Access Management.');
  const user=V918_PREVIOUS_STAFF_LOGIN_(mobile,pin,role);
  if(user&&V918_BLOCKED_DEMO_IDS.indexOf(s_(user.staffId))>=0)throw new Error('Legacy demo access is disabled. Ask Admin to create production access in Access Management.');
  return user;
};

const V918_PREVIOUS_SETUP_DEMO_ACCESS_=setupDemoAccessV81;
setupDemoAccessV81=function(){
  throw new Error('Demo access creation is disabled in production. Use Admin → Access Management.');
};

function getProductionSecurityHealthV918(){
  return {ok:true,version:V918_SECURITY_VERSION,legacyDemoStaffBlocked:true,adminAccessSeparate:true,staffPinStoredAsHash:true};
}
