(()=>{
var __now=Date.now(), __D={
 meta:{settings:{shopName:"Test Do'kon",staff:[{id:"o1",name:"Rahbar",role:"owner",hash:"abcdefghijklmnopqrst",login:"rahbar"},{id:"s1",name:"Sotuvchi",role:"seller",hash:"zzzzzzzzzzzzzzzzzzzz",login:"s"}],theme:{v:2}}},
 products:{p1:{name:"Tungi krem",price:85000,cost:50000,qty:12,barcode:"4780001",cat:"Krem"},p2:{name:"Keratin shampun",price:120000,cost:70000,qty:-2,barcode:"4780002",cat:"Soch"},p3:{name:"Piling",price:60000,cost:30000,qty:1,cat:"Yuz"}},
 clients:{c1:{name:"Dilnoza",phone:"+998901112233",debt:150000,cashback:5000,spent:900000}},
 suppliers:{sp1:{name:"Saber",debt:500000}},
 sales:{s1:{no:"A-1001",ts:__now-3600e3,total:205000,cash:205000,items:[{pid:"p1",name:"Tungi krem",qty:1,price:85000,cost:50000},{pid:"p2",name:"Keratin shampun",qty:1,price:120000,cost:70000}],seller:"Rahbar"},s2:{no:"A-1002",ts:__now-86400e3*2,total:60000,card:60000,items:[{pid:"p3",name:"Piling",qty:1,price:60000,cost:30000}],seller:"Sotuvchi",clientId:"c1"}},
 payments:{},purchases:{},returns:{},expenses:{e1:{ts:__now-7200e3,amount:300000,cat:"Ijara"}},shifts:{},catalog:{},inventory:{},certs:{},broadcasts:{},
 orders:{o1:{ts:__now-600e3,status:"new",name:"Mijoz",total:85000,items:[{pid:"p1",name:"Tungi krem",qty:1,price:85000}]}},
 sessions:{u1:{role:"owner",staffId:"o1",exp:__now+864e5,perms:{}}},devices:{u1:{ts:__now}},private:{}};
var __P=(path)=>path.split("/"), __get=(path)=>{let p=__P(path),o=__D;for(let k of p){o=o&&o[k]}return o};
function __docSnap(path){let v=__get(path);let id=__P(path).pop();return{id,exists:()=>v!=null,data:()=>v==null?void 0:JSON.parse(JSON.stringify(v)),get:(k)=>v&&v[k],metadata:{fromCache:false,hasPendingWrites:false}}}
function __colSnap(col){let o=__D[col]||{};let docs=Object.keys(o).map(id=>({id,data:()=>JSON.parse(JSON.stringify(o[id])),exists:()=>true,ref:{path:col+"/"+id,id}}));return{docs,size:docs.length,empty:!docs.length,forEach:f=>docs.forEach(f),docChanges:()=>docs.map(d=>({type:"added",doc:d})),metadata:{fromCache:false,hasPendingWrites:false}}}
function __set(path,val,merge){let p=__P(path),o=__D;for(let i=0;i<p.length-1;i++){o[p[i]]=o[p[i]]||{};o=o[p[i]]}let k=p[p.length-1];o[k]=merge?Object.assign(o[k]||{},val):val}
window.__writes=[];
function Yc(c){return{c}} function _y(a,o){return{db:1}} function Oy(o){return{}} function Vy(){return{}}
function Sl(){return{currentUser:{uid:"u1",isAnonymous:true}}} function El(a,cb){setTimeout(()=>cb({uid:"u1",isAnonymous:true,email:""}),10);return()=>{}} function Il(){return Promise.resolve({user:{uid:"u1"}})}
function ct(db,...parts){parts=parts.flatMap(x=>String(x).split("/"));if(parts.length%2===1)parts.push(Math.random().toString(36).slice(2,10));return{type:"doc",path:parts.join("/"),id:parts[parts.length-1]}}
function ai(db,...parts){return{type:"col",path:parts.join("/")}} function As(r){return r} function Ss(){return{}} function Ry(){return{}} function Py(){return{}} function Ly(n){return n}
function ks(ref,...a){let cb=a.find(x=>typeof x=="function");setTimeout(()=>cb(ref.type==="doc"?__docSnap(ref.path):__colSnap(ref.path)),20);return()=>{}}
function sd(ref){return Promise.resolve(__docSnap(ref.path))} function Xa(ref){return Promise.resolve(__colSnap(ref.path))}
function wn(ref,v,o){window.__writes.push(["set",ref.path]);__set(ref.path,v,o&&o.merge);return Promise.resolve()}
function xy(ref,v){window.__writes.push(["update",ref.path]);__set(ref.path,v,true);return Promise.resolve()}
function ad(){let ops=[];return{set(r,v,o){ops.push(()=>wn(r,v,o));return this},update(r,v){ops.push(()=>xy(r,v));return this},delete(r){ops.push(()=>{});return this},commit(){ops.forEach(f=>f());return Promise.resolve()}}}
