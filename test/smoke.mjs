import assert from 'node:assert/strict';
import { actionNode, createDocument, entityNode, typeNode } from '@shapeshift-labs/frontier-lang-kernel';
import { emitPython } from '../dist/index.js';

const document = createDocument({ id: 'doc', name: 'Doc', nodes: [
  typeNode({ id: 'type_input', name: 'TodoInput', fields: [{ id: 'title', name: 'title', type: 'Text' }] }),
  entityNode({ id: 'entity_todo', name: 'Todo', fields: [{ id: 'tags', name: 'tags', type: { kind: 'set', item: 'Text' } }] }),
  actionNode({ id: 'action_add', name: 'add_todo', input: 'TodoInput', returns: 'Patch' })
] });
const out = emitPython(document);
assert.match(out, /class TodoInput/);
assert.match(out, /class Todo/);
assert.match(out, /frozenset\[str\]/);
assert.match(out, /def add_todo/);
