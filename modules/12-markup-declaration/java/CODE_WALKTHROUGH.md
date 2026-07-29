# Module 12 — Java Code Walkthrough

`State.java`, `Token.java`, `Preprocessor.java`, and `CharacterReference.java`
are unchanged. `Tokenizer.java` gains three lookahead helpers and two new
states, mirroring the JS version exactly in structure.

## `peekString` / `matchCaseInsensitive` / `matchLiteral`

```java
String peekString(int length) {
    int end = Math.min(pos + length, input.length());
    return input.substring(pos, end);
}
boolean matchCaseInsensitive(String str) {
    return peekString(str.length()).equalsIgnoreCase(str);
}
boolean matchLiteral(String str) {
    return peekString(str.length()).equals(str);
}
```

`Math.min` guards against reading past the end of the string when fewer
than `length` characters remain — Java's `substring` throws
`StringIndexOutOfBoundsException` on an out-of-range end index, unlike
JS's `slice`, which just clamps silently. This is a real, small language
difference this module's lookahead code has to account for explicitly
that the JS version gets for free.

## `markupDeclarationOpenState` / `bogusCommentState`

Structurally identical to the JS version, including the same EOF-emits-
the-comment behavior in `bogusCommentState`, contrasted with
`tagNameState`'s EOF-discards behavior from Module 9.

## The `?` reconsume detail

Same story as the JS walkthrough: this module's first draft of
`TokenizerTest.java` initially expected `"xml version=\"1.0\"?"` for
`<?xml version="1.0"?>`'s bogus-comment data, and the real, run output was
`"?xml version=\"1.0\"?"` — the leading `?` is included, because Module
9's `tagOpenState` reconsumes it rather than discarding it. Fixed by
reading the actual output, not by re-deriving the expected value from
memory a second time.

## Try it yourself

Same experiment as the JS walkthrough, verified the same way: change
`matchCaseInsensitive("DOCTYPE")` to `matchLiteral("DOCTYPE")`. Recompile,
rerun — exactly one check fails (the DOCTYPE case-insensitivity one), all
others stay green.
