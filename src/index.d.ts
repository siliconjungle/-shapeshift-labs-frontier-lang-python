import type { FrontierLangDocument } from '@shapeshift-labs/frontier-lang-kernel';

export interface EmitPythonOptions {
  readonly banner?: string;
}

export declare function emitPython(document: FrontierLangDocument, options?: EmitPythonOptions): string;
