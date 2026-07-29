# Module 15 — Java Code Walkthrough

Everything except `Tokenizer.java` is unchanged. One new method,
structurally identical to the JS version.

## `cdataSectionState`

```java
if (matchLiteral("]]>")) {
    consume();
    consume();
    consume();
    state = State.DATA;
    return;
}
```

Same `matchLiteral` helper from Module 12, same three-character
lookahead-then-consume shape. The fallthrough (NUL, EOF, ordinary
character) mirrors `dataState()` exactly, on purpose — see DECISIONS.md
for why CDATA content's NUL handling was modeled after Data state rather
than invented fresh.

## Try it yourself

Same experiment as the JS walkthrough, verified the same way: change
`matchLiteral("]]>")` to `matchLiteral("]]")`. Recompile, rerun
`TokenizerTest` — all 6 checks still pass (every test's `]]` happens to be
followed by a real `>`). Then run
`new Tokenizer("]]x]]>rest")` force-started in `CDATA_SECTION` and check
its output directly: correct is `"]]xrest"`; buggy is `"]]>rest"` — the
same divergence the JS walkthrough found, confirmed independently in this
language too.
