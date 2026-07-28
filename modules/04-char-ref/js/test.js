'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { State } = require('./State');
const { Tokenizer, STATE_MODULE_MAP } = require('./Tokenizer');
const { CharacterToken, EOFToken } = require('./Token');

// --- Carried forward, still true ---

test('State enum has exactly 68 states', () => {
  assert.equal(Object.keys(State).length, 68);
});

test('every state has a module hint in STATE_MODULE_MAP', () => {
  for (const value of Object.values(State)) {
    assert.ok(STATE_MODULE_MAP[value] !== undefined);
  }
});

test('plain text still tokenizes correctly (Module 3 behavior intact)', () => {
  const tokens = new Tokenizer('hi').run();
  assert.equal(tokens.length, 3);
  assert.equal(tokens[0].data, 'h');
});

// --- New in Module 4: named references ---

test('a named reference with a semicolon decodes correctly', () => {
  const tokens = new Tokenizer('&amp;').run();
  assert.equal(tokens.length, 2);
  assert.equal(tokens[0].data, '&');
  assert.ok(tokens[1] instanceof EOFToken);
});

test('a legacy named reference without a semicolon still decodes, with a parse error', () => {
  const tokenizer = new Tokenizer('&amp b');
  const tokens = tokenizer.run();
  assert.equal(tokens.map((t) => t.data ?? '').join(''), '& b');
  assert.ok(tokenizer.parseErrors.some((e) => e.description === 'missing-semicolon-after-character-reference'));
});

test('an unrecognized name is not a reference at all -- & and the letters are all literal', () => {
  const tokens = new Tokenizer('&xyz;').run();
  assert.equal(tokens.map((t) => t.data ?? '').join(''), '&xyz;');
});

test('an unmatched named reference falls back to literal characters', () => {
  const tokens = new Tokenizer('&notit;').run();
  assert.equal(tokens.map((t) => t.data ?? '').join(''), '&notit;');
});

// --- New in Module 4: numeric references ---

test('a decimal numeric reference decodes correctly', () => {
  const tokens = new Tokenizer('&#65;').run();
  assert.equal(tokens[0].data, 'A');
});

test('a hex numeric reference decodes correctly (upper or lower x)', () => {
  assert.equal(new Tokenizer('&#x41;').run()[0].data, 'A');
  assert.equal(new Tokenizer('&#X41;').run()[0].data, 'A');
});

test('a numeric reference missing its semicolon still decodes, with a parse error', () => {
  const tokenizer = new Tokenizer('&#65b');
  const tokens = tokenizer.run();
  assert.equal(tokens.map((t) => t.data ?? '').join(''), 'Ab');
  assert.ok(tokenizer.parseErrors.some((e) => e.description === 'missing-semicolon-after-character-reference'));
});

test('a numeric reference with no digits at all is not a reference -- backtracks fully', () => {
  const tokenizer = new Tokenizer('&#;');
  const tokens = tokenizer.run();
  assert.equal(tokens.map((t) => t.data ?? '').join(''), '&#;');
  assert.ok(tokenizer.parseErrors.some((e) => e.description === 'absence-of-digits-in-numeric-character-reference'));
});

test('&#0; is a parse error and becomes U+FFFD, not a literal NUL', () => {
  const tokenizer = new Tokenizer('&#0;');
  const tokens = tokenizer.run();
  assert.equal(tokens[0].data, '�');
  assert.ok(tokenizer.parseErrors.some((e) => e.description === 'null-character-reference'));
});

test('a codepoint beyond U+10FFFF becomes U+FFFD', () => {
  const tokenizer = new Tokenizer('&#1114112;'); // 0x110000, one past the max
  const tokens = tokenizer.run();
  assert.equal(tokens[0].data, '�');
  assert.ok(tokenizer.parseErrors.some((e) => e.description === 'character-reference-outside-unicode-range'));
});

test('a surrogate codepoint becomes U+FFFD', () => {
  const tokenizer = new Tokenizer('&#55296;'); // 0xD800
  const tokens = tokenizer.run();
  assert.equal(tokens[0].data, '�');
  assert.ok(tokenizer.parseErrors.some((e) => e.description === 'surrogate-character-reference'));
});

test('a Windows-1252-range codepoint is substituted via the legacy table', () => {
  const tokenizer = new Tokenizer('&#128;'); // 0x80 -> EURO SIGN
  const tokens = tokenizer.run();
  assert.equal(tokens[0].data, '€');
  assert.ok(tokenizer.parseErrors.some((e) => e.description === 'control-character-reference'));
});

test('an astral numeric reference produces one CharacterToken holding a surrogate pair', () => {
  const tokens = new Tokenizer('&#128512;').run(); // U+1F600 GRINNING FACE
  assert.equal(tokens[0].data.length, 2); // 2 UTF-16 code units
  assert.equal(tokens[0].data, '\u{1F600}');
  assert.equal([...tokens[0].data].length, 1); // but 1 real code point
});

// --- New in Module 4: bail-out conditions ---

test('a bare & at EOF is just a literal character', () => {
  const tokens = new Tokenizer('&').run();
  assert.equal(tokens[0].data, '&');
  assert.ok(tokens[1] instanceof EOFToken);
});

test('& followed by whitespace is not a reference attempt at all', () => {
  const tokens = new Tokenizer('& ').run();
  assert.equal(tokens.map((t) => t.data ?? '').join(''), '& ');
});

// --- CHARACTER_REFERENCE_IN_RCDATA: reachable even though RCDATA itself isn't built yet ---

test('character reference in RCDATA state decodes and returns to RCDATA', () => {
  const tokenizer = new Tokenizer('amp;');
  tokenizer.state = State.CHARACTER_REFERENCE_IN_RCDATA;
  tokenizer.step();
  assert.equal(tokenizer.tokens[0].data, '&');
  assert.equal(tokenizer.state, State.RCDATA);
});
