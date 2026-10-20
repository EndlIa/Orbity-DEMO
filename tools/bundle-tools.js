import {createHash} from 'node:crypto';
import {readFile,readdir,lstat,realpath} from 'node:fs/promises';
import {resolve,relative,sep} from 'node:path';
import {validateManifestDraft,canonicalManifest} from '../src/manifest-review.js';
export const validateBundleManifest=validateManifestDraft;
const hash=bytes=>createHash('sha256').update(bytes).digest();
const excluded=(path)=>path.split('/').some(part=>['.git','node_modules','.orbity'].includes(part)) || ['.DS_Store','Thumbs.db'].includes(path.split('/').at(-1));
export async function inspectBundle(directory){
 const root=await realpath(directory),files=[];
 async function walk(folder){
  for(const entry of await readdir(folder,{withFileTypes:true})){
   const absolute=resolve(folder,entry.name),path=relative(root,absolute).split(sep).join('/');
   if(path.includes('\n')||path.includes('\r')||path.includes('\\'))throw Error(`Unsupported bundle path: ${path}`);
   if(excluded(path))continue;
   const stat=await lstat(absolute);
   if(stat.isSymbolicLink())throw Error(`Symlinks are unsupported: ${path}`);
   if(stat.isDirectory())await walk(absolute);
   else if(stat.isFile())files.push({path,bytes:await readFile(absolute)});
   else throw Error(`Unsupported file type: ${path}`);
  }
 }
 await walk(root);
 files.sort((a,b)=>Buffer.compare(Buffer.from(a.path),Buffer.from(b.path)));
 const manifestFile=files.find(f=>f.path==='orbity.json');
 if(!manifestFile)throw Error('Missing orbity.json. Adaptation drafts must be reviewed and completed before packing.');
 const manifest=JSON.parse(manifestFile.bytes.toString('utf8')),errors=validateBundleManifest(manifest);
 if(!files.some(f=>f.path===manifest?.entry))errors.push('entry must reference a file inside the bundle');
 const canonical=canonicalManifest(manifest);
 if(!manifestFile.bytes.equals(Buffer.from(canonical)))errors.push('orbity.json must use sorted keys, 2-space indentation, UTF-8 and a trailing LF');
 if(errors.length)throw Error(errors.join('\n'));
 const payload=files.map(f=>`${hash(f.bytes).toString('hex')} ${f.path}\n`).join('');
 return {id:manifest.id,version:manifest.version,integrity:'sha256-'+hash(payload).toString('base64'),files:files.map(f=>({path:f.path,bytes:f.bytes.length,sha256:hash(f.bytes).toString('hex')})),checks:{manifest:'passed',entry:'present',runtime:'not run',conformance:'not certified'}};
}
