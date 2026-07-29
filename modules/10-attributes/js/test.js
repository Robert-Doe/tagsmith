'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const NUL = String.fromCodePoint(0);

const { State } = require('./State');
const { Tokenizer, NotImplementedError, STATE_MODULE_MAP } = require('./Tokenizer');
const { StartTagToken, EOFToken } = require('./Token');

// --- Carried forward ---

test('State enum has exactly 68 states', () => {
  assert.equal(Object.keys(State).length, 68);
});

test('every state has a module hint in STATE_MODULE_MAP', () => {
  for (const value of Object.values(State)) {
    assert.ok(STATE_MODULE_MAP[value] !== undefined);
  }
});

test('a plain tag with no attributes still works', () => {
  const t = new Tokenizer('<div>');
  const tokens = t.run();
  assert.ok(tokens[0] instanceof StartTagToken);
  assert.deepEqual(tokens[0].attributes, []);
});

// --- The three quoting styles ---

test('a double-quoted attribute value parses correctly', () => {
  const tokens = new Tokenizer('<div class="x">').run();
  assert.deepEqual(tokens[0].attributes, [{ name: 'class', value: 'x' }]);
});

test('a single-quoted attribute value parses correctly', () => {
  const tokens = new Tokenizer("<div class='x'>").run();
  assert.deepEqual(tokens[0].attributes, [{ name: 'class', value: 'x' }]);
});

test('an unquoted attribute value parses correctly', () => {
  const tokens = new Tokenizer('<div class=x>').run();
  assert.deepEqual(tokens[0].attributes, [{ name: 'class', value: 'x' }]);
});

test('a boolean attribute (no value at all) gets an empty string value', () => {
  const tokens = new Tokenizer('<div disabled>').run();
  assert.deepEqual(tokens[0].attributes, [{ name: 'disabled', value: '' }]);
});

test('multiple attributes are collected in order', () => {
  const tokens = new Tokenizer('<div a="1" b="2" c="3">').run();
  assert.deepEqual(tokens[0].attributes, [
    { name: 'a', value: '1' },
    { name: 'b', value: '2' },
    { name: 'c', value: '3' },
  ]);
});

// --- The duplicate-attribute rule (Module 1's data-structure decision, finally exercised) ---

test('a duplicate attribute name is dropped -- first occurrence wins', () => {
  const t = new Tokenizer('<div a="1" a="2">');
  const tokens = t.run();
  assert.deepEqual(tokens[0].attributes, [{ name: 'a', value: '1' }]);
  assert.ok(t.parseErrors.some((e) => e.description === 'duplicate-attribute'));
});

// --- Self-closing tags ---

test('a self-closing tag sets selfClosing and still emits correctly', () => {
  const tokens = new Tokenizer('<br/>').run();
  assert.equal(tokens[0].tagName, 'br');
  assert.equal(tokens[0].selfClosing, true);
});

test('a self-closing tag with an attribute works too', () => {
  const tokens = new Tokenizer('<input type="text"/>').run();
  assert.equal(tokens[0].selfClosing, true);
  assert.deepEqual(tokens[0].attributes, [{ name: 'type', value: 'text' }]);
});

// --- NUL handling: replaced IN the name/value, not a separate token ---

test('NUL in an attribute name becomes U+FFFD in the name', () => {
  const tokens = new Tokenizer(`<div a${NUL}b="1">`).run();
  assert.equal(tokens[0].attributes[0].name, 'a�b');
});

test('NUL in an attribute value becomes U+FFFD in the value', () => {
  const tokens = new Tokenizer(`<div a="1${NUL}2">`).run();
  assert.equal(tokens[0].attributes[0].value, '1�2');
});

// --- EOF discards the whole tag, at any point in attribute parsing ---

test('EOF mid-attribute-value discards the entire tag token', () => {
  const t = new Tokenizer('<div a="1');
  const tokens = t.run();
  assert.equal(tokens.length, 1);
  assert.ok(tokens[0] instanceof EOFToken);
});

// --- Recoverable parse errors ---

test('missing whitespace between attributes is a parse error but still parses both', () => {
  const t = new Tokenizer('<div a="1"b="2">');
  const tokens = t.run();
  assert.deepEqual(tokens[0].attributes, [
    { name: 'a', value: '1' },
    { name: 'b', value: '2' },
  ]);
  assert.ok(t.parseErrors.some((e) => e.description === 'missing-whitespace-between-attributes'));
});

test('a bare = before any attribute name is a parse error but still parses', () => {
  const t = new Tokenizer('<div =x>');
  const tokens = t.run();
  assert.equal(tokens[0].attributes[0].name, '=x');
  assert.ok(t.parseErrors.some((e) => e.description === 'unexpected-equals-sign-before-attribute-name'));
});

test('class= with no value at all is a parse error but still emits the tag', () => {
  const t = new Tokenizer('<div class=>');
  const tokens = t.run();
  assert.ok(tokens[0] instanceof StartTagToken);
  assert.deepEqual(tokens[0].attributes, [{ name: 'class', value: '' }]);
  assert.ok(t.parseErrors.some((e) => e.description === 'missing-attribute-value'));
});

// --- The seam into Module 11 ---

test('an & inside a quoted attribute value hands off to Module 11', () => {
  const t = new Tokenizer('<div a="x&amp;y">');
  assert.throws(() => t.run(), (err) => {
    assert.ok(err instanceof NotImplementedError);
    assert.equal(err.moduleNumber, 11);
    return true;
  });
});
