# Module 8 — Java Code Walkthrough

`State.java`, `Token.java`, `Preprocessor.java`, `CharacterReference.java`,
and `Check.java` are unchanged. `Tokenizer.java` gains a static helper and
six new private methods.

## `isDoubleEscapeTerminator(char c)`

A `private static` method — same reasoning as the JS module-level
function: it needs no instance state, and both call sites need the exact
same six-character check.

## The case-sensitive "script" check

```java
state = tempBuffer.equals("script") ? State.SCRIPT_DATA_DOUBLE_ESCAPED : State.SCRIPT_DATA_ESCAPED;
```

`String.equals`, not `.equalsIgnoreCase` — deliberately. `tempBuffer`
accumulates letters exactly as typed (via `tempBuffer += boxed`, no
`Character.toLowerCase` call anywhere in these two methods), so `"SCRIPT"`
and `"script"` are genuinely different strings here, unlike every tag-name
comparison elsewhere in this course.

## EOF handling, boxed

```java
boolean atEof = eof();
Character boxed = atEof ? null : consume();
if (!atEof && isDoubleEscapeTerminator(boxed)) { ... }
```

Same `atEof`/boxed-`Character` pattern established in Module 5's
`endTagNameState` — necessary here for the same reason: Java's `consume()`
throws on an empty read, so EOF has to be checked before calling it, not
inferred from its return value the way JS's `undefined` allows.

## Try it yourself

Same exercise as the JS walkthrough, verified the same way: change
`tempBuffer.equals("script")` to `tempBuffer.equalsIgnoreCase("script")`
in `scriptDataDoubleEscapeStartState` only. Recompile, rerun — exactly one
check should flip to FAIL. Predict which one and why before you look.
