# Module 3 — JavaScript Code Walkthrough

`State.js`, `Token.js`, and `Preprocess.js` are unchanged from Module 2.
Only `Tokenizer.js` changes, in three places.

## New: `parseErrors` and `reportParseError()`

```js
this.parseErrors = [];
reportParseError(description) {
  this.parseErrors.push({ state: this.state, description });
}
```

The spec's "this is a parse error" notes are informational, not fatal —
tokenizing continues afterward. Modeled as an array you can inspect after
`run()`, not an exception. This is the first of many spec-defined parse
errors this course will hit; every future one reuses this same method.

## Rewritten: `dataState()`

The '&' and '<' branches no longer `throw`. They now do exactly what the
spec says: `this.state = State.CHARACTER_REFERENCE_IN_DATA;` (or
`TAG_OPEN`) and `return`. Nothing is emitted. The *next* call to `step()`
is what decides what happens next — and since neither of those two states
has a real handler yet, `step()`'s existing fallback (`throw new
NotImplementedError(this.state, STATE_MODULE_MAP[this.state])`) fires,
unchanged from Module 1. No new dispatch logic was needed — Module 1's
generic fallback was already correct for this; Module 3 just stopped
intercepting it early with a hardcoded throw.

The NUL branch and the "anything else" branch both now call
`this.emit(new CharacterToken(c))` — NUL additionally calls
`reportParseError('unexpected-null-character')` first, per spec, but still
emits the character. Emitting a real `NUL` character token (rather than
substituting something else) is a specific, spec-fidelity choice — see
DECISIONS.md for why this snapshot of the spec does this differently than
the modern living standard.

## Try it yourself

Call `new Tokenizer('a&b').run()` and catch the thrown error. Then inspect
`tokenizer.tokens` — it holds one `CharacterToken` (`'a'`), even though
`run()` itself threw. Convince yourself why: `emit()` already ran and
mutated the array before the exception unwound the call stack; throwing
doesn't retroactively undo prior side effects.
