import assert from 'node:assert/strict';
import { actionNode, capabilityNode, createDocument, entityNode, typeNode } from '@shapeshift-labs/frontier-lang-kernel';
import { emitPython, renderPythonAst, toPythonAst } from '../dist/index.js';

const document = createDocument({ id: 'doc', name: 'Doc', nodes: [
  typeNode({ id: 'type_input', name: 'TodoInput', fields: [{ id: 'title', name: 'title', type: 'Text' }] }),
  capabilityNode({ id: 'cap_http', name: 'HttpRequest', capability: 'http.request', adapters: [
    { target: { language: 'python', platform: 'server', packageName: 'httpx' }, symbol: 'httpx.request', kind: 'library' }
  ] }),
  entityNode({ id: 'entity_todo', name: 'Todo', fields: [{ id: 'tags', name: 'tags', type: { kind: 'set', item: 'Text' } }] }),
  actionNode({ id: 'action_add', name: 'add_todo', input: 'TodoInput', returns: 'Patch' })
] });
const out = emitPython(document);
const ast = toPythonAst(document);
assert.equal(ast.kind, 'python.module');
assert.equal(ast.declarations.some((declaration) => declaration.kind === 'dataclass' && declaration.name === 'Todo'), true);
assert.equal(ast.declarations.some((declaration) => declaration.kind === 'capabilityDescriptor' && declaration.name === 'HTTP_REQUEST_CAPABILITY'), true);
assert.equal(renderPythonAst(ast), out);
assert.match(out, /class TodoInput/);
assert.match(out, /HTTP_REQUEST_CAPABILITY/);
assert.match(out, /httpx\.request/);
assert.match(out, /class Todo/);
assert.match(out, /frozenset\[str\]/);
assert.match(out, /def add_todo/);
