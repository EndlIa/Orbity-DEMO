// Pure compatibility observations. UI rendering belongs to Orbity-site.
export function assessAsset({source, model}) {
  const runtime = model?.userData?.sculptRuntime;
  return [
    {label: '模型工厂', status: 'detected', detail: '当前页面通过适配器调用已知工厂函数，返回 Three.js 对象。'},
    {label: '组件结构', status: runtime?.nodes ? 'detected' : 'partial', detail: runtime?.nodes ? '检测到 sculptRuntime.nodes；同时可浏览命名对象。' : '未检测到 sculptRuntime.nodes；可浏览运行时命名对象。'},
    {label: '动画能力', status: 'deferred', detail: typeof model?.userData?.tick === 'function' ? '预览器检测到 tick 回调；动画协议和确定性检查暂缓。' : '尚未确认动画入口；动画协议暂缓。'},
    {label: '参数能力', status: 'deferred', detail: '参数规范和可编辑性认证暂缓；当前不会从源码推断参数。'},
    {label: '资源清理', status: 'partial', detail: '宿主适配层会释放常见几何体、材质和贴图；完整资源所有权及资产级契约仍需确认。'},
    {label: '边界与单位', status: 'deferred', detail: '真实单位和 bounds 暂缓确认；当前预览不代表物理尺度。'},
    {label: '协议状态', status: 'missing', detail: '这是人工接入的预览示例，尚未完成 Orbity 协议转换。'}
  ];
}
