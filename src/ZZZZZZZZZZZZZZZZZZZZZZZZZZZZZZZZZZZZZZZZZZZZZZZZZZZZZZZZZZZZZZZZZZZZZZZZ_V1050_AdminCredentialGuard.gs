/**
 * Native Elaneeru V10.5.0 — admin credential guard (security hotfix).
 *
 * setV8AdminCredentials(email, pin) in Code.gs is a public function on a web app that
 * runs as the owner with anonymous access, so any visitor could call it through
 * google.script.run and replace the admin login. Once admin credentials exist, the
 * current admin email + PIN are now required to change them. First-time setup (no
 * credentials stored yet) is unchanged.
 */
const V1050_PREVIOUS_SET_ADMIN_CREDENTIALS=setV8AdminCredentials;
setV8AdminCredentials=function(email,pin,currentEmail,currentPin){
  const p=PropertiesService.getScriptProperties();
  if(s_(p.getProperty('ADMIN_EMAIL'))&&s_(p.getProperty('ADMIN_PIN_HASH'))){
    requireAdmin_(currentEmail,currentPin);
  }
  const result=V1050_PREVIOUS_SET_ADMIN_CREDENTIALS(email,pin);
  try{audit_('SECURITY','ADMIN_CREDENTIALS_CHANGED','Script Properties','ADMIN',s_(email).toLowerCase(),'','');}catch(e){}
  return result;
};
function getAdminCredentialGuardHealthV1050(){return {ok:true,version:'10.5.0',adminCredentialGuard:true};}
