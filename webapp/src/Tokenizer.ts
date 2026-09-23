/*
 * Tokenizer.ts, TypeScript port of tagsmith's real, spec-accurate
 * HTML5 tokenizer state machine.
 *
 * Ported directly from modules/16-integration/js/Tokenizer.js, the
 * course's own final, fully-implemented (all 68 states) JavaScript
 * tokenizer. Every state method below is a direct transliteration: same
 * branches, same order, same parse-error names, same reconsume-via-
 * `pos -= 1` trick the original uses. The only additions are TypeScript
 * types and two small instrumentation hooks the playground UI needs that
 * the original didn't: `stateTrace` (a capped log of every state the
 * machine visited) and tagging each emitted token with the state that was
 * active when it was emitted (`tokenStates`, parallel to `tokens`).
 */

import { State, type StateName } from './State';
import {
  Token, EOFToken, CharacterToken, EndTagToken, StartTagToken, CommentToken, DoctypeToken, TagToken,
} from './Token';
import { preprocess } from './Preprocess';
import { consumeCharacterReference } from './CharacterReference';

function isDoubleEscapeTerminator(c: string | undefined): boolean {
  return c === '\t' || c === '\n' || c === '\f' || c === ' ' || c === '/' || c === '>';
}

export class NotImplementedError extends Error {
  stateName: string;
  constructor(stateName: string) {
    super(`[${stateName} state] is not implemented.`);
    this.name = 'NotImplementedError';
    this.stateName = stateName;
  }
}

export interface ParseErrorEntry {
  state: StateName;
  description: string;
}

interface CurrentAttribute {
  name: string;
  value: string;
}

const MAX_TRACE = 4000;
const MAX_STEPS = 500000; // safety valve against pathological input in the browser

export class Tokenizer {
  input: string;
  pos = 0;
  state: StateName = State.DATA;
  tokens: Token[] = [];
  /** Parallel to `tokens`, the state active when each token was emitted. */
  tokenStates: StateName[] = [];
  /** Capped log of every state transition, for the "state trace" panel. */
  stateTrace: { state: StateName; pos: number }[] = [];
  halted = false;
  parseErrors: ParseErrorEntry[] = [];

  currentToken: TagToken | CommentToken | DoctypeToken | null = null;
  tempBuffer = '';
  lastStartTagName: string | null = null;
  currentAttribute: CurrentAttribute | null = null;
  attrValueReturnState: StateName | null = null;
  additionalAllowedCharacter: string | undefined = undefined;

  constructor(input: string) {
    this.input = preprocess(input);
  }

  reportParseError(description: string): void {
    this.parseErrors.push({ state: this.state, description });
  }

  eof(): boolean {
    return this.pos >= this.input.length;
  }

  consume(): string {
    return this.input[this.pos++];
  }

  peek(offset = 0): string | undefined {
    return this.input[this.pos + offset];
  }

  peekString(length: number): string {
    return this.input.slice(this.pos, this.pos + length);
  }

  matchCaseInsensitive(str: string): boolean {
    return this.peekString(str.length).toLowerCase() === str.toLowerCase();
  }

  matchLiteral(str: string): boolean {
    return this.peekString(str.length) === str;
  }

  emit(token: Token): void {
    this.tokens.push(token);
    this.tokenStates.push(this.state);
  }

  // ============ Data / character-reference / text-content families ============

  dataState(): void {
    if (this.eof()) {
      this.emit(new EOFToken());
      this.halted = true;
      return;
    }
    const c = this.consume();
    if (c === '&') {
      this.state = State.CHARACTER_REFERENCE_IN_DATA;
      return;
    }
    if (c === '<') {
      this.state = State.TAG_OPEN;
      return;
    }
    if (c.codePointAt(0) === 0) {
      this.reportParseError('unexpected-null-character');
      this.emit(new CharacterToken(c));
      return;
    }
    this.emit(new CharacterToken(c));
  }

  private characterReferenceState(returnState: StateName): void {
    const decoded = consumeCharacterReference(this, undefined);
    if (decoded === null) {
      this.emit(new CharacterToken('&'));
    } else {
      this.emit(new CharacterToken(decoded));
    }
    this.state = returnState;
  }

  characterReferenceInDataState(): void {
    this.characterReferenceState(State.DATA);
  }

  characterReferenceInRcdataState(): void {
    this.characterReferenceState(State.RCDATA);
  }

  private textContentState(charRefState: StateName | null, lessThanState: StateName): void {
    if (this.eof()) {
      this.emit(new EOFToken());
      this.halted = true;
      return;
    }
    const c = this.consume();
    if (charRefState !== null && c === '&') {
      this.state = charRefState;
      return;
    }
    if (c === '<') {
      this.state = lessThanState;
      return;
    }
    if (c.codePointAt(0) === 0) {
      this.reportParseError('unexpected-null-character');
      this.emit(new CharacterToken(c));
      return;
    }
    this.emit(new CharacterToken(c));
  }

  rcdataState(): void {
    this.textContentState(State.CHARACTER_REFERENCE_IN_RCDATA, State.RCDATA_LESS_THAN_SIGN);
  }

  rawtextState(): void {
    this.textContentState(null, State.RAWTEXT_LESS_THAN_SIGN);
  }

  plaintextState(): void {
    if (this.eof()) {
      this.emit(new EOFToken());
      this.halted = true;
      return;
    }
    const c = this.consume();
    if (c.codePointAt(0) === 0) {
      this.reportParseError('unexpected-null-character');
      this.emit(new CharacterToken(c));
      return;
    }
    this.emit(new CharacterToken(c));
  }

  private lessThanSignState(endTagOpenState: StateName, returnState: StateName, bangState?: StateName): void {
    if (this.peek() === '/') {
      this.tempBuffer = '';
      this.consume();
      this.state = endTagOpenState;
      return;
    }
    if (bangState !== undefined && this.peek() === '!') {
      this.consume();
      this.emit(new CharacterToken('<'));
      this.emit(new CharacterToken('!'));
      this.state = bangState;
      return;
    }
    this.emit(new CharacterToken('<'));
    this.state = returnState;
  }

  rcdataLessThanSignState(): void {
    this.lessThanSignState(State.RCDATA_END_TAG_OPEN, State.RCDATA);
  }

  rawtextLessThanSignState(): void {
    this.lessThanSignState(State.RAWTEXT_END_TAG_OPEN, State.RAWTEXT);
  }

