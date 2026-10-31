// Pure report generation. UI rendering belongs to Orbity-site.
export function buildAdaptationReport({id, filename, factory, source, model}) {
  const runtime = model?.userData?.sculptRuntime;
  const nodes = Object.keys(runtime?.nodes || {});
  const sockets = Object.keys(runtime?.sockets || {});
  return {
    reportVersion: '0.1',
    status: 'incomplete',
    asset: {suggestedId: `test01/${id}`, sourceFile: filename, upstreamFactory: factory},
    observations: {
      factory: '通过当前人工适配器调用，尚未完成独立验证',
      runtimeNodes: nodes,
      runtimeSockets: sockets,
      tick: typeof model?.userData?.tick === 'function',
      sourceBytes: new TextEncoder().encode(source).length
    },
    requiredDecisions: [
      {field: 'license', reason: '需核实作者邮件授权的具体再分发条款及第三方权利。'},
      {field: 'entry', reason: '需要实现并验证符合协议的包装入口和生命周期。'}
    ],
    deferredExtensions: [
      {field: 'units', reason: '真实单位暂缓确认。'},
      {field: 'bounds', reason: '边界暂缓测量，不作为当前认证条件。'},
      {field: 'animation', reason: '动画协议和确定性检查暂缓。'},
      {field: 'params', reason: '参数和编辑等级暂缓，不从数字常量推断。'}
    ],
    limitations: [
      '此文件是适配报告，不是有效的 Orbity manifest。',
      '静态检查和运行时观察不能证明安全性、视觉保真或协议一致性。'
    ]
  };
}
