import test from 'node:test';
import assert from 'node:assert/strict';
import { validateA2UIQuotes, isVerbatimQuote } from '../src/a2ui/quotes.ts';
import { a2uiHistoryText } from '../src/a2ui/history.ts';
import { sanitizeA2UIDocument, A2UI_GENERATION_RESPONSE_FORMAT } from '../src/a2ui/protocol.ts';
import { readCompletedA2UI } from '../src/a2ui/streaming.ts';
const primary={id:'answer',type:'narrative',title:'An answer',body:'Karthik builds systems that help people make useful decisions.',items:[],options:[],artifactIds:['project:real','project:invented'],quoteIds:[]};
const quote={id:'rationale',type:'quote_focus',title:'His rationale',body:'',items:[],options:[],artifactIds:['project:real'],quoteIds:['quote:project:real']};
const raw={version:'1.0',question:'Why?',title:'Why Karthik builds systems',lead:'',compositionOptions:['stacked'],quotes:[{artifactId:'project:real',text:'Useful systems help people make decisions.'}],primary,supporting:[quote],actions:[]};
const artifacts=[{id:'project:real',data:{title:'Real'},annotation:'“Useful systems help people make decisions.”'}];
test('generation schema puts complete quotes before components',()=>{const keys=Object.keys(A2UI_GENERATION_RESPONSE_FORMAT.json_schema.schema.properties);assert.ok(keys.indexOf('quotes')<keys.indexOf('primary'));const json=JSON.stringify(raw);const part=readCompletedA2UI(json.slice(0,json.indexOf(',"supporting"')));assert.deepEqual(part.quotes,raw.quotes)});
test('stream sanitization never inserts a temporary quote or drops authored support',()=>{const first=sanitizeA2UIDocument({...raw,supporting:[]},'Why?','',artifacts,[],{autoQuote:false});const next=sanitizeA2UIDocument(raw,'Why?','',artifacts,[],{autoQuote:false});assert.deepEqual(first.supporting,[]);assert.deepEqual(first.primary,next.primary);assert.deepEqual(next.supporting.map(s=>s.id),['rationale']);assert.deepEqual(next.primary.artifactIds,['project:real'])});
test('quotes reject fabricated text, unknown sources and reordered ellipsis fragments',()=>{const corpus='Useful systems help people make decisions. Careful experiments reveal what actually works.';assert.equal(isVerbatimQuote(corpus,'Useful systems help people…what actually works.'),true);assert.equal(isVerbatimQuote(corpus,'Careful experiments…Useful systems'),false);assert.equal(isVerbatimQuote(corpus,'Useful systems…fake'),false);const result=validateA2UIQuotes([{artifactId:'unknown',text:'Useful systems help people make decisions.'},{artifactId:'real',text:'This is fabricated text.'},{artifactId:'real',text:'Useful systems help people make decisions.'}],()=>corpus,new Set(['real']));assert.equal(result.size,1);assert.ok(result.get('real').includes('Useful systems'))});
test('history comes from the same sanitized facts without another model',()=>{const doc=sanitizeA2UIDocument(raw,'Why?','',artifacts,[],{autoQuote:false});const text=a2uiHistoryText(doc);assert.ok(text.includes(primary.body));assert.ok(text.includes(raw.title));assert.ok(!text.includes('project:invented'));assert.ok(text.length<=4000)});

