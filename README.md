# Orbity Core

`@orbity/core` 是 Orbity 的技术核心：协议草案、Three.js 源码分析、确定性工厂适配、清单校验、兼容性观察和实例生命周期检查。

## 当前范围

- Three.js 对象资产候选：同步工厂返回 `Object3D`，可生成待审查适配草稿。
- 简单 Three.js 应用候选：只生成只读审查包，不冻结应用宿主协议。
- `orbity/0.1` schema、MVP profile 和 bundle 检查 CLI。
- 规则优先；不会执行上传源码，也不会把静态识别当成安全认证。

参数、边界、单位、动画能力、远程 registry、账号和持久化 Fork 仍是后续工作。上游示例不属于本仓库的许可证范围。

## 开发

```bash
npm install
npm test
npm run orbity -- validate path/to/orbity.json
npm run orbity -- inspect path/to/bundle
```

许可证：`UNLICENSED`（待发布前确定）。
