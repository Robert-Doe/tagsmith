'use strict';

/**
 * The six token types the spec defines in the 8.2.4 preamble, before any
 * state is described. Field names and initial values below are taken
 * directly from that preamble, not invented:
 *   - DOCTYPE: name, public identifier, system identifier (each starts
 *     "missing," not empty string), and a force-quirks flag (off).
 *   - Start/end tag: a tag name, a self-closing flag (unset), and a list
 *     of attributes (each with a name and a value).
 *   - Comment: data (starts empty string).
 *   - Character: data (spec: exactly ONE character per token).
 *   - EOF: no fields.
 */

class Token {}

class DoctypeToken extends Token {
  constructor() {
    super();
    this.name = null; // null = "missing" per spec, distinct from ''
    this.publicIdentifier = null;
    this.systemIdentifier = null;
    this.forceQuirks = false;
  }
}

class TagToken extends Token {
  constructor() {
    super();
    this.tagName = '';
    this.selfClosing = false;
    this.attributes = []; // [{ name, value }]
  }
}

class StartTagToken extends TagToken {}
class EndTagToken extends TagToken {}

class CommentToken extends Token {
  constructor() {
    super();
    this.data = '';
  }
}

class CharacterToken extends Token {
  constructor(data) {
    super();
    this.data = data; // exactly one character, per spec
  }
}

class EOFToken extends Token {}

module.exports = {
  Token,
  DoctypeToken,
  StartTagToken,
  EndTagToken,
  CommentToken,
  CharacterToken,
  EOFToken,
};
