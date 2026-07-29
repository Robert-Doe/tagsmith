'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const NUL = String.fromCodePoint(0);

const { State } = require('./State');
const { Tokenizer, STATE_MODULE_MAP } = require('./Tokenizer');
const { DoctypeToken, EOFToken } = require('./Token');

// --- Carried forward ---

test('State enum has exactly 68 states', () => {
  assert.equal(Object.keys(State).length, 68);
});

test('every state has a module hint in STATE_MODULE_MAP', () => {
  for (const value of Object.values(State)) {
    assert.ok(STATE_MODULE_MAP[value] !== undefined);
  }
});

// --- The simple, common case ---

test('a plain <!DOCTYPE html> tokenizes correctly end to end', () => {
  const tokens = new Tokenizer('<!DOCTYPE html>rest').run();
  assert.ok(tokens[0] instanceof DoctypeToken);
  assert.equal(tokens[0].name, 'html');
  assert.equal(tokens[0].publicIdentifier, null);
  assert.equal(tokens[0].systemIdentifier, null);
  assert.equal(tokens[0].forceQuirks, false);
});

test('the doctype name is lowercased regardless of source case', () => {
  const tokens = new Tokenizer('<!DOCTYPE HTML>').run();
  assert.equal(tokens[0].name, 'html');
});

// --- Missing name forces quirks ---

test('<!DOCTYPE > with no name at all forces quirks mode', () => {
  const t = new Tokenizer('<!DOCTYPE >');
  const tokens = t.run();
  assert.equal(tokens[0].name, null);
  assert.equal(tokens[0].forceQuirks, true);
  assert.ok(t.parseErrors.some((e) => e.description === 'missing-doctype-name'));
});

// --- PUBLIC and SYSTEM identifiers ---

test('PUBLIC with both a public and a system identifier', () => {
  const tokens = new Tokenizer(
    '<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">'
  ).run();
  assert.equal(tokens[0].name, 'html');
  assert.equal(tokens[0].publicIdentifier, '-//W3C//DTD HTML 4.01//EN');
  assert.equal(tokens[0].systemIdentifier, 'http://www.w3.org/TR/html4/strict.dtd');
  assert.equal(tokens[0].forceQuirks, false);
});

test('PUBLIC with only a public identifier leaves systemIdentifier missing (null)', () => {
  const tokens = new Tokenizer('<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN">').run();
  assert.equal(tokens[0].publicIdentifier, '-//W3C//DTD HTML 4.01//EN');
  assert.equal(tokens[0].systemIdentifier, null);
  assert.equal(tokens[0].forceQuirks, false);
});

test('SYSTEM with only a system identifier leaves publicIdentifier missing (null)', () => {
  const tokens = new Tokenizer('<!DOCTYPE html SYSTEM "about:legacy-compat">').run();
  assert.equal(tokens[0].systemIdentifier, 'about:legacy-compat');
  assert.equal(tokens[0].publicIdentifier, null);
});

test('PUBLIC and SYSTEM keywords match case-insensitively', () => {
  const t1 = new Tokenizer('<!DOCTYPE html public "x">').run();
  assert.equal(t1[0].publicIdentifier, 'x');
  const t2 = new Tokenizer('<!DOCTYPE html System "y">').run();
  assert.equal(t2[0].systemIdentifier, 'y');
});

// --- NUL handling ---

test('NUL in the doctype name becomes U+FFFD in the name', () => {
  const tokens = new Tokenizer(`<!DOCTYPE h${NUL}tml>`).run();
  assert.equal(tokens[0].name, 'h�tml');
});

// --- Malformed doctypes force quirks and fall to Bogus DOCTYPE ---

test('an unrecognized keyword after the name forces quirks and is otherwise ignored', () => {
  const t = new Tokenizer('<!DOCTYPE html FOO extra stuff>rest');
  const tokens = t.run();
  assert.equal(tokens[0].name, 'html');
  assert.equal(tokens[0].forceQuirks, true);
  assert.ok(t.parseErrors.some((e) => e.description === 'invalid-character-sequence-after-doctype-name'));
});

test('a missing quote after PUBLIC forces quirks and discards everything until >', () => {
  const t = new Tokenizer('<!DOCTYPE html PUBLIC x>rest');
  const tokens = t.run();
  assert.equal(tokens[0].forceQuirks, true);
  assert.equal(tokens[0].publicIdentifier, null);
});

// --- The one exception: trailing garbage after a COMPLETE system identifier does NOT force quirks ---

test('trailing garbage after a complete system identifier does not force quirks', () => {
  const t = new Tokenizer('<!DOCTYPE html SYSTEM "x" extra>rest');
  const tokens = t.run();
  assert.equal(tokens[0].systemIdentifier, 'x');
  assert.equal(tokens[0].forceQuirks, false);
  assert.ok(t.parseErrors.some((e) => e.description === 'unexpected-character-after-doctype-system-identifier'));
});

// --- EOF discards nothing -- always emits a (force-quirks) doctype plus EOF ---

test('EOF mid-doctype emits a force-quirks doctype token AND an EOF token', () => {
  const tokens = new Tokenizer('<!DOCTYPE html').run();
  assert.equal(tokens.length, 2);
  assert.equal(tokens[0].name, 'html');
  assert.equal(tokens[0].forceQuirks, true);
  assert.ok(tokens[1] instanceof EOFToken);
});
