(function(){
  const productionApi='https://script.google.com/macros/s/AKfycbx2s0l5A8LAdD1j24395XJSTMd5cEU7QdUkTI8LarDzatF-vVw6ODfm5x7MVJUkP9aB/exec';
  const previewApi='https://script.google.com/macros/s/AKfycby4tO2Y1xWbVv1XqzbIYjuTKOt4XRWPzB9MseMC1x-qc8gbNYPvqvG1z6PuCPGZi5O2/exec';
  const preview=new URLSearchParams(location.search).get('preview')==='1';

  window.NEL_OPS_CONFIG={
    apiUrl:preview?previewApi:productionApi,
    productionApiUrl:productionApi,
    previewApiUrl:previewApi,
    appVersion:'9.4.0',
    supportPhone:'7411807675',
    supportWhatsApp:'917411807675',
    company:'Sri Govindadri Ventures',
    preview:preview
  };

  // V9.4 login recovery: the original login() authenticates successfully but
  // its immediate refresh() can be skipped because BUSY is still true. After
  // the original click finishes, trigger the first route sync once BUSY clears.
  document.addEventListener('DOMContentLoaded',function(){
    const btn=document.getElementById('loginBtn');
    if(!btn)return;
    btn.addEventListener('click',function(){
      let attempts=0;
      const timer=setInterval(function(){
        attempts++;
        const login=document.getElementById('login');
        const app=document.getElementById('app');
        if(login&&login.classList.contains('hidden')&&app&&!app.classList.contains('hidden')){
          clearInterval(timer);
          setTimeout(function(){
            try{
              if(typeof BUSY!=='undefined') BUSY=false;
              if(typeof refresh==='function') refresh();
            }catch(e){}
          },80);
        }else if(attempts>40){
          clearInterval(timer);
        }
      },100);
    });
  });
})();
