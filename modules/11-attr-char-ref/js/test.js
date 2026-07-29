'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { State } = require('./State');
const { Tokenizer, STATE_MODULE_MAP } = require('./Tokenizer');

function firstAttrValue(tokens) {
  return tokens[0].attributes[0].value;
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

// --- Basic decoding, all three quoting styles ---

test('a named reference with a semicolon decodes inside a double-quoted value', () => {
  const tokens = new Tokenizer('<div a="x&amp;y">').run();
  assert.equal(firstAttrValue(tokens), 'x&y');
});

test('a named reference decodes inside a single-quoted value', () => {
  const tokens = new Tokenizer("<div a='x&amp;y'>").run();
  assert.equal(firstAttrValue(tokens), 'x&y');
});

test('a named reference decodes inside an unquoted value, and the tag still closes correctly', () => {
  const tokens = new Tokenizer('<div a=x&amp;y>').run();
  assert.equal(tokens[0].tagName, 'div');
  assert.equal(firstAttrValue(tokens), 'x&y');
});

test('a numeric reference decodes normally in an attribute value (ambiguous-ampersand only applies to named refs)', () => {
  const tokens = new Tokenizer('<div a="x&#65;y">').run();
  assert.equal(firstAttrValue(tokens), 'xAy');
});

// --- The ambiguous ampersand exception: THE new behavior this module adds ---

test('a legacy no-semicolon match followed by = is ambiguous -- NOT decoded, unlike Module 4 Data-state behavior', () => {
  const tokens = new Tokenizer('<div a="x&amp=y">').run();
  assert.equal(firstAttrValue(tokens), 'x&amp=y'); // fully literal, untouched
});

test('a legacy no-semicolon match followed by an alphanumeric is also ambiguous', () => {
  const tokens = new Tokenizer('<div a="x&amp1y">').run();
  assert.equal(firstAttrValue(tokens), 'x&amp1y');
});

test('a legacy no-semicolon match followed by something else entirely still decodes normally', () => {
  const tokens = new Tokenizer('<div a="x&amp y">').run();
  // "amp" matches (no ';'), followed by a space -- not '=' or alphanumeric,
  // so this is NOT ambiguous and decodes exactly like Module 4's Data state.
  assert.equal(firstAttrValue(tokens), 'x& y');
});

// --- '&' immediately followed by the closing quote is just literal ---

test('& immediately before the closing quote is literal, not a reference attempt', () => {
  const tokens = new Tokenizer('<div a="x&">').run();
  assert.equal(firstAttrValue(tokens), 'x&');
});

// --- Regression: Module 4's Data-state behavior must be completely unaffected ---

test('Data state character reference decoding is unchanged by this module', () => {
  const t = new Tokenizer('&amp b'); // the exact Module 4 test case
  const tokens = t.run();
  assert.equal(tokens.map((tok) => tok.data ?? '').join(''), '& b');
});
