# Module 14 — JavaScript Code Walkthrough

`State.js`, `Preprocess.js`, and `CharacterReference.js` are unchanged.
`Token.js` needed no changes — `DoctypeToken`'s four fields were fully
defined back in Module 1. `Tokenizer.js` gains sixteen new methods, three
shared helpers, and this module's real engineering decision: when to
factor and when not to.

## Three helpers, not one mega-helper

`emitDoctype()` is trivial. `doctypeEofForceQuirks()` collapses what would
otherwise be five identical lines repeated roughly ten times — every
DOCTYPE state's EOF branch does exactly the same thing. `doctypeIdentifierQuotedState`
does the heaviest lifting: it's the one place four states (public/system ×
double/single-quote) really are the same shape, parametrized by
`fieldName` (using JS's ability to index an object property by a string
variable, `this.currentToken[fieldName] += c`).

Everything else — twelve states — is written directly, even though many
look superficially similar ("before X identifier," "after Y keyword").
Compare `beforeDoctypePublicIdentifierState` and
`afterDoctypePublicKeywordState` side by side: both end up in the same two
places on a quote character, but one ignores whitespace and stays, the
other switches state on whitespace; one reports
`missing-whitespace-after-doctype-public-keyword` on a quote, the other
reports nothing. Small, real differences — exactly the kind this course
has repeatedly chosen not to paper over with an over-general helper.

## `afterDoctypeNameState`'s un-consume-then-lookahead

```js
this.pos -= 1; // un-consume for the 6-char lookahead
if (this.matchCaseInsensitive('PUBLIC')) { ... }
```

This state has to consume one character to check the simple cases (`>`,
whitespace, EOF) before it knows it needs a 6-character lookahead for
`PUBLIC`/`SYSTEM` — so it consumes, checks the easy cases, and backs up by
one before trying `matchCaseInsensitive`, which itself calls `peekString`
without any further consumption. The same "consume-then-back-up-for-
lookahead" trick Module 12 used for detecting `--`/`DOCTYPE`/`[CDATA[`.

## The one asymmetric decision: `afterDoctypeSystemIdentifierState`

Every other "this wasn't valid, fall back to bogus doctype" branch in this
module sets `forceQuirks = true`. This one specifically doesn't — see
DECISIONS.md for why trailing garbage *after* a complete, validly-quoted
identifier is treated differently from a missing or malformed one.

## Try it yourself

In `afterDoctypeSystemIdentifierState`, add `this.currentToken.forceQuirks
= true;` right before the `reportParseError` call (making it match every
other bogus-doctype fallback). Rerun the tests — exactly one test flips,
and it's the one built specifically to guard this asymmetry.
