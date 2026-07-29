'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const NUL = String.fromCodePoint(0);

const { State } = require('./State');
const { Tokenizer, STATE_MODULE_MAP } = require('./Tokenizer');
const { EOFToken } = require('./Token');

function dataOf(tokens) {
  return tokens.map((t) => t.data ?? '').join('');
}

// --- Carried forward ---

test('State enum has exactly 68 states', () => {
  assert.equal(Object.keys(State).length, 68);
});

test('every state has a module hint in STATE_MODULE_MAP', () => {
  for (const value of Object.values(State)) {
    assert.ok(STATE_MODULE_MAP[value] !== undefined);
  }
});

// --- The full nested round trip: single-escaped -> double-escaped -> single-escaped -> plain ---

test('a full nested <script>...</script> inside a hidden comment round-trips completely', () => {
  const t = new Tokenizer('<script>x</script>-->rest');
  t.state = State.SCRIPT_DATA_ESCAPED;
  const tokens = t.run();
  assert.equal(dataOf(tokens), '<script>x</script>-->rest');
  assert.equal(t.state, State.SCRIPT_DATA);
});

// --- The case-sensitivity quirk ---

test('lowercase "script" enters double-escaped mode', () => {
  const t = new Tokenizer('<script>');
  t.state = State.SCRIPT_DATA_ESCAPED;
  const tokens = t.run();
  assert.equal(dataOf(tokens), '<script>');
  assert.equal(t.state, State.SCRIPT_DATA_DOUBLE_ESCAPED);
});

test('uppercase "SCRIPT" does NOT enter double-escaped mode -- exact case-sensitive match required', () => {
  const t = new Tokenizer('<SCRIPT>');
  t.state = State.SCRIPT_DATA_ESCAPED;
  const tokens = t.run();
  assert.equal(dataOf(tokens), '<SCRIPT>');
  assert.equal(t.state, State.SCRIPT_DATA_ESCAPED); // fell back, did NOT double-escape
});

test('the mirror quirk applies to double-escape-END too', () => {
  const t = new Tokenizer('<script></SCRIPT>');
  t.state = State.SCRIPT_DATA_ESCAPED;
  const tokens = t.run();
  assert.equal(dataOf(tokens), '<script></SCRIPT>');
  // "SCRIPT" (uppercase) doesn't match "script", so we never left double-escaped mode
  assert.equal(t.state, State.SCRIPT_DATA_DOUBLE_ESCAPED);
});

// --- '<' is emitted immediately in double-escaped mode, unlike single-escaped ---

test('a lone < in double-escaped mode is emitted immediately, not deferred', () => {
  const t = new Tokenizer('a<b');
  t.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
  const tokens = t.run();
  assert.equal(dataOf(tokens), 'a<b');
  assert.equal(tokens.length, 4); // a, <, b, EOF -- three real characters
});

// --- NUL and EOF parse errors, same shape as Module 7 ---

test('NUL inside SCRIPT_DATA_DOUBLE_ESCAPED is a parse error but still literal', () => {
  const t = new Tokenizer(`a${NUL}b`);
  t.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
  const tokens = t.run();
  assert.equal(tokens.length, 4);
  assert.ok(t.parseErrors.some((e) => e.description === 'unexpected-null-character'));
});

test('EOF while still inside SCRIPT_DATA_DOUBLE_ESCAPED is a parse error', () => {
  const t = new Tokenizer('');
  t.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
  const tokens = t.run();
  assert.equal(tokens.length, 1);
  assert.ok(tokens[0] instanceof EOFToken);
  assert.ok(t.parseErrors.some((e) => e.description === 'eof-in-script-html-comment-like-text'));
});

// --- "-->" exits ALL the way to plain SCRIPT_DATA, skipping single-escaped entirely ---

test('"-->" from double-escaped mode exits straight to SCRIPT_DATA, not back to single-escaped', () => {
  const t = new Tokenizer('--x-->rest');
  t.state = State.SCRIPT_DATA_DOUBLE_ESCAPED;
  const tokens = t.run();
  assert.equal(dataOf(tokens), '--x-->rest');
  assert.equal(t.state, State.SCRIPT_DATA);
});
