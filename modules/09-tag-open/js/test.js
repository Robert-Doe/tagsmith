'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const NUL = String.fromCodePoint(0);

const { State } = require('./State');
const { Tokenizer, NotImplementedError, STATE_MODULE_MAP } = require('./Tokenizer');
const { StartTagToken, EndTagToken, CharacterToken, EOFToken } = require('./Token');

// --- Carried forward ---

test('State enum has exactly 68 states', () => {
  assert.equal(Object.keys(State).length, 68);
});

test('every state has a module hint in STATE_MODULE_MAP', () => {
  for (const value of Object.values(State)) {
    assert.ok(STATE_MODULE_MAP[value] !== undefined);
  }
});

// --- Basic start/end tags, driven from plain Data state ---

test('a simple start tag produces a real StartTagToken', () => {
  const t = new Tokenizer('<div>');
  const tokens = t.run();
  assert.equal(tokens.length, 2);
  assert.ok(tokens[0] instanceof StartTagToken);
  assert.equal(tokens[0].tagName, 'div');
  assert.ok(tokens[1] instanceof EOFToken);
});

test('a simple end tag produces a real EndTagToken', () => {
  const t = new Tokenizer('</div>');
  const tokens = t.run();
  assert.ok(tokens[0] instanceof EndTagToken);
  assert.equal(tokens[0].tagName, 'div');
});

test('tag names are lowercased regardless of source case', () => {
  const t = new Tokenizer('<DIV>');
  const tokens = t.run();
  assert.equal(tokens[0].tagName, 'div');
});

test('a full sentence with a tag in the middle tokenizes end to end', () => {
  const t = new Tokenizer('hi<div>there');
  const tokens = t.run();
  // h, i, <div>, t, h, e, r, e, EOF
  assert.equal(tokens.length, 9);
  assert.equal(tokens[0].data, 'h');
  assert.equal(tokens[1].data, 'i');
  assert.ok(tokens[2] instanceof StartTagToken);
  assert.equal(tokens[2].tagName, 'div');
  assert.equal(tokens[3].data, 't');
  assert.ok(tokens[8] instanceof EOFToken);
});

test('lastStartTagName is updated when a start tag is emitted, not for end tags', () => {
  const t = new Tokenizer('<div>');
  t.run();
  assert.equal(t.lastStartTagName, 'div');
  const t2 = new Tokenizer('</span>');
  t2.run();
  assert.equal(t2.lastStartTagName, null);
});

// --- NUL and EOF inside a tag name ---

test('NUL inside a tag name is replaced with U+FFFD IN THE NAME, not a separate token', () => {
  const t = new Tokenizer(`<a${NUL}b>`);
  const tokens = t.run();
  assert.equal(tokens.length, 2); // just the tag + EOF, no stray character tokens
  assert.equal(tokens[0].tagName, 'a�b');
});

test('EOF mid-tag-name discards the half-built tag -- only EOF is emitted', () => {
  const t = new Tokenizer('<di');
  const tokens = t.run();
  assert.equal(tokens.length, 1);
  assert.ok(tokens[0] instanceof EOFToken);
  assert.ok(t.parseErrors.some((e) => e.description === 'eof-in-tag'));
});

// --- End tag open edge cases ---

test('</> with no name at all emits nothing, just a parse error', () => {
  const t = new Tokenizer('</>rest');
  const tokens = t.run();
  assert.ok(!tokens.some((tok) => tok instanceof EndTagToken));
  assert.ok(t.parseErrors.some((e) => e.description === 'missing-end-tag-name'));
});

test('</ at EOF emits literal < and / characters, then EOF', () => {
  const t = new Tokenizer('</');
  const tokens = t.run();
  assert.equal(tokens.length, 3);
  assert.equal(tokens[0].data, '<');
  assert.equal(tokens[1].data, '/');
  assert.ok(tokens[2] instanceof EOFToken);
});

// --- Seams into Modules 10 and 12 ---

test('a space after a tag name hands off to BEFORE_ATTRIBUTE_NAME (Module 10)', () => {
  const t = new Tokenizer('<div class>');
  assert.throws(() => t.run(), (err) => {
    assert.ok(err instanceof NotImplementedError);
    assert.equal(err.moduleNumber, 10);
    return true;
  });
});

test('a / after a tag name hands off to SELF_CLOSING_START_TAG (Module 10)', () => {
  const t = new Tokenizer('<br/>');
  assert.throws(() => t.run(), (err) => {
    assert.equal(err.moduleNumber, 10);
    return true;
  });
});

test('<! hands off to MARKUP_DECLARATION_OPEN (Module 12)', () => {
  const t = new Tokenizer('<!DOCTYPE html>');
  assert.throws(() => t.run(), (err) => {
    assert.equal(err.moduleNumber, 12);
    return true;
  });
});

test('<? hands off to BOGUS_COMMENT (Module 12)', () => {
  const t = new Tokenizer('<?xml');
  assert.throws(() => t.run(), (err) => {
    assert.equal(err.moduleNumber, 12);
    return true;
  });
});

// --- The architectural point: the tokenizer alone never enters RCDATA ---

test('the tokenizer does NOT auto-switch to RCDATA for <textarea> -- that is tree construction\'s job', () => {
  const t = new Tokenizer('<textarea>x</textarea>');
  const tokens = t.run();
  // If this were auto-switching to RCDATA, we'd see 1 StartTag + 1
  // Character('x') + 1 EndTag. Since it does NOT, "x" is still just an
  // ordinary Data-state character -- proving no RCDATA logic ran at all.
  assert.equal(tokens.length, 4);
  assert.ok(tokens[0] instanceof StartTagToken);
  assert.equal(tokens[0].tagName, 'textarea');
  assert.ok(tokens[1] instanceof CharacterToken);
  assert.equal(tokens[1].data, 'x');
  assert.ok(tokens[2] instanceof EndTagToken);
  assert.equal(tokens[2].tagName, 'textarea');
  assert.ok(tokens[3] instanceof EOFToken);
});

test('without tree construction, a nested tag inside would-be RCDATA content overwrites lastStartTagName', () => {
  const t = new Tokenizer('<textarea><b></textarea>');
  t.run();
  // <b> is tokenized as a REAL start tag (since the tokenizer never
  // entered RCDATA), so it overwrites lastStartTagName -- exactly the
  // corruption a real browser avoids by switching state before this
  // content is ever reached.
  assert.equal(t.lastStartTagName, 'b');
});
