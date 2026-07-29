# Module 16 — JavaScript Code Walkthrough

No source files changed at all — `Tokenizer.js` is byte-for-byte the same
file Module 15 finished with, already dispatching all 68 states. This
module's entire content is `test.js`: proving the whole machine, not
building any more of it.

## The completeness meta-test

```js
for (const stateName of Object.keys(State)) {
  const t = new Tokenizer('x');
  t.state = State[stateName];
  t.currentToken = new DoctypeToken();
  ...
  try { t.step(); }
  catch (e) { assert.ok(!(e instanceof NotImplementedError), ...); }
}
```

This doesn't test *correctness* — it tests *existence*. Every one of the
68 states gets force-set and stepped once with a deliberately loose fixture
object (borrowed fields that don't really belong to whatever token type
each state expects); other exceptions are expected and ignored, since the
only thing this test cares about is whether `NotImplementedError`
specifically still fires anywhere. It's the direct, automated descendant
of Module 1's very first test ("State enum has exactly 68 states") — that
test proved the board was fully labeled; this one proves every room on it
now has someone actually working inside.

## The realistic-page test's shape-string trick

```js
const shape = struct.map((t) => {
  if (t instanceof DoctypeToken) return `DOCTYPE:${t.name}`;
  ...
});
```

Rather than asserting on the raw token objects (verbose, hard to read at a
glance when it fails), the test reduces the whole document down to one
short, readable line per structural token — `<div>`, `</div>`,
`COMMENT:page header` — and diffs that against a single expected array.
This is the token-stream equivalent of Module 12's "shape" thinking
applied to a whole document instead of one tag.

## The differential test that isn't in this file

The two most important verifications in this module happened **outside**
`test.js` entirely: this course's author ran the exact `REALISTIC_PAGE`
HTML string through a real browser's `DOMParser`, live, in this session,
and compared the resulting tag sequence, attributes, and decoded text
against this tokenizer's output — a genuine match, not a simulated one.
A second run, of the `<script>if (a<b)...` snippet, confirmed the real
browser correctly treats the whole script body as text (because tree
construction switches it into script-data mode), which this pure
tokenizer cannot do on its own — exactly the divergence Module 9 predicted
four modules ago, now observed against a live reference implementation
instead of just reasoned about. See DECISIONS.md for the exact,
transcribed results of both runs.

## Try it yourself

Delete the `CDATA_SECTION` `if` branch from `step()`'s dispatch chain and
rerun this module's test suite. Verified, not assumed: **two** tests fail,
not one — the completeness meta-test (with the exact message
`"CDATA_SECTION still throws NotImplementedError"`) and the CDATA
integration test, since removing the dispatch branch breaks both what it
directly checks and what depends on it indirectly. Try a different state
and predict, before running, whether it breaks one test or several.
