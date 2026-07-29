'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { State } = require('./State');
const { Tokenizer, NotImplementedError, STATE_MODULE_MAP } = require('./Tokenizer');
const { DoctypeToken, StartTagToken, EndTagToken, CommentToken, CharacterToken, EOFToken } = require('./Token');

function structural(tokens) {
  return tokens.filter((t) => !(t instanceof CharacterToken));
}

function textOf(tokens) {
  return tokens.filter((t) => t instanceof CharacterToken).map((t) => t.data).join('');
}

// --- Carried forward: the machine is still complete ---

test('State enum has exactly 68 states', () => {
  assert.equal(Object.keys(State).length, 68);
});

test('every state has a module hint in STATE_MODULE_MAP', () => {
  for (const value of Object.values(State)) {
    assert.ok(STATE_MODULE_MAP[value] !== undefined);
  }
});

test('every one of the 68 states is dispatchable -- none still throws NotImplementedError', () => {
  for (const stateName of Object.keys(State)) {
    const t = new Tokenizer('x');
    t.state = State[stateName];
    t.currentToken = new DoctypeToken();
    t.currentToken.tagName = '';
    t.currentToken.attributes = [];
    t.currentToken.data = '';
    t.currentAttribute = { name: '', value: '' };
    try {
      t.step();
    } catch (e) {
      assert.ok(!(e instanceof NotImplementedError), `${stateName} still throws NotImplementedError`);
    }
  }
});

// --- The capstone: a complete, realistic HTML document, one continuous run ---

const REALISTIC_PAGE =
  '<!DOCTYPE html>' +
  '<!-- page header -->' +
  '<html lang="en">' +
  '<head><meta charset="utf-8"><title>Test &amp; Page</title></head>' +
  '<body>' +
  '<div class="main" data-id="42">' +
  '<p>Hello &amp; welcome, &lt;friend&gt;!</p>' +
  '<br/>' +
  '<img src="x.png" alt="An image">' +
  '</div>' +
  '</body>' +
  '</html>';

test('a complete, realistic HTML page tokenizes with zero parse errors', () => {
  const t = new Tokenizer(REALISTIC_PAGE);
  t.run();
  assert.equal(t.parseErrors.length, 0);
});

test('the realistic page produces the exact expected structural token sequence', () => {
  const tokens = new Tokenizer(REALISTIC_PAGE).run();
  const struct = structural(tokens);
  const shape = struct.map((t) => {
    if (t instanceof DoctypeToken) return `DOCTYPE:${t.name}`;
    if (t instanceof CommentToken) return `COMMENT:${t.data.trim()}`;
    if (t instanceof StartTagToken) return `<${t.tagName}${t.selfClosing ? '/' : ''}>`;
    if (t instanceof EndTagToken) return `</${t.tagName}>`;
    if (t instanceof EOFToken) return 'EOF';
    return '?';
  });
  assert.deepEqual(shape, [
    'DOCTYPE:html',
    'COMMENT:page header',
    '<html>', '<head>', '<meta>', '<title>', '</title>', '</head>',
    '<body>', '<div>', '<p>', '</p>', '<br/>', '<img>', '</div>', '</body>', '</html>',
    'EOF',
  ]);
});

test('attributes and entities inside the realistic page decode correctly', () => {
  const tokens = new Tokenizer(REALISTIC_PAGE).run();
  const div = structural(tokens).find((t) => t instanceof StartTagToken && t.tagName === 'div');
  assert.deepEqual(div.attributes, [
    { name: 'class', value: 'main' },
    { name: 'data-id', value: '42' },
  ]);
  assert.equal(textOf(tokens).includes('Test & Page'), true);
  assert.equal(textOf(tokens).includes('Hello & welcome, <friend>!'), true);
});

// --- The architectural payoff: WHY tree construction has to exist ---

test('without tree construction, ordinary JS containing "<" corrupts the rest of tokenizing', () => {
  // This is the single clearest, most concrete proof in this whole course
  // of why a browser's tokenizer cannot stand alone -- completely ordinary
  // JavaScript containing a "<" comparison, run through a PURE tokenizer
  // with no tree-construction driver, gets misinterpreted as a tag.
  const src = '<script>if (a<b) { console.log("hi"); }</script>';
  const tokens = new Tokenizer(src).run();
  const struct = structural(tokens);
  assert.ok(struct[0] instanceof StartTagToken);
  assert.equal(struct[0].tagName, 'script');
  // The "<b)" from "a<b) {" is misread as a NEW tag attempt with a
  // garbage name -- exactly the corruption tree construction exists to
  // prevent, by switching to SCRIPT_DATA before this content is reached.
  assert.ok(struct[1] instanceof StartTagToken);
  assert.equal(struct[1].tagName, 'b)');
  // And because that garbage tag never finds a closing '>', EOF discards
  // it entirely (Module 9's rule) -- the real </script> is never even
  // reached as its own token.
  assert.ok(!struct.some((t) => t instanceof EndTagToken && t.tagName === 'script'));
});

// --- A grab-bag of features combined that no single earlier module tested together ---

test('a self-closing tag with a duplicate attribute and an entity in its value, mid-document', () => {
  const tokens = new Tokenizer('<input type="text" value="a&amp;b" type="hidden"/>after').run();
  const input = structural(tokens)[0];
  assert.equal(input.tagName, 'input');
  assert.equal(input.selfClosing, true);
  assert.deepEqual(input.attributes, [
    { name: 'type', value: 'text' },
    { name: 'value', value: 'a&b' },
  ]); // the duplicate "type" was dropped, per Module 10's rule
});

test('a CDATA section embedded directly in an otherwise ordinary document', () => {
  const tokens = new Tokenizer('<p>before<![CDATA[<raw>&notdecoded;]]>after</p>').run();
  assert.equal(textOf(tokens), 'before<raw>&notdecoded;after');
});
