import {parse} from '@babel/parser';
import {createModelInstance} from './model-adapter.js';

export function inspectModule(source) {
  const ast=parse(source,{sourceType:'module',plugins:['typescript']});
  const factories=[], factoryDetails=[], unsupported=[], imports=[], bindings=new Map(), exports=[];
  const unwrap=node=>{
    while(node && ['TSAsExpression','TSSatisfiesExpression','TSNonNullExpression','ParenthesizedExpression','TSTypeAssertion'].includes(node.type)) node=node.expression;
    return node;
  };
  function bind(node) {
    if(node?.type==='FunctionDeclaration' && node.id) bindings.set(node.id.name,{node,kind:'function'});
    if(node?.type==='VariableDeclaration') for(const item of node.declarations)
      if(item.id.type==='Identifier') bindings.set(item.id.name,{node:unwrap(item.init),kind:node.kind});
    if(node?.type==='ImportDeclaration') for(const item of node.specifiers) bindings.set(item.local.name,{kind:'import'});
  }
  for(const statement of ast.program.body) {
    bind(statement);
    if(statement.type==='ImportDeclaration') imports.push(statement.source.value);
    if(statement.type==='ExportNamedDeclaration') {
      if(statement.exportKind==='type') continue;
      bind(statement.declaration);
      const node=statement.declaration;
      if(node?.type==='FunctionDeclaration' && node.id) exports.push({name:node.id.name,local:node.id.name,rule:'named-function',line:node.loc.start.line});
      if(node?.type==='VariableDeclaration') for(const item of node.declarations)
        if(item.id.type==='Identifier') exports.push({name:item.id.name,local:item.id.name,rule:'named-variable',line:item.loc.start.line});
      for(const item of statement.specifiers) if(item.exportKind!=='type') exports.push({name:item.exported.name??item.exported.value,local:item.local?.name,rule:'local-export',external:!!statement.source,line:item.loc.start.line});
      if(statement.source) imports.push(statement.source.value);
    }
    if(statement.type==='ExportAllDeclaration') {
      imports.push(statement.source.value);
      unsupported.push({name:'*',reason:'re-export',line:statement.loc.start.line});
    }
    if(statement.type==='ExportDefaultDeclaration') {
      const node=unwrap(statement.declaration);
      bind(node);
      exports.push({name:'default',local:node.type==='Identifier'?node.name:node.type==='FunctionDeclaration'?node.id?.name:undefined,node:node.type==='Identifier'?undefined:node,rule:'default-export',line:node.loc.start.line});
    }
  }
  // Conservative write detection: a shadowed write can exclude a candidate, never approve one.
  const written=new Set();
  function writes(node) {
    if(!node || typeof node!=='object') return;
    function target(value) {
      if(!value) return;
      if(value.type==='Identifier') written.add(value.name);
      else if(value.type==='RestElement') target(value.argument);
      else if(value.type==='AssignmentPattern') target(value.left);
      else if(value.type==='ArrayPattern') value.elements.forEach(target);
      else if(value.type==='ObjectPattern') value.properties.forEach(x=>target(x.type==='RestElement'?x.argument:x.value));
    }
    if(node.type==='AssignmentExpression') target(node.left);
    if(node.type==='UpdateExpression') target(node.argument);
    if(['ForInStatement','ForOfStatement'].includes(node.type) && node.left.type!=='VariableDeclaration') target(node.left);
    for(const [key,value] of Object.entries(node)) if(!['loc','start','end'].includes(key)) {
      if(Array.isArray(value)) value.forEach(writes); else if(value && typeof value==='object') writes(value);
    }
  }
  writes(ast.program);
  function resolve(name,seen=new Set()) {
    if(seen.has(name)) return {reason:'cyclic-alias'};
    seen.add(name);
    const binding=bindings.get(name);
    if(!binding) return {reason:'unresolved-binding'};
    if(binding.kind==='import') return {reason:'imported-binding'};
    if(!['const','function'].includes(binding.kind) || written.has(name)) return {reason:'mutable-binding'};
    if(binding.node?.type==='Identifier') {
      const result=resolve(binding.node.name,seen);
      return {...result,aliases:[name,...(result.aliases||[])]};
    }
    return {node:binding.node,aliases:[name]};
  }
  for(const item of exports) {
    const result=item.external?{reason:'re-export'}:item.local?resolve(item.local):{node:item.node,aliases:[]};
    const node=result.node;
    let reason=result.reason;
    if(!reason && !['FunctionDeclaration','FunctionExpression','ArrowFunctionExpression'].includes(node?.type)) reason='not-function';
    if(!reason && (node.async || node.generator)) reason=node.async?'async-function':'generator-function';
    if(!reason && node.params.some(param=>param.type!=='AssignmentPattern' && param.type!=='RestElement' && !param.optional && !(param.type==='Identifier' && param.name==='this'))) reason='required-arguments';
    if(reason) unsupported.push({name:item.name,reason,line:item.line});
    else {
      factories.push(item.name);
      factoryDetails.push({name:item.name,importKind:item.name==='default'?'default':'named',rule:item.rule,local:item.local??null,aliases:result.aliases||[],line:item.line});
    }
  }
  const findings=[];
  function visit(node) {
    if(!node || typeof node!=='object') return;
    if(node.type==='Identifier' && ['WebGLRenderer','PerspectiveCamera','OrthographicCamera','requestAnimationFrame','setAnimationLoop','setInterval','document','fetch','XMLHttpRequest','WebSocket','Worker'].includes(node.name)) findings.push({name:node.name,line:node.loc.start.line});
    if(node.type==='ImportExpression') findings.push({name:'dynamic import',line:node.loc.start.line});
    for(const [key,value] of Object.entries(node)) if(!['loc','start','end'].includes(key)) {
      if(Array.isArray(value)) value.forEach(visit); else if(value && typeof value==='object') visit(value);
    }
  }
  visit(ast.program);
  const uniqueFindings=[...new Map(findings.map(x=>[`${x.name}:${x.line}`,x])).values()];
  const findingNames=new Set(uniqueFindings.map(item=>item.name));
  const concerns=[];
  if(!factories.length) concerns.push({code:'no-supported-entry',severity:'blocking',message:'没有符合规则的对象工厂，也未识别出简单展示应用结构。'});
  if(['WebGLRenderer','PerspectiveCamera','OrthographicCamera','requestAnimationFrame','setAnimationLoop','setInterval'].some(name=>findingNames.has(name))) concerns.push({code:'app-loop-or-renderer',severity:'review',message:'源码包含渲染器、相机或独立循环线索；需要把宿主生命周期移出资产。'});
  if(findingNames.has('document')) concerns.push({code:'dom-access',severity:'review',message:'源码访问 document；请改用宿主提供的纹理或输入能力。'});
  if(['fetch','XMLHttpRequest','WebSocket','Worker'].some(name=>findingNames.has(name))) concerns.push({code:'external-side-effect',severity:'review',message:'源码包含网络、Worker 或持久副作用线索；生成包不会替你隔离这些调用。'});
  if(findingNames.has('dynamic import')) concerns.push({code:'dynamic-import',severity:'review',message:'源码包含动态 import；单文件适配器不会解析运行时依赖。'});
  const appLike=findingNames.has('WebGLRenderer')&&(findingNames.has('PerspectiveCamera')||findingNames.has('OrthographicCamera')||findingNames.has('requestAnimationFrame')||findingNames.has('document'));const complex=['fetch','XMLHttpRequest','WebSocket','Worker','dynamic import'].filter(name=>findingNames.has(name));if(appLike)concerns.unshift({code:'simple-app-host-boundary',severity:'review',message:'识别到简单应用线索；渲染器、相机和动画循环应由 Orbity 宿主统一管理。'});if(complex.length)concerns.push({code:'out-of-scope-complexity',severity:'blocking',message:`检测到超出当前范围的副作用线索：${complex.join('、')}。`});const mode=complex.length?'unsupported':appLike?'simple-app-candidate':factories.length?'object-asset-candidate':'unsupported';
  return {factories,factoryDetails:factoryDetails.map(item=>({...item,localName:item.local})),unsupported,unsupportedExports:unsupported,imports:[...new Set(imports)],findings:uniqueFindings,adaptation:{mode,concerns}};
}

