import test from 'node:test';import assert from 'node:assert/strict';import {extractSymbols,findLines} from '../src/code-tools.js';
test('提取真实 TypeScript 符号并保留行号',()=>{const s='// function fake() {}\nexport interface Opt { x:number }\nexport function make() { return 1 }';assert.deepEqual(extractSymbols(s).map(x=>[x.name,x.line]),[['Opt',2],['make',3]])});
test('代码搜索忽略大小写并返回所有匹配行',()=>{assert.deepEqual(findLines('Mesh\nmesh\nGroup','MESH'),[1,2]);assert.deepEqual(findLines('abc',' '),[])});