// Load the real server generator with only the server-only gallery formatter
// replaced. OpenAI is injected by its public options, so tests exercise the
// actual streaming/validation path without a network call.
import { readFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const generatorPath=fileURLToPath(new URL('../src/a2ui/generate.ts',import.meta.url));
const requireFromGenerator=createRequire(generatorPath);
const generatorModule=new Module(generatorPath);
generatorModule.filename=generatorPath;
generatorModule.require=(id)=>{
  if(id==='@/utils/galleryIndex') return {galleryCategoryPromptDirectory:()=>''};
  if(id==='@/utils/modelRouting') return requireFromGenerator('../utils/modelRouting.ts');
  return requireFromGenerator(id.startsWith('./')?id+'.ts':id);
};
generatorModule._compile(ts.transpileModule(readFileSync(generatorPath,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,generatorPath);
const {generateA2UI}=generatorModule.exports;
function options(create,onPartial){return {llm:{chat:{completions:{create}}},question:'Why?',context:primary.body,sources:[{id:'project:real',label:'Real',corpus:'Useful systems help people make decisions.'}],galleryCategories:[],datedWorkOrder:'',hydrate:(id,annotation)=>({id,data:{title:'Real'},annotation}),onPartial};}
test('one completion streams stable complete components with validated hydrated sources',async()=>{
  let calls=0,ended=false;const updates=[];
  const result=await generateA2UI(options(async config=>{calls++;assert.equal(config.stream,true);return (async function*(){const json=JSON.stringify(raw);for(let n=0;n<json.length;n+=11)yield {choices:[{delta:{content:json.slice(n,n+11)}}]};ended=true;})()},(doc,source)=>{assert.equal(ended,false);updates.push(doc);assert.ok(source.every(a=>a.id==='project:real'));assert.ok(source[0].annotation)}));
  assert.equal(calls,1);assert.equal(result.grounded,true);assert.equal(updates[0].supporting.length,0);assert.equal(updates.at(-1).supporting[0].id,'rationale');assert.equal(updates[0].primary.id,result.document.primary.id);assert.equal(updates.find(u=>u.primary.body).primary.body,result.document.primary.body);assert.deepEqual(result.document.primary.artifactIds,["project:real"]);assert.ok(result.historyText.includes(primary.body));
});
test('truncated output retains a completed primary without repair calls',async()=>{
  let calls=0;const json=JSON.stringify(raw);const cutoff=json.indexOf(',"supporting"');
  const result=await generateA2UI(options(async()=>{calls++;return (async function*(){yield {choices:[{delta:{content:json.slice(0,cutoff)}}]}})()}));
  assert.equal(calls,1);assert.equal(result.grounded,true);assert.equal(result.document.primary.id,'answer');assert.deepEqual(result.document.supporting,[]);
});
// The model writes the lead and each body before the items that own their
// point, so ownership clears that prose only once the items arrive.
test('streamed prose is never shown and then taken back',async()=>{
  const pointed={version:'1.0',question:'Why?',points:[{id:'p1',text:'He builds decision systems.'},{id:'p2',text:'Real decisions are the bar.'}],title:'Why Karthik builds decision systems',titlePointId:'p1',lead:'He cares whether a system changes a real decision.',leadPointId:'p2',compositionOptions:['stacked'],quotes:[],
    primary:{id:'answer',type:'evidence_stack',title:'Decision systems',titlePointId:'p1',body:'He measures every system by the real decisions it improves for people.',bodyPointId:'p2',items:[{label:'Evidence',value:'Measured decisions',detail:'He judges systems by the decisions they improve rather than by demos.',pointId:'p2',artifactId:'project:real',assetId:''}],options:[],artifactIds:['project:real'],quoteIds:[]},
    supporting:[{id:'bar',type:'narrative',title:'The bar',titlePointId:'p2',body:'Changing a real decision is the bar he sets for every system he builds.',bodyPointId:'p2',items:[],options:[],artifactIds:[],quoteIds:[]}],actions:[]};
  const updates=[];const json=JSON.stringify(pointed);
  const result=await generateA2UI(options(async()=>(async function*(){for(let n=0;n<json.length;n+=7)yield {choices:[{delta:{content:json.slice(n,n+7)}}]}})(),doc=>updates.push(doc)));
  const prose=d=>new Map([['lead',d.lead],['primary.title',d.primary.title],['primary.body',d.primary.body],...d.supporting.flatMap((c,i)=>[[`supporting.${i}.title`,c.title],[`supporting.${i}.body`,c.body]])]);
  const docs=[...updates,result.document];
  docs.forEach((doc,i)=>{for(const [path,value] of prose(doc)){if(!value)continue;for(const later of docs.slice(i+1))assert.equal(prose(later).get(path),value,`${path} was shown in update ${i}, then changed`)}});
  // Not vacuous: ownership really does clear this prose, and items still stream.
  assert.deepEqual([result.document.lead,result.document.primary.body,result.document.supporting[0].body],['','','']);
  assert.ok(updates.some(u=>u.primary.items.length===1&&u.supporting.length===0));
});
test('an empty stream yields a recoverable unavailable answer without retrying',async()=>{
  let calls=0;const result=await generateA2UI(options(async()=>{calls++;return (async function*(){})()}));assert.equal(calls,1);assert.equal(result.grounded,false);assert.match(result.historyText,/Ask again/);
});
