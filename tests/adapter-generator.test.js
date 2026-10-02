import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectModule,generateAdapter,generateSimpleAppReview} from '../src/adapter-generator.js';
const source="import * as THREE from 'three'; export const createModel = () => new THREE.Group();";
test('recognizes sync exports and preserves original bytes in draft',()=>{const r=generateAdapter({source,factory:'createModel'});assert.equal(r.files['source/model.ts'],source);assert.match(r.files['entry.js'],/export function create/);const manifest=JSON.parse(r.files['orbity.draft.json']);assert.equal(manifest.units,undefined);assert.equal(manifest.license,undefined);assert.equal(manifest.bounds,undefined);assert.equal(manifest.params,undefined);});
test('rejects unknown factories and path traversal',()=>{assert.throws(()=>generateAdapter({source,factory:'unknown'}));assert.throws(()=>generateAdapter({source,factory:'createModel',filename:'../evil.ts'}));});
test('AST inspection ignores comments and reports application concerns with locations',()=>{const r=inspectModule('// document fetch requestAnimationFrame\nexport async function ignored(){}\nexport function create(){ return document.createElement("canvas") }');assert.deepEqual(r.factories,['create']);assert.deepEqual(r.findings,[{name:'document',line:3}]);});
test('invalid syntax fails and user-confirmed metadata is retained',()=>{assert.throws(()=>inspectModule('export function {'));const r=generateAdapter({source,factory:'createModel',units:'cm',license:'MIT'});assert.equal(JSON.parse(r.files['orbity.draft.json']).units,'cm');assert.equal(JSON.parse(r.files['orbity.draft.json']).license,'MIT');});

test('generated entry executes with isolated instance lifecycle',async()=>{
 const {mkdtemp,writeFile,mkdir,rm}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {pathToFileURL}=await import('node:url');
 const dir=await mkdtemp(join(tmpdir(),'orbity-generated-'));
 try{
  const source="export function createModel(){ const root={isObject3D:true,userData:{},removeFromParent(){},traverse(fn){fn(this)}};root.userData.tick=(_dt,time)=>{root.time=time};return root; }";
  const {files}=generateAdapter({source,factory:'createModel',filename:'model.js'});
  await mkdir(join(dir,'source'));await writeFile(join(dir,'package.json'),'{"type":"module"}');
  for(const [name,content] of Object.entries(files))await writeFile(join(dir,name),content);
  const {create}=await import(pathToFileURL(join(dir,'entry.js')).href);
  const a=create(),b=create();a.tick(.5);b.tick(.1);a.dispose();b.tick(.2);
  assert.equal(a.root.time,.5);assert.ok(Math.abs(b.root.time-.3)<1e-10);b.dispose();
 }finally{await rm(dir,{recursive:true,force:true})}
});


test('resolves default exports, named aliases and immutable alias chains',()=>{
 const cases=[
  ['export default function make() {}','default','default-export'],
  ['export default () => ({})','default','default-export'],
  ['const make=()=>({}); export default make','default','default-export'],
  ['function make(){} export {make as asset}','asset','local-export'],
  ['function make(){} const alias=make; export {alias as default}','default','local-export'],
  ['export const make=(size=1,...extra)=>({})','make','named-variable'],
  ['const make=()=>({}); export {make as "asset-model"}','asset-model','local-export'],
 ];
 for(const [source,name,rule] of cases) {
  const inspection=inspectModule(source);
  assert.deepEqual(inspection.factories,[name]);
  assert.equal(inspection.factoryDetails[0].rule,rule);
  const {files}=generateAdapter({source,factory:name});
  assert.equal(JSON.parse(files['adaptation-report.json']).rule.name,name);
  assert.equal(files['source/model.ts'],source);
  if(name==='default') assert.match(files['entry.js'],/import upstreamFactory from/);
 }
});

