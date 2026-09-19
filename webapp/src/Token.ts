/*
 * Token.ts — TypeScript port of tagsmith's modules/16-integration/js/Token.js.
 *
 * The six token types the spec defines in the 8.2.4 preamble. Field names
 * and initial values are unchanged from the original JS classes.
 */

export interface Attribute {
  name: string;
  value: string;
}

export abstract class Token {
  abstract readonly kind: 'DOCTYPE' | 'StartTag' | 'EndTag' | 'Comment' | 'Character' | 'EOF';
}

export class DoctypeToken extends Token {
  readonly kind = 'DOCTYPE' as const;
  name: string | null = null; // null = "missing" per spec, distinct from ''
  publicIdentifier: string | null = null;
  systemIdentifier: string | null = null;
  forceQuirks = false;
}

export abstract class TagToken extends Token {
  tagName = '';
  selfClosing = false;
  attributes: Attribute[] = [];
}

export class StartTagToken extends TagToken {
  readonly kind = 'StartTag' as const;
}

export class EndTagToken extends TagToken {
  readonly kind = 'EndTag' as const;
}

export class CommentToken extends Token {
  readonly kind = 'Comment' as const;
  data = '';
}

export class CharacterToken extends Token {
  readonly kind = 'Character' as const;
  data: string;
  constructor(data: string) {
    super();
    this.data = data;
  }
}

export class EOFToken extends Token {
  readonly kind = 'EOF' as const;
}
