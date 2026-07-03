export function pythonActionBodyStatements(node, { pyIdentifier, pyLiteral }) {
  const body = node.body ?? [];
  if (!body.length) return ['return []'];
  const statements = ['if env is None:', '    env = {}', 'patches: list[FrontierPatchOperation] = []'];
  statements.push(...renderPythonActionBodyRecords(body, { pyIdentifier, pyLiteral, locals: new Map() }));
  if (!containsTopLevelReturn(body)) statements.push('return patches');
  return statements;
}

function renderPythonActionBodyRecords(body, { pyIdentifier, pyLiteral, locals }) {
  const statements = [];
  for (const record of body) {
    if (record.kind === 'let') {
      const local = pyIdentifier(record.name ?? record.id ?? 'binding');
      statements.push(`${local} = ${pythonActionValueExpression(record.value, { pyIdentifier, pyLiteral, locals, valueType: actionRecordValueType(record), comparisonType: actionRecordComparisonType(record), callType: actionRecordCallType(record) })}`);
      locals.set(record.name, local);
      continue;
    }
    if (record.kind === 'patch' && (record.op === 'set' || record.op === 'insert' || record.op === 'merge')) {
      statements.push(`patches.append({"op": ${pyLiteral(record.op)}, "path": ${pyLiteral(record.path ?? '')}, "value": ${pythonActionValueExpression(record.value, { pyIdentifier, pyLiteral, locals, valueType: actionRecordValueType(record), comparisonType: actionRecordComparisonType(record), callType: actionRecordCallType(record) })}})`);
      continue;
    }
    if (record.kind === 'patch' && record.op === 'remove') {
      statements.push(`patches.append({"op": "remove", "path": ${pyLiteral(record.path ?? '')}})`);
      continue;
    }
    if (record.kind === 'callEffect') {
      const local = pyIdentifier(`invoke_${record.id ?? record.name ?? 'effect'}`);
      statements.push(`${local} = env.get(${pyLiteral(record.capability ?? record.name ?? '')})`);
      statements.push(`if callable(${local}):`);
      statements.push(`    ${local}(${pythonActionValueExpression(record.input, { pyIdentifier, pyLiteral, locals })})`);
      continue;
    }
    if (record.kind === 'if') {
      statements.push(`if ${pythonActionConditionExpression(record.condition, { pyIdentifier, pyLiteral, locals, comparisonType: actionRecordComparisonType(record), callType: actionRecordCallType(record) })}:`);
      for (const statement of renderPythonActionBodyRecords(record.body ?? [], { pyIdentifier, pyLiteral, locals: new Map(locals) })) statements.push(`    ${statement}`);
      if (Array.isArray(record.elseBody) && record.elseBody.length) {
        statements.push('else:');
        for (const statement of renderPythonActionBodyRecords(record.elseBody, { pyIdentifier, pyLiteral, locals: new Map(locals) })) statements.push(`    ${statement}`);
      }
      continue;
    }
    if (record.kind === 'match') {
      const local = pyIdentifier(`match_${record.name ?? record.id ?? 'value'}`);
      statements.push(`${local} = ${pythonActionValueExpression(record.value, { pyIdentifier, pyLiteral, locals, valueType: actionRecordValueType(record), comparisonType: actionRecordComparisonType(record), callType: actionRecordCallType(record) })}`);
      (record.cases ?? []).forEach((branch, index) => {
        const keyword = index === 0 ? 'if' : 'elif';
        statements.push(`${keyword} ${local} == ${pythonActionValueExpression(branch.value, { pyIdentifier, pyLiteral, locals })}:`);
        for (const statement of renderPythonActionBodyRecords(branch.body ?? [], { pyIdentifier, pyLiteral, locals: new Map(locals) })) statements.push(`    ${statement}`);
      });
      if (Array.isArray(record.defaultBody) && record.defaultBody.length) {
        statements.push('else:');
        for (const statement of renderPythonActionBodyRecords(record.defaultBody, { pyIdentifier, pyLiteral, locals: new Map(locals) })) statements.push(`    ${statement}`);
      }
      continue;
    }
    if (record.kind === 'forIn') {
      const item = pyIdentifier(record.itemName ?? record.name ?? record.id ?? 'item');
      const loopLocals = new Map(locals);
      loopLocals.set(record.itemName ?? record.name, item);
      statements.push(`for ${item} in ${pythonActionValueExpression(record.collection, { pyIdentifier, pyLiteral, locals })}:`);
      for (const statement of renderPythonActionBodyRecords(record.body ?? [], { pyIdentifier, pyLiteral, locals: loopLocals })) statements.push(`    ${statement}`);
      continue;
    }
    if (record.kind === 'repeat') {
      const index = pyIdentifier(record.indexName ?? record.name ?? record.id ?? 'index');
      const loopLocals = new Map(locals);
      loopLocals.set(record.indexName ?? record.name, index);
      statements.push(`for ${index} in range(int(${pythonActionValueExpression(record.count, { pyIdentifier, pyLiteral, locals })})):`);
      for (const statement of renderPythonActionBodyRecords(record.body ?? [], { pyIdentifier, pyLiteral, locals: loopLocals })) statements.push(`    ${statement}`);
      continue;
    }
    if (record.kind === 'return') {
      statements.push(`return ${pythonActionValueExpression(record.value, { pyIdentifier, pyLiteral, locals, valueType: actionRecordValueType(record), comparisonType: actionRecordComparisonType(record), callType: actionRecordCallType(record) })}`);
    }
  }
  return statements;
}