  private endTagOpenStateShared(endTagNameState: StateName, returnState: StateName): void {
    const c = this.consume();
    if (c !== undefined && /[a-zA-Z]/.test(c)) {
      this.currentToken = new EndTagToken();
      this.currentToken.tagName = c.toLowerCase();
      this.tempBuffer = c;
      this.state = endTagNameState;
      return;
    }
    this.emit(new CharacterToken('<'));
    this.emit(new CharacterToken('/'));
    this.state = returnState;
    if (c !== undefined) {
      this.pos -= 1; // reconsume in returnState
    }
  }

  rcdataEndTagOpenState(): void {
    this.endTagOpenStateShared(State.RCDATA_END_TAG_NAME, State.RCDATA);
  }

  rawtextEndTagOpenState(): void {
    this.endTagOpenStateShared(State.RAWTEXT_END_TAG_NAME, State.RAWTEXT);
  }

  private endTagNameStateShared(returnState: StateName): void {
    const c = this.consume();
    const isAppropriate = (this.currentToken as TagToken).tagName === this.lastStartTagName;
    if (isAppropriate && c !== undefined && /[\t\n\f ]/.test(c)) {
      this.state = State.BEFORE_ATTRIBUTE_NAME;
      return;
    }
    if (isAppropriate && c === '/') {
      this.state = State.SELF_CLOSING_START_TAG;
      return;
    }
    if (isAppropriate && c === '>') {
      this.emit(this.currentToken!);
      this.currentToken = null;
      this.state = State.DATA;
      return;
    }
    if (c !== undefined && /[a-zA-Z]/.test(c)) {
      (this.currentToken as TagToken).tagName += c.toLowerCase();
      this.tempBuffer += c;
      return;
    }
    this.emit(new CharacterToken('<'));
    this.emit(new CharacterToken('/'));
    for (const bufChar of this.tempBuffer) {
      this.emit(new CharacterToken(bufChar));
    }
    this.currentToken = null;
    this.state = returnState;
    if (c !== undefined) {
      this.pos -= 1; // reconsume in returnState
    }
  }

  rcdataEndTagNameState(): void {
    this.endTagNameStateShared(State.RCDATA);
  }

  rawtextEndTagNameState(): void {
    this.endTagNameStateShared(State.RAWTEXT);
  }

  // ============ Script data family ============

  scriptDataState(): void {
    this.textContentState(null, State.SCRIPT_DATA_LESS_THAN_SIGN);
  }

  scriptDataLessThanSignState(): void {
    this.lessThanSignState(State.SCRIPT_DATA_END_TAG_OPEN, State.SCRIPT_DATA, State.SCRIPT_DATA_ESCAPE_START);
  }

  scriptDataEndTagOpenState(): void {
    this.endTagOpenStateShared(State.SCRIPT_DATA_END_TAG_NAME, State.SCRIPT_DATA);
  }

  scriptDataEndTagNameState(): void {
    this.endTagNameStateShared(State.SCRIPT_DATA);
  }

  scriptDataEscapeStartState(): void {
    if (this.peek() === '-') {
      this.consume();
      this.emit(new CharacterToken('-'));
      this.state = State.SCRIPT_DATA_ESCAPE_START_DASH;
      return;
    }
    this.state = State.SCRIPT_DATA;
  }

  scriptDataEscapeStartDashState(): void {
    if (this.peek() === '-') {
      this.consume();
      this.emit(new CharacterToken('-'));
      this.state = State.SCRIPT_DATA_ESCAPED_DASH_DASH;
      return;
    }
    this.state = State.SCRIPT_DATA;
  }

  scriptDataEscapedState(): void {
    if (this.eof()) {
      this.reportParseError('eof-in-script-html-comment-like-text');
      this.emit(new EOFToken());
      this.halted = true;
      return;
    }
    const c = this.consume();
    if (c === '-') {
      this.emit(new CharacterToken('-'));
      this.state = State.SCRIPT_DATA_ESCAPED_DASH;
      return;
    }
    if (c === '<') {
      this.state = State.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
      return;
    }
    if (c.codePointAt(0) === 0) {
      this.reportParseError('unexpected-null-character');
      this.emit(new CharacterToken(c));
      return;
    }
    this.emit(new CharacterToken(c));
  }

  scriptDataEscapedDashState(): void {
    if (this.eof()) {
      this.reportParseError('eof-in-script-html-comment-like-text');
      this.emit(new EOFToken());
      this.halted = true;
      return;
    }
    const c = this.consume();
    if (c === '-') {
      this.emit(new CharacterToken('-'));
      this.state = State.SCRIPT_DATA_ESCAPED_DASH_DASH;
      return;
    }
    if (c === '<') {
      this.state = State.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
      return;
    }
    if (c.codePointAt(0) === 0) {
      this.reportParseError('unexpected-null-character');
      this.emit(new CharacterToken(c));
      this.state = State.SCRIPT_DATA_ESCAPED;
      return;
    }
    this.emit(new CharacterToken(c));
    this.state = State.SCRIPT_DATA_ESCAPED;
  }

  scriptDataEscapedDashDashState(): void {
    if (this.eof()) {
      this.reportParseError('eof-in-script-html-comment-like-text');
      this.emit(new EOFToken());
      this.halted = true;
      return;
    }
    const c = this.consume();
    if (c === '-') {
      this.emit(new CharacterToken('-'));
      return;
    }
    if (c === '<') {
      this.state = State.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;
      return;
    }
    if (c === '>') {
      this.emit(new CharacterToken('>'));
      this.state = State.SCRIPT_DATA;
      return;
    }
    if (c.codePointAt(0) === 0) {
      this.reportParseError('unexpected-null-character');
      this.emit(new CharacterToken(c));
      this.state = State.SCRIPT_DATA_ESCAPED;
      return;
    }
    this.emit(new CharacterToken(c));
    this.state = State.SCRIPT_DATA_ESCAPED;
  }

  scriptDataEscapedLessThanSignState(): void {
    if (this.peek() === '/') {
      this.tempBuffer = '';
      this.consume();
      this.state = State.SCRIPT_DATA_ESCAPED_END_TAG_OPEN;
      return;
    }
    const c = this.peek();
    if (c !== undefined && /[a-zA-Z]/.test(c)) {
      this.tempBuffer = '';
      this.emit(new CharacterToken('<'));
      this.state = State.SCRIPT_DATA_DOUBLE_ESCAPE_START; // reconsume the letter there
      return;
    }
    this.emit(new CharacterToken('<'));
    this.state = State.SCRIPT_DATA_ESCAPED;
  }

  scriptDataEscapedEndTagOpenState(): void {
    this.endTagOpenStateShared(State.SCRIPT_DATA_ESCAPED_END_TAG_NAME, State.SCRIPT_DATA_ESCAPED);
  }

