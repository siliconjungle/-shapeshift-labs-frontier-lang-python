import assert from 'node:assert/strict';
import { createDocument, entityNode, actionNode } from '@shapeshift-labs/frontier-lang-kernel';
import { emitPython } from '../dist/index.js';

for (let index = 0; index < 100; index += 1) {
  const document = createDocument({ id: `doc_${index}`, name: `Doc${index}`, nodes: [
    entityNode({ id: `ent_${index}`, name: 'Todo', fields: [{ id: `field_title_${index}`, name: 'title', type: 'Text' }] }),
    actionNode({ id: `action_${index}`, name: 'update_todo', input: 'Todo', returns: 'Patch' })
  ] });
  const output = emitPython(document);
  assert.match(output, /class Todo/);
  assert.match(output, /def update_todo/);
}
