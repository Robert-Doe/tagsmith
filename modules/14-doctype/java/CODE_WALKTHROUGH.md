# Module 14 — Java Code Walkthrough

`State.java`, `Preprocessor.java`, `CharacterReference.java`, and
`Check.java` are unchanged. `Token.java` needed no changes — `DoctypeToken`
was fully defined back in Module 1. `Tokenizer.java` gains sixteen new
methods and three shared helpers.

## `doctypeIdentifierQuotedState`'s `isPublic` boolean, not field-name-by-string

```java
private void doctypeIdentifierQuotedState(char quoteChar, boolean isPublic, State nextState, String abruptErrorName) {
    ...
    if (isPublic) doctype.publicIdentifier += boxed; else doctype.systemIdentifier += boxed;
}
```

JS's version indexes `this.currentToken[fieldName]` directly, since JS
objects allow property access by a string variable. Java has no equivalent
without reflection (which would be a strange, heavyweight tool for two
fields) — so the Java version takes a `boolean isPublic` and branches
explicitly wherever the JS version would have indexed dynamically. Same
sharing, different mechanism, each idiomatic for its language.

## `DoctypeToken doctype = (DoctypeToken) currentToken;` — one cast per method

Most of this module's sixteen methods start by casting `currentToken` to
`DoctypeToken` once and reusing the local variable, rather than repeating
the cast on every field access — a small readability choice that also
happens to avoid casting the same expression five times in a row.

## The one asymmetric decision, Java side

Same as JS: `afterDoctypeSystemIdentifierState` deliberately does not set
`forceQuirks = true` in its fallback branch, unlike every sibling state in
this family. See DECISIONS.md.

## Try it yourself

Same experiment as the JS walkthrough, verified the same way: add
`doctype.forceQuirks = true;` to `afterDoctypeSystemIdentifierState`'s
fallback branch (there's no local `doctype` variable there currently —
you'll need to add the cast). Recompile, rerun — exactly one check flips.