  scriptDataEscapedEndTagNameState(): void {
    this.endTagNameStateShared(State.SCRIPT_DATA_ESCAPED);
  }

  scriptDataDoubleEscapeStartState(): void {
    const c = this.consume();
    if (c !== undefined && isDoubleEscapeTerminator(c)) {
      this.state = this.tempBuffer === 'script' ? State.SCRIPT_DATA_DOUBLE_ESCAPED : State.SCRIPT_DATA_ESCAPED;
      this.emit(new CharacterToken(c));
      return;
    }
    if (c !== undefined && /[a-zA-Z]/.test(c)) {
      this.tempBuffer += c;
      this.emit(new CharacterToken(c));
      return;
    }
    this.state = State.SCRIPT_DATA_ESCAPED;
    if (c !== undefined) {
      this.pos -= 1;
    }
  }

  scriptDataDoubleEscapedState(): void {
    if (this.eof()) {
      this.reportParseError('eof-in-script-html-comment-like-text');
      this.emit(new EOFToken());
      this.halted = true;
      return;
    }
    const c = this.consume();
    if (c === '-') {
      this.emit(new CharacterToken('-'));
      this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED_DASH;
      return;
    }
    if (c === '<') {
      this.emit(new CharacterToken('<'));
      this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN;
      return;
    }
    if (c.codePointAt(0) === 0) {
      this.reportParseError('unexpected-null-character');
      this.emit(new CharacterToken(c));
      return;
    }
    this.emit(new CharacterToken(c));
  }

  scriptDataDoubleEscapedDashState(): void {
    if (this.eof()) {
      this.reportParseError('eof-in-script-html-comment-like-text');
      this.emit(new EOFToken());
      this.halted = true;
      return;
    }
    const c = this.consume();
    if (c === '-') {
      this.emit(new CharacterToken('-'));
      this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH;
      return;
    }
    if (c === '<') {
      this.emit(new CharacterToken('<'));
      this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN;
      return;
    }
    if (c.codePointAt(0) === 0) {
      this.reportParseError('unexpected-null-character');
      this.emit(new CharacterToken(c));
      this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
      return;
    }
    this.emit(new CharacterToken(c));
    this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
  }

  scriptDataDoubleEscapedDashDashState(): void {
    if (this.eof()) {
      this.reportParseError('eof-in-script-html-comment-like-text');
      this.emit(new EOFToken());
      this.halted = true;
      return;
    }
    const c = this.consume();
    if (c === '-') {
      this.emit(new CharacterToken('-'));
      return;
    }
    if (c === '<') {
      this.emit(new CharacterToken('<'));
      this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN;
      return;
    }
    if (c === '>') {
      this.emit(new CharacterToken('>'));
      this.state = State.SCRIPT_DATA;
      return;
    }
    if (c.codePointAt(0) === 0) {
      this.reportParseError('unexpected-null-character');
      this.emit(new CharacterToken(c));
      this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
      return;
    }
    this.emit(new CharacterToken(c));
    this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
  }

  scriptDataDoubleEscapedLessThanSignState(): void {
    if (this.peek() === '/') {
      this.tempBuffer = '';
      this.consume();
      this.emit(new CharacterToken('/'));
      this.state = State.SCRIPT_DATA_DOUBLE_ESCAPE_END;
      return;
    }
    this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
  }

  scriptDataDoubleEscapeEndState(): void {
    const c = this.consume();
    if (c !== undefined && isDoubleEscapeTerminator(c)) {
      this.state = this.tempBuffer === 'script' ? State.SCRIPT_DATA_ESCAPED : State.SCRIPT_DATA_DOUBLE_ESCAPED;
      this.emit(new CharacterToken(c));
      return;
    }
    if (c !== undefined && /[a-zA-Z]/.test(c)) {
      this.tempBuffer += c;
      this.emit(new CharacterToken(c));
      return;
    }
    this.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
    if (c !== undefined) {
      this.pos -= 1;
    }
  }

  // ============ Tag / attribute family ============

  tagOpenState(): void {
    const c = this.consume();
    if (c === '!') {
      this.state = State.MARKUP_DECLARATION_OPEN;
      return;
    }
    if (c === '/') {
      this.state = State.END_TAG_OPEN;
      return;
    }
    if (c !== undefined && /[a-zA-Z]/.test(c)) {
      this.currentToken = new StartTagToken();
      this.state = State.TAG_NAME;
      this.pos -= 1; // reconsume the letter there
      return;
    }
    if (c === '?') {
      this.reportParseError('unexpected-question-mark-instead-of-tag-name');
      this.currentToken = new CommentToken();
      this.state = State.BOGUS_COMMENT;
      this.pos -= 1;
      return;
    }
    this.reportParseError('invalid-first-character-of-tag-name');
    this.emit(new CharacterToken('<'));
    this.state = State.DATA;
    if (c !== undefined) {
      this.pos -= 1;
    }
  }

  endTagOpenState(): void {
    const c = this.consume();
    if (c !== undefined && /[a-zA-Z]/.test(c)) {
      this.currentToken = new EndTagToken();
      this.state = State.TAG_NAME;
      this.pos -= 1;
      return;
    }
    if (c === '>') {
      this.reportParseError('missing-end-tag-name');
      this.state = State.DATA;
      return;
    }
    if (c === undefined) {
      this.reportParseError('eof-before-tag-name');
      this.emit(new CharacterToken('<'));
      this.emit(new CharacterToken('/'));
      this.state = State.DATA;
      return;
    }
    this.reportParseError('invalid-first-character-of-tag-name');
    this.currentToken = new CommentToken();
    this.state = State.BOGUS_COMMENT;
    this.pos -= 1;
  }

  private emitCurrentTagToken(): void {
    this.emit(this.currentToken!);
    if (this.currentToken instanceof StartTagToken) {
      this.lastStartTagName = this.currentToken.tagName;
    }
    this.currentToken = null;
  }

  tagNameState(): void {
    const c = this.consume();
    if (c !== undefined && /[\t\n\f ]/.test(c)) {
      this.state = State.BEFORE_ATTRIBUTE_NAME;
      return;
    }
    if (c === '/') {
      this.state = State.SELF_CLOSING_START_TAG;
      return;
    }
    if (c === '>') {
      this.emitCurrentTagToken();
      this.state = State.DATA;
      return;
    }
    if (c !== undefined && /[A-Z]/.test(c)) {
      (this.currentToken as TagToken).tagName += c.toLowerCase();
      return;
    }
    if (c !== undefined && c.codePointAt(0) === 0) {
      this.reportParseError('unexpected-null-character');
      (this.currentToken as TagToken).tagName += '�';
      return;
    }
    if (c === undefined) {
      this.reportParseError('eof-in-tag');
      this.emit(new EOFToken());
      this.halted = true;
      return;
    }
    (this.currentToken as TagToken).tagName += c;
  }

