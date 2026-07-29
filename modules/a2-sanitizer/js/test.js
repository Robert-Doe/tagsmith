'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { sanitize } = require('./Sanitizer');
const { naiveStripScript } = require('./NaiveRegexSanitizer');

// --- Core sanitizer behavior ---

test('a real <script> element is removed entirely, surrounding content preserved', () => {
  const out = sanitize('<p>hi</p><script>alert(1)</script><p>bye</p>');
  assert.equal(out, '<p>hi</p><p>bye</p>');
  assert.ok(!out.includes('alert'));
});

test('an event handler attribute is stripped; other attributes on the same element survive', () => {
  const out = sanitize('<img src="x.png" onerror="alert(1)">');
  assert.equal(out, '<img src="x.png">');
});

test('a javascript: URL in href is stripped; the href attribute itself is dropped, not just neutered', () => {
  const out = sanitize('<a href="javascript:alert(1)">click</a>');
  assert.equal(out, '<a>click</a>');
});

test('an ordinary https:// href is left completely untouched', () => {
  const out = sanitize('<a href="https://example.com">click</a>');
  assert.equal(out, '<a href="https://example.com">click</a>');
});

test('void elements and plain nesting survive unchanged', () => {
  const out = sanitize('<br><p>after</p>');
  assert.equal(out, '<br><p>after</p>');
});

test('multiple dangerous attributes on one element are all stripped, safe ones kept', () => {
  const out = sanitize('<div class="a" onclick="bad()">safe &amp; text &lt;here&gt;</div>');
  assert.equal(out, '<div class="a">safe &amp; text &lt;here></div>');
  assert.ok(!out.includes('onclick'));
});

// --- The payoff: the exact divergence ROADMAP.md predicted for this module ---
// "A sanitizer that strips <script> while preserving surrounding text only
// works correctly if it respects RAWTEXT/script-data state boundaries --
// a hand-rolled regex sanitizer provably cannot."

test('the real, tokenizer-based sanitizer correctly preserves literal "<script>" text inside RCDATA (<title>)', () => {
  const out = sanitize('<title><script>alert(1)</script></title>');
  // The tree never contained a real script ELEMENT here at all -- Module 5's
  // RCDATA rules mean this text was never eligible for removal in the first
  // place, so it must survive completely intact (re-escaped for safe
  // re-serialization, not stripped).
  assert.equal(out, '<title>&lt;script>alert(1)&lt;/script></title>');
});

test('PROVEN, not asserted: the naive regex sanitizer corrupts that exact same legitimate content', () => {
  const html = '<title><script>alert(1)</script></title>';
  const naiveResult = naiveStripScript(html);
  const realResult = sanitize(html);
  // The naive approach deletes real page content it was never supposed to
  // touch, because it pattern-matches raw text with no notion of RCDATA.
  assert.equal(naiveResult, '<title></title>');
  assert.notEqual(naiveResult, realResult);
  assert.ok(!naiveResult.includes('alert'), 'naive result coincidentally also has no "alert" left, but for the WRONG reason -- it deleted real title text, not a real script');
});
