import assert from 'node:assert/strict';
import { actionNode, capabilityNode, createDocument, effectNode, entityNode, externNode, stateNode, typeNode } from '@shapeshift-labs/frontier-lang-kernel';
import { emitPython, emitPythonWithSourceMap, renderPythonAst, renderPythonAstWithSourceMap, toPythonAst } from '../dist/index.js';
const ref = (name, scope, path) => ({ kind: 'ref', name, scope, path });
const literal = (value) => ({ kind: 'literal', value });
const call = (callee, args, callType) => ({ kind: 'call', callee, args, callType });

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
assert.match(out, /return \[\]/);

const actionBodyDocument = createDocument({ id: 'action_body', name: 'ActionBody', nodes: [
  typeNode({ id: 'body_input', name: 'BodyInput', fields: [
    { id: 'body_title', name: 'title', type: 'Text' },
    { id: 'body_count', name: 'count', type: 'Number' },
    { id: 'body_enabled', name: 'enabled', type: 'Boolean' },
    { id: 'body_items', name: 'items', type: { kind: 'list', item: { kind: 'ref', name: 'Item' } } }
  ] }),
  typeNode({ id: 'body_item', name: 'Item', fields: [{ id: 'body_item_name', name: 'name', type: 'Text' }] }),
  actionNode({ id: 'action_body_add', name: 'add_body', input: 'BodyInput', returns: 'Patch', body: [
    { kind: 'let', id: 'bind_normalized_title', name: 'normalizedTitle', callType: 'Text', value: { expression: 'normalizeTitle(input.title)', expressionAst: call('normalizeTitle', [ref('input.title', 'input', ['title'])], 'Text'), callType: 'Text' } },
    { kind: 'let', id: 'bind_can_write', name: 'canWrite', value: { expression: 'input.enabled == true', expressionAst: { kind: 'binary', op: '==', left: ref('input.enabled', 'input', ['enabled']), right: literal(true) } } },
    { kind: 'let', id: 'bind_next_count', name: 'nextCount', valueType: 'Number', value: { expression: 'input.count + 1', expressionAst: { kind: 'binary', op: '+', left: ref('input.count', 'input', ['count']), right: literal(1) }, valueType: 'Number' } },
    { kind: 'let', id: 'bind_payload', name: 'payload', value: { expression: '{ title: input.title, tags: [input.title, "new"] }', expressionAst: { kind: 'object', entries: [
      { key: 'title', value: ref('input.title', 'input', ['title']) },
      { key: 'tags', value: { kind: 'array', elements: [ref('input.title', 'input', ['title']), literal('new')] } }
    ] } } },
    { kind: 'patch', op: 'set', id: 'patch_title', name: 'title', path: '/todos/title', value: { expression: 'normalizedTitle', expressionAst: ref('normalizedTitle', 'local', ['normalizedTitle']) } },
    { kind: 'patch', op: 'set', id: 'patch_count', name: 'count', path: '/todos/count', valueType: 'Number', value: { expression: 'nextCount', expressionAst: ref('nextCount', 'local', ['nextCount']), valueType: 'Number' } },
    { kind: 'patch', op: 'set', id: 'patch_payload', name: 'payload', path: '/todos/payload', value: { expression: 'payload', expressionAst: ref('payload', 'local', ['payload']) } },
    { kind: 'if', id: 'guard_enabled', name: 'enabled', condition: { expression: 'canWrite && input.enabled', expressionAst: { kind: 'logical', op: '&&', left: ref('canWrite', 'local', ['canWrite']), right: ref('input.enabled', 'input', ['enabled']) } }, body: [
      { kind: 'patch', op: 'set', id: 'patch_status_ready', name: 'ready', path: '/todos/status', value: { value: 'ready' } },
      { kind: 'callEffect', id: 'call_guarded_storage', name: 'guardedPersist', capability: 'storage.write', input: { expression: 'normalizedTitle', expressionAst: ref('normalizedTitle', 'local', ['normalizedTitle']) } }
    ], elseBody: [
      { kind: 'patch', op: 'set', id: 'patch_status_blocked', name: 'blocked', path: '/todos/status', value: { value: 'blocked' } }
    ] },
    { kind: 'forIn', id: 'for_items', itemName: 'item', collection: { expression: 'input.items', expressionAst: ref('input.items', 'input', ['items']) }, body: [
      { kind: 'patch', op: 'set', id: 'patch_last_name', name: 'lastName', path: '/todos/lastName', value: { expression: 'item.name', expressionAst: ref('item.name', 'local', ['item', 'name']) } }
    ] },
    { kind: 'repeat', id: 'repeat_items', indexName: 'index', count: { expression: 'input.count', expressionAst: ref('input.count', 'input', ['count']) }, body: [
      { kind: 'patch', op: 'set', id: 'patch_last_index', name: 'lastIndex', path: '/todos/lastIndex', value: { expression: 'index', expressionAst: ref('index', 'local', ['index']) } }
    ] },
    { kind: 'patch', op: 'insert', id: 'patch_insert', name: 'item', path: '/todos', value: { expression: 'input', expressionAst: ref('input', 'input', []) } },
    { kind: 'patch', op: 'remove', id: 'patch_remove', name: 'oldTitle', path: '/todos/oldTitle' },
    { kind: 'return', id: 'return_patches', value: { expression: 'patches', expressionAst: ref('patches', 'patches', []) } }
  ] })
] });
const actionBodyOut = emitPython(actionBodyDocument);
assert.match(actionBodyOut, /def add_body\(state: Any, input: BodyInput, env: Mapping\[str, Any\] \| None = None\) -> list\[FrontierPatchOperation\]:/);
assert.match(actionBodyOut, /if env is None:\n        env = \{\}\n    patches: list\[FrontierPatchOperation\] = \[\]/);
assert.match(actionBodyOut, /normalizedTitle = normalizeTitle\(input\.title\)/);
assert.match(actionBodyOut, /canWrite = \(input\.enabled == True\)/);
assert.match(actionBodyOut, /nextCount = \(input\.count \+ 1\)/);
assert.match(actionBodyOut, /payload = \{"title": input\.title, "tags": \[input\.title, "new"\]\}/);
assert.match(actionBodyOut, /patches\.append\(\{"op": "set", "path": "\/todos\/title", "value": normalizedTitle\}\)/);
assert.match(actionBodyOut, /patches\.append\(\{"op": "set", "path": "\/todos\/count", "value": nextCount\}\)/);
assert.match(actionBodyOut, /patches\.append\(\{"op": "set", "path": "\/todos\/payload", "value": payload\}\)/);
assert.match(actionBodyOut, /if canWrite and input\.enabled:\n        patches\.append\(\{"op": "set", "path": "\/todos\/status", "value": "ready"\}\)\n        invoke_call_guarded_storage = env\.get\("storage\.write"\)\n        if callable\(invoke_call_guarded_storage\):\n            invoke_call_guarded_storage\(normalizedTitle\)\n    else:\n        patches\.append\(\{"op": "set", "path": "\/todos\/status", "value": "blocked"\}\)/);
assert.match(actionBodyOut, /for item in input\.items:\n        patches\.append\(\{"op": "set", "path": "\/todos\/lastName", "value": item\.name\}\)/);
assert.match(actionBodyOut, /for index in range\(int\(input\.count\)\):\n        patches\.append\(\{"op": "set", "path": "\/todos\/lastIndex", "value": index\}\)/);
assert.match(actionBodyOut, /patches\.append\(\{"op": "insert", "path": "\/todos", "value": input\}\)/);
assert.match(actionBodyOut, /patches\.append\(\{"op": "remove", "path": "\/todos\/oldTitle"\}\)/);
assert.match(actionBodyOut, /return patches/);