export function generateAdapter({source,factory,filename='model.ts',id='local/model',units='',license='',allowRequiredArguments=false}) {
  if(typeof source!=='string' || !source.trim() || source.length>1000000) throw Error('请输入不超过 1 MB 的源码。');
  if(!/^[a-zA-Z0-9_-]+\.(?:ts|js|mjs)$/.test(filename)) throw Error('文件名仅支持字母、数字、连字符、下划线和 ts/js/mjs 扩展名。');
  if(!/^[a-z0-9][a-z0-9._-]{0,62}\/[a-z0-9][a-z0-9._-]{0,62}$/.test(id)) throw Error('资产 ID 使用 owner/name 格式。');
  if(units && !['m','cm','mm','in'].includes(units)) throw Error('单位无效。');
  const inspection=inspectModule(source);
  let selected=inspection.factoryDetails.find(item=>item.name===factory);
  if(!selected && allowRequiredArguments) {
    const required=inspection.unsupportedExports.find(item=>item.name===factory && item.reason==='required-arguments');
    if(required) selected={name:factory,localName:factory,local:factory,importKind:factory==='default'?'default':'named',rule:'reviewed-required-arguments',line:required.line,requiredArguments:true};
  }
  if(!selected) throw Error('请选择当前源码导出且无需必填参数的同步工厂候选函数。');
  if(inspection.adaptation.mode!=='object-asset-candidate'&&!selected.requiredArguments) throw Error(inspection.adaptation.mode==='simple-app-candidate'?'检测到简单应用结构，不能包装成对象资产；请使用简单应用审查流程。':'源码超出当前支持范围，不能生成对象资产入口。');
  const draft={spec:'orbity/0.1',id,version:'0.0.0',entry:'entry.js',capabilities:{edit:'static',ownsWorld:false}};
  if(units) draft.units=units;
  if(license.trim()) draft.license=license.trim();
  const report={status:'draft',factory,rule:selected,sourceFile:`source/${filename}`,inspection,pending:[...(!license.trim()?['确认再分发许可']:[]),'运行工厂两次并检查实例隔离'],deferredExtensions:[...(!units?['真实单位']:[]),'bounds','params/editability','animation/tick'],notice:`静态线索可能有误报或遗漏；生成过程中未执行源码。${selected.requiredArguments?'此工厂存在必填参数，已由审查流程显式放行；生成的 create() 仍需宿主提供兼容调用。':''}`};
  const entry=`// Generated instance adapter draft. Review adaptation-report.json before use.\nimport ${selected.importKind==='default'?'upstreamFactory':`{ ${/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(factory)?factory:JSON.stringify(factory)} as upstreamFactory }`} from './source/${filename}';\nimport { createModelInstance } from './adapter-runtime.js';\n\nexport function create() {\n  return createModelInstance(upstreamFactory);\n}\n`;
  return {inspection,files:{[`source/${filename}`]:source,'entry.js':entry,'adapter-runtime.js':`export const createModelInstance = ${createModelInstance.toString()};\n`,'orbity.draft.json':JSON.stringify(draft,null,2)+'\n','adaptation-report.json':JSON.stringify(report,null,2)+'\n','README.md':`# ${id} — adaptation draft\n\nThis package contains the unchanged source and a generated entry wrapper.\nUse a TypeScript-aware bundler if the source is TypeScript. Resolve all imports manually.\nReview adaptation-report.json and confirm the license before sharing. Units, bounds, params and animation/tick are deferred extensions in the MVP profile. This draft is not a certified orbity.json.\nNo parameters, sockets, physical scale or license were inferred.\n`}};
}


