import assert from 'node:assert/strict';
import { createDocument, entityNode, actionNode } from '@shapeshift-labs/frontier-lang-kernel';
import { emitPython, emitPythonWithSourceMap } from '../dist/index.js';

for (let index = 0; index < 100; index += 1) {
  const document = createDocument({ id: `doc_${index}`, name: `Doc${index}`, nodes: [
    entityNode({ id: `ent_${index}`, name: 'Todo', fields: [{ id: `field_title_${index}`, name: 'title', type: 'Text' }] }),
    actionNode({ id: `action_${index}`, name: 'update_todo', input: 'Todo', returns: 'Patch' })
  ] });
  const output = emitPython(document);
  const mapped = emitPythonWithSourceMap(document, { targetPath: `doc_${index}.py` });
  const todoMapping = mapped.sourceMap.mappings.find((mapping) => mapping.semanticNodeId === `ent_${index}`);
  assert.match(output, /class Todo/);
  assert.match(output, /def update_todo/);
  assert.equal(mapped.code, output);
  assert.equal(mapped.sourceMap.target.language, 'python');
  assert.equal(todoMapping.generatedSpan.targetPath, `doc_${index}.py`);
}
