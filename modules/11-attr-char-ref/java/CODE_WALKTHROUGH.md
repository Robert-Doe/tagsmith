# Module 11 — Java Code Walkthrough

`State.java`, `Token.java`, and `Preprocessor.java` are unchanged.
`CharacterReference.java` and `Tokenizer.java` both change.

## `CharacterReference.java`: a required new parameter, not a defaulted one

Unlike JS's `isInAttribute = false`, Java has no default parameters —
`consumeCharacterReference` and `consumeNamedReference` both gained a
`boolean isInAttribute` that every call site must now pass explicitly.
Module 4's original call site (`characterReferenceState`, still in
`Tokenizer.java`) had to be updated to pass `false` — a one-line, compiler-
enforced change, impossible to forget silently the way a JS default
parameter's absence could be.

```java
if (!hasSemicolon && isInAttribute) {
    int nextPos = tokenizer.pos + len;
    Character next = nextPos < tokenizer.input.length() ? tokenizer.input.charAt(nextPos) : null;
    if (next != null && (next == '=' || Character.isLetterOrDigit(next))) {
        tokenizer.pos = startPos;
        return null;
    }
}
```

`Character.isLetterOrDigit` is Java's built-in equivalent of the
alphanumeric check — used here instead of a hand-rolled ASCII range test
since it's already exactly right for this purpose and more directly
readable than `next >= 'a' && next <= 'z' || ...` repeated a fourth time.

## `Tokenizer.java`: two new fields

`attrValueReturnState` (type `State`) and `additionalAllowedCharacter`
(type `Character`, boxed so it can be `null` for the unquoted case) play
the same role as their JS counterparts — the two pieces of context an
attribute-value state has to stash before switching into
`CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE`, since the state switch itself
can't carry parameters.

## Try it yourself

Same experiment as the JS walkthrough, verified the same way: change the
Data/RCDATA call site (`CharacterReference.consumeCharacterReference(this,
null, false)`) to pass `true`. Recompile, rerun `TokenizerTest` — all 10
checks still pass, because no existing test's input happens to expose the
gap. Write a new check for `new Tokenizer("&amp=x").run()` (started in
plain `DATA` state, not an attribute) and confirm it distinguishes the two
behaviors before trusting that the fix matters.
