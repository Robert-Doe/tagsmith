# Module 8 — JavaScript Code Walkthrough

`State.js`, `Token.js`, `Preprocess.js`, and `CharacterReference.js` are
unchanged. `Tokenizer.js` gains a module-level helper function and six new
methods.

## `isDoubleEscapeTerminator(c)`

A standalone function, not a class method — deliberately, since both
`scriptDataDoubleEscapeStartState` and `scriptDataDoubleEscapeEndState`
need the exact same six-character check (tab, LF, FF, space, `/`, `>`) and
neither needs `this`.

## The case-sensitive "script" check

```js
this.state = this.tempBuffer === 'script' ? State.SCRIPT_DATA_DOUBLE_ESCAPED : State.SCRIPT_DATA_ESCAPED;
```

This line appears twice (start and end states), comparing against the
lowercase literal `'script'` — not `.toLowerCase()`-normalized. Every
uppercase or lowercase letter consumed while building `tempBuffer` gets
appended *as typed*, unlike every tag name this course has built so far,
which always lowercases as it goes. This is a real, deliberate asymmetry
in the spec, not an inconsistency this course introduced — see
DECISIONS.md.

## `scriptDataDoubleEscapedState` vs. `scriptDataEscapedState` (Module 7)

Structurally the same shape, with exactly one different line: the `'<'`
branch here calls `this.emit(new CharacterToken('<'))` *before* switching
state; Module 7's equivalent branch never emits `'<'` itself at all (it
defers to whatever the less-than-sign state decides). Comparing these two
methods side by side is the fastest way to see the module's one real new
idea.

## `scriptDataDoubleEscapedLessThanSignState`

The simplest of the six new methods — only `/` matters, there's no letter
branch at all (unlike Module 7's single-escaped equivalent). That's not an
oversight: we're already *inside* nested-name-matching territory by this
point, so there's nothing further to detect.

## Try it yourself

Change `this.tempBuffer === 'script'` to
`this.tempBuffer.toLowerCase() === 'script'` in
`scriptDataDoubleEscapeStartState` only (leave the end-state check alone).
Rerun the tests — the "uppercase SCRIPT does NOT enter double-escaped
mode" test should now fail, and you can predict exactly which state the
tokenizer ends up in instead before checking.
