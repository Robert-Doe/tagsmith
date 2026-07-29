# Module 13 — Java Code Walkthrough

`State.java`, `Token.java`, `Preprocessor.java`, `CharacterReference.java`,
and `Check.java` are unchanged. `Tokenizer.java` gains six new private
methods, structurally identical to the JS version throughout.

## `((CommentToken) currentToken)` — one more cast, everywhere

Every method here accumulates into `.data`, which lives on `CommentToken`
specifically, not on the shared `Token`/`TagToken` hierarchy — so every
data-mutating line casts `currentToken` explicitly. This is the same
pattern `appendToCurrentTagName` used in Module 9, applied to a different
concrete type.

## `commentEndBangState`'s three-character give-back

```java
if (!atEof && boxed == '-') {
    ((CommentToken) currentToken).data += "--!";
    state = State.COMMENT_END_DASH;
    return;
}
```

Java string concatenation (`+=` with a string literal) reads identically
to the JS version here — no language-specific wrinkle in this particular
method, worth noting precisely because so many of this course's earlier
modules *did* need a language-specific adjustment at points like this one.

## Try it yourself

Same experiment as the JS walkthrough, verified the same way: change
`commentEndState`'s dash branch to not append (`return;` with no
mutation). Recompile, rerun — `<!--hi---->` now produces `"hi"` instead of
`"hi--"`, and exactly one check fails.
