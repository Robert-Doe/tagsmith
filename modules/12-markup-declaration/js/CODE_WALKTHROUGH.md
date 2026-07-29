# Module 12 — JavaScript Code Walkthrough

`State.js`, `Token.js`, `Preprocess.js`, and `CharacterReference.js` are
unchanged. `Tokenizer.js` gains three lookahead helpers and two new states.

## `peekString` / `matchCaseInsensitive` / `matchLiteral`

Every earlier module only ever needed to look at *one* character ahead
(`peek()`). This module is the first to need multi-character lookahead —
checking whether the next several characters spell `"--"`, `"DOCTYPE"`, or
`"[CDATA["` without committing to consuming them until a full match is
confirmed. `matchCaseInsensitive` and `matchLiteral` are thin wrappers
around `peekString` that exist mostly for readability at the call site —
`this.matchCaseInsensitive('DOCTYPE')` reads as an assertion, not a string
manipulation.

## `markupDeclarationOpenState`

Three lookaheads, checked in a fixed order, each independent of the
others:

```js
if (this.matchLiteral('--')) { ... }
if (this.matchCaseInsensitive('DOCTYPE')) { ... }
if (this.matchLiteral('[CDATA[')) { ... }
```

Notice the manual `for` loops that consume exactly as many characters as
each keyword's length, rather than a single `consume()` call — multi-
character lookahead needs multi-character consumption once it's confirmed,
which is genuinely new; every earlier state consumed at most one character
before deciding what to do.

## `bogusCommentState`

Structurally similar to `tagNameState` (Module 9) but with one real
difference worth sitting with: EOF here **emits the comment token**, where
`tagNameState`'s EOF discards the in-progress tag entirely. Same shape of
method, opposite policy — a good example of why "look for the pattern"
isn't a substitute for reading each state's own spec text.

## The `?` reconsume detail — a mistake caught by this module's own tests

Module 9's Tag Open state reconsumes the `?` character when routing to
Bogus Comment (rather than discarding it). This module is the first place
that detail becomes *observable* — and the first draft of this module's
own tests got it wrong, asserting `<?xml?>` produces comment data
`"xml?"` when the real, verified output is `"?xml?"` (leading `?`
included). The tests were corrected after running them and seeing the
actual output, not by re-deriving the answer from memory a second time —
exactly the "verify before documenting" discipline this course is built
around.

## Try it yourself

Change `matchCaseInsensitive('DOCTYPE')` to `matchLiteral('DOCTYPE')`.
Rerun the tests. Verified, not guessed: exactly one test fails — the
DOCTYPE case-insensitivity check — while all 11 others stay green. Before
running it, predict why swapping just this one call is enough to break
that test without touching anything else in the file.
