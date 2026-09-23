/*
 * tokenizerTypes.ts, the minimal surface CharacterReference.ts needs from
 * Tokenizer, pulled into its own file so the two modules don't need a
 * circular import (the original JS avoids this simply by duck-typing the
 * tokenizer object it's handed; TypeScript needs a named shape instead).
 */
export interface TokenizerLike {
  input: string;
  pos: number;
  eof(): boolean;
  consume(): string;
  peek(offset?: number): string | undefined;
  reportParseError(description: string): void;
}
