import type { FrontierLangDocument } from '@shapeshift-labs/frontier-lang-kernel';

export interface EmitPythonOptions {
  readonly banner?: string;
  readonly sourceMapId?: string;
  readonly sourcePath?: string;
  readonly sourceHash?: string;
  readonly target?: FrontierProjectionTarget;
  readonly targetPath?: string;
  readonly targetHash?: string;
  readonly semanticIndexId?: string;
  readonly universalAstId?: string;
  readonly nativeAstId?: string;
  readonly nativeSourceId?: string;
  readonly sourceSpansBySemanticNodeId?: Readonly<Record<string, FrontierProjectionSourceSpan>>;
  readonly semanticSymbolIdsBySemanticNodeId?: Readonly<Record<string, string>>;
  readonly semanticOccurrenceIdsBySemanticNodeId?: Readonly<Record<string, string>>;
  readonly lossIdsBySemanticNodeId?: Readonly<Record<string, readonly string[]>>;
  readonly evidence?: readonly FrontierProjectionEvidenceRecord[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface FrontierProjectionTarget {
  readonly language?: string;
  readonly platform?: string;
  readonly packageName?: string;
  readonly emitPath?: string;
  readonly [key: string]: unknown;
}

export interface FrontierProjectionSourceSpan {
  readonly path?: string;
  readonly startLine: number;
  readonly startColumn: number;
  readonly endLine: number;
  readonly endColumn: number;
}

export interface FrontierProjectionGeneratedSpan extends FrontierProjectionSourceSpan {
  readonly target?: FrontierProjectionTarget;
  readonly targetPath?: string;
  readonly generatedName?: string;
}

export interface FrontierProjectionEvidenceRecord {
  readonly id: string;
  readonly kind?: string;
  readonly summary?: string;
  readonly [key: string]: unknown;
}

export interface FrontierProjectionSourceMapMapping {
  readonly id: string;
  readonly semanticNodeId: string;
  readonly nativeSourceId?: string;
  readonly semanticSymbolId?: string;
  readonly semanticOccurrenceId?: string;
  readonly sourceSpan?: FrontierProjectionSourceSpan;
  readonly generatedSpan: FrontierProjectionGeneratedSpan;
  readonly target?: FrontierProjectionTarget;
  readonly generatedName?: string;
  readonly evidenceIds?: readonly string[];
  readonly lossIds?: readonly string[];
  readonly precision: 'declaration';
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface FrontierProjectionSourceMap {
  readonly kind: 'frontier.lang.sourceMap';
  readonly version: 1;
  readonly id: string;
  readonly sourcePath?: string;
  readonly sourceHash?: string;
  readonly target?: FrontierProjectionTarget;
  readonly targetPath?: string;
  readonly targetHash?: string;
  readonly semanticIndexId?: string;
  readonly universalAstId?: string;
  readonly nativeAstId?: string;
  readonly nativeSourceId?: string;
  readonly mappings: readonly FrontierProjectionSourceMapMapping[];
  readonly evidence: readonly FrontierProjectionEvidenceRecord[];
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface PythonSourceMapResult {
  readonly code: string;
  readonly sourceMap: FrontierProjectionSourceMap;
}

export interface EmitPythonWithSourceMapResult extends PythonSourceMapResult {
  readonly ast: PythonAstModule;
}

export interface PythonSourceRef {
  readonly semanticNodeId: string;
  readonly semanticNodeKind?: string;
  readonly semanticNodeName?: string;
  readonly regionIds?: readonly string[];
}

export type PythonAstDeclaration =
  | {
      readonly kind: 'dataclass';
      readonly name: string;
      readonly fields: readonly { readonly name: string; readonly type: string }[];
      readonly sourceRef?: PythonSourceRef;
    }
  | {
      readonly kind: 'capabilityDescriptor';
      readonly name: string;
      readonly value: unknown;
      readonly sourceRef?: PythonSourceRef;
    }
  | {
      readonly kind: 'function';
      readonly name: string;
      readonly stateType: string;
      readonly inputType: string;
      readonly envType: string;
      readonly returnType: string;
      readonly body: readonly string[];
      readonly sourceRef?: PythonSourceRef;
    };

export interface PythonAstModule {
  readonly kind: 'python.module';
  readonly banner: string;
  readonly declarations: readonly PythonAstDeclaration[];
}

export declare function toPythonAst(document: FrontierLangDocument, options?: EmitPythonOptions): PythonAstModule;
export declare function renderPythonAst(ast: PythonAstModule): string;
export declare function renderPythonAstWithSourceMap(ast: PythonAstModule, options?: EmitPythonOptions): PythonSourceMapResult;
export declare function emitPython(document: FrontierLangDocument, options?: EmitPythonOptions): string;
export declare function emitPythonWithSourceMap(document: FrontierLangDocument, options?: EmitPythonOptions): EmitPythonWithSourceMapResult;
