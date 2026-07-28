# Module 7 — Java Code Walkthrough

`State.java`, `Token.java`, `Preprocessor.java`, `CharacterReference.java`,
and `Check.java` are unchanged. `Tokenizer.java` gains nine new private
methods; nothing existing was modified.

## Structurally identical to the JS version

Every method here mirrors its JS counterpart line-for-line in control flow
— the dash-counting chain
(`scriptDataEscapeStartState`→`scriptDataEscapeStartDashState`→`scriptDataEscapedDashDashState`),
the three text-processing states sharing the consume/`-`/`<`/NUL/else
shape, and `scriptDataEscapedLessThanSignState` standing alone rather than
reusing `lessThanSignState`, for the same reason as JS: its ASCII-letter
branch does something none of that helper's existing branches do.

## One Java-specific wrinkle: `Character` boxing in the less-than-sign check

```java
Character next = peek();
if (next != null && next == '/') { ... }
if (next != null && isAsciiLetter(next)) { ... }
```

Two explicit null checks where the JS version has one implicit `undefined`
check per branch — same pattern established back in Module 6's `bangState`
handling, now appearing a third time. By this module, it's a recognizable,
repeated idiom rather than a one-off.

## `scriptDataEscapedEndTagOpenState` / `scriptDataEscapedEndTagNameState`

One-line calls into Module 5's shared helpers, exactly like the JS side —
concrete proof (again) that the "appropriate end tag" mechanism didn't
need to know or care how deep into the script-data family it was called
from.

## Try it yourself

Same exercise as the JS walkthrough: comment out the final
`state = State.SCRIPT_DATA_ESCAPED;` in `scriptDataEscapedDashDashState`'s
last branch. Recompile, rerun — verified fact, not a guess: it still
reports **11 passed, 0 failed**. Then try to construct an input where the
*actual token stream* (not just an internal field) differs between the
correct and broken versions, and confirm it by running both versions
side by side rather than reasoning it out on paper alone — the JS
walkthrough's author tried exactly that and found their first guess didn't
actually expose anything.
