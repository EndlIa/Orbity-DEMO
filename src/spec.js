export function validateManifest(m) {
 const errors=[];
 if(!m || typeof m !== 'object') return ['清单必须是对象'];
 if(m.specVersion !== '0.1') errors.push('不支持的协议版本');
 if(typeof m.id !== 'string' || !/^[a-z0-9-]+$/.test(m.id)) errors.push('id 必须为小写字母、数字或连字符');
 if(typeof m.name !== 'string' || !m.name.trim()) errors.push('缺少名称');
 if(!m.parameters || typeof m.parameters !== 'object' || Array.isArray(m.parameters)) errors.push('parameters 必须是对象');
 else for(const [key,p] of Object.entries(m.parameters)) {
  if(!p || !['number','color','boolean'].includes(p.type)) { errors.push(`${key}: 不支持的参数类型`); continue; }
  if(p.type === 'number' && (typeof p.default !== 'number' || !Number.isFinite(p.default) || typeof p.min !== 'number' || typeof p.max !== 'number' || p.min > p.max || p.default < p.min || p.default > p.max)) errors.push(`${key}: 数值范围或默认值无效`);
  if(p.type === 'color' && !/^#[0-9a-f]{6}$/i.test(p.default)) errors.push(`${key}: 颜色格式无效`);
  if(p.type === 'boolean' && typeof p.default !== 'boolean') errors.push(`${key}: 默认值必须为布尔值`);
 }
 return errors;
}
export function defaults(manifest) { return Object.fromEntries(Object.entries(manifest.parameters).map(([k,v])=>[k,v.default])); }
export function validateValues(manifest, values) {
 const errors=[];
 for(const [k,p] of Object.entries(manifest.parameters)) { const v=values[k]; if(p.type==='number' && (typeof v!=='number'||!Number.isFinite(v)||v<p.min||v>p.max)) errors.push(k); if(p.type==='color' && (typeof v!=='string'||!/^#[0-9a-f]{6}$/i.test(v))) errors.push(k); if(p.type==='boolean' && typeof v!=='boolean') errors.push(k); }
 return errors;
}