function pythonActionValueExpression(value, context = {}) {
  const ast = actionExpressionAst(value);
  if (ast) return structuredPythonActionExpression(ast, { ...context, expressionContext: 'value' });
  if (value && Object.prototype.hasOwnProperty.call(value, 'value')) return context.pyLiteral(value.value);
  const expression = String(value?.expression ?? '').trim();
  const local = localExpression(expression, context);
  if (local) return local;
  if (/^(input|state|patches|env)(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/.test(expression)) return expression;
  if (/^(True|False|None|true|false|null|-?\d+(?:\.\d+)?)$/.test(expression)) return pythonLiteralExpression(expression);
  return context.pyLiteral(expression);
}

function pythonActionConditionExpression(value, context = {}) {
  const ast = actionExpressionAst(value);
  if (ast) return structuredPythonActionExpression(ast, { ...context, expressionContext: 'condition' });
  if (value && Object.prototype.hasOwnProperty.call(value, 'value')) {
    if (typeof value.value === 'boolean') return context.pyLiteral(value.value);
    throw new Error(`Unsupported Frontier action condition literal: ${String(value.value)}`);
  }
  const expression = String(value?.expression ?? '').trim();
  const local = localExpression(expression, context);
  if (local) return local;
  if (/^(input|state|patches|env)(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/.test(expression)) return expression;
  if (/^(True|False|true|false)$/.test(expression)) return pythonLiteralExpression(expression);
  throw new Error(`Unsupported Frontier action condition expression: ${expression}`);
}

function actionExpressionAst(value) {
  if (value?.expressionAst && typeof value.expressionAst === 'object') return value.expressionAst;
  if (value?.kind && typeof value.kind === 'string') return value;
  return undefined;
}

function structuredPythonActionExpression(node, context = {}) {
  if (!node || typeof node !== 'object') throw new Error('Unsupported Frontier action expression');
  if (node.kind === 'literal') return structuredPythonLiteralExpression(node.value, context);
  if (node.kind === 'ref') return structuredPythonRefExpression(node, context);
  if (node.kind === 'array') return structuredPythonArrayExpression(node, context);
  if (node.kind === 'object') return structuredPythonObjectExpression(node, context);
  if (node.kind === 'unary' && node.op === '!') return `not ${parenthesizeExpression(structuredPythonActionExpression(node.argument, { ...context, expressionContext: 'condition' }), node.argument)}`;
  if (node.kind === 'call') return structuredPythonCallExpression(node, context);
  if (node.kind === 'logical' && (node.op === '&&' || node.op === '||')) {
    const op = node.op === '&&' ? 'and' : 'or';
    return `${parenthesizeExpression(structuredPythonActionExpression(node.left, { ...context, expressionContext: 'condition' }), node.left)} ${op} ${parenthesizeExpression(structuredPythonActionExpression(node.right, { ...context, expressionContext: 'condition' }), node.right)}`;
  }
  if (node.kind === 'binary') {
    if (isNumericOperator(node.op)) {
      if (!isNumericType(context.valueType)) throw new Error(`Unsupported Frontier action expression operator: ${node.op}`);
      return `(${structuredPythonActionExpression(node.left, { ...context, expressionContext: 'value' })} ${node.op} ${structuredPythonActionExpression(node.right, { ...context, expressionContext: 'value' })})`;
    }
    const op = pythonComparisonOperator(node.op);
    if (isOrderedComparison(node.op) && !isNumericComparison(node) && !isNumericType(context.comparisonType)) throw new Error(`Unsupported Frontier action expression operator: ${node.op}`);
    const valueContext = isOrderedComparison(node.op) ? { ...context, expressionContext: 'value', valueType: context.comparisonType } : { ...context, expressionContext: 'value' };
    return `(${structuredPythonActionExpression(node.left, valueContext)} ${op} ${structuredPythonActionExpression(node.right, valueContext)})`;
  }
  throw new Error(`Unsupported Frontier action expression: ${node.kind ?? 'unknown'}`);
}

function structuredPythonArrayExpression(node, context = {}) {
  if (context.expressionContext === 'condition') throw new Error('Unsupported Frontier action condition expression');
  const elements = (node.elements ?? []).map((element) => structuredPythonActionExpression(element, { ...context, expressionContext: 'value' }));
  return `[${elements.join(', ')}]`;
}

function structuredPythonObjectExpression(node, context = {}) {
  if (context.expressionContext === 'condition') throw new Error('Unsupported Frontier action condition expression');
  const entries = (node.entries ?? []).map((entry) => `${context.pyLiteral(String(entry.key ?? ''))}: ${structuredPythonActionExpression(entry.value, { ...context, expressionContext: 'value' })}`);
  return entries.length ? `{${entries.join(', ')}}` : '{}';
}

function structuredPythonLiteralExpression(value, { expressionContext, pyLiteral } = {}) {
  if (expressionContext === 'condition' && typeof value !== 'boolean') throw new Error(`Unsupported Frontier action condition literal: ${String(value)}`);
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Unsupported Frontier action expression literal');
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return pyLiteral(value);
  throw new Error('Unsupported Frontier action expression literal');
}

function structuredPythonCallExpression(node, context = {}) {
  const callType = node.callType ?? context.callType;
  if (!isSupportedCallType(callType)) throw new Error('Unsupported Frontier action call type');
  const callee = String(node.callee ?? '').trim();
  if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(callee) || isBlockedCallCallee(callee)) throw new Error(`Unsupported Frontier action call callee: ${callee || 'unknown'}`);
  const args = Array.isArray(node.args) ? node.args : [];
  if (args.some(hasCallExpression)) throw new Error('Unsupported Frontier action call argument');
  return `${context.pyIdentifier(callee)}(${args.map((arg) => structuredPythonActionExpression(arg, { ...context, expressionContext: 'value' })).join(', ')})`;
}

function structuredPythonRefExpression(node, { locals } = {}) {
  const name = String(node.name ?? '').trim();
  const hasExplicitPath = Array.isArray(node.path);
  const rawParts = hasExplicitPath ? node.path.map(String) : name.split('.').filter(Boolean);
  const scope = node.scope ?? (rawParts[0] === 'input' || rawParts[0] === 'state' || rawParts[0] === 'patches' ? rawParts[0] : 'local');
  const parts = hasExplicitPath || node.scope || scope === 'local' ? rawParts : rawParts.slice(1);
  if (scope === 'local') {
    const [root, ...rest] = parts;
    if (!root || !locals?.has(root)) throw new Error(`Unsupported Frontier action expression ref: ${name || root || 'local'}`);
    return `${locals.get(root)}${propertyPath(rest)}`;
  }
  if (scope === 'input' || scope === 'state' || scope === 'patches') return `${scope}${propertyPath(parts)}`;
  throw new Error(`Unsupported Frontier action expression ref: ${name || scope}`);
}

function pythonComparisonOperator(op) {
  if (op === '==' || op === '!=' || op === '>' || op === '>=' || op === '<' || op === '<=') return op;
  throw new Error(`Unsupported Frontier action expression operator: ${op}`);
}

function actionRecordValueType(record) {
  return record.valueType ?? record.type ?? record.value?.valueType ?? record.value?.type;
}

function actionRecordComparisonType(record) {
  return record.comparisonType ?? record.compareType ?? record.compare ?? record.value?.comparisonType ?? record.value?.compareType ?? record.condition?.comparisonType ?? record.condition?.compareType;
}

function actionRecordCallType(record) {
  return record.callType ?? record.call ?? record.returns ?? record.value?.callType ?? record.value?.call ?? record.condition?.callType ?? record.condition?.call;
}

function isNumericOperator(op) {
  return op === '+' || op === '-' || op === '*' || op === '/' || op === '%';
}

function isNumericType(value) {
  return ['number', 'numeric', 'int', 'integer', 'float', 'double', 'decimal'].includes(String(value ?? '').trim().toLowerCase());
}

function isSupportedCallType(value) {
  return ['text', 'string', 'bool', 'boolean', 'number', 'numeric', 'int', 'integer', 'float', 'double', 'decimal', 'json'].includes(String(value ?? '').trim().toLowerCase());
}

function isOrderedComparison(op) {
  return op === '>' || op === '>=' || op === '<' || op === '<=';
}

function isNumericComparison(node) {
  return node.left?.kind === 'literal' && typeof node.left.value === 'number' && node.right?.kind === 'literal' && typeof node.right.value === 'number';
}

function hasCallExpression(node) {
  if (!node || typeof node !== 'object') return false;
  if (node.kind === 'call') return true;
  if (node.kind === 'binary' || node.kind === 'logical') return hasCallExpression(node.left) || hasCallExpression(node.right);
  if (node.kind === 'unary') return hasCallExpression(node.argument);
  if (node.kind === 'array') return (node.elements ?? []).some(hasCallExpression);
  if (node.kind === 'object') return (node.entries ?? []).some((entry) => hasCallExpression(entry.value));
  return false;
}

function isBlockedCallCallee(callee) {
  return ['__builtins__', '__import__', 'delattr', 'env', 'eval', 'exec', 'getattr', 'globals', 'input', 'locals', 'open', 'patches', 'setattr', 'state'].includes(callee);
}

function parenthesizeExpression(expression, node) {
  return node?.kind === 'binary' || node?.kind === 'logical' ? `(${expression})` : expression;
}

function propertyPath(parts) {
  return parts.map((part) => {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(part)) throw new Error(`Unsupported Frontier action expression ref: ${part}`);
    return `.${part}`;
  }).join('');
}

function localExpression(expression, { locals } = {}) {
  const match = /^([A-Za-z_][A-Za-z0-9_-]*)(\.[A-Za-z_][A-Za-z0-9_]*)*$/.exec(expression);
  if (!match || !locals?.has(match[1])) return undefined;
  return `${locals.get(match[1])}${expression.slice(match[1].length)}`;
}

function pythonLiteralExpression(expression) {
  if (expression === 'true') return 'True';
  if (expression === 'false') return 'False';
  if (expression === 'null') return 'None';
  return expression;
}

function containsTopLevelReturn(body) {
  return body.some((record) => record.kind === 'return');
}
