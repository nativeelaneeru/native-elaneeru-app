/*******************************************************************************
 * NATIVE ELANEERU V10.3 — LANGUAGE CHANGE REFRESH
 * Persist selected language + active B2C page, refresh once, restore page.
 ******************************************************************************/
function b2cLanguageRefreshV103_(){
  return `<script>(function(){
    if(window.NEL103_LANG_REFRESH)return;window.NEL103_LANG_REFRESH=true;
    var PAGE_KEY='nel_b2c_lang_restore_page';
    function activePage(){
      var pages=['home','shop','orders','account','offers'];
      for(var i=0;i<pages.length;i++){
        var el=document.getElementById(pages[i]+'Page');
        if(el && !el.classList.contains('hide')) return pages[i];
      }
      return 'home';
    }
    function attach(){
      var sel=document.getElementById('nel102Lang');
      if(!sel || sel.dataset.nel103==='1') return false;
      sel.dataset.nel103='1';
      sel.addEventListener('change',function(){
        try{
          localStorage.setItem('nel_b2c_language',this.value||'en');
          sessionStorage.setItem(PAGE_KEY,activePage());
        }catch(e){}
        var old=this.style.opacity;this.style.opacity='.6';this.disabled=true;
        setTimeout(function(){location.reload()},90);
      });
      return true;
    }
    function restore(){
      var p='';try{p=sessionStorage.getItem(PAGE_KEY)||'';sessionStorage.removeItem(PAGE_KEY)}catch(e){}
      if(p && typeof window.go==='function') setTimeout(function(){try{window.go(p)}catch(e){}},420);
    }
    var tries=0,t=setInterval(function(){tries++;if(attach()||tries>50)clearInterval(t)},100);
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',restore,{once:true});else restore();
  })();</script>`;
}
function doGetV103_(e){
  var out=doGetV102_(e);
  var isBridge=String(e&&e.parameter&&e.parameter.bridge||'')==='1';
  var p=String(e&&e.parameter&&e.parameter.page||'').toLowerCase();
  if(!isBridge && (p===''||p==='home'||p==='b2c')) out.append(b2cLanguageRefreshV103_());
  return out;
}
doGet=doGetV103_;
