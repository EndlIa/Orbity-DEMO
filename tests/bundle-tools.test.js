import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,rm,symlink} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {inspectBundle,validateBundleManifest} from '../tools/bundle-tools.js';
const manifest={bounds:[1,1,1],capabilities:{edit:'static',ownsWorld:false},entry:'entry.js',id:'local/sample',license:'MIT',spec:'orbity/0.1',units:'m',version:'0.0.0'};
test('bundle digest is stable, ignores normative exclusions, and is byte exact',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'orbity-bundle-'));
 try{await writeFile(join(dir,'orbity.json'),JSON.stringify(manifest,null,2)+'\n');await writeFile(join(dir,'entry.js'),'export {};\n');
 const a=await inspectBundle(dir);await mkdir(join(dir,'.orbity'));await writeFile(join(dir,'.orbity','cache'),'ignored');assert.equal((await inspectBundle(dir)).integrity,a.integrity);
 await writeFile(join(dir,'entry.js'),'export {};\r\n');assert.notEqual((await inspectBundle(dir)).integrity,a.integrity);
 await symlink('/tmp',join(dir,'outside'));await assert.rejects(inspectBundle(dir),/Symlinks/);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('schema rejects unknown fields and invalid manifests',()=>{assert.deepEqual(validateBundleManifest(manifest),[]);assert.ok(validateBundleManifest({...manifest,unknown:true}).length);assert.ok(validateBundleManifest({...manifest,units:undefined}).length);});
