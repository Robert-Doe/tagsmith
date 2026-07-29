# Module 11 — JavaScript Code Walkthrough

`State.js`, `Token.js`, and `Preprocess.js` are unchanged.
`CharacterReference.js` and `Tokenizer.js` both change.

## `CharacterReference.js`: `isInAttribute` threaded through

`consumeCharacterReference` gains a third parameter, `isInAttribute =
false` — defaulted so Module 4's two existing call sites
(`characterReferenceInDataState`, `characterReferenceInRcdataState`) don't
need to change at all. It flows through to `consumeNamedReference`, where
the actual new logic lives:

```js
if (!hasSemicolon && isInAttribute) {
  const next = tokenizer.input[tokenizer.pos + len];
  if (next !== undefined && (next === '=' || /[a-zA-Z0-9]/.test(next))) {
    tokenizer.pos = startPos;
    return null;
  }
}
```

Read this as: "if this match has no semicolon, AND we're inside an
attribute, peek at what comes right after the match — if it's `=` or
alphanumeric, undo everything and pretend we never tried." The peek
happens *before* `tokenizer.pos` is advanced past the match, which is why
it's computed as `tokenizer.pos + len`, not read via `peek()` (which
operates relative to the *current* position, still sitting before the
match).

## `Tokenizer.js`: two new fields, three touched methods

`attrValueReturnState` and `additionalAllowedCharacter` are the two pieces
of context each attribute-value state needs to hand off before switching
into `CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE` — since the state switch
itself carries no parameters, these fields are how that context survives
the transition. `attributeValueQuotedState` gained a second parameter
(`returnState`) purely to compute the right value for
`attrValueReturnState`; `attributeValueUnquotedState` sets
`additionalAllowedCharacter = undefined` explicitly, spelling out "there's
no quote to protect here" rather than leaving it implicit.

## `characterReferenceInAttributeValueState`

Four lines, but every one differs from Module 4's
`characterReferenceState`: it reads `additionalAllowedCharacter` and
passes `true` for `isInAttribute`, and appends to
`this.currentAttribute.value` instead of calling `this.emit(...)`. Same
algorithm underneath, genuinely different integration.

## Try it yourself

Change `characterReferenceState` (Module 4's Data/RCDATA path, further up
this same file) to pass `true` for `isInAttribute` instead of leaving it
at the default. Rerun this module's tests. Checked, not assumed: **all
11 still pass** — none of this course's existing Data-state tests happen
to use a no-semicolon named match immediately followed by `=` or an
alphanumeric character, so nothing here can tell the difference. Write a
new test — something shaped like `new Tokenizer('&amp=x').run()` fed
straight into Data state, checking the resulting character tokens — that
actually would fail with the bug in place, then confirm it does. This is
the same lesson Module 8's walkthrough landed on: a passing suite proves
what it tests, not everything that could go wrong.
