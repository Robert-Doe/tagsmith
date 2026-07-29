# Module 15 — JavaScript Code Walkthrough

Everything except `Tokenizer.js` is unchanged. This module adds exactly
one new method — the smallest single-state addition since Module 4.

## `cdataSectionState`

```js
if (this.matchLiteral(']]>')) {
  this.consume();
  this.consume();
  this.consume();
  this.state = State.DATA;
  return;
}
```

Reuses `matchLiteral`, built back in Module 12 for `--`/`DOCTYPE`/`[CDATA[`
detection, for exactly the same reason: checking whether the next three
characters spell the close sequence, without committing to consuming any
of them until the full match is confirmed. If it doesn't match, the method
falls through to ordinary single-character consumption — the same
NUL-parse-error-but-still-literal, EOF-is-an-error shape as Data state.

## Why one state, not three

Some later spec revisions split CDATA-section handling into a
bracket-counting chain, similar to the comment/script-data dash-counting
families. This course's spec snapshot doesn't (see `State.js`'s 68-state
scope note, and the original Module 1 table-of-contents fetch this whole
course is built from) — so this module matches that snapshot: one state,
lookahead-based detection. Both approaches produce byte-identical output;
this is a structuring choice, not a behavioral one.

## Try it yourself

Change `matchLiteral(']]>')` to `matchLiteral(']]')` (two brackets, no
`>`) — a real bug: it only checks two characters but the code right below
it still blindly consumes three. Rerun this module's test suite first:
checked, not assumed, **all 7 still pass** — every existing test's `]]`
happens to be immediately followed by a real `>`, so the blind third
`consume()` always eats the right character anyway, by coincidence. Now
try `new Tokenizer(']]x]]>rest')` force-started in `CDATA_SECTION`
directly. Verified: the correct output is `"]]xrest"`; the buggy version
silently produces `"]]>rest"` instead — a `>` appears in the output where
an `x` should be, because the bug matched two brackets early, then blindly
swallowed the `x` as if it were the closing `>`. Confirm this yourself
before moving on.