test('reports exclusions instead of guessing callable exports',()=>{
 const source=`import {external} from 'elsewhere';
export {external};
export {other} from 'elsewhere';
export async function asynchronous(){}
export function* iterator(){}
export function needsArgument(value){}
export let mutable=()=>({});
export const number=1;
function reassigned(){} reassigned=()=>({}); export {reassigned};
export class Model {}
export const a=b,b=a;
export * from 'other';`;
 const result=inspectModule(source);
 assert.deepEqual(result.factories,[]);
 for(const reason of ['imported-binding','re-export','async-function','generator-function','required-arguments','mutable-binding','not-function','cyclic-alias']) assert.ok(result.unsupported.some(x=>x.reason===reason),reason);
 assert.deepEqual(result.imports,['elsewhere','other']);
 assert.throws(()=>generateAdapter({source,factory:'needsArgument'}));
});

test('nested function exports and shadowed assignments never create a false candidate',()=>{
 const result=inspectModule(`function outer(){ function inner(){} } export {outer};
 function mutable(){} function shadow(){ let mutable; mutable=1; } export {mutable};`);
 assert.deepEqual(result.factories,['outer']);
 assert.equal(result.unsupported.find(x=>x.name==='mutable').reason,'mutable-binding');
});

test('required arguments need an explicit reviewed escape hatch',()=>{
 const source='export function createModel(host) { return host; }';
 assert.throws(()=>generateAdapter({source,factory:'createModel'}));
 const result=generateAdapter({source,factory:'createModel',allowRequiredArguments:true});
 const report=JSON.parse(result.files['adaptation-report.json']);
 assert.equal(report.rule.rule,'reviewed-required-arguments');
 assert.match(report.notice,/必填参数/);
});

test('generated default and aliased entries execute actual export bindings',async()=>{
 const {mkdtemp,writeFile,mkdir,rm}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {pathToFileURL}=await import('node:url');
 const body='return {isObject3D:true,userData:{},removeFromParent(){},traverse(fn){fn(this)}}';
 const cases=[
  ['export default function(){'+body+'}','default'],
  ['export default ()=>{'+body+'}','default'],
  ['function local(){'+body+'} export {local as renamed}','renamed'],
  ['function local(){'+body+'} const alias=local; export default alias','default'],
  ['function local(){'+body+'} export {local as "asset-model"}','asset-model'],
 ];
 for(const [source,factory] of cases) {
  const dir=await mkdtemp(join(tmpdir(),'orbity-exports-'));
  try {
   const {files}=generateAdapter({source,factory,filename:'model.js'});
   await mkdir(join(dir,'source'));await writeFile(join(dir,'package.json'),' {"type":"module"}');
   for(const [name,content] of Object.entries(files)) await writeFile(join(dir,name),content);
   const {create}=await import(pathToFileURL(join(dir,'entry.js')).href);
   const a=create(),b=create();assert.notEqual(a.root,b.root);a.dispose();b.dispose();
  }finally{await rm(dir,{recursive:true,force:true})}
 }
});

test('classifies adaptation concerns without executing source',()=>{
 const candidate=inspectModule("import * as THREE from 'three'; export function create(){ const camera=new THREE.PerspectiveCamera(); requestAnimationFrame(()=>{}); return camera; }");
 assert.equal(candidate.adaptation.mode,'object-asset-candidate');
 assert.ok(candidate.adaptation.concerns.some(item=>item.code==='app-loop-or-renderer'));
 const shell=inspectModule("const renderer = new WebGLRenderer(); document.body.append(renderer); requestAnimationFrame(loop);");
 assert.equal(shell.adaptation.mode,'simple-app-candidate');
 assert.deepEqual(shell.adaptation.concerns.map(item=>item.code),['simple-app-host-boundary','no-supported-entry','app-loop-or-renderer','dom-access']);
});


test('generates a review-only draft for simple applications',()=>{
 const source="const renderer=new WebGLRenderer(); const camera=new PerspectiveCamera(); requestAnimationFrame(loop);";
 const result=generateSimpleAppReview({source,filename:'app.js'});
 assert.ok(result.files['application-review.json']);
 assert.match(result.files['SIMPLE-APP-REVIEW.md'],/does not contain an executable entry/);
 assert.equal(Object.hasOwn(result.files,'entry.js'),false);
});
