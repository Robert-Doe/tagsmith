'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { State } = require('./State');
const { Tokenizer, NotImplementedError, STATE_MODULE_MAP } = require('./Tokenizer');
const { preprocess } = require('./Preprocess');
const {
  DoctypeToken,
  StartTagToken,
  EndTagToken,
  CommentToken,
  CharacterToken,
  EOFToken,
} = require('./Token');

test('CRLF pairs become a single LF', () => {
  assert.equal(preprocess('a\r\nb'), 'a\nb');
});

test('lone CR (no following LF) becomes LF', () => {
  assert.equal(preprocess('a\rb'), 'a\nb');
});

test('a run of CRLF, CRLF, CR, LF all normalize correctly', () => {
  assert.equal(preprocess('a\r\n\r\n\r\nb'), 'a\n\n\nb');
  assert.equal(preprocess('x\ry\r\nz\n'), 'x\ny\nz\n');
});

test('input with no CR is untouched', () => {
  assert.equal(preprocess('plain\ntext'), 'plain\ntext');
});

test('the Tokenizer preprocesses input before tokenizing (EOF still reached correctly)', () => {
  const tokenizer = new Tokenizer('\r\n');
  assert.throws(
    () => tokenizer.run(),
    (err) => {
      // '\r\n' preprocesses to a single '\n', consumed as one Data-state
      // character, hitting the same unimplemented character-emission branch
      // as any other single non-&,< character.
      assert.equal(err.moduleNumber, 3);
      return true;
    }
  );
});

test('State enum has exactly 68 states', () => {
  assert.equal(Object.keys(State).length, 68);
});

test('every state has a module hint in STATE_MODULE_MAP', () => {
  for (const value of Object.values(State)) {
    assert.ok(
      STATE_MODULE_MAP[value] !== undefined,
      `state "${value}" has no module mapping`
    );
  }
});

test('empty input immediately produces exactly one EOF token', () => {
  const tokenizer = new Tokenizer('');
  const tokens = tokenizer.run();
  assert.equal(tokens.length, 1);
  assert.ok(tokens[0] instanceof EOFToken);
});

test('a plain character throws NotImplementedError pointing at Module 3', () => {
  const tokenizer = new Tokenizer('a');
  assert.throws(
    () => tokenizer.run(),
    (err) => {
      assert.ok(err instanceof NotImplementedError);
      assert.equal(err.moduleNumber, 3);
      return true;
    }
  );
});

test('an ampersand throws NotImplementedError pointing at Module 4', () => {
  const tokenizer = new Tokenizer('&amp;');
  assert.throws(
    () => tokenizer.run(),
    (err) => {
      assert.equal(err.moduleNumber, 4);
      return true;
    }
  );
});

test('a less-than sign throws NotImplementedError pointing at Module 9', () => {
  const tokenizer = new Tokenizer('<div>');
  assert.throws(
    () => tokenizer.run(),
    (err) => {
      assert.equal(err.moduleNumber, 9);
      return true;
    }
  );
});

test('a non-DATA state throws NotImplementedError naming its own module', () => {
  const tokenizer = new Tokenizer('');
  tokenizer.state = State.COMMENT_START; // force a state module 1 doesn't own
  assert.throws(
    () => tokenizer.step(),
    (err) => {
      assert.ok(err instanceof NotImplementedError);
      assert.equal(err.stateName, State.COMMENT_START);
      assert.equal(err.moduleNumber, 13);
      return true;
    }
  );
});

test('every token class can be constructed and holds its spec-defined fields', () => {
  const doctype = new DoctypeToken();
  assert.equal(doctype.name, null, 'DOCTYPE name starts "missing", not empty string');
  assert.equal(doctype.publicIdentifier, null);
  assert.equal(doctype.systemIdentifier, null);
  assert.equal(doctype.forceQuirks, false);

  const start = new StartTagToken();
  start.tagName = 'div';
  assert.equal(start.tagName, 'div');
  assert.deepEqual(start.attributes, []);
  assert.equal(start.selfClosing, false);

  const end = new EndTagToken();
  assert.ok(end instanceof EndTagToken);

  const comment = new CommentToken();
  assert.equal(comment.data, '');

  const char = new CharacterToken('x');
  assert.equal(char.data, 'x');

  const eof = new EOFToken();
  assert.ok(eof instanceof EOFToken);
});
