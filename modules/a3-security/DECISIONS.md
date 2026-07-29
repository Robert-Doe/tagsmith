# Module A3 — DECISIONS.md

## (a) Forced by the spec

- **A context element determines the tokenizer's *initial* state before
  fragment parsing begins.** This is a real, distinct rule from the
  HTML5 fragment-parsing algorithm (used by `Element.innerHTML =`),
  separate from — and not reducible to — Module A1's mechanism (which
  switches state mid-stream, the instant a matching start tag is
  tokenized). The same tag-name table applies in both cases (RCDATA for
  `textarea`/`title`, RAWTEXT for `style`/`xmp`, `SCRIPT_DATA` for
  `script`, `PLAINTEXT` for `plaintext`), but *when* it gets consulted —
  upfront vs. mid-stream — is genuinely a different spec mechanism, and
  this module is the first place this course models the upfront one.
- **Nothing in the tokenizer's per-character logic changes between a
  "real" document parse and a fragment parse.** `TreeBuilder`'s new
  `contextTagName` constructor parameter only changes the tokenizer's
  starting `state` and `lastStartTagName` — every state transition rule
  built in Modules 1–16 runs completely unmodified. This is direct,
  concrete evidence that Track 1's tokenizer really is a general-purpose
  engine, not something implicitly coupled to "parsing a whole document
  from scratch."

## (b) Forced by an external contract — verified against a real, live browser

The core claim of this module — that identical text can be inert in one
parsing context and a live, dangerous element in another — was verified
directly against a real browser DOM in this course-building session
(`mcp__Claude_Browser__javascript_tool`), not simulated:

```js
const payload = '<img src=x onerror=alert(1)>';

const ta = document.createElement('textarea');
ta.innerHTML = payload;
const capturedText = ta.value;               // "<img src=x onerror=alert(1)>"

const div1 = document.createElement('div');
div1.innerHTML = payload;                     // div1.querySelector('img') !== null  -> true

const div2 = document.createElement('div');
div2.innerHTML = capturedText;                // div2.querySelector('img') !== null  -> true
```

**Real, transcribed result:**
```json
{
  "capturedText": "<img src=x onerror=alert(1)>",
  "div1HasRealImg": true,
  "div1InnerHTML": "<img src=\"x\" onerror=\"alert(1)\">",
  "div2HasRealImg": true,
  "div2InnerHTML": "<img src=\"x\" onerror=\"alert(1)\">"
}
```

This course's `TreeBuilder(payload, 'textarea')` and
`TreeBuilder(payload, 'div')` reproduce `capturedText` and
`div1HasRealImg` exactly (see `js/test.js`/`TokenizerTest.java`). The
critical third measurement — `div2`, built from the *already-captured*
text, not the original payload — is what actually proves the mutation
mechanism: nothing about the string changed between being read out of
`ta.value` and being written into `div2.innerHTML`; only the parsing
*context* changed, and that alone was enough to turn inert text back
into a live, executing element.

## (c) Our convention

- **This module reuses `innerHTML`'s real context-element table rather
  than inventing a new one** — the exact same `RCDATA_ELEMENTS` /
  `RAWTEXT_ELEMENTS` sets Module A1 already built for mid-stream
  switching are reused here for upfront context selection, via a small
  shared `contextInitialState()` function. Two spec mechanisms, one
  shared piece of data — not a coincidence, but not merging them into
  one function either, since *when* the table gets consulted is a real,
  meaningful difference worth keeping visibly separate in the code.
- **The `PAYLOAD` chosen (`<img src=x onerror=alert(1)>`) uses an
  unquoted attribute value and an image tag specifically because both
  are ordinary, unremarkable HTML** — no escaping tricks, no malformed
  markup, nothing that depends on a tokenizer quirk. The entire point is
  that *completely ordinary* markup is what becomes dangerous purely by
  virtue of parsing context — a deliberately unglamorous, maximally
  convincing choice of example.
- **This module does not attempt to "fix" the mutation-XSS mechanism** —
  unlike Modules A1 and A2, which each closed a real gap, A3's job is to
  demonstrate that this specific class of bug is a structural consequence
  of context-sensitive parsing itself, not a bug in any one
  implementation. The real mitigation (never re-insert previously-parsed
  text into a new context without re-sanitizing it *in that new
  context*) is an application-design discipline, not something a
  tokenizer or even a sanitizer can enforce unilaterally — Module A2's
  `sanitize()`, if its own output were later assigned to a different
  element's `innerHTML` without re-sanitizing, would be exactly as
  exposed to this mechanism as the naive example here.

## What We Proved

- **The same tag-name-to-state table Module A1 built for mid-stream
  switching also governs upfront, context-driven fragment parsing** —
  one small, shared piece of data, two genuinely different moments it
  gets applied.
- **A completely ordinary payload, containing no tokenizer-specific
  tricks, is provably inert in an RCDATA/RAWTEXT/script-data context and
  provably live in a DATA context** — verified via direct assertions on
  real parsed attribute lists, not just "didn't crash."
- **The core mutation-XSS mechanism — text captured as safe in one
  context becoming a live, dangerous element when reused in another — is
  real, not hypothetical**, confirmed independently in this course's own
  tokenizer (both languages) *and* against an actual, live browser DOM in
  the same session. All three sources agree exactly, closing this
  course's loop from spec text, to a hand-built implementation, to a
  real, named, documented class of web security bug.
