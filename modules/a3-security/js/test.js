'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { TreeBuilder } = require('./TreeBuilder');
const { ElementNode, TextNode } = require('./TreeNode');

const PAYLOAD = '<img src=x onerror=alert(1)>';

// --- The core mechanism: context picks the tokenizer's INITIAL state ---

test('fragment parsing with no context behaves exactly like Module A1 (DATA state)', () => {
  const doc = new TreeBuilder('<b>hi</b>').run();
  const b = doc.children[0];
  assert.ok(b instanceof ElementNode);
  assert.equal(b.tagName, 'b');
});

test('context="textarea" (RCDATA) keeps a real-looking tag as inert literal text', () => {
  const doc = new TreeBuilder(PAYLOAD, 'textarea').run();
  assert.equal(doc.children.length, 1);
  assert.ok(doc.children[0] instanceof TextNode);
  assert.equal(doc.children[0].data, PAYLOAD);
});

test('context="div" (DATA) parses the identical string as a REAL, live element', () => {
  const doc = new TreeBuilder(PAYLOAD, 'div').run();
  assert.equal(doc.children.length, 1);
  const img = doc.children[0];
  assert.ok(img instanceof ElementNode);
  assert.equal(img.tagName, 'img');
  assert.deepEqual(img.attributes, [
    { name: 'src', value: 'x' },
    { name: 'onerror', value: 'alert(1)' },
  ]);
});

test('context="script" (SCRIPT_DATA) also keeps the same payload as inert literal text', () => {
  const doc = new TreeBuilder(PAYLOAD, 'script').run();
  assert.equal(doc.children.length, 1);
  assert.ok(doc.children[0] instanceof TextNode);
  assert.equal(doc.children[0].data, PAYLOAD);
});

// --- The payoff: the exact mutation-XSS mechanism, live-verified against a real browser ---
// (see DECISIONS.md for the transcribed javascript_tool session against a
// real DOM: textarea.innerHTML = PAYLOAD, then textarea.value, then a
// SECOND div's innerHTML set to that captured text -- all matched exactly.)

test('PROVEN: text safely captured from one context becomes a live element in another', () => {
  // Step 1: content lands somewhere safe -- e.g. a user typed this into a
  // <textarea>, or it ended up as a <title>'s text. RCDATA context means
  // it's just text; nothing here is dangerous yet.
  const safelyStored = new TreeBuilder(PAYLOAD, 'textarea').run();
  const capturedText = safelyStored.children[0].data;
  assert.equal(capturedText, PAYLOAD); // bit-for-bit identical to the original payload

  // Step 2: elsewhere in the same app, that captured text is reused --
  // e.g. re-rendered into a <div> via innerHTML, on the (wrong) assumption
  // that "it was already just text before, so it's still just text."
  const reinserted = new TreeBuilder(capturedText, 'div').run();
  const img = reinserted.children[0];

  // The SAME string, unchanged, is now a real element with a real event
  // handler attribute -- nothing was re-encoded or tampered with between
  // steps 1 and 2. The only thing that changed was parsing CONTEXT.
  assert.ok(img instanceof ElementNode);
  assert.equal(img.tagName, 'img');
  assert.equal(img.attributes.find((a) => a.name === 'onerror').value, 'alert(1)');
});
