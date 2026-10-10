const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const data=JSON.parse(html.match(/<script id="chapter-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const js=html.match(/<script>\s*([\s\S]*?)<\/script>/)[1],els=new Map();
function el(id){if(!els.has(id))els.set(id,{textContent:id==='chapter-data'?JSON.stringify(data):'',innerHTML:'',scrollTop:0,value:'',disabled:false,classList:{add(){},remove(){},toggle(){}},scrollIntoView(){}});return els.get(id);}
const c=vm.createContext({document:{getElementById:el,querySelectorAll:()=>[],addEventListener(){}},matchMedia:()=>({matches:true}),IntersectionObserver:class{observe(){}},console});
const run=s=>vm.runInContext(s,c);vm.runInContext(js,c);
assert.equal(data.chapters.length,9);assert.equal(new Set(data.nodes.map(n=>n.id)).size,data.nodes.length);
for(const id of data.chapters){run(`renderChapter(${JSON.stringify(id)})`);assert.ok(el('document').innerHTML.length>100);}
run("renderChapter('4')");el('reader').scrollTop=456;
assert.equal(run("resolveInternal('第２－４－(1)－①－ア－(ｲ)','4-2-(2)-ア')"),'2-4-(1)-①-ア-(イ)');
run("openRef({id:resolveInternal('第２－４－(1)－①－ア－(ｲ)','4-2-(2)-ア')})");
assert.ok(el('reference').innerHTML.includes('旅券'));assert.equal(el('reader').scrollTop,456);
run("openRef({law:'法第12条第３項'})");assert.ok(el('reference').innerHTML.includes('参照された項'));el('back').onclick();assert.ok(el('reference').innerHTML.includes('旅券'));assert.equal(el('reader').scrollTop,456);
run("openRef({id:resolveInternal('第５－１－ケ','2-2-(1)-ア-(ア)-A')})");assert.ok(el('reference').innerHTML.includes('複数回'));assert.ok(el('reference').innerHTML.includes('転出証明書情報通知'));
run("openRef({missing:'第６－９－(1)',context:'7-4'})");assert.ok(el('reference').innerHTML.includes('自動接続していません'));assert.equal(el('reader').scrollTop,456);el('close').onclick();
for(const sample of ['戸籍法第４条','国民健康保険法第４条','地方自治法第10条','番号利用法第２条第５項','刑法第157条','令第13条第３項','規則第47条','住民基本台帳法施行令第４条','入管特例法第10条'])assert.ok(!run(`linked(${JSON.stringify(sample)},'1-2-(14)')`).includes('data-law'));
assert.ok(!run("body(map.get('1-2-(14)'))").includes('data-law="法第30条の６第１項"'));
assert.equal(run("resolveInternal('ア(ｲ)','2-2-(4)-エ')"),'2-2-(4)-ア-(イ)');
assert.ok(run("linked('ア(ｲ)に掲げる書類','2-2-(4)-エ')").includes('data-ref="2-2-(4)-ア-(イ)"'));
assert.ok(run("linked('第５、第６－３','7-5')").includes('data-ref="5"'));
const internal=[],missing=[],external=[],laws=[];
for(const n of data.nodes){const text=(n.heading&&!n.term?n.title:'')+run(`definitionBody(map.get(${JSON.stringify(n.id)}))`),rendered=run(`linked(${JSON.stringify(text)},${JSON.stringify(n.id)})`);
 for(const m of rendered.matchAll(/class="internal-link" data-ref="([^"]+)"[^>]*>([^<]+)<\/button>/g)){assert.ok(data.nodes.some(x=>x.id===m[1]));internal.push({from:n.id,reference:m[2],to:m[1]});}
 for(const m of rendered.matchAll(/data-missing="([^"]+)"/g))missing.push({from:n.id,reference:m[1],context:text.slice(Math.max(0,text.indexOf(m[1])-150),text.indexOf(m[1])+m[1].length+60)});
 for(const m of rendered.matchAll(/data-law="([^"]+)"/g)){assert.ok(run(`resolveLaw(${JSON.stringify(m[1])},${JSON.stringify(n.id)})`));laws.push({from:n.id,reference:m[1]});}
 const pattern=run('new RegExp(fullReferencePattern,"g")');for(const m of text.matchAll(pattern)){if(run(`isExternalInternal(${JSON.stringify(text)},${m.index},${m[0].length})`))external.push({from:n.id,reference:m[0],context:text.slice(Math.max(0,m.index-120),m.index+m[0].length+50)});}
}
assert.ok(internal.length>70);assert.ok(laws.length>300);
const audit={date:'2026-10-08',scope:'全９章',itemCount:data.nodes.length,internalCount:internal.length,lawCount:laws.length,unresolvedCount:missing.length,externalCount:external.length,internal,missing,external,laws};
fs.writeFileSync(path.join(__dirname,'全編リンク監査.json'),JSON.stringify(audit,null,2));
console.log(JSON.stringify({items:data.nodes.length,internal:internal.length,laws:laws.length,missing,external},null,2));
run('close()');el('reader').scrollTop=456;
run("openRef({law:'法第12条第３項'})");
assert.ok(el('reference').innerHTML.includes('data-delegation="12|3"'));
el('panelScroll').scrollTop=180;
run("openRef({order:'360M50000008028',article:'5'})");
assert.ok(el('reference').innerHTML.includes('第五条'));
assert.ok(el('reference').innerHTML.includes('e-Govで確認'));
assert.equal(el('reader').scrollTop,456);
el('back').onclick();assert.equal(el('panelScroll').scrollTop,180);
assert.ok(el('reference').innerHTML.includes('data-delegation="12|3"'));
for(const [source,targets] of Object.entries(data.delegations)){
  assert.ok(run(`renderDelegation({delegation:${JSON.stringify(source)}})`).includes('data-order'));
  for(const target of targets){
    const output=run(`renderOrder(${JSON.stringify(target)})`);
    assert.ok(output.includes(data.orders[target.order].articles[target.article].title));
    assert.ok(!output.includes('data-delegation='));
  }
}
run("openRef({law:'法第30条の45'})");assert.ok(el('reference').innerHTML.includes('data-delegation="30-45|1"'));
run("openRef({delegation:'9|3'})");assert.ok(el('reference').innerHTML.includes('506M60000018001'));
el('panelScroll').scrollTop=100;el('panelScroll').clientHeight=500;
run("scrollReference({deltaY:40,deltaX:0,deltaMode:0,preventDefault(){}})");assert.equal(el('panelScroll').scrollTop,140);
run("scrollReference({deltaY:-20,deltaX:0,deltaMode:0,preventDefault(){}})");assert.equal(el('panelScroll').scrollTop,120);
run("scrollReference({deltaY:1,deltaX:0,deltaMode:1,preventDefault(){}})");assert.equal(el('panelScroll').scrollTop,144);
run("scrollReference({deltaY:1,deltaX:0,deltaMode:2,preventDefault(){}})");assert.equal(el('panelScroll').scrollTop,644);
run("scrollReference({ctrlKey:true,deltaY:40,deltaX:0,preventDefault(){throw Error('zoom blocked')}})");assert.equal(el('panelScroll').scrollTop,644);
run("scrollReference({deltaY:4,deltaX:40,preventDefault(){throw Error('horizontal scroll blocked')}})");assert.equal(el('panelScroll').scrollTop,644);
assert.equal(el('reader').scrollTop,456);
console.log('PASS: references, panel history, vertical wheel pixel/line/page movement, zoom/horizontal gestures and reader position.');
