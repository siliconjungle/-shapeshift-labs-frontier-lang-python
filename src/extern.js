export function externDescriptorItem(node, helpers) {
  return {
    kind: 'externDescriptor',
    name: `${helpers.pyConstIdentifier(node.name)}_EXTERN`,
    value: {
      name: node.name,
      language: node.language,
      symbol: node.symbol ?? node.name,
      input: node.input ?? node.signature?.input,
      returns: node.returns ?? node.signature?.returns,
      effects: node.effects ?? [],
      resources: node.resources ?? []
    },
    sourceRef: helpers.sourceRef(node)
  };
}

export function externRunnerItem(node, helpers) {
  return {
    kind: 'externRunner',
    name: `call_${helpers.pyIdentifier(node.name)}_extern`,
    inputType: helpers.pyType(node.input ?? node.signature?.input ?? 'Json'),
    returnType: helpers.pyType(node.returns ?? node.signature?.returns ?? 'Json'),
    value: {
      name: node.name,
      language: node.language,
      symbol: node.symbol ?? node.name,
      effects: node.effects ?? [],
      resources: node.resources ?? []
    },
    sourceRef: helpers.sourceRef(node)
  };
}
