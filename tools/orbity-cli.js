import {inspectBundle,validateBundleManifest} from './bundle-tools.js';
import {readFile} from 'node:fs/promises';
const [command,path]=process.argv.slice(2);
try{
 if(command==='inspect'&&path)console.log(JSON.stringify(await inspectBundle(path),null,2));
 else if(command==='validate'&&path){const errors=validateBundleManifest(JSON.parse(await readFile(path,'utf8')));if(errors.length)throw Error(errors.join('\n'));console.log('Manifest schema and value checks passed. Runtime conformance has not been tested.');}
 else {console.error('Usage: npm run orbity -- inspect <bundle-dir> | validate <manifest.json>');process.exitCode=1;}
}catch(error){console.error(error.message);process.exitCode=1;}
