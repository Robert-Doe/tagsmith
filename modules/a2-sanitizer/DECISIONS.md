# Module A2 — DECISIONS.md

## (a) Forced by the tokenization spec (via Module A1's tree)

- **A `<script>` element can only be correctly identified as "the whole
  span from this start tag to its matching appropriate end tag" by
  actually tokenizing in `SCRIPT_DATA` mode.** Everything inside that
  span — stray `<`, `>`, comment-looking `<!--`, nested-looking
  `<script>` text — is text, per Modules 6–8, precisely because the
  tokenizer is in a mode where those characters aren't special. A
  sanitizer that wants to remove "the script and nothing but the script"
  has no choice but to ask the same question the tokenizer already
  answers correctly: where does this element's content actually end?
- **Attribute values are already fully decoded and boundary-correct by
  the time they reach this module** (Modules 10–11: quoted/unquoted
  value parsing, character references inside attribute values, the
  ambiguous-ampersand exception). Checking `attr.value` for a
  `javascript:` prefix here is checking the *real*, fully-resolved
  value — not a raw, possibly-still-encoded substring of the source.

## (b) Forced by an external contract

- **Which attribute names count as "event handlers" (`on*`) and which
  URL-bearing attributes matter (`href`, `src`) is a fact about HTML's
  own vocabulary and how real browsers execute script — not a tokenizer
  fact.** This course treats "these categories are dangerous" as an
  external, security-domain contract, the same way Module A1 treated the
  RCDATA/RAWTEXT tag-name table as coming from the (separate) tree
  construction spec.
- **Dropping a disallowed element removes its entire subtree, not just
  its tags ("unwrapping" it into its content).** This is forced by what
  `<script>` content *means*: unwrapping `<script>alert(1)</script>`
  into bare text `alert(1)` would still be safe as inert page text, but
  this course's `DROPPED_ELEMENTS` policy removes the content too,
  because a real sanitizer generally cannot assume every possible
  dangerous element's content is safe once de-tagged (some elements'
  content is meaningful in other injection contexts). Documented as a
  deliberate, conservative policy choice, not a tokenizer requirement.

## (c) Our convention

- **The dangerous-attribute and dangerous-element lists are small and
  illustrative** (`script` only; `on*` prefix; `href`/`src` with a
  `javascript:` scheme), not a complete real-world sanitizer policy. Real
  sanitizers also worry about `style` attributes/elements, `iframe`,
  `object`/`embed`, `data:` URLs, SVG/MathML foreign content, and more.
  This module's job is to prove the tokenizer-vs-regex correctness gap
  with real, verified examples — not to ship a production allowlist.
- **`sanitize()` always returns a serialized HTML *string*, not a tree.**
  A tree-returning API would be more flexible, but a string is the
  natural "drop-in replacement for a regex-based sanitizer" shape, which
  is exactly the comparison this module needs to make honestly.
- **`NaiveRegexSanitizer` is real, working code, not a strawman written
  to fail.** `/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi` is a reasonable,
  realistic first attempt — it correctly handles the ordinary case
  (`<script>alert(1)</script>` surrounded by normal text) identically to
  the real sanitizer. Its failure on the RCDATA case isn't a rigged
  demo; it's what actually happens when you pattern-match HTML instead
  of tokenizing it, using an unremarkable, representative regex.

## A real discovery, inherited from Module A1

This module's central proof — `<title><script>alert(1)</script></title>`
must come out with its title text completely intact, because
`</script>` is not an appropriate end tag inside `<title>`'s RCDATA — is
the *exact* scenario that surfaced a real, previously-undiscovered
JavaScript-only bug in this course's own `Tokenizer.js` while this
module was being built (full root cause, fix, and the Java/JS language
difference behind it: Module A1's `DECISIONS.md`). Module A2 didn't just
inherit that fix; it's the reason the fix has a real consumer that
depends on it being correct — this module's own `<title>`/`<script>`
test would have failed (loudly, both languages) had the fix not already
landed in A1's `Tokenizer.js` before A2 copied it forward.

## What We Proved

- **A real `<script>` element is removed entirely — content and all —
  with zero leakage** of its text into the sanitized output, in both
  languages, verified by direct string equality and a substring check.
- **Event-handler attributes and `javascript:` URLs are stripped while
  every other attribute on the same element survives untouched** —
  proving attribute-level filtering doesn't require throwing away the
  whole element.
- **The predicted regex-vs-tokenizer divergence is real, not
  hypothetical**: on the exact same input, this course's tokenizer-based
  `sanitize()` correctly preserves legitimate `<title>` text containing
  the literal substring `<script>...</script>`, while a realistic,
  representative regex-based sanitizer silently deletes that real page
  content. Both outputs were captured from real runs and asserted to be
  unequal, not merely described.
