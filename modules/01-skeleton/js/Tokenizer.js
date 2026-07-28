'use strict';

const { State } = require('./State');
const { EOFToken } = require('./Token');

/**
 * Thrown by any state that isn't implemented yet. Carries the exact spec
 * state name and the number of the course module that will implement it,
 * so tests (and you, reading a stack trace) can tell "not built yet" apart
 * from "actually broken."
 */
class NotImplementedError extends Error {
  constructor(stateName, moduleNumber) {
    super(`[${stateName} state] is not implemented yet. It arrives in Module ${moduleNumber}.`);
    this.name = 'NotImplementedError';
    this.stateName = stateName;
    this.moduleNumber = moduleNumber;
  }
}

/**
 * Maps every one of the 68 states to the module that will give it real
 * behavior. This map is scaffolding specific to this COURSE — a production
 * tokenizer would never ship it — but it's what lets Module 1 prove the
 * dispatch structure can already address all 68 rooms on the board.
 */
const STATE_MODULE_MAP = {
  [State.DATA]: 3,
  [State.CHARACTER_REFERENCE_IN_DATA]: 4,
  [State.RCDATA]: 5,
  [State.CHARACTER_REFERENCE_IN_RCDATA]: 4,
  [State.RAWTEXT]: 5,
  [State.SCRIPT_DATA]: 6,
  [State.PLAINTEXT]: 5,
  [State.TAG_OPEN]: 9,
  [State.END_TAG_OPEN]: 9,
  [State.TAG_NAME]: 9,
  [State.RCDATA_LESS_THAN_SIGN]: 5,
  [State.RCDATA_END_TAG_OPEN]: 5,
  [State.RCDATA_END_TAG_NAME]: 5,
  [State.RAWTEXT_LESS_THAN_SIGN]: 5,
  [State.RAWTEXT_END_TAG_OPEN]: 5,
  [State.RAWTEXT_END_TAG_NAME]: 5,
  [State.SCRIPT_DATA_LESS_THAN_SIGN]: 6,
  [State.SCRIPT_DATA_END_TAG_OPEN]: 6,
  [State.SCRIPT_DATA_END_TAG_NAME]: 6,
  [State.SCRIPT_DATA_ESCAPE_START]: 7,
  [State.SCRIPT_DATA_ESCAPE_START_DASH]: 7,
  [State.SCRIPT_DATA_ESCAPED]: 7,
  [State.SCRIPT_DATA_ESCAPED_DASH]: 7,
  [State.SCRIPT_DATA_ESCAPED_DASH_DASH]: 7,
  [State.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN]: 7,
  [State.SCRIPT_DATA_ESCAPED_END_TAG_OPEN]: 7,
  [State.SCRIPT_DATA_ESCAPED_END_TAG_NAME]: 7,
  [State.SCRIPT_DATA_DOUBLE_ESCAPE_START]: 8,
  [State.SCRIPT_DATA_DOUBLE_ESCAPED]: 8,
  [State.SCRIPT_DATA_DOUBLE_ESCAPED_DASH]: 8,
  [State.SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH]: 8,
  [State.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN]: 8,
  [State.SCRIPT_DATA_DOUBLE_ESCAPE_END]: 8,
  [State.BEFORE_ATTRIBUTE_NAME]: 10,
  [State.ATTRIBUTE_NAME]: 10,
  [State.AFTER_ATTRIBUTE_NAME]: 10,
  [State.BEFORE_ATTRIBUTE_VALUE]: 10,
  [State.ATTRIBUTE_VALUE_DOUBLE_QUOTED]: 10,
  [State.ATTRIBUTE_VALUE_SINGLE_QUOTED]: 10,
  [State.ATTRIBUTE_VALUE_UNQUOTED]: 10,
  [State.CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE]: 11,
  [State.AFTER_ATTRIBUTE_VALUE_QUOTED]: 10,
  [State.SELF_CLOSING_START_TAG]: 10,
  [State.BOGUS_COMMENT]: 12,
  [State.MARKUP_DECLARATION_OPEN]: 12,
  [State.COMMENT_START]: 13,
  [State.COMMENT_START_DASH]: 13,
  [State.COMMENT]: 13,
  [State.COMMENT_END_DASH]: 13,
  [State.COMMENT_END]: 13,
  [State.COMMENT_END_BANG]: 13,
  [State.DOCTYPE]: 14,
  [State.BEFORE_DOCTYPE_NAME]: 14,
  [State.DOCTYPE_NAME]: 14,
  [State.AFTER_DOCTYPE_NAME]: 14,
  [State.AFTER_DOCTYPE_PUBLIC_KEYWORD]: 14,
  [State.BEFORE_DOCTYPE_PUBLIC_IDENTIFIER]: 14,
  [State.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED]: 14,
  [State.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED]: 14,
  [State.AFTER_DOCTYPE_PUBLIC_IDENTIFIER]: 14,
  [State.BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS]: 14,
  [State.AFTER_DOCTYPE_SYSTEM_KEYWORD]: 14,
  [State.BEFORE_DOCTYPE_SYSTEM_IDENTIFIER]: 14,
  [State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED]: 14,
  [State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED]: 14,
  [State.AFTER_DOCTYPE_SYSTEM_IDENTIFIER]: 14,
  [State.BOGUS_DOCTYPE]: 14,
  [State.CDATA_SECTION]: 15,
};

class Tokenizer {
  constructor(input) {
    this.input = input;
    this.pos = 0;
    this.state = State.DATA;
    this.tokens = [];
    this.halted = false;
  }

  eof() {
    return this.pos >= this.input.length;
  }

  consume() {
    return this.input[this.pos++];
  }

  emit(token) {
    this.tokens.push(token);
  }

  /** The ONLY state with real logic in this module. Only its EOF branch
   * is actually implemented — the '&' and '<' branches, and the plain
   * "emit a character" branch, are stubbed with a pointer to the module
   * that completes them. */
  dataState() {
    if (this.eof()) {
      this.emit(new EOFToken());
      this.halted = true;
      return;
    }
    const c = this.consume();
    if (c === '&') {
      throw new NotImplementedError(State.CHARACTER_REFERENCE_IN_DATA, 4);
    }
    if (c === '<') {
      throw new NotImplementedError(State.TAG_OPEN, 9);
    }
    throw new NotImplementedError('Data (character-emission branch)', 3);
  }

  step() {
    if (this.state === State.DATA) {
      this.dataState();
      return;
    }
    throw new NotImplementedError(this.state, STATE_MODULE_MAP[this.state]);
  }

  run() {
    while (!this.halted) {
      this.step();
    }
    return this.tokens;
  }
}

module.exports = { Tokenizer, NotImplementedError, STATE_MODULE_MAP };
