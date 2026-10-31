import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createModelInstance} from '../src/model-adapter.js';

test('adapter forwards animation and releases shared resources once', () => {
  const root = new THREE.Group(), parent = new THREE.Group();
  const geometry = new THREE.BoxGeometry(), texture = new THREE.Texture();
  const material = new THREE.MeshBasicMaterial({map: texture});
  root.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material));
  parent.add(root);
  let calls = [], disposed = {geometry: 0, material: 0, texture: 0};
  root.userData.tick = (dt, elapsed) => calls.push([dt, elapsed]);
  geometry.addEventListener('dispose', () => disposed.geometry++);
  material.addEventListener('dispose', () => disposed.material++);
  texture.addEventListener('dispose', () => disposed.texture++);
  const instance = createModelInstance(() => root);
  instance.tick(.1);
  instance.dispose(); instance.dispose(); instance.tick(.2);
  assert.deepEqual(calls, [[.1, .1]]);
  assert.deepEqual(disposed, {geometry: 1, material: 1, texture: 1});
  assert.equal(root.parent, null);
});
test('adapter rejects a factory without an Object3D', () => {
  assert.throws(() => createModelInstance(() => ({})), /Object3D/);
});

test('instances own independent clocks and disposal', () => {
  const factory=()=>{const root=new THREE.Group();root.userData.tick=(_dt,t)=>{root.position.x=t};return root};
  const a=createModelInstance(factory), b=createModelInstance(factory);
  a.tick(.2);a.tick(.3);b.tick(.1);
  assert.equal(a.root.position.x,.5);assert.equal(b.root.position.x,.1);
  a.dispose();b.tick(.2);assert.equal(a.root.position.x,.5);assert.ok(Math.abs(b.root.position.x-.3)<1e-10);
  assert.throws(()=>b.tick(NaN));assert.throws(()=>b.tick(-1));b.dispose();
});
