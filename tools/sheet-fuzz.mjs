/* A user who does not follow the script, on the worksheet: random clicks,
   typing at any speed (numbers as documents write them, and junk), Enter, Tab,
   arrows, Esc or a click elsewhere to finish, scrolling and waiting past the
   delayed save mid-edit, undo and redo, Delete, paste, label rows, formulas,
   sorting, the raw-data lock, new columns, resizing, minimising, the fill
   handle and the Fill dialog. After every action: the data hold only numbers
   and nulls, the fingerprint matches, what is drawn is what is there, what is
   stored is what is on screen; after typing, the cell holds what was typed (or,
   for junk, the text waits in its box); at the end a reload gives the same
   data. Seeded, so a failure can be run again; the page is served over HTTP.
   Usage: node tools/sheet-fuzz.mjs [kurve.html] [seed or a-b] [steps]
   With V=1 every step is printed.                                          */
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import http from "node:http"; import { readFileSync } from "node:fs";
let chromium;
try { ({ chromium } = await import(process.env.PLAYWRIGHT || "playwright")); }
catch (e) { ({ chromium } = await import("/opt/node22/lib/node_modules/playwright/index.mjs")); }
const here = dirname(fileURLToPath(import.meta.url));
const FILE = resolve(process.argv[2] || join(here, "..", "kurve.html"));
const SEEDS = (()=>{ const a=String(process.argv[3]||"1-3").split("-").map(Number); const out=[]; for(let s=a[0];s<=(a[1]||a[0]);s++) out.push(s); return out; })();
const N = +(process.argv[4]||120);
let total=0;
for(const seed of SEEDS) total+=await runSeed(seed);
console.log(`\n${SEEDS.length-total} of ${SEEDS.length} runs clean`);
process.exit(total?1:0);
async function runSeed(seed){
let st=seed>>>0; const rnd=()=>{ st=(st+0x6D2B79F5)>>>0; let t=st; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; };
const ri=(a,b)=>a+Math.floor(rnd()*(b-a+1)), pick=a=>a[Math.floor(rnd()*a.length)];
const HTML=readFileSync(FILE); const server=http.createServer((q,r)=>{ r.writeHead(200,{"content-type":"text/html; charset=utf-8"}); r.end(HTML); }).listen(0);
const URL=`http://127.0.0.1:${server.address().port}/kurve.html`;
const browser=await chromium.launch();
const W0=pick([1440,1280,1024,900]);
const ctx=await browser.newContext({viewport:{width:W0,height:pick([900,800,700])}});
const page=await ctx.newPage(); const errors=[], fails=[], trail=[];
// SLOW=n runs the page n times slower (Chrome's CPU throttling), for the races a fast machine hides.
if(+process.env.SLOW>1){ const cdp=await ctx.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate",{rate:+process.env.SLOW}); }
page.on("pageerror",e=>errors.push("pageerror: "+e.message+" @ "+(e.stack||"").split("\n").slice(1,3).join(" | ")));
page.on("console",m=>{ if(m.type()==="error"&&!/Failed to load resource/.test(m.text())) errors.push("console: "+m.text()); });
page.on("dialog",d=>{ errors.push("native dialog "+d.message()); d.dismiss().catch(()=>{}); });
await page.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
await page.addInitScript(()=>{ try{ localStorage.setItem("kurve.ovAuto","0"); }catch(e){} });
await page.goto(URL); await page.waitForFunction(()=>typeof S!=="undefined"&&S.pid&&S.proj,null,{timeout:15000});
const start=pick(["empty","ir","empty"]);
if(start==="ir"){ await page.evaluate(()=>{ loadExample("ir"); }); await page.waitForTimeout(900); }
await page.evaluate(()=>{ Object.keys(WINS).forEach(id=>{ if(id!=="sheet"&&!isDoc(id)) closeWin(id); }); openWin("sheet",{render:true}); focusWin("sheet"); });
if(rnd()<0.5) await page.evaluate(()=>toggleMax("sheet"));
await page.waitForTimeout(300);
const log=s=>{ trail.push(s); if(process.env.V) console.log(s); };
const fail=(s)=>{ fails.push(`[${trail.length}] ${s}`); };
const wait=ms=>page.waitForTimeout(ms);
const hideToast=()=>page.evaluate(()=>{ const t=document.querySelector("#toast"); if(t) t.hidden=true; });
// Close any dialog that opened (a correction, a fill, a confirm).
async function closeDialogs(){ for(let i=0;i<3;i++){ const open=await page.evaluate(()=>[...document.querySelectorAll(".modal")].some(m=>!m.hidden)); if(!open) return; await page.keyboard.press("Escape"); await wait(120); } }
// A cell whose centre really is that cell (not under the sticky header or another window),
// measured once the worksheet has stopped moving: its window, its scroll and its place on the
// page (which scrolls itself below 860 px) the same for 150 ms. A person clicks what they see;
// a cell measured while the window grows out of its taskbar button, or while a wheel's smooth
// scroll runs (it may start a frame or two after the wheel), is elsewhere by the click.
async function visibleCell(opts={}){
  await page.waitForFunction(()=>{ const w=$("#w-sheet"), b=$("#ws"); if(w&&(w._wa||w._wf)) return false; if(!b) return true;
    const r=b.getBoundingClientRect(), k=[b.scrollTop,b.scrollLeft,Math.round(r.top),Math.round(r.left)].join(","), now=performance.now();
    if(window.__fzK!==k){ window.__fzK=k; window.__fzT=now; return false; } return now-window.__fzT>=150; },null,{timeout:3000,polling:"raf"}).catch(()=>{});
  return page.evaluate(o=>{ const box=$("#ws"); if(!box) return null; const bb=box.getBoundingClientRect();
    const tds=[...box.querySelectorAll("td[data-ci][data-r]")].filter(td=>{ const r=+td.dataset.r; if(o.data&&r<0) return false; if(o.label&&r>=0) return false; const rc=td.getBoundingClientRect(); const x=rc.x+rc.width/2, y=rc.y+rc.height/2; if(x<bb.left||x>bb.right-12||y<bb.top||y>bb.bottom-12) return false; const el=document.elementFromPoint(x,y); return el&&(el===td||td.contains(el)); });
    if(!tds.length) return null; const td=tds[Math.floor(o.u*tds.length)], rc=td.getBoundingClientRect();
    return {r:+td.dataset.r,c:+td.dataset.ci,x:rc.x+rc.width/2,y:rc.y+rc.height/2}; },Object.assign({u:rnd()},opts));
}
const state=()=>page.evaluate(()=>{ const m=S.wsm, s=S.ws; const q=m&&m.cols[s.c];
  return {r:s.r,c:s.c,edit:!!s.edit,editing:!!S.editing,inp:!!document.querySelector("#ws input.wsed"),sheet:S.sheet,lock:rawLocked(),ord:!!(m&&m.ord),cid:q&&!q.phantom?q.id:null,phantom:!!(q&&q.phantom),calc:!!(q&&q.calc),top:$("#ws").scrollTop,modal:[...document.querySelectorAll(".modal")].some(x=>!x.hidden),winOpen:winOpen("sheet")}; });
// The data behind cell (r,c) of the Raw sheet, read fresh.
const cellVal=(r,c,k)=>page.evaluate(([r,c,k])=>{ const cols=allCols().filter(o=>!o.src), col=cols[c]; if(!col) return {none:true,v:null}; const m=wsLive(); if(k==null) k=m&&m.kind==="raw"?wsDR(m,r):r; const v=col.data[k]; return {v:v===undefined?null:v, fx:!!col.fx, id:col.id, k}; },[r,c,k]);
// Invariants after every action.
async function check(tag){
  const bad=await page.evaluate(()=>{ const out=[]; const p=P(); if(!p) return out;
    allCols().forEach(c=>{ (c.data||[]).forEach((v,i)=>{ if(v!==null&&!(typeof v==="number"&&Number.isFinite(v))) out.push(`col ${colLetter(c)||c.id} row ${i+1} holds ${JSON.stringify(v)}`); }); if(c.data&&c.data.length&&c.data[c.data.length-1]==null&&!c.fx) out.push(`col ${colLetter(c)} ends in empty cells`); });
    if(!S.editing&&!S.ws.edit){ const ok=rawVerified(); if(ok===false) out.push("fingerprint does not match the data"); }
    if(!!S.ws.edit!==!!S.editing) out.push(`edit ${!!S.ws.edit} but editing ${!!S.editing}`);
    if(S.ws.edit&&!document.querySelector("#ws input.wsed")&&winOpen("sheet")){ const e=S.ws.edit, w=S.ws.win; if(w&&e.r>=w[0]&&e.r<w[1]) out.push("editing a drawn cell with no text box in it"); }
    // what is drawn is what is there
    const m=wsLive(); if(m&&!S.ws.edit&&winOpen("sheet")){ let n=0; document.querySelectorAll("#ws td[data-ci][data-r]").forEach(td=>{ if(n>4) return; const r=+td.dataset.r, c=+td.dataset.ci; if(td.classList.contains("editing")) return; const want=wsText(m,r,c); if(td.textContent!==want){ n++; out.push(`cell ${(m.cols[c]||{}).letter}${r+1} shows "${td.textContent}" but holds "${want}"`); } }); }
    const s=S.ws; if(m&&(s.c<0||s.c>=m.cols.length)) out.push("selection off the sheet");
    // What is stored is what is on screen, once nothing waits to be saved.
    if(!Object.keys(wsPatch).length&&!S.ws.edit){ try{ const st=JSON.parse(localStorage.getItem("kurve.p."+S.pid)||"null"); if(st){ const f=cs=>JSON.stringify((cs||[]).filter(c=>!c.src).map(c=>[c.id,c.role,c.name||"",c.unit||"",c.fx?c.fx.src:null,c.fx?null:(c.data||[])]));
      const a=f(st.cols), b=f(p.cols); if(a!==b){ const A=JSON.parse(a), B=JSON.parse(b); out.push(`stored ${A.length} columns, on screen ${B.length}: `+B.map((c,i)=>JSON.stringify(c)!==JSON.stringify(A[i])?`#${i} screen ${JSON.stringify(c).slice(0,90)} stored ${String(JSON.stringify(A[i])).slice(0,90)}`:"").filter(Boolean).slice(0,2).join(" | ")); } } }catch(e){ out.push("store read: "+e.message); } }
    return out; });
  bad.forEach(b=>fail(`${tag}: ${b}`));
}
const nums=()=>pick(["12","-3.5","0","1e3","2.5e-4","1,5","−7","  42  ","+8","0.000123","123456789","3.","-.5","1 234,5","6.02E23","1e-300"]);
const junk=()=>pick(["abc","1.2.3","--5","1e","NaN","Infinity","0x10","12a","1/2","5%","",")(","∞","１２"]);
async function typeValue(){
  const s0=await state(); if(s0.modal){ await closeDialogs(); return; }
  if(s0.edit){ await page.keyboard.press("Escape"); await wait(40); }
  if(s0.sheet!=="raw") return;
  const valid=rnd()<0.75, text=valid?nums():junk();
  const how=pick(["type","type","dbl","f2"]);
  const c=await visibleCell({data:true}); if(!c) return;
  if(how==="dbl"){ await page.mouse.dblclick(c.x,c.y); await wait(60); const sd=await state(); if(!sd.edit&&!sd.modal&&sd.sheet==="raw"){ fail(`double-click on ${c.r+1}:${c.c} did not open the cell`+(sd.r!==c.r||sd.c!==c.c?` (the active cell is ${sd.r+1}:${sd.c})`:"")); return; }
    if(sd.edit&&(sd.r!==c.r||sd.c!==c.c)) fail(`double-click on ${c.r+1}:${c.c} opened ${sd.r+1}:${sd.c}`);
    await page.keyboard.press("Control+A"); }
  else { await page.mouse.click(c.x,c.y); await wait(ri(0,80)); if(how==="f2"){ await page.keyboard.press("F2"); await page.keyboard.press("Control+A"); } }
  if(how!=="dbl"){ const k=await page.evaluate(()=>{ const a=document.activeElement; return !!a&&!!a.closest&&!!a.closest("#ws"); }); if(!k&&!(await state()).modal) fail(`a click on ${c.r+1}:${c.c} left the keys outside the grid`); }
  const s1=await state(); const before=await cellVal(s1.r,s1.c); const K=before.k;
  const delay=pick([0,0,20,80,160]);
  if(text==="") { await page.keyboard.press("Backspace"); }
  else if(/[^\x00-\x7f]/.test(text[0])&&how==="type"){ await page.evaluate(()=>{ const a=document.activeElement; (a&&a.id==="ws"?a:$("#ws")).dispatchEvent(new KeyboardEvent("keydown",{key:"Process",bubbles:true,cancelable:true})); }); await page.keyboard.insertText(text); }
  else await page.keyboard.type(text,{delay});
  // sometimes do something else before finishing
  if(rnd()<0.15){ const dy=ri(-800,800); await page.mouse.wheel(0,dy); log(`  wheel ${dy} mid-edit`); await wait(ri(0,300)); }
  if(rnd()<0.12){ await wait(ri(600,1200)); log("  waited past the delayed save mid-edit"); }
  // Where the typing went, for the failure's message.
  const mid=await page.evaluate(()=>{ const e=S.ws.edit, a=document.activeElement; return {edit:e?{r:e.r,c:e.c,val:e.val}:null,focus:a?(a.id||a.className||a.tagName):null}; });
  const end=pick(["Enter","Enter","Enter","Tab","ArrowDown","ArrowRight","Shift+Enter","click","Escape"]);
  log(`type "${text}" into ${s1.r+1}:${s1.c} (${how}) then ${end}${s1.lock?" [locked]":""}`);
  if(end==="click"){ const c2=await visibleCell({data:true}); if(c2&&!(c2.r===s1.r&&c2.c===s1.c)) await page.mouse.click(c2.x,c2.y); else await page.keyboard.press("Enter"); }
  else await page.keyboard.press(end);
  await wait(ri(20,250));
  const s2=await state();
  const num=await page.evaluate(t=>parseNum(t),text);
  const after=await cellVal(s1.r,s1.c,K);
  const typedOver=before.v!=null;
  // Backspace on a selected cell clears it at once, as Delete does (and Google Sheets'),
  // so Escape after it has nothing to give back; in a cell's text box it only deletes text.
  if(end==="Escape"){ const want=text===""&&how==="type"&&!s1.lock&&!before.fx?null:before.v; if(after.v!==want) fail(`Escape changed ${s1.r+1}:${s1.c} from ${before.v} to ${after.v}`); }
  else if(how!=="type"&&end.startsWith("Arrow")&&s2.edit){ /* arrows move the caret in edit mode */ await page.keyboard.press("Enter"); await wait(100); }
  else if(before.fx){ if(after.v!==before.v) fail(`a computed cell changed`); }
  else if(text.trim()===""&&!typedOver){ if(after.v!=null) fail(`empty text left ${after.v}`); }
  else if(num==null&&text.trim()!==""){ // junk
    if(after.v!==before.v) fail(`junk "${text}" changed the cell to ${after.v}`);
    if(end!=="click"&&!s2.edit&&!s2.modal) fail(`junk "${text}" + ${end}: the text box closed and the text was dropped`);
    if(s2.edit){ await page.keyboard.press("Escape"); await wait(60); }
  } else if(s1.lock&&typedOver){ if(after.v!==before.v) fail(`locked value changed`); await closeDialogs(); }
  else if(s1.ord&&false){}
  else { const want=text.trim()===""?null:num; if(after.v!==want){ const ctx2=await page.evaluate(()=>({toast:($("#toast")&&!$("#toast").hidden)?$("#toast").innerText.replace(/\s+/g," "):"",log:(P().log||[]).slice(-2).map(l=>l.text).join(" / "),cols:allCols().filter(c=>!c.src).map(c=>colLetter(c)+(c.fx?"=fx":"")+":"+c.data.length).join(" "),edit:!!S.ws.edit,ord:!!(S.wsm&&S.wsm.ord)})); fail(`typed "${text}" into ${s1.r+1}:${s1.c} then ${end}: holds ${JSON.stringify(after.v)}, expected ${JSON.stringify(want)} | ${JSON.stringify(ctx2)} | before ${JSON.stringify(before)} | before ${end} ${JSON.stringify(mid)}`); }
    // after the delayed save it must still be there
    if(rnd()<0.3){ await wait(900); const a2=await cellVal(s1.r,s1.c,K); if(a2.v!==want) fail(`after the delayed save ${s1.r+1}:${s1.c} holds ${JSON.stringify(a2.v)}, expected ${JSON.stringify(want)}`); }
    // the cell moved to must be on screen, not scrolled away
    if(!s2.modal&&["Enter","Tab","ArrowDown","ArrowRight","Shift+Enter"].includes(end)){ const vis=await page.evaluate(()=>{ const td=document.querySelector(`#ws td[data-r="${S.ws.r}"][data-ci="${S.ws.c}"]`); if(!td) return false; const b=$("#ws").getBoundingClientRect(), r=td.getBoundingClientRect(); return r.bottom>b.top&&r.top<b.bottom; }); if(!vis) fail(`after ${end} the active cell is off screen: `+JSON.stringify(await page.evaluate(()=>{ const b=$("#ws"), td=document.querySelector(`#ws td[data-r="${S.ws.r}"][data-ci="${S.ws.c}"]`), bb=b.getBoundingClientRect(); return {r:S.ws.r,c:S.ws.c,top:b.scrollTop,h:b.clientHeight,sh:b.scrollHeight,head:S.ws.head,rowH:S.ws.rowH,win:S.ws.win,td:td?[Math.round(td.getBoundingClientRect().top-bb.top),Math.round(td.getBoundingClientRect().bottom-bb.top)]:null,boxTop:Math.round(bb.top),boxH:Math.round(bb.height),vh:innerHeight}; }))); }
  }
}
const actions=[
  ["type",30,typeValue],
  ["click",8,async()=>{ const c=await visibleCell(); if(c){ log(`click ${c.r+1}:${c.c}`); await page.mouse.click(c.x,c.y,{modifiers:rnd()<0.2?["Shift"]:[]}); } }],
  ["wheel",8,async()=>{ const dy=pick([-3000,-600,-120,120,600,3000,9000]); log(`wheel ${dy}`); const b=await page.$("#ws"); const bb=b&&await b.boundingBox(); if(bb){ await page.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2); await page.mouse.wheel(0,dy); } }],
  ["keys",8,async()=>{ const k=pick(["ArrowDown","ArrowUp","ArrowLeft","ArrowRight","PageDown","PageUp","Home","End","Control+End","Control+Home","Shift+ArrowDown","Shift+ArrowRight","Tab","Enter","Control+ArrowDown","Escape"]); log(`key ${k}`); await page.keyboard.press(k); }],
  ["undo",7,async()=>{ const k=pick(["Control+z","Control+z","Control+y","Control+Shift+z"]); log(`key ${k}`); await page.keyboard.press(k); }],
  ["delete",5,async()=>{ log("Delete"); await page.keyboard.press(pick(["Delete","Backspace"])); await wait(150); await closeDialogs(); }],
  ["label",4,async()=>{ const c=await visibleCell({label:true}); if(!c) return; await page.mouse.click(c.x,c.y); const t=pick(["Wavelength","nm","a b c","x^{2}","","Temp (K)","'quote\"","<b>bold</b>","   "]); log(`label "${t}" at ${c.r}:${c.c}`); if(t) await page.keyboard.type(t); else await page.keyboard.press("F2"); await page.keyboard.press(pick(["Enter","Tab","Escape"])); }],
  ["formula",3,async()=>{ const c=await page.evaluate(()=>{ const td=[...document.querySelectorAll('#ws td.fxc')][Math.floor(Math.random()*3)]; if(!td) return null; const r=td.getBoundingClientRect(), x=r.x+r.width/2, y=r.y+r.height/2, el=document.elementFromPoint(x,y); return el&&(el===td||td.contains(el))?{x,y}:null; }); if(!c) return; const f=pick(["B*2","A+1","log10(B)","B*","sin(","C","2*x","i"]); log(`formula ${f}`); await page.mouse.click(c.x,c.y); await page.keyboard.type(f); await page.keyboard.press(pick(["Enter","Escape","Tab"])); await wait(100); const ed=await state(); if(ed.edit) await page.keyboard.press("Escape"); }],
  ["paste",5,async()=>{ const t=pick(["1\t2\n3\t4","5\n6\n7","x\ty\n1\t10\n2\t20","garbage text","1,5\t2,5\n3,5\t4,5","\t\t\n\t\t","9","1\t\t3\n\t5\t"]); log(`paste ${JSON.stringify(t)}`); await page.evaluate(t=>{ const el=document.activeElement&&document.activeElement.closest&&document.activeElement.closest("#ws")?document.activeElement:$("#ws"); const dt=new DataTransfer(); dt.setData("text/plain",t); el.dispatchEvent(new ClipboardEvent("paste",{clipboardData:dt,bubbles:true,cancelable:true})); },t); await wait(150); await closeDialogs(); }],
  ["wait",6,async()=>{ const ms=pick([50,300,800,1300]); log(`wait ${ms}`); await wait(ms); }],
  ["sheet",3,async()=>{ const s=pick(["raw","final","raw"]); log(`sheet ${s}`); await page.click(`#wsSheet [data-sheet="${s}"]`).catch(()=>{}); }],
  ["sort",2,async()=>{ const d=pick([1,-1,0]); log(`sort ${d}`); await page.evaluate(d=>{ const m=S.wsm; const q=m&&m.cols.find(q=>!q.phantom); if(q) wsSortBy(d?q.id:null,d); },d); }],
  ["lock",3,async()=>{ log("lock toggle"); await page.click("#wsLockBtn").catch(()=>{}); }],
  ["addcol",2,async()=>{ log("add column"); await page.click("#addColBtn").catch(()=>{}); }],
  ["resize",2,async()=>{ const w=pick([1440,1100,900,700,420]), h=pick([900,700,600]); log(`viewport ${w}x${h}`); await page.setViewportSize({width:w,height:h}); }],
  ["minimise",2,async()=>{ const bar=rnd()<0.5; log(`minimise and restore the worksheet${bar?" from its taskbar button":""}`); await page.evaluate(()=>minimiseWin("sheet")); await wait(ri(50,400));
      const b=bar&&await page.$('#taskbar .tk[data-tk="sheet"]:not([hidden])');
      if(b){ await b.click().catch(()=>{}); await wait(30); const k=await page.evaluate(()=>{ const a=document.activeElement; return winOpen("sheet")&&!!a&&!!a.closest&&!!a.closest("#w-sheet"); }); if(!k) fail("the worksheet restored from its taskbar button does not have the keys"); }
      else await page.evaluate(()=>{ openWin("sheet"); focusWin("sheet"); }); }],
  ["elsewhere",2,async()=>{ log("click the graph"); await page.evaluate(()=>{ const w=winOfGraph(S.gid); if(w) openWin(w); }); const g=await page.$("#plot"); if(g){ const bb=await g.boundingBox(); if(bb) await page.mouse.click(bb.x+20,bb.y+20); } await page.evaluate(()=>focusWin("sheet")); }],
  ["fillh",2,async()=>{ log("fill handle drag"); const h=await page.evaluate(()=>{ const td=document.querySelector("#ws td.fh"); if(!td) return null; const r=td.getBoundingClientRect(); return {x:r.right-3,y:r.bottom-3}; }); if(!h) return; await page.mouse.move(h.x,h.y); await page.mouse.down(); await page.mouse.move(h.x,h.y+ri(30,200),{steps:5}); await page.mouse.up(); await wait(100); }],
  ["filldlg",2,async()=>{ const k=pick(["linear","rows","random","list","even","trend"]); log(`fill dialog ${k}`); await page.evaluate(k=>{ openFillDlg(k); },k); await wait(300); await page.keyboard.press(pick(["Enter","Escape"])); await wait(200); await closeDialogs(); }],
  ["rapid",4,async()=>{ log("rapid entry down a column"); const c=await visibleCell({data:true}); if(!c) return; await page.mouse.click(c.x,c.y); const s=await state(); if(s.sheet!=="raw"||s.calc) return; const vals=[]; for(let i=0;i<ri(3,9);i++){ const v=String(ri(-999,999)/pick([1,10,100])); vals.push(v); await page.keyboard.type(v,{delay:pick([0,10,40])}); await page.keyboard.press("Enter"); if(rnd()<0.3) await wait(ri(300,900)); }
      await wait(200); const s2=await state(); if(s.lock||s.ord) return; for(let i=0;i<vals.length;i++){ const cv=await cellVal(s.r+i,s.c,null); const want=await page.evaluate(t=>parseNum(t),vals[i]); if(cv.fx) break; if(cv.v!==want) fail(`rapid entry: row ${s.r+i+1} col ${s.c} holds ${cv.v}, typed ${vals[i]}`); } }],
];
const total=actions.reduce((a,x)=>a+x[1],0);
for(let i=0;i<N;i++){
  let u=rnd()*total, act=actions[0]; for(const a of actions){ u-=a[1]; if(u<=0){ act=a; break; } }
  try{ await act[2](); }catch(e){ fail(`${act[0]} threw: ${e.message.split("\n")[0]}`); }
  await wait(ri(0,60));
  const s=await state(); if(s.modal&&rnd()<0.8) await closeDialogs();
  try{ await check(act[0]); }catch(e){ fail(`check threw: ${e.message.split("\n")[0]}`); }
  if(process.env.V==="2") log("    · "+JSON.stringify(await page.evaluate(()=>{ let st=null; try{ st=JSON.parse(localStorage.getItem("kurve.p."+S.pid)); }catch(e){} return {pend:Object.keys(wsPatch).length,edit:!!S.ws.edit,sheet:S.sheet,mem:allCols().filter(c=>!c.src).map(c=>colLetter(c)+":"+(c.fx?"fx":c.data.length)).join(","),stored:st?(st.cols||[]).filter(c=>!c.src).map(c=>(c.fx?"fx":(c.data||[]).length)).join(","):"none"}; })));
  if(fails.length>12) break;
}
// Everything typed survives a reload.
await page.keyboard.press("Escape"); await wait(1200);
const snap=await page.evaluate(()=>JSON.stringify(allCols().filter(c=>!c.src).map(c=>[c.role,c.name,c.unit,c.fx?c.fx.src:null,c.fx?null:c.data])));
await page.goto(URL); await page.waitForFunction(()=>typeof S!=="undefined"&&S.pid&&S.proj,null,{timeout:15000}); await wait(500);
const snap2=await page.evaluate(()=>JSON.stringify(allCols().filter(c=>!c.src).map(c=>[c.role,c.name,c.unit,c.fx?c.fx.src:null,c.fx?null:c.data])));
if(snap!==snap2){ const a=JSON.parse(snap), b=JSON.parse(snap2); const d=[]; for(let i=0;i<Math.max(a.length,b.length);i++){ if(JSON.stringify(a[i])!==JSON.stringify(b[i])) d.push(`col ${i}: before ${String(JSON.stringify(a[i])).slice(0,160)} after ${String(JSON.stringify(b[i])).slice(0,160)}`); } fail("after a reload the data differ from what was on screen: "+d.slice(0,3).join(" | ")); }
console.log(`seed ${seed} (${start}, ${W0}px): ${trail.length} steps, ${fails.length} failures, ${errors.length} page errors`);
const tail=n=>trail.slice(-n).join("\n    ");
fails.slice(0,8).forEach(f=>console.log("  FAIL "+f));
errors.slice(0,6).forEach(e=>console.log("  !! "+e));
if(fails.length||errors.length){ console.log("  last steps:\n    "+tail(14)); }
await browser.close(); server.close(); return fails.length||errors.length?1:0;
}
