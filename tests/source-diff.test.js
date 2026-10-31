import test from 'node:test';import assert from 'node:assert/strict';
import {diffSource,unifiedPatch} from '../src/source-diff.js';
test('diff preserves exact original and adapted lines including blank lines',()=>{const before='a\nb\n\nc',after='a\nx\n\nc\nd';const rows=diffSource(before,after);assert.equal(rows.filter(r=>r.kind!=='add').map(r=>r.text).join('\n'),before);assert.equal(rows.filter(r=>r.kind!=='remove').map(r=>r.text).join('\n'),after);assert.equal(rows.find(r=>r.text==='x').after,2);assert.match(unifiedPatch(before,after,'old.ts','new.ts'),/--- a\/old.ts/);});
test('diff bounds work for arbitrary sources',()=>{assert.throws(()=>diffSource('x\n'.repeat(1500),'y\n'.repeat(1500)),/过大/)});
