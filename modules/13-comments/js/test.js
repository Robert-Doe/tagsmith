'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const NUL = String.fromCodePoint(0);

const { State } = require('./State');
const { Tokenizer, STATE_MODULE_MAP } = require('./Tokenizer');
const { CommentToken, CharacterToken, EOFToken } = require('./Token');

function commentData(tokens, i = 0) {
  const comments = tokens.filter((t) => t instanceof CommentToken);
  return comments[i].data;
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

// --- The full round trip, starting from real Data-state markup ---

test('a simple comment tokenizes end to end from real markup', () => {
  const tokens = new Tokenizer('<!--hello-->rest').run();
  assert.ok(tokens[0] instanceof CommentToken);
  assert.equal(tokens[0].data, 'hello');
  assert.ok(tokens[1] instanceof CharacterToken);
  assert.equal(tokens[1].data, 'r');
});

test('an empty comment works', () => {
  const tokens = new Tokenizer('<!---->rest').run();
  assert.equal(commentData(tokens), '');
});

// --- Abrupt closes ---

test('<!--> is an abrupt-closing-of-empty-comment', () => {
  const t = new Tokenizer('<!-->rest');
  const tokens = t.run();
  assert.equal(commentData(tokens), '');
  assert.ok(t.parseErrors.some((e) => e.description === 'abrupt-closing-of-empty-comment'));
});

test('<!---> is ALSO an abrupt-closing-of-empty-comment (one dash short)', () => {
  const t = new Tokenizer('<!--->rest');
  const tokens = t.run();
  assert.equal(commentData(tokens), '');
  assert.ok(t.parseErrors.some((e) => e.description === 'abrupt-closing-of-empty-comment'));
});

// --- Extra dashes before the real close ---

test('extra dashes right before the close become part of the data', () => {
  // "<!--hi---->": the LAST two dashes + '>' are the real close; the
  // first two of the four trailing dashes are "given back" as data.
  const tokens = new Tokenizer('<!--hi---->rest').run();
  assert.equal(commentData(tokens), 'hi--');
});

// --- The legacy "--!>" close ---

test('--!> closes the comment, with a parse error', () => {
  const t = new Tokenizer('<!--hi--!>rest');
  const tokens = t.run();
  assert.equal(commentData(tokens), 'hi');
  assert.ok(t.parseErrors.some((e) => e.description === 'incorrectly-closed-comment'));
});

test('--! NOT followed by > or - gives "--!" back to the data', () => {
  const tokens = new Tokenizer('<!--a--!b-->c').run();
  assert.equal(commentData(tokens), 'a--!b');
});

test('--! followed by another - starts a fresh close attempt (COMMENT_END_DASH)', () => {
  // "a" then "--!-->c": the '-' after '!' does NOT append '-' itself,
  // only the "--!" is given back, and the new dash starts counting again.
  const tokens = new Tokenizer('<!--a--!-->c').run();
  assert.equal(commentData(tokens), 'a--!');
});

// --- NUL and EOF ---

test('NUL inside a comment becomes U+FFFD in the data', () => {
  const tokens = new Tokenizer(`<!--a${NUL}b-->`).run();
  assert.equal(commentData(tokens), 'a�b');
});

test('EOF mid-comment-body emits BOTH the partial comment and an EOF token', () => {
  const tokens = new Tokenizer('<!--unclosed').run();
  assert.equal(tokens.length, 2);
  assert.equal(tokens[0].data, 'unclosed');
  assert.ok(tokens[1] instanceof EOFToken);
});

test('EOF inside comment-end-bang still emits the partial comment', () => {
  const tokens = new Tokenizer('<!--a--!').run();
  assert.equal(tokens.length, 2);
  assert.equal(tokens[0].data, 'a');
  assert.ok(tokens[1] instanceof EOFToken);
});
