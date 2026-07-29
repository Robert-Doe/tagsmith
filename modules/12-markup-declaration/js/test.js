'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const NUL = String.fromCodePoint(0);

const { State } = require('./State');
const { Tokenizer, NotImplementedError, STATE_MODULE_MAP } = require('./Tokenizer');
const { CommentToken, EOFToken } = require('./Token');

// --- Carried forward ---

test('State enum has exactly 68 states', () => {
  assert.equal(Object.keys(State).length, 68);
});

test('every state has a module hint in STATE_MODULE_MAP', () => {
  for (const value of Object.values(State)) {
    assert.ok(STATE_MODULE_MAP[value] !== undefined);
  }
});

// --- The three recognized lookaheads ---

test('<!-- consumes both dashes, starts a comment token, and hands off to Module 13', () => {
  const t = new Tokenizer('<!--x');
  assert.throws(() => t.run(), (err) => {
    assert.ok(err instanceof NotImplementedError);
    assert.equal(err.moduleNumber, 13);
    return true;
  });
  assert.ok(t.currentToken instanceof CommentToken);
  assert.equal(t.currentToken.data, '');
  assert.equal(t.state, State.COMMENT_START);
});

test('<!DOCTYPE hands off to Module 14, case-insensitively', () => {
  for (const spelling of ['DOCTYPE', 'doctype', 'DocType']) {
    const t = new Tokenizer(`<!${spelling} html>`);
    assert.throws(() => t.run(), (err) => {
      assert.equal(err.moduleNumber, 14);
      return true;
    });
    assert.equal(t.state, State.DOCTYPE);
  }
});

test('<![CDATA[ hands off to Module 15', () => {
  const t = new Tokenizer('<![CDATA[x]]>');
  assert.throws(() => t.run(), (err) => {
    assert.equal(err.moduleNumber, 15);
    return true;
  });
  assert.equal(t.state, State.CDATA_SECTION);
});

// --- Bogus comment: the fallback for everything else ---

test('an unrecognized <! declaration becomes a bogus comment', () => {
  const tokens = new Tokenizer('<!weird>rest').run();
  assert.ok(tokens[0] instanceof CommentToken);
  assert.equal(tokens[0].data, 'weird');
});

test('a bogus comment reports incorrectly-opened-comment', () => {
  const t = new Tokenizer('<!weird>');
  t.run();
  assert.ok(t.parseErrors.some((e) => e.description === 'incorrectly-opened-comment'));
});

test('<? routes through Tag Open (Module 9) into a bogus comment here', () => {
  const tokens = new Tokenizer('<?xml version="1.0"?>rest').run();
  assert.ok(tokens[0] instanceof CommentToken);
  // The '?' itself is reconsumed by Tag Open's '?' branch (Module 9), so
  // it's the FIRST character of the bogus comment's data, not discarded.
  assert.equal(tokens[0].data, '?xml version="1.0"?');
});

test('</9 (invalid end tag start) also becomes a bogus comment', () => {
  const tokens = new Tokenizer('</9text>rest').run();
  assert.ok(tokens[0] instanceof CommentToken);
  assert.equal(tokens[0].data, '9text');
});

test('NUL inside a bogus comment becomes U+FFFD in the data', () => {
  const tokens = new Tokenizer(`<!a${NUL}b>`).run();
  assert.equal(tokens[0].data, 'a�b');
});

test('EOF inside a bogus comment emits BOTH the comment and an EOF token', () => {
  const t = new Tokenizer('<!unclosed');
  const tokens = t.run();
  assert.equal(tokens.length, 2);
  assert.ok(tokens[0] instanceof CommentToken);
  assert.equal(tokens[0].data, 'unclosed');
  assert.ok(tokens[1] instanceof EOFToken);
});

// --- Full round trip through Data state ---

test('a bogus comment inside a real document tokenizes correctly end to end', () => {
  const tokens = new Tokenizer('hi<?xml?>there').run();
  assert.equal(tokens[0].data, 'h');
  assert.ok(tokens[2] instanceof CommentToken);
  assert.equal(tokens[2].data, '?xml?');
});
