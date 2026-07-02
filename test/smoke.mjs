import assert from 'node:assert/strict';
import { actionNode, capabilityNode, createDocument, effectNode, entityNode, externNode, stateNode, typeNode } from '@shapeshift-labs/frontier-lang-kernel';
import { emitPython, emitPythonWithSourceMap, renderPythonAst, renderPythonAstWithSourceMap, toPythonAst } from '../dist/index.js';

const document = createDocument({ id: 'doc', name: 'Doc', nodes: [
  typeNode({ id: 'type_input', name: 'TodoInput', fields: [{ id: 'title', name: 'title', type: 'Text' }] }),
  capabilityNode({ id: 'cap_http', name: 'HttpRequest', capability: 'http.request', adapters: [
    { target: { language: 'python', platform: 'server', packageName: 'httpx' }, symbol: 'httpx.request', kind: 'library' }
  ] }),
  effectNode({ id: 'effect_persist', name: 'PersistTodo', capability: 'storage.write', input: 'TodoInput', returns: 'Json', resources: ['TodoDb.todos'] }),
  externNode({ id: 'extern_persist', name: 'persistTodo', language: 'typescript', symbol: 'persistTodo', signature: { input: 'TodoInput', returns: 'Patch' }, effects: ['storage.write'], resources: ['TodoDb.todos'] }),
  entityNode({ id: 'entity_todo', name: 'Todo', fields: [{ id: 'tags', name: 'tags', type: { kind: 'set', item: 'Text' } }] }),
  stateNode({ id: 'state_todo', name: 'TodoDb', collections: [{ id: 'collection_todos', name: 'todos', type: { kind: 'map', key: 'Text', value: { kind: 'ref', name: 'Todo' } } }] }),
  actionNode({ id: 'action_add', name: 'add_todo', input: 'TodoInput', returns: 'Patch' })
] });
const out = emitPython(document);
const ast = toPythonAst(document);
const rendered = renderPythonAstWithSourceMap(ast, {
  sourceMapId: 'map_doc_py',
  sourcePath: 'doc.frontier',
  targetPath: 'doc.py',
  semanticIndexId: 'semantic_doc',
  sourceSpansBySemanticNodeId: {
    entity_todo: { path: 'doc.frontier', startLine: 9, startColumn: 1, endLine: 11, endColumn: 2 }
  },
  semanticSymbolIdsBySemanticNodeId: {
    entity_todo: 'symbol_todo'
  },
  lossIdsBySemanticNodeId: {
    entity_todo: ['loss_collection_type']
  },
  evidence: [{ id: 'evidence_projection', kind: 'projection', summary: 'smoke projection evidence' }]
});
const emitted = emitPythonWithSourceMap(document, { targetPath: 'doc.py' });
assert.equal(ast.kind, 'python.module');
assert.equal(ast.declarations.some((declaration) => declaration.kind === 'dataclass' && declaration.name === 'Todo'), true);
assert.equal(ast.declarations.some((declaration) => declaration.kind === 'dataclass' && declaration.name === 'TodoDbState'), true);
assert.equal(ast.declarations.some((declaration) => declaration.kind === 'capabilityDescriptor' && declaration.name === 'HTTP_REQUEST_CAPABILITY'), true);
assert.equal(ast.declarations.some((declaration) => declaration.kind === 'effectDescriptor' && declaration.name === 'PERSIST_TODO_EFFECT'), true);
assert.equal(ast.declarations.some((declaration) => declaration.kind === 'effectRunner' && declaration.name === 'run_PersistTodo_effect'), true);
assert.equal(ast.declarations.some((declaration) => declaration.kind === 'externDescriptor' && declaration.name === 'PERSIST_TODO_EXTERN'), true);
assert.equal(ast.declarations.some((declaration) => declaration.kind === 'externRunner' && declaration.name === 'call_persistTodo_extern'), true);
assert.equal(ast.declarations.find((declaration) => declaration.kind === 'dataclass' && declaration.name === 'Todo').sourceRef.semanticNodeId, 'entity_todo');
assert.equal(ast.declarations.find((declaration) => declaration.kind === 'dataclass' && declaration.name === 'TodoDbState').sourceRef.semanticNodeId, 'state_todo');
assert.equal(ast.declarations.find((declaration) => declaration.kind === 'effectDescriptor' && declaration.name === 'PERSIST_TODO_EFFECT').sourceRef.semanticNodeId, 'effect_persist');
assert.equal(ast.declarations.find((declaration) => declaration.kind === 'externDescriptor' && declaration.name === 'PERSIST_TODO_EXTERN').sourceRef.semanticNodeId, 'extern_persist');
assert.equal(renderPythonAst(ast), out);
assert.equal(rendered.code, out);
assert.equal(emitted.code, out);
assert.equal(emitted.ast.kind, 'python.module');
assert.equal(rendered.sourceMap.kind, 'frontier.lang.sourceMap');
assert.equal(rendered.sourceMap.id, 'map_doc_py');
assert.equal(rendered.sourceMap.target.language, 'python');
assert.equal(rendered.sourceMap.targetPath, 'doc.py');
assert.equal(rendered.sourceMap.semanticIndexId, 'semantic_doc');
const todoMapping = rendered.sourceMap.mappings.find((mapping) => mapping.semanticNodeId === 'entity_todo');
assert.equal(todoMapping.generatedName, 'Todo');
assert.equal(todoMapping.generatedSpan.targetPath, 'doc.py');
assert.equal(todoMapping.generatedSpan.startLine > 0, true);
assert.equal(todoMapping.sourceSpan.path, 'doc.frontier');
assert.equal(todoMapping.semanticSymbolId, 'symbol_todo');
assert.deepEqual(todoMapping.lossIds, ['loss_collection_type']);
assert.deepEqual(todoMapping.evidenceIds, ['evidence_projection']);
assert.deepEqual(todoMapping.metadata.regionIds, ['tags']);
const effectMapping = rendered.sourceMap.mappings.find((mapping) => mapping.semanticNodeId === 'effect_persist' && mapping.generatedName === 'PERSIST_TODO_EFFECT');
assert.equal(effectMapping.generatedName, 'PERSIST_TODO_EFFECT');
const externMapping = rendered.sourceMap.mappings.find((mapping) => mapping.semanticNodeId === 'extern_persist' && mapping.generatedName === 'PERSIST_TODO_EXTERN');
assert.equal(externMapping.generatedName, 'PERSIST_TODO_EXTERN');
assert.match(out, /class TodoInput/);
assert.match(out, /HTTP_REQUEST_CAPABILITY/);
assert.match(out, /httpx\.request/);
assert.match(out, /PERSIST_TODO_EFFECT: Mapping\[str, Any\]/);
assert.match(out, /"capability": "storage\.write"/);
assert.match(out, /def run_PersistTodo_effect\(input: TodoInput, env: Mapping\[str, Any\]\) -> Any:/);
assert.match(out, /invoke = env\["invoke"\]/);
assert.match(out, /return invoke\("storage\.write", input, \{"effect": "PersistTodo", "resources": \["TodoDb\.todos"\], "semantics": None\}\)/);
assert.match(out, /PERSIST_TODO_EXTERN: Mapping\[str, Any\]/);
assert.match(out, /"symbol": "persistTodo"/);
assert.match(out, /def call_persistTodo_extern\(input: TodoInput, env: Mapping\[str, Any\]\) -> list\[FrontierPatchOperation\]:/);
assert.match(out, /call_extern = env\["callExtern"\]/);
assert.match(out, /return call_extern\("persistTodo", input, \{"extern": "persistTodo", "language": "typescript", "effects": \["storage\.write"\], "resources": \["TodoDb\.todos"\]\}\)/);
assert.match(out, /class Todo/);
assert.match(out, /frozenset\[str\]/);
assert.match(out, /class TodoDbState/);
assert.match(out, /todos: Mapping\[str, Todo\]/);
assert.match(out, /def add_todo\(state: TodoDbState, input: TodoInput/);
assert.match(out, /def add_todo/);