const matchDocument = createDocument({ id: 'match', name: 'Match', nodes: [
  typeNode({ id: 'match_input', name: 'MatchInput', fields: [{ id: 'match_status', name: 'status', type: 'Text' }] }),
  actionNode({ id: 'action_match_status', name: 'set_status_by_match', input: 'MatchInput', returns: 'Patch', body: [
    { kind: 'match', id: 'match_status', name: 'status', value: { expression: 'input.status', expressionAst: ref('input.status', 'input', ['status']) }, cases: [
      { id: 'case_ready', name: 'ready', value: { value: 'ready' }, body: [{ kind: 'patch', op: 'set', id: 'patch_ready', name: 'ready', path: '/status', value: { value: 'ready' } }] },
      { id: 'case_blocked', name: 'blocked', value: { value: 'blocked' }, body: [{ kind: 'patch', op: 'set', id: 'patch_blocked', name: 'blocked', path: '/status', value: { value: 'blocked' } }] }
    ], defaultBody: [{ kind: 'patch', op: 'set', id: 'patch_pending', name: 'pending', path: '/status', value: { value: 'pending' } }] }
  ] })
] });
assert.match(emitPython(matchDocument), /match_status = input\.status\n    if match_status == "ready":\n        patches\.append\(\{"op": "set", "path": "\/status", "value": "ready"\}\)\n    elif match_status == "blocked":\n        patches\.append\(\{"op": "set", "path": "\/status", "value": "blocked"\}\)\n    else:\n        patches\.append\(\{"op": "set", "path": "\/status", "value": "pending"\}\)/);

const directReturnDocument = createDocument({ id: 'direct_return', name: 'DirectReturn', nodes: [
  typeNode({ id: 'direct_input', name: 'DirectInput', fields: [{ id: 'direct_count', name: 'count', type: 'Number' }, { id: 'direct_title', name: 'title', type: 'Text' }] }),
  actionNode({ id: 'action_next_count', name: 'next_count', input: 'DirectInput', returns: 'Number', body: [
    { kind: 'return', id: 'return_next_count', valueType: 'Number', value: { expression: 'input.count + 1', expressionAst: { kind: 'binary', op: '+', left: ref('input.count', 'input', ['count']), right: literal(1) }, valueType: 'Number' } }
  ] }),
  actionNode({ id: 'action_normalized_title', name: 'normalized_title', input: 'DirectInput', returns: 'Text', body: [
    { kind: 'return', id: 'return_normalized_title', callType: 'Text', value: { expression: 'normalizeTitle(input.title)', expressionAst: call('normalizeTitle', [ref('input.title', 'input', ['title'])], 'Text'), callType: 'Text' } }
  ] })
] });
const directReturnOut = emitPython(directReturnDocument);
assert.match(directReturnOut, /def next_count\(state: Any, input: DirectInput, env: Mapping\[str, Any\] \| None = None\) -> float:/);
assert.match(directReturnOut, /return \(input\.count \+ 1\)/);
assert.match(directReturnOut, /def normalized_title\(state: Any, input: DirectInput, env: Mapping\[str, Any\] \| None = None\) -> str:/);
assert.match(directReturnOut, /return normalizeTitle\(input\.title\)/);

const badConditionDocument = createDocument({ id: 'bad_condition', name: 'BadCondition', nodes: [
  actionNode({ id: 'action_bad_condition', name: 'bad_condition', returns: 'Patch', body: [
    { kind: 'if', id: 'guard_bad', condition: { expression: 'eval(input.title)' }, body: [] }
  ] })
] });
assert.throws(() => emitPython(badConditionDocument), /Unsupported Frontier action condition expression/);
