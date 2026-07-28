# Module 6 — JavaScript Code Walkthrough

`State.js`, `Token.js`, `Preprocess.js`, and `CharacterReference.js` are
unchanged. `Tokenizer.js` gets one modified method and four tiny new ones.

## The one change: `lessThanSignState` grows a third branch

Module 5's `lessThanSignState(endTagOpenState, returnState)` becomes
`lessThanSignState(endTagOpenState, returnState, bangState)`. The new
parameter is optional (`undefined` by default at the call site for RCDATA
and RAWTEXT, which pass only two arguments... except JS doesn't enforce
arity, so both existing wrappers were updated to explicitly still work
correctly without a third arg — `bangState !== undefined` is the guard that
keeps the old behavior byte-for-byte identical when it's omitted).

## The four new wrappers

```js
scriptDataState() {
  this.textContentState(null, State.SCRIPT_DATA_LESS_THAN_SIGN);
}
scriptDataLessThanSignState() {
  this.lessThanSignState(State.SCRIPT_DATA_END_TAG_OPEN, State.SCRIPT_DATA, State.SCRIPT_DATA_ESCAPE_START);
}
scriptDataEndTagOpenState() {
  this.endTagOpenState(State.SCRIPT_DATA_END_TAG_NAME, State.SCRIPT_DATA);
}
scriptDataEndTagNameState() {
  this.endTagNameState(State.SCRIPT_DATA);
}
```

Every one of these calls a method Module 5 already wrote. `scriptDataState`
reuses `textContentState` exactly as `rawtextState` does — same `null`
first argument, meaning "no character references" — the only difference
between script data's base behavior and RAWTEXT's is which
less-than-sign state it switches into, which is just the second argument.

## What's genuinely new: the `<!` branch

```js
if (bangState !== undefined && this.peek() === '!') {
  this.consume();
  this.emit(new CharacterToken('<'));
  this.emit(new CharacterToken('!'));
  this.state = bangState;
  return;
}
```

Notice this branch *does* emit tokens immediately, unlike the '/' branch
right above it (which defers everything to the next state). That's a real,
spec-mandated asymmetry, not a stylistic inconsistency — see DECISIONS.md.

## Try it yourself

Run `new Tokenizer('<script>a<!--b</script>').run()` after force-setting
`state = State.SCRIPT_DATA`. It'll throw, naming Module 7 — but check
`tokenizer.tokens` first. You should see character tokens for `a`, then a
literal `<` and `!` token pair, and nothing for `--b</script>` at all
(never reached, because the exception fires as soon as
`SCRIPT_DATA_ESCAPE_START` is entered). This is exactly the "seam before
the room" pattern from Module 1, now three levels deep.