  beforeAttributeNameState(): void {
    const c = this.consume();
    if (c !== undefined && /[\t\n\f ]/.test(c)) {
      return;
    }
    if (c === '/') {
      this.state = State.SELF_CLOSING_START_TAG;
      return;
    }
    if (c === '>') {
      this.emitCurrentTagToken();
      this.state = State.DATA;
      return;
    }
    if (c === '=') {
      this.reportParseError('unexpected-equals-sign-before-attribute-name');
      this.currentAttribute = { name: '=', value: '' };
      this.state = State.ATTRIBUTE_NAME;
      return;
    }
    this.currentAttribute = { name: '', value: '' };
    this.state = State.ATTRIBUTE_NAME;
    if (c !== undefined) {
      this.pos -= 1;
    }
  }

  private finishAttributeName(nextState: StateName): void {
    const isDuplicate = (this.currentToken as TagToken).attributes.some((a) => a.name === this.currentAttribute!.name);
    if (isDuplicate) {
      this.reportParseError('duplicate-attribute');
    } else {
      (this.currentToken as TagToken).attributes.push(this.currentAttribute!);
    }
    this.state = nextState;
  }

  attributeNameState(): void {
    const c = this.consume();
    if (c !== undefined && /[\t\n\f ]/.test(c)) {
      this.finishAttributeName(State.AFTER_ATTRIBUTE_NAME);
      return;
    }
    if (c === '/' || c === '>' || c === undefined) {
      this.finishAttributeName(State.AFTER_ATTRIBUTE_NAME);
      if (c !== undefined) {
        this.pos -= 1;
      }
      return;
    }
    if (c === '=') {
      this.finishAttributeName(State.BEFORE_ATTRIBUTE_VALUE);
      return;
    }
    if (/[A-Z]/.test(c)) {
      this.currentAttribute!.name += c.toLowerCase();
      return;
    }
    if (c.codePointAt(0) === 0) {
      this.reportParseError('unexpected-null-character');
      this.currentAttribute!.name += '�';
      return;
    }
    if (c === '"' || c === "'" || c === '<') {
      this.reportParseError('unexpected-character-in-attribute-name');
      this.currentAttribute!.name += c;
      return;
    }
    this.currentAttribute!.name += c;
  }

  afterAttributeNameState(): void {
    const c = this.consume();
    if (c !== undefined && /[\t\n\f ]/.test(c)) {
      return;
    }
    if (c === '/') {
      this.state = State.SELF_CLOSING_START_TAG;
      return;
    }
    if (c === '=') {
      this.state = State.BEFORE_ATTRIBUTE_VALUE;
      return;
    }
    if (c === '>') {
      this.emitCurrentTagToken();
      this.state = State.DATA;
      return;
    }
    if (c === undefined) {
      this.reportParseError('eof-in-tag');
      this.emit(new EOFToken());
      this.halted = true;
      return;
    }
    this.currentAttribute = { name: '', value: '' };
    this.state = State.ATTRIBUTE_NAME;
    this.pos -= 1;
  }

  beforeAttributeValueState(): void {
    const c = this.consume();
    if (c !== undefined && /[\t\n\f ]/.test(c)) {
      return;
    }
    if (c === '"') {
      this.state = State.ATTRIBUTE_VALUE_DOUBLE_QUOTED;
      return;
    }
    if (c === "'") {
      this.state = State.ATTRIBUTE_VALUE_SINGLE_QUOTED;
      return;
    }
    if (c === '>') {
      this.reportParseError('missing-attribute-value');
      this.emitCurrentTagToken();
      this.state = State.DATA;
      return;
    }
    this.state = State.ATTRIBUTE_VALUE_UNQUOTED;
    if (c !== undefined) {
      this.pos -= 1;
    }
  }

  private attributeValueQuotedState(quoteChar: string, returnState: StateName): void {
    const c = this.consume();
    if (c === quoteChar) {
      this.state = State.AFTER_ATTRIBUTE_VALUE_QUOTED;
      return;
    }
    if (c === '&') {
      this.attrValueReturnState = returnState;
      this.additionalAllowedCharacter = quoteChar;
      this.state = State.CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE;
      return;
    }
    if (c !== undefined && c.codePointAt(0) === 0) {
      this.reportParseError('unexpected-null-character');
      this.currentAttribute!.value += '�';
      return;
    }
    if (c === undefined) {
      this.reportParseError('eof-in-tag');
      this.emit(new EOFToken());
      this.halted = true;
      return;
    }
    this.currentAttribute!.value += c;
  }

  attributeValueDoubleQuotedState(): void {
    this.attributeValueQuotedState('"', State.ATTRIBUTE_VALUE_DOUBLE_QUOTED);
  }

  attributeValueSingleQuotedState(): void {
    this.attributeValueQuotedState("'", State.ATTRIBUTE_VALUE_SINGLE_QUOTED);
  }

  attributeValueUnquotedState(): void {
    const c = this.consume();
    if (c !== undefined && /[\t\n\f ]/.test(c)) {
      this.state = State.BEFORE_ATTRIBUTE_NAME;
      return;
    }
    if (c === '&') {
      this.attrValueReturnState = State.ATTRIBUTE_VALUE_UNQUOTED;
      this.additionalAllowedCharacter = undefined;
      this.state = State.CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE;
      return;
    }
    if (c === '>') {
      this.emitCurrentTagToken();
      this.state = State.DATA;
      return;
    }
    if (c !== undefined && c.codePointAt(0) === 0) {
      this.reportParseError('unexpected-null-character');
      this.currentAttribute!.value += '�';
      return;
    }
    if (c === undefined) {
      this.reportParseError('eof-in-tag');
      this.emit(new EOFToken());
      this.halted = true;
      return;
    }
    this.currentAttribute!.value += c;
  }

