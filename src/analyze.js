/** Conservative hints only; this is not a parser or a security scanner. */
export function analyzeSource(source){
 const factories=[...source.matchAll(/export\s+(?:async\s+)?function\s+([\w$]+)\s*\(/g)].map(m=>m[1]);
 const imports=[...source.matchAll(/(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g)].map(m=>m[1]);
 const warnings=[];if(/\bWebGLRenderer\b/.test(source))warnings.push('发现渲染器：模型与展示环境可能需要分离。');if(/requestAnimationFrame/.test(source))warnings.push('发现独立渲染循环：需要人工迁移生命周期。');if(/\b(fetch|XMLHttpRequest|WebSocket)\b/.test(source))warnings.push('发现网络相关调用：需要人工检查。');if(/\bonBeforeCompile\b|ShaderMaterial/.test(source))warnings.push('发现自定义 shader：需要验证渲染器和版本兼容性。');
 return {factories,imports:[...new Set(imports)],hasGroup:/\b(?:THREE\.)?Group\b/.test(source),warnings};
}
