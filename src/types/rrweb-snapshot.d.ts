/**
 * Type declarations for rrweb-snapshot
 */

declare module 'rrweb-snapshot' {
  export interface SnapshotOptions {
    maskAllInputs?: boolean;
    maskTextFn?: (text: string) => string;
    maskTextSelector?: string;
    maskInputOptions?: Record<string, boolean>;
    maskTextClass?: string;
    maskInputSelector?: string;
    slimDOMOptions?: Record<string, boolean>;
    inlineStylesheet?: boolean;
    inlineImages?: boolean;
  }

  export function snapshot(
    document: Document,
    options?: SnapshotOptions
  ): any;

  export function rebuild(
    snapshot: any,
    options?: {
      doc?: Document;
      afterAppend?: (node: Node) => void;
    }
  ): Node;
}