export function generateSimpleAppReview({source,filename='application.ts',id='local/application'}) {
  if(typeof source!=='string'||!source.trim()||source.length>1000000) throw Error('请输入不超过 1 MB 的源码。');
  if(!/^[a-zA-Z0-9_-]+\.(?:ts|js|mjs)$/.test(filename)) throw Error('文件名仅支持字母、数字、连字符、下划线和 ts/js/mjs 扩展名。');
  if(!/^[a-z0-9][a-z0-9._-]{0,62}\/[a-z0-9][a-z0-9._-]{0,62}$/.test(id)) throw Error('资产 ID 使用 owner/name 格式。');
  const inspection=inspectModule(source);
  if(inspection.adaptation.mode!=='simple-app-candidate') throw Error('源码未被识别为当前范围内的简单展示应用。');
  const report={status:'review-only',kind:'simple-app-candidate',sourceFile:`source/${filename}`,inspection,pending:['确认这是单场景、单页面的展示应用','确认是否只有 Three.js 场景、相机、灯光和轻量交互','将 renderer 与 requestAnimationFrame 移交给 Orbity 宿主','决定简单应用宿主接口后再生成可执行入口'],notice:'此包只保存原始源码和人工迁移计划；不会执行源码，也不定义或冻结应用宿主协议。'};
  return {inspection,files:{[`source/${filename}`]:source,'application-review.json':JSON.stringify(report,null,2)+'\n','SIMPLE-APP-REVIEW.md':`# ${id} — simple application review\n\nThis review-only draft keeps the source unchanged. It does not contain an executable entry or define an application host API.\n\n## Migration checklist\n\n- Confirm the source is a small, single-scene visual demo.\n- Keep scene content and lightweight interaction; move renderer ownership, resize handling and the animation loop to the host.\n- Resolve each finding in application-review.json manually.\n- Wait for the simple-app host contract before creating an executable adapter.\n`}};
}
