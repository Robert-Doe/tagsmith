# Module 5 — Java Code Walkthrough

`State.java`, `Token.java`, `Preprocessor.java`, `CharacterReference.java`,
and `Check.java` are all unchanged. Everything new is in `Tokenizer.java`.

## New fields

```java
Token currentToken = null;
String tempBuffer = "";
String lastStartTagName = null;
```

All package-private, following the same convention Module 4 established
for `pos`/`input`/`state`. A `public setLastStartTagName(String)` is
provided since — unlike the fully-open JS class — Java tests in a
different class need an explicit way to poke this from outside if it were
private; here it's package-private already (same default package as
`TokenizerTest`), but the setter documents intent and would keep working
even if this class were later moved into a real named package.

## `textContentState` / `rcdataState` / `rawtextState`

Structurally identical to the JS version. One difference worth noticing:
`char c == 0` is how NUL is checked here, deliberately written as a
numeric comparison rather than a character literal — the same class of bug
this course hit for real earlier (a NUL character literal that silently
became a space when typed) is why numeric comparison was preferred
wherever a NUL check was newly introduced in this module.

## The three-method chain: `lessThanSignState` → `endTagOpenState` → `endTagNameState`

Same shared/thin-wrapper shape as JS. The one place Java's static typing
earns its keep: `endTagNameState` casts `currentToken` to `EndTagToken`
exactly once it needs `.tagName`, and the compiler would catch it
immediately if a future edit ever let a non-`EndTagToken` reach that cast —
a `ClassCastException` at a very specific, well-understood line, rather
than a silently wrong tag name.

`endTagOpenState` and `endTagNameState` both need an EOF-safe read: Java's
`consume()` (i.e. `input.charAt(pos++)`) throws
`StringIndexOutOfBoundsException` if called past the end of the string,
unlike JS's array-style indexing, which just returns `undefined`. Both
methods check `eof()` explicitly before calling `consume()`, using a boxed
`Character`/boolean pair to represent "there was no character" — the same
role JS's `undefined` return plays, made explicit rather than implicit.

## Try it yourself

Same exercise as the JS walkthrough: remove the `isAppropriate` guard from
just the `'>'` branch inside `endTagNameState`. Recompile, rerun — predict
which specific check fails and why before reading the output.