  afterAttributeValueQuotedState(): void {
    const c = this.consume();
    if (c !== undefined && /[\t\n\f ]/.test(c)) {
      this.state = State.BEFORE_ATTRIBUTE_NAME;
      return;
    }
    if (c === '/') {
      this.state = State.SELF_CLOSING_START_TAG;
      return;
    }
    if (c === '>') {
      this.emitCurrentTagToken();
      this.state = State.DATA;
      return;
    }
    if (c === undefined) {
      this.reportParseError('eof-in-tag');
      this.emit(new EOFToken());
      this.halted = true;
      return;
    }
    this.reportParseError('missing-whitespace-between-attributes');
    this.state = State.BEFORE_ATTRIBUTE_NAME;
    this.pos -= 1;
  }

  selfClosingStartTagState(): void {
    const c = this.consume();
    if (c === '>') {
      (this.currentToken as TagToken).selfClosing = true;
      this.emitCurrentTagToken();
      this.state = State.DATA;
      return;
    }
    if (c === undefined) {
      this.reportParseError('eof-in-tag');
      this.emit(new EOFToken());
      this.halted = true;
      return;
    }
    this.reportParseError('unexpected-solidus-in-tag');
    this.state = State.BEFORE_ATTRIBUTE_NAME;
    this.pos -= 1;
  }

  characterReferenceInAttributeValueState(): void {
    const decoded = consumeCharacterReference(this, this.additionalAllowedCharacter, true);
    if (decoded === null) {
      this.currentAttribute!.value += '&';
    } else {
      this.currentAttribute!.value += decoded;
    }
    this.state = this.attrValueReturnState!;
  }

  // ============ Markup declaration / comment family ============

  markupDeclarationOpenState(): void {
    if (this.matchLiteral('--')) {
      this.consume();
      this.consume();
      this.currentToken = new CommentToken();
      this.state = State.COMMENT_START;
      return;
    }
    if (this.matchCaseInsensitive('DOCTYPE')) {
      for (let i = 0; i < 'DOCTYPE'.length; i++) this.consume();
      this.state = State.DOCTYPE;
      return;
    }
    if (this.matchLiteral('[CDATA[')) {
      for (let i = 0; i < '[CDATA['.length; i++) this.consume();
      this.state = State.CDATA_SECTION;
      return;
    }
    this.reportParseError('incorrectly-opened-comment');
    this.currentToken = new CommentToken();
    this.state = State.BOGUS_COMMENT;
  }

  bogusCommentState(): void {
    const c = this.consume();
    if (c === '>') {
      this.emit(this.currentToken!);
      this.currentToken = null;
      this.state = State.DATA;
      return;
    }
    if (c === undefined) {
      this.emit(this.currentToken!);
      this.currentToken = null;
      this.emit(new EOFToken());
      this.halted = true;
      return;
    }
    if (c.codePointAt(0) === 0) {
      this.reportParseError('unexpected-null-character');
      (this.currentToken as CommentToken).data += '�';
      return;
    }
    (this.currentToken as CommentToken).data += c;
  }

  commentStartState(): void {
    const c = this.consume();
    if (c === '-') {
      this.state = State.COMMENT_START_DASH;
      return;
    }
    if (c === '>') {
      this.reportParseError('abrupt-closing-of-empty-comment');
      this.emit(this.currentToken!);
      this.currentToken = null;
      this.state = State.DATA;
      return;
    }
    this.state = State.COMMENT;
    if (c !== undefined) {
      this.pos -= 1;
    }
  }

  commentStartDashState(): void {
    const c = this.consume();
    if (c === '-') {
      this.state = State.COMMENT_END;
      return;
    }
    if (c === '>') {
      this.reportParseError('abrupt-closing-of-empty-comment');
      this.emit(this.currentToken!);
      this.currentToken = null;
      this.state = State.DATA;
      return;
    }
    if (c === undefined) {
      this.reportParseError('eof-in-comment');
      this.emit(this.currentToken!);
      this.currentToken = null;
      this.emit(new EOFToken());
      this.halted = true;
      return;
    }
    (this.currentToken as CommentToken).data += '-';
    this.state = State.COMMENT;
    this.pos -= 1;
  }

  commentState(): void {
    const c = this.consume();
    if (c === '-') {
      this.state = State.COMMENT_END_DASH;
      return;
    }
    if (c !== undefined && c.codePointAt(0) === 0) {
      this.reportParseError('unexpected-null-character');
      (this.currentToken as CommentToken).data += '�';
      return;
    }
    if (c === undefined) {
      this.reportParseError('eof-in-comment');
      this.emit(this.currentToken!);
      this.currentToken = null;
      this.emit(new EOFToken());
      this.halted = true;
      return;
    }
    (this.currentToken as CommentToken).data += c;
  }

  commentEndDashState(): void {
    const c = this.consume();
    if (c === '-') {
      this.state = State.COMMENT_END;
      return;
    }
    if (c === undefined) {
      this.reportParseError('eof-in-comment');
      this.emit(this.currentToken!);
      this.currentToken = null;
      this.emit(new EOFToken());
      this.halted = true;
      return;
    }
    (this.currentToken as CommentToken).data += '-';
    this.state = State.COMMENT;
    this.pos -= 1;
  }

  commentEndState(): void {
    const c = this.consume();
    if (c === '>') {
      this.emit(this.currentToken!);
      this.currentToken = null;
      this.state = State.DATA;
      return;
    }
    if (c === '!') {
      this.state = State.COMMENT_END_BANG;
      return;
    }
    if (c === '-') {
      (this.currentToken as CommentToken).data += '-';
      return;
    }
    if (c === undefined) {
      this.reportParseError('eof-in-comment');
      this.emit(this.currentToken!);
      this.currentToken = null;
      this.emit(new EOFToken());
      this.halted = true;
      return;
    }
    (this.currentToken as CommentToken).data += '--';
    this.state = State.COMMENT;
    this.pos -= 1;
  }

  commentEndBangState(): void {
    const c = this.consume();
    if (c === '-') {
      (this.currentToken as CommentToken).data += '--!';
      this.state = State.COMMENT_END_DASH;
      return;
    }
    if (c === '>') {
      this.reportParseError('incorrectly-closed-comment');
      this.emit(this.currentToken!);
      this.currentToken = null;
      this.state = State.DATA;
      return;
    }
    if (c === undefined) {
      this.reportParseError('eof-in-comment');
      this.emit(this.currentToken!);
      this.currentToken = null;
      this.emit(new EOFToken());
      this.halted = true;
      return;
    }
    (this.currentToken as CommentToken).data += '--!';
    this.state = State.COMMENT;
    this.pos -= 1;
  }

  // ============ DOCTYPE family ============

  private emitDoctype(): void {
    this.emit(this.currentToken!);
    this.currentToken = null;
  }

