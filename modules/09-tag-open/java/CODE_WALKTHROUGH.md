# Module 9 — Java Code Walkthrough

`State.java`, `Token.java`, `Preprocessor.java`, `CharacterReference.java`,
and `Check.java` are unchanged — `StartTagToken`/`EndTagToken` were fully
defined back in Module 1. `Tokenizer.java` gains four new private methods.

## `tagOpenState` / `endTagOpenState`

Same shape and same reasoning as the JS version. One Java-specific detail:
`isAsciiLetter(boxed)` takes the boxed `Character` and Java auto-unboxes it
to compare against the `char`-typed range check inside — this only works
safely because every call site already guarded `!atEof` first, so `boxed`
is never null when `isAsciiLetter` unboxes it.

## `appendToCurrentTagName` and the `TagToken` cast

```java
private void appendToCurrentTagName(char c) {
    ((TagToken) currentToken).tagName += c;
}
```

`currentToken` is declared as the abstract `Token` type (from Module 5),
so appending to `.tagName` needs a cast. Casting to `TagToken` — the
shared abstract parent of both `StartTagToken` and `EndTagToken` — rather
than checking `instanceof StartTagToken`/`instanceof EndTagToken`
separately means this one method works correctly no matter which kind of
tag is currently being built, without needing to know or care which.

## `emitCurrentTagToken`

```java
private void emitCurrentTagToken() {
    emit(currentToken);
    if (currentToken instanceof StartTagToken) {
        lastStartTagName = ((StartTagToken) currentToken).tagName;
    }
    currentToken = null;
}
```

Here the cast *is* to the specific subtype, deliberately — `lastStartTagName`
only makes sense for start tags, so this is the one place in the module
where distinguishing `StartTagToken` from `EndTagToken` actually matters,
unlike `appendToCurrentTagName` where it doesn't.

## Try it yourself

Same experiment as the JS walkthrough: run a `Tokenizer` on
`"<textarea><b></textarea>"`, call `.run()`, then read `.lastStartTagName`
directly (package-private, accessible from `TokenizerTest` in the same
default package). Confirm it reads `"b"`, then trace through
`tagOpenState`/`tagNameState`/`emitCurrentTagToken` to see exactly why.
