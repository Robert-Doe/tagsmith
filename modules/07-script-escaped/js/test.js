'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const NUL = String.fromCodePoint(0);

const { State } = require('./State');
const { Tokenizer, NotImplementedError, STATE_MODULE_MAP } = require('./Tokenizer');
const { EndTagToken, EOFToken } = require('./Token');

function dataOf(tokens) {
  return tokens.map((t) => (t instanceof EndTagToken ? `</${t.tagName}>` : t.data ?? '')).join('');
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

test('script data base states from Module 6 still work unchanged', () => {
  const t = new Tokenizer('a<b');
  t.state = State.SCRIPT_DATA;
  assert.equal(dataOf(t.run()), 'a<b');
});

// --- Entering and abandoning the escape opener ---

test('escape-start with no dash bails out to plain script data, nothing emitted here', () => {
  const t = new Tokenizer('abc');
  t.state = State.SCRIPT_DATA_ESCAPE_START;
  const tokens = t.run();
  assert.equal(dataOf(tokens), 'abc');
});

test('escape-start-dash with only one dash bails out, but the dash was already emitted', () => {
  const t = new Tokenizer('-x');
  t.state = State.SCRIPT_DATA_ESCAPE_START;
  const tokens = t.run();
  assert.equal(dataOf(tokens), '-x');
});

// --- Full round trip through a real hidden comment ---

test('a full "--comment-->" round trip emits every character and exits to SCRIPT_DATA', () => {
  const t = new Tokenizer('--comment-->rest');
  t.state = State.SCRIPT_DATA_ESCAPE_START;
  const tokens = t.run();
  assert.equal(dataOf(tokens), '--comment-->rest');
  assert.equal(t.state, State.SCRIPT_DATA);
});

// --- NUL handling breaks dash runs but keeps tokenizing ---

test('NUL inside SCRIPT_DATA_ESCAPED is a parse error but still literal', () => {
  const t = new Tokenizer(`a${NUL}b`);
  t.state = State.SCRIPT_DATA_ESCAPED;
  const tokens = t.run();
  assert.equal(tokens.length, 4);
  assert.ok(t.parseErrors.some((e) => e.description === 'unexpected-null-character'));
});

test('NUL inside SCRIPT_DATA_ESCAPED_DASH breaks the dash run and returns to ESCAPED', () => {
  const t = new Tokenizer(`${NUL}x`);
  t.state = State.SCRIPT_DATA_ESCAPED_DASH;
  t.run();
  assert.equal(t.state, State.SCRIPT_DATA_ESCAPED);
});

// --- EOF inside a hidden comment is its own parse error ---

test('EOF while still inside SCRIPT_DATA_ESCAPED is a parse error', () => {
  const t = new Tokenizer('');
  t.state = State.SCRIPT_DATA_ESCAPED;
  const tokens = t.run();
  assert.equal(tokens.length, 1);
  assert.ok(tokens[0] instanceof EOFToken);
  assert.ok(t.parseErrors.some((e) => e.description === 'eof-in-script-html-comment-like-text'));
});

// --- The end-tag chain works from inside escaped mode too ---

test('a matching end tag closes even from deep inside escaped mode, landing in DATA', () => {
  const t = new Tokenizer('text</script>after');
  t.state = State.SCRIPT_DATA_ESCAPED;
  t.lastStartTagName = 'script';
  const tokens = t.run();
  assert.equal(dataOf(tokens), 'text</script>after');
  assert.ok(tokens.some((tok) => tok instanceof EndTagToken && tok.tagName === 'script'));
  assert.equal(t.state, State.DATA);
});

test('a non-matching end tag falls back to SCRIPT_DATA_ESCAPED, not plain SCRIPT_DATA', () => {
  const t = new Tokenizer('text</style>after');
  t.state = State.SCRIPT_DATA_ESCAPED;
  t.lastStartTagName = 'script';
  const tokens = t.run();
  assert.equal(dataOf(tokens), 'text</style>after');
  // EOF was reached still inside escaped mode -- proof the fallback landed
  // in ESCAPED, not SCRIPT_DATA (which would NOT report this parse error).
  assert.ok(t.parseErrors.some((e) => e.description === 'eof-in-script-html-comment-like-text'));
});

// --- The seam into Module 8 ---

test('a nested "<script" inside escaped mode hands off to SCRIPT_DATA_DOUBLE_ESCAPE_START', () => {
  const t = new Tokenizer('<script>');
  t.state = State.SCRIPT_DATA_ESCAPED;
  assert.throws(
    () => t.run(),
    (err) => {
      assert.ok(err instanceof NotImplementedError);
      assert.equal(err.moduleNumber, 8);
      return true;
    }
  );
  assert.equal(dataOf(t.tokens), '<');
  assert.equal(t.state, State.SCRIPT_DATA_DOUBLE_ESCAPE_START);
});
