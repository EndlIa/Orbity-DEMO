import test from 'node:test';import assert from 'node:assert/strict';
import {createTextureHost} from '../src/texture-host.js';
test('drawing facade hides canvas and expires after callback; disposal restores budget',()=>{
 const ctx={getImageData:(_x,_y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),clearRect(){},strokeRect(){},arc(){},beginPath(){},stroke(){},fillText(){},measureText(){return {width:4}}};let saved;
 const host=createTextureHost({maxPixels:16,canvasFactory:()=>({getContext:()=>ctx})});
 const texture=host.createTexture({width:4,height:4},drawing=>{saved=drawing;assert.equal(drawing.canvas,undefined);assert.equal(drawing.getImageData,undefined);assert.deepEqual(drawing.measureText('x'),{width:4});});
 assert.equal(texture.image.getContext,undefined);assert.ok(texture.isDataTexture);assert.throws(()=>saved.fillText('x',1,1),/ended/);
 assert.throws(()=>host.createTexture({width:1,height:1},()=>{}),/budget/);
 texture.dispose();const next=host.createTexture({width:4,height:4},()=>{});let disposed=0;next.addEventListener('dispose',()=>disposed++);host.dispose();host.dispose();assert.equal(disposed,1);assert.throws(()=>host.createTexture({width:1,height:1},()=>{}),/disposed/);
});
test('drawing failure does not consume texture budget',()=>{const host=createTextureHost({maxPixels:1,canvasFactory:()=>({getContext:()=>({getImageData:()=>({data:new Uint8ClampedArray(4)})})})});assert.throws(()=>host.createTexture({width:1,height:1},()=>{throw Error('draw failed')}));host.createTexture({width:1,height:1},()=>{});host.dispose();});
