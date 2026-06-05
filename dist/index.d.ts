import type { FrontierLangDocument } from '@shapeshift-labs/frontier-lang-kernel';

export interface EmitPythonOptions {
  readonly banner?: string;
}

export type PythonAstDeclaration =
  | {
      readonly kind: 'dataclass';
      readonly name: string;
      readonly fields: readonly { readonly name: string; readonly type: string }[];
    }
  | {
      readonly kind: 'capabilityDescriptor';
      readonly name: string;
      readonly value: unknown;
    }
  | {
      readonly kind: 'function';
      readonly name: string;
      readonly stateType: string;
      readonly inputType: string;
      readonly envType: string;
      readonly returnType: string;
      readonly body: readonly string[];
    };

export interface PythonAstModule {
  readonly kind: 'python.module';
  readonly banner: string;
  readonly declarations: readonly PythonAstDeclaration[];
}

export declare function toPythonAst(document: FrontierLangDocument, options?: EmitPythonOptions): PythonAstModule;
export declare function renderPythonAst(ast: PythonAstModule): string;
export declare function emitPython(document: FrontierLangDocument, options?: EmitPythonOptions): string;