  private doctypeEofForceQuirks(): void {
    this.reportParseError('eof-in-doctype');
    (this.currentToken as DoctypeToken).forceQuirks = true;
    this.emitDoctype();
    this.emit(new EOFToken());
    this.halted = true;
  }

  private doctypeIdentifierQuotedState(
    quoteChar: string,
    fieldName: 'publicIdentifier' | 'systemIdentifier',
    nextState: StateName,
    abruptErrorName: string
  ): void {
    const c = this.consume();
    const tok = this.currentToken as DoctypeToken;
    if (c === quoteChar) {
      this.state = nextState;
      return;
    }
    if (c !== undefined && c.codePointAt(0) === 0) {
      this.reportParseError('unexpected-null-character');
      tok[fieldName] = (tok[fieldName] ?? '') + '�';
      return;
    }
    if (c === '>') {
      this.reportParseError(abruptErrorName);
      tok.forceQuirks = true;
      this.emitDoctype();
      this.state = State.DATA;
      return;
    }
    if (c === undefined) {
      this.doctypeEofForceQuirks();
      return;
    }
    tok[fieldName] = (tok[fieldName] ?? '') + c;
  }

  doctypeState(): void {
    const c = this.consume();
    if (c !== undefined && /[\t\n\f ]/.test(c)) {
      this.state = State.BEFORE_DOCTYPE_NAME;
      return;
    }
    if (c === undefined) {
      this.reportParseError('eof-in-doctype');
      this.currentToken = new DoctypeToken();
      this.currentToken.forceQuirks = true;
      this.emitDoctype();
      this.emit(new EOFToken());
      this.halted = true;
      return;
    }
    this.reportParseError('missing-whitespace-before-doctype-name');
    this.state = State.BEFORE_DOCTYPE_NAME;
    this.pos -= 1;
  }

  beforeDoctypeNameState(): void {
    const c = this.consume();
    if (c !== undefined && /[\t\n\f ]/.test(c)) {
      return;
    }
    if (c !== undefined && /[A-Z]/.test(c)) {
      this.currentToken = new DoctypeToken();
      this.currentToken.name = c.toLowerCase();
      this.state = State.DOCTYPE_NAME;
      return;
    }
    if (c !== undefined && c.codePointAt(0) === 0) {
      this.reportParseError('unexpected-null-character');
      this.currentToken = new DoctypeToken();
      this.currentToken.name = '�';
      this.state = State.DOCTYPE_NAME;
      return;
    }
    if (c === '>') {
      this.reportParseError('missing-doctype-name');
      this.currentToken = new DoctypeToken();
      this.currentToken.forceQuirks = true;
      this.emitDoctype();
      this.state = State.DATA;
      return;
    }
    if (c === undefined) {
      this.reportParseError('eof-in-doctype');
      this.currentToken = new DoctypeToken();
      this.currentToken.forceQuirks = true;
      this.emitDoctype();
      this.emit(new EOFToken());
      this.halted = true;
      return;
    }
    this.currentToken = new DoctypeToken();
    this.currentToken.name = c;
    this.state = State.DOCTYPE_NAME;
  }

  doctypeNameState(): void {
    const c = this.consume();
    const tok = this.currentToken as DoctypeToken;
    if (c !== undefined && /[\t\n\f ]/.test(c)) {
      this.state = State.AFTER_DOCTYPE_NAME;
      return;
    }
    if (c === '>') {
      this.emitDoctype();
      this.state = State.DATA;
      return;
    }
    if (c !== undefined && /[A-Z]/.test(c)) {
      tok.name += c.toLowerCase();
      return;
    }
    if (c !== undefined && c.codePointAt(0) === 0) {
      this.reportParseError('unexpected-null-character');
      tok.name += '�';
      return;
    }
    if (c === undefined) {
      this.doctypeEofForceQuirks();
      return;
    }
    tok.name += c;
  }

  afterDoctypeNameState(): void {
    const c = this.consume();
    if (c !== undefined && /[\t\n\f ]/.test(c)) {
      return;
    }
    if (c === '>') {
      this.emitDoctype();
      this.state = State.DATA;
      return;
    }
    if (c === undefined) {
      this.doctypeEofForceQuirks();
      return;
    }
    this.pos -= 1; // un-consume for the 6-char lookahead
    if (this.matchCaseInsensitive('PUBLIC')) {
      for (let i = 0; i < 6; i++) this.consume();
      this.state = State.AFTER_DOCTYPE_PUBLIC_KEYWORD;
      return;
    }
    if (this.matchCaseInsensitive('SYSTEM')) {
      for (let i = 0; i < 6; i++) this.consume();
      this.state = State.AFTER_DOCTYPE_SYSTEM_KEYWORD;
      return;
    }
    this.reportParseError('invalid-character-sequence-after-doctype-name');
    (this.currentToken as DoctypeToken).forceQuirks = true;
    this.state = State.BOGUS_DOCTYPE;
  }

  afterDoctypePublicKeywordState(): void {
    const c = this.consume();
    const tok = this.currentToken as DoctypeToken;
    if (c !== undefined && /[\t\n\f ]/.test(c)) {
      this.state = State.BEFORE_DOCTYPE_PUBLIC_IDENTIFIER;
      return;
    }
    if (c === '"' || c === "'") {
      this.reportParseError('missing-whitespace-after-doctype-public-keyword');
      tok.publicIdentifier = '';
      this.state = c === '"' ? State.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED : State.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED;
      return;
    }
    if (c === '>') {
      this.reportParseError('missing-doctype-public-identifier');
      tok.forceQuirks = true;
      this.emitDoctype();
      this.state = State.DATA;
      return;
    }
    if (c === undefined) {
      this.doctypeEofForceQuirks();
      return;
    }
    this.reportParseError('missing-quote-before-doctype-public-identifier');
    tok.forceQuirks = true;
    this.state = State.BOGUS_DOCTYPE;
    this.pos -= 1;
  }

  beforeDoctypePublicIdentifierState(): void {
    const c = this.consume();
    const tok = this.currentToken as DoctypeToken;
    if (c !== undefined && /[\t\n\f ]/.test(c)) {
      return;
    }
    if (c === '"' || c === "'") {
      tok.publicIdentifier = '';
      this.state = c === '"' ? State.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED : State.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED;
      return;
    }
    if (c === '>') {
      this.reportParseError('missing-doctype-public-identifier');
      tok.forceQuirks = true;
      this.emitDoctype();
      this.state = State.DATA;
      return;
    }
    if (c === undefined) {
      this.doctypeEofForceQuirks();
      return;
    }
    this.reportParseError('missing-quote-before-doctype-public-identifier');
    tok.forceQuirks = true;
    this.state = State.BOGUS_DOCTYPE;
    this.pos -= 1;
  }

