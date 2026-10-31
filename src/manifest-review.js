import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../spec/manifest.schema.json' with {type:'json'};
const validate=new Ajv2020({allErrors:true,strict:false}).compile(schema);
export function validateManifestDraft(manifest){
 const errors=[];
 if(!validate(manifest))errors.push(...validate.errors.map(e=>`${e.instancePath||'/'} ${e.message}`));
 if(manifest && typeof manifest==='object')for(const key of ['bounds'])if(Array.isArray(manifest[key])&&!manifest[key].every(Number.isFinite))errors.push(`${key}: values must be finite`);
 for(const param of Array.isArray(manifest?.params)?manifest.params:[]){
  if(!param||typeof param!=='object')continue;
  if(['number','integer'].includes(param.type) && (!Number.isFinite(param.default)||param.min!==undefined&&param.default<param.min || param.max!==undefined&&param.default>param.max || param.min!==undefined&&param.max!==undefined&&param.min>param.max))errors.push(`params/${param.key}: invalid range or default`);
  if(param.type==='enum' && (!Array.isArray(param.values)||!param.values.includes(param.default)))errors.push(`params/${param.key}: default is not an enum member`);
 }
 const names=new Set();for(const param of Array.isArray(manifest?.params)?manifest.params:[]){if(!param)continue;if(names.has(param.key))errors.push(`duplicate parameter: ${param.key}`);names.add(param.key)}
 return errors;
}
export function canonicalManifest(value){
 const sorted=item=>Array.isArray(item)?item.map(sorted):item&&typeof item==='object'?Object.fromEntries(Object.keys(item).sort().map(k=>[k,sorted(item[k])])):item;
 return JSON.stringify(sorted(value),null,2)+'\n';
}
