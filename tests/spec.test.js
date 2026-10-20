import test from 'node:test';
import assert from 'node:assert/strict';
import {validateManifest, defaults} from '../src/spec.js';
import {validateManifestDraft} from '../src/manifest-review.js';

const manifest = {
  specVersion: '0.1',
  id: 'local-model',
  name: 'Local model',
  parameters: {height: {type: 'number', min: 0, max: 2, default: 1.5}}
};

test('核心协议清单验证和默认值保持稳定', () => {
  assert.deepEqual(validateManifest(manifest), []);
  assert.equal(defaults(manifest).height, 1.5);
  const invalid = structuredClone(manifest);
  invalid.parameters.height.default = 9;
  assert.ok(validateManifest(invalid).length);
});

test('清单草稿使用参数 key 报告范围和重复错误', () => {
  const base = {spec: 'orbity/0.1', id: 'local/model', version: '0.0.0', entry: 'entry.js', units: 'm', bounds: [1, 1, 1], capabilities: {edit: 'params', ownsWorld: false}, license: 'MIT', params: [{key: 'size', type: 'number', min: 0, max: 1, default: 2}, {key: 'size', type: 'number', min: 0, max: 1, default: .5}]};
  const errors = validateManifestDraft(base);
  assert.ok(errors.some(error => error.includes('params/size')));
  assert.ok(errors.some(error => error.includes('duplicate parameter: size')));
});