  doctypePublicIdentifierDoubleQuotedState(): void {
    this.doctypeIdentifierQuotedState('"', 'publicIdentifier', State.AFTER_DOCTYPE_PUBLIC_IDENTIFIER, 'abrupt-doctype-public-identifier');
  }

  doctypePublicIdentifierSingleQuotedState(): void {
    this.doctypeIdentifierQuotedState("'", 'publicIdentifier', State.AFTER_DOCTYPE_PUBLIC_IDENTIFIER, 'abrupt-doctype-public-identifier');
  }

  afterDoctypePublicIdentifierState(): void {
    const c = this.consume();
    const tok = this.currentToken as DoctypeToken;
    if (c !== undefined && /[\t\n\f ]/.test(c)) {
      this.state = State.BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS;
      return;
    }
    if (c === '>') {
      this.emitDoctype();
      this.state = State.DATA;
      return;
    }
    if (c === '"' || c === "'") {
      this.reportParseError('missing-whitespace-between-doctype-public-and-system-identifiers');
      tok.systemIdentifier = '';
      this.state = c === '"' ? State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED : State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
      return;
    }
    if (c === undefined) {
      this.doctypeEofForceQuirks();
      return;
    }
    this.reportParseError('missing-quote-before-doctype-system-identifier');
    tok.forceQuirks = true;
    this.state = State.BOGUS_DOCTYPE;
    this.pos -= 1;
  }

  betweenDoctypePublicAndSystemIdentifiersState(): void {
    const c = this.consume();
    const tok = this.currentToken as DoctypeToken;
    if (c !== undefined && /[\t\n\f ]/.test(c)) {
      return;
    }
    if (c === '>') {
      this.emitDoctype();
      this.state = State.DATA;
      return;
    }
    if (c === '"' || c === "'") {
      tok.systemIdentifier = '';
      this.state = c === '"' ? State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED : State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
      return;
    }
    if (c === undefined) {
      this.doctypeEofForceQuirks();
      return;
    }
    this.reportParseError('missing-quote-before-doctype-system-identifier');
    tok.forceQuirks = true;
    this.state = State.BOGUS_DOCTYPE;
    this.pos -= 1;
  }

  afterDoctypeSystemKeywordState(): void {
    const c = this.consume();
    const tok = this.currentToken as DoctypeToken;
    if (c !== undefined && /[\t\n\f ]/.test(c)) {
      this.state = State.BEFORE_DOCTYPE_SYSTEM_IDENTIFIER;
      return;
    }
    if (c === '"' || c === "'") {
      this.reportParseError('missing-whitespace-after-doctype-system-keyword');
      tok.systemIdentifier = '';
      this.state = c === '"' ? State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED : State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
      return;
    }
    if (c === '>') {
      this.reportParseError('missing-doctype-system-identifier');
      tok.forceQuirks = true;
      this.emitDoctype();
      this.state = State.DATA;
      return;
    }
    if (c === undefined) {
      this.doctypeEofForceQuirks();
      return;
    }
    this.reportParseError('missing-quote-before-doctype-system-identifier');
    tok.forceQuirks = true;
    this.state = State.BOGUS_DOCTYPE;
    this.pos -= 1;
  }

  beforeDoctypeSystemIdentifierState(): void {
    const c = this.consume();
    const tok = this.currentToken as DoctypeToken;
    if (c !== undefined && /[\t\n\f ]/.test(c)) {
      return;
    }
    if (c === '"' || c === "'") {
      tok.systemIdentifier = '';
      this.state = c === '"' ? State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED : State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
      return;
    }
    if (c === '>') {
      this.reportParseError('missing-doctype-system-identifier');
      tok.forceQuirks = true;
      this.emitDoctype();
      this.state = State.DATA;
      return;
    }
    if (c === undefined) {
      this.doctypeEofForceQuirks();
      return;
    }
    this.reportParseError('missing-quote-before-doctype-system-identifier');
    tok.forceQuirks = true;
    this.state = State.BOGUS_DOCTYPE;
    this.pos -= 1;
  }

  doctypeSystemIdentifierDoubleQuotedState(): void {
    this.doctypeIdentifierQuotedState('"', 'systemIdentifier', State.AFTER_DOCTYPE_SYSTEM_IDENTIFIER, 'abrupt-doctype-system-identifier');
  }

  doctypeSystemIdentifierSingleQuotedState(): void {
    this.doctypeIdentifierQuotedState("'", 'systemIdentifier', State.AFTER_DOCTYPE_SYSTEM_IDENTIFIER, 'abrupt-doctype-system-identifier');
  }

  afterDoctypeSystemIdentifierState(): void {
    const c = this.consume();
    if (c !== undefined && /[\t\n\f ]/.test(c)) {
      return;
    }
    if (c === '>') {
      this.emitDoctype();
      this.state = State.DATA;
      return;
    }
    if (c === undefined) {
      this.doctypeEofForceQuirks();
      return;
    }
    this.reportParseError('unexpected-character-after-doctype-system-identifier');
    this.state = State.BOGUS_DOCTYPE;
    this.pos -= 1;
  }

  bogusDoctypeState(): void {
    const c = this.consume();
    if (c === '>') {
      this.emitDoctype();
      this.state = State.DATA;
      return;
    }
    if (c !== undefined && c.codePointAt(0) === 0) {
      this.reportParseError('unexpected-null-character');
      return;
    }
    if (c === undefined) {
      this.emitDoctype();
      this.emit(new EOFToken());
      this.halted = true;
      return;
    }
  }

  cdataSectionState(): void {
    if (this.matchLiteral(']]>')) {
      this.consume();
      this.consume();
      this.consume();
      this.state = State.DATA;
      return;
    }
    if (this.eof()) {
      this.reportParseError('eof-in-cdata');
      this.emit(new EOFToken());
      this.halted = true;
      return;
    }
    const c = this.consume();
    if (c.codePointAt(0) === 0) {
      this.reportParseError('unexpected-null-character');
      this.emit(new CharacterToken(c));
      return;
    }
    this.emit(new CharacterToken(c));
  }

  // ============ dispatch ============

