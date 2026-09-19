/*
 * Preprocess.ts — TypeScript port of
 * tagsmith's modules/16-integration/js/Preprocess.js.
 *
 * "Preprocessing the input stream": every CRLF pair becomes one LF, and
 * every remaining lone CR also becomes an LF, before a single state runs.
 * Order matters: CRLF must be normalized before lone CR (swap them and
 * "\r\n" becomes "\n\n" instead of "\n").
 */
export function preprocess(input: string): string {
  return input.split('\r\n').join('\n').split('\r').join('\n');
}
