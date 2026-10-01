(function(){
  const LOCAL_KEY='ne_core_v2_store';
  const empty=()=>({
    EMPLOYEES:[],LOCATIONS:[],SUPPLIERS:[],PRODUCTS:[],INWARDS:[],BATCHES:[],BUNCHES:[],ORDERS:[],ORDER_LINES:[],ALLOCATIONS:[],TRIPS:[],TRIP_ORDERS:[],DELIVERIES:[],RETURNS:[],DAMAGES:[],STOCK_LEDGER:[],VEHICLES:[],VENDORS:[],AUDIT_LOG:[]
  });
  function loadLocal(){try{return Object.assign(empty(),JSON.parse(localStorage.getItem(LOCAL_KEY)||'{}'))}catch(e){return empty()}}
  function saveLocal(data){localStorage.setItem(LOCAL_KEY,JSON.stringify(data));return data}
  function clone(v){return JSON.parse(JSON.stringify(v))}
  function now(){return new Date().toISOString()}
  function id(prefix){return prefix+'-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,6).toUpperCase()}
  let mode='local',apiUrl='';
  async function api(action,payload){
    if(!apiUrl)throw new Error('NE Core production API is not configured yet.');
    const res=await fetch(apiUrl,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,payload})});
    if(!res.ok)throw new Error('NE Core API HTTP '+res.status);
    const out=await res.json();
    if(out&&out.ok===false)throw new Error(out.error||'NE Core API request failed.');
    return out&&Object.prototype.hasOwnProperty.call(out,'data')?out.data:out;
  }
  const local={
    list(table,filter){const db=loadLocal();let rows=(db[table]||[]).slice();if(filter)rows=rows.filter(r=>Object.keys(filter).every(k=>String(r[k]??'')===String(filter[k])));return Promise.resolve(clone(rows))},
    get(table,key,value){return this.list(table).then(rows=>clone(rows.find(r=>String(r[key]??'')===String(value))||null))},
    insert(table,row){const db=loadLocal();if(!db[table])db[table]=[];db[table].push(clone(row));saveLocal(db);return Promise.resolve(clone(row))},
    update(table,key,value,patch){const db=loadLocal(),rows=db[table]||[],i=rows.findIndex(r=>String(r[key]??'')===String(value));if(i<0)throw new Error(table+' record not found');rows[i]=Object.assign({},rows[i],clone(patch));saveLocal(db);return Promise.resolve(clone(rows[i]))},
    transact(fn){const db=loadLocal(),work=clone(db),result=fn(work);saveLocal(work);return Promise.resolve(clone(result))},
    dump(){return Promise.resolve(clone(loadLocal()))},
    reset(){localStorage.removeItem(LOCAL_KEY);return Promise.resolve(empty())}
  };
  window.NE_CORE_STORE={
    version:'2.0.0',
    configure(opts){opts=opts||{};mode=opts.mode||mode;apiUrl=opts.apiUrl||apiUrl;return this},
    get mode(){return mode},
    list(table,filter){return mode==='api'?api('list',{table,filter}):local.list(table,filter)},
    get(table,key,value){return mode==='api'?api('get',{table,key,value}):local.get(table,key,value)},
    insert(table,row){return mode==='api'?api('insert',{table,row}):local.insert(table,row)},
    update(table,key,value,patch){return mode==='api'?api('update',{table,key,value,patch}):local.update(table,key,value,patch)},
    transact(name,payload,localFn){return mode==='api'?api('transact',{name,payload}):local.transact(localFn)},
    dump(){return mode==='api'?api('dump',{}):local.dump()},
    reset(){return mode==='api'?Promise.reject(new Error('Production reset is disabled.')):local.reset()},
    helpers:{now,id}
  };
})();