  private static readonly DISPATCH: Record<string, keyof Tokenizer> = {
    [State.DATA]: 'dataState',
    [State.CHARACTER_REFERENCE_IN_DATA]: 'characterReferenceInDataState',
    [State.CHARACTER_REFERENCE_IN_RCDATA]: 'characterReferenceInRcdataState',
    [State.RCDATA]: 'rcdataState',
    [State.RAWTEXT]: 'rawtextState',
    [State.PLAINTEXT]: 'plaintextState',
    [State.RCDATA_LESS_THAN_SIGN]: 'rcdataLessThanSignState',
    [State.RAWTEXT_LESS_THAN_SIGN]: 'rawtextLessThanSignState',
    [State.RCDATA_END_TAG_OPEN]: 'rcdataEndTagOpenState',
    [State.RAWTEXT_END_TAG_OPEN]: 'rawtextEndTagOpenState',
    [State.RCDATA_END_TAG_NAME]: 'rcdataEndTagNameState',
    [State.RAWTEXT_END_TAG_NAME]: 'rawtextEndTagNameState',
    [State.SCRIPT_DATA]: 'scriptDataState',
    [State.SCRIPT_DATA_LESS_THAN_SIGN]: 'scriptDataLessThanSignState',
    [State.SCRIPT_DATA_END_TAG_OPEN]: 'scriptDataEndTagOpenState',
    [State.SCRIPT_DATA_END_TAG_NAME]: 'scriptDataEndTagNameState',
    [State.SCRIPT_DATA_ESCAPE_START]: 'scriptDataEscapeStartState',
    [State.SCRIPT_DATA_ESCAPE_START_DASH]: 'scriptDataEscapeStartDashState',
    [State.SCRIPT_DATA_ESCAPED]: 'scriptDataEscapedState',
    [State.SCRIPT_DATA_ESCAPED_DASH]: 'scriptDataEscapedDashState',
    [State.SCRIPT_DATA_ESCAPED_DASH_DASH]: 'scriptDataEscapedDashDashState',
    [State.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN]: 'scriptDataEscapedLessThanSignState',
    [State.SCRIPT_DATA_ESCAPED_END_TAG_OPEN]: 'scriptDataEscapedEndTagOpenState',
    [State.SCRIPT_DATA_ESCAPED_END_TAG_NAME]: 'scriptDataEscapedEndTagNameState',
    [State.SCRIPT_DATA_DOUBLE_ESCAPE_START]: 'scriptDataDoubleEscapeStartState',
    [State.SCRIPT_DATA_DOUBLE_ESCAPED]: 'scriptDataDoubleEscapedState',
    [State.SCRIPT_DATA_DOUBLE_ESCAPED_DASH]: 'scriptDataDoubleEscapedDashState',
    [State.SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH]: 'scriptDataDoubleEscapedDashDashState',
    [State.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN]: 'scriptDataDoubleEscapedLessThanSignState',
    [State.SCRIPT_DATA_DOUBLE_ESCAPE_END]: 'scriptDataDoubleEscapeEndState',
    [State.TAG_OPEN]: 'tagOpenState',
    [State.END_TAG_OPEN]: 'endTagOpenState',
    [State.TAG_NAME]: 'tagNameState',
    [State.BEFORE_ATTRIBUTE_NAME]: 'beforeAttributeNameState',
    [State.ATTRIBUTE_NAME]: 'attributeNameState',
    [State.AFTER_ATTRIBUTE_NAME]: 'afterAttributeNameState',
    [State.BEFORE_ATTRIBUTE_VALUE]: 'beforeAttributeValueState',
    [State.ATTRIBUTE_VALUE_DOUBLE_QUOTED]: 'attributeValueDoubleQuotedState',
    [State.ATTRIBUTE_VALUE_SINGLE_QUOTED]: 'attributeValueSingleQuotedState',
    [State.ATTRIBUTE_VALUE_UNQUOTED]: 'attributeValueUnquotedState',
    [State.AFTER_ATTRIBUTE_VALUE_QUOTED]: 'afterAttributeValueQuotedState',
    [State.SELF_CLOSING_START_TAG]: 'selfClosingStartTagState',
    [State.CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE]: 'characterReferenceInAttributeValueState',
    [State.MARKUP_DECLARATION_OPEN]: 'markupDeclarationOpenState',
    [State.BOGUS_COMMENT]: 'bogusCommentState',
    [State.COMMENT_START]: 'commentStartState',
    [State.COMMENT_START_DASH]: 'commentStartDashState',
    [State.COMMENT]: 'commentState',
    [State.COMMENT_END_DASH]: 'commentEndDashState',
    [State.COMMENT_END]: 'commentEndState',
    [State.COMMENT_END_BANG]: 'commentEndBangState',
    [State.DOCTYPE]: 'doctypeState',
    [State.BEFORE_DOCTYPE_NAME]: 'beforeDoctypeNameState',
    [State.DOCTYPE_NAME]: 'doctypeNameState',
    [State.AFTER_DOCTYPE_NAME]: 'afterDoctypeNameState',
    [State.AFTER_DOCTYPE_PUBLIC_KEYWORD]: 'afterDoctypePublicKeywordState',
    [State.BEFORE_DOCTYPE_PUBLIC_IDENTIFIER]: 'beforeDoctypePublicIdentifierState',
    [State.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED]: 'doctypePublicIdentifierDoubleQuotedState',
    [State.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED]: 'doctypePublicIdentifierSingleQuotedState',
    [State.AFTER_DOCTYPE_PUBLIC_IDENTIFIER]: 'afterDoctypePublicIdentifierState',
    [State.BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS]: 'betweenDoctypePublicAndSystemIdentifiersState',
    [State.AFTER_DOCTYPE_SYSTEM_KEYWORD]: 'afterDoctypeSystemKeywordState',
    [State.BEFORE_DOCTYPE_SYSTEM_IDENTIFIER]: 'beforeDoctypeSystemIdentifierState',
    [State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED]: 'doctypeSystemIdentifierDoubleQuotedState',
    [State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED]: 'doctypeSystemIdentifierSingleQuotedState',
    [State.AFTER_DOCTYPE_SYSTEM_IDENTIFIER]: 'afterDoctypeSystemIdentifierState',
    [State.BOGUS_DOCTYPE]: 'bogusDoctypeState',
    [State.CDATA_SECTION]: 'cdataSectionState',
  };

  step(): void {
    if (this.stateTrace.length < MAX_TRACE) {
      this.stateTrace.push({ state: this.state, pos: this.pos });
    }
    const method = Tokenizer.DISPATCH[this.state];
    if (!method) {
      throw new NotImplementedError(this.state);
    }
    (this[method] as () => void).call(this);
  }

  run(): Token[] {
    let steps = 0;
    while (!this.halted && steps < MAX_STEPS) {
      this.step();
      steps++;
    }
    return this.tokens;
  }
}
