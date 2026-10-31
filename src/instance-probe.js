import * as THREE from 'three';

export function probeInstances(create) {
 const instances=[];
 const state=root=>{root.updateMatrixWorld(true);const rows=[];root.traverse(o=>rows.push([o.type,o.name,...o.matrixWorld.elements]));return JSON.stringify(rows)};
 try{
  const a=create();instances.push(a);const b=create();instances.push(b);
  for(const instance of instances)if(!instance?.root?.isObject3D||typeof instance.dispose!=='function')throw Error('实例缺少 root 或 dispose');
  const bounds=new THREE.Box3().setFromObject(a.root),size=bounds.getSize(new THREE.Vector3());
  const before=state(b.root);a.tick?.(.5);const isolated=before===state(b.root);
  const bObjects=new Set();b.root.traverse(o=>bObjects.add(o));let sharedObjects=0;a.root.traverse(o=>{if(bObjects.has(o))sharedObjects++});
  const resources=root=>{const result=new Set();root.traverse(o=>{if(o.geometry)result.add(o.geometry);for(const material of Array.isArray(o.material)?o.material:[o.material])if(material){result.add(material);for(const value of Object.values(material))if(value?.isTexture)result.add(value)}});return result};
  const bResources=resources(b.root);let invalidatedResources=0;const listeners=[];
  for(const resource of bResources){const listener=()=>invalidatedResources++;resource.addEventListener('dispose',listener);listeners.push([resource,listener]);}
  try{a.dispose();a.dispose();b.tick?.(.5);}finally{for(const [resource,listener] of listeners)resource.removeEventListener('dispose',listener);}
  return {probe:'orbity-instance-probe/1',status:a.root!==b.root&&isolated&&!sharedObjects&&!invalidatedResources?'checks-passed':'review-required',checks:{separateRoots:a.root!==b.root,sharedHierarchyObjects:sharedObjects,independentTransforms:isolated,otherInstanceResourcesDisposed:invalidatedResources},observations:{initialBounds:{min:bounds.min.toArray(),max:bounds.max.toArray(),size:size.toArray(),units:'unconfirmed'},tick:typeof b.tick==='function'},limitations:['仅检查已内置、经过人工接入的实例。','边界只覆盖初始姿态；不作为正式 bounds。','未验证贴图像素、完整参数影响、确定性或沙箱。']};
 }finally{for(const instance of instances)instance?.dispose?.();}
}
