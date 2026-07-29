'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { TreeBuilder } = require('./TreeBuilder');
const { ElementNode, TextNode, CommentNode } = require('./TreeNode');

function el(node) {
  return node instanceof ElementNode ? node.tagName : null;
}

// --- The payoff: resolving Module 16's demonstrated divergence ---

test('textarea content is now correctly protected from tag/entity interpretation... except entities, which DO decode', () => {
  const doc = new TreeBuilder('<textarea>x&amp;<b>y</textarea>after').run();
  const textarea = doc.children[0];
  assert.equal(textarea.tagName, 'textarea');
  assert.equal(textarea.children.length, 1);
  assert.ok(textarea.children[0] instanceof TextNode);
  // '<b>' stayed literal text (RCDATA doesn't parse tags); '&amp;' still decoded (RCDATA DOES decode entities)
  assert.equal(textarea.children[0].data, 'x&<b>y');
  assert.equal(doc.children[1].data, 'after');
});

test('script content is now preserved as ONE text node -- matching the real browser exactly (Module 16)', () => {
  const doc = new TreeBuilder('<script>if (a<b) { console.log("hi"); }</script>').run();
  const script = doc.children[0];
  assert.equal(script.tagName, 'script');
  assert.equal(script.children.length, 1);
  // This exact string was independently verified against a real browser's
  // DOMParser in Module 16's DECISIONS.md.
  assert.equal(script.children[0].data, 'if (a<b) { console.log("hi"); }');
});

test('a real </script> end tag now correctly closes the element (unlike the pure tokenizer in Module 16)', () => {
  const doc = new TreeBuilder('<script>x</script><p>after</p>').run();
  assert.equal(doc.children.length, 2);
  assert.equal(el(doc.children[0]), 'script');
  assert.equal(el(doc.children[1]), 'p');
});

// --- A real, previously-undiscovered tokenizer bug this module surfaced ---
// (see DECISIONS.md "A real discovery" section for the full story: a
// non-matching end tag inside RCDATA/RAWTEXT/script-data must stay literal
// text -- Modules 1-16 never had a test that could exercise this, because
// Track 1 never drove a *real*, tag-triggered RCDATA/RAWTEXT/script-data
// entry followed by a genuinely mismatched closing tag.)

test('a MISMATCHED end tag inside RCDATA stays literal text, not a real close (title vs script)', () => {
  const doc = new TreeBuilder('<title><script>alert(1)</script></title>after').run();
  const title = doc.children[0];
  assert.equal(title.tagName, 'title');
  assert.equal(title.children.length, 1);
  // The whole "<script>alert(1)</script>" span is literal text -- "</script>"
  // is NOT an appropriate end tag for <title>, so it must not close anything.
  assert.equal(title.children[0].data, '<script>alert(1)</script>');
  assert.equal(doc.children[1].data, 'after');
});

test('a MISMATCHED end tag inside RAWTEXT (style) also stays literal text', () => {
  const doc = new TreeBuilder('<style></title>still style text</style>after').run();
  const style = doc.children[0];
  assert.equal(style.tagName, 'style');
  assert.equal(style.children.length, 1);
  assert.equal(style.children[0].data, '</title>still style text');
  assert.equal(doc.children[1].data, 'after');
});

// --- General tree-building correctness ---

test('a realistic nested document builds the correct tree shape', () => {
  const doc = new TreeBuilder(
    '<!DOCTYPE html><html><head><title>Hi</title></head><body><div class="a"><p>text</p></div></body></html>'
  ).run();
  assert.equal(doc.doctype.name, 'html');
  const html = doc.children[0];
  assert.equal(html.tagName, 'html');
  const [head, body] = html.children;
  assert.equal(head.tagName, 'head');
  assert.equal(head.children[0].tagName, 'title');
  assert.equal(head.children[0].children[0].data, 'Hi');
  assert.equal(body.tagName, 'body');
  const div = body.children[0];
  assert.equal(div.tagName, 'div');
  assert.deepEqual(div.attributes, [{ name: 'class', value: 'a' }]);
  assert.equal(div.children[0].tagName, 'p');
  assert.equal(div.children[0].children[0].data, 'text');
});

test('a comment becomes a real CommentNode in the tree', () => {
  const doc = new TreeBuilder('<div><!-- note --></div>').run();
  const div = doc.children[0];
  assert.ok(div.children[0] instanceof CommentNode);
  assert.equal(div.children[0].data, ' note ');
});

test('void elements never receive children -- a following tag is a sibling, not nested inside', () => {
  const doc = new TreeBuilder('<div><br><p>after br</p></div>').run();
  const div = doc.children[0];
  assert.equal(div.children[0].tagName, 'br');
  assert.equal(div.children[0].children.length, 0);
  assert.equal(div.children[1].tagName, 'p'); // sibling, NOT br's child
});

test('a self-closing tag on a normal element is also never pushed', () => {
  const doc = new TreeBuilder('<div/><p>after</p>').run();
  assert.equal(doc.children[0].tagName, 'div');
  assert.equal(doc.children[0].children.length, 0);
  assert.equal(doc.children[1].tagName, 'p'); // sibling, not div's child
});

test('an unmatched end tag is ignored, not a crash', () => {
  const doc = new TreeBuilder('<div><p>text</div>after').run();
  // </div> closes <div> even though <p> was never explicitly closed --
  // popping the stack down to (and including) the matching element.
  assert.equal(doc.children.length, 2);
  assert.equal(doc.children[0].tagName, 'div');
  assert.equal(doc.children[1].data, 'after');
});

test('adjacent character tokens coalesce into one TextNode, not many', () => {
  const doc = new TreeBuilder('<p>a&amp;b&lt;c</p>').run();
  const p = doc.children[0];
  assert.equal(p.children.length, 1);
  assert.equal(p.children[0].data, 'a&b<c');
});
