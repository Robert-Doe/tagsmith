# Module 4 — DECISIONS.md

## (a) Forced by the spec

- **A numeric reference of 0 becomes U+FFFD, not NUL.** Unlike Data
  state's own NUL handling (Module 3, which emits NUL literally per that
  spec snapshot), `&#0;` is explicitly special-cased in the character
  reference algorithm itself to produce U+FFFD REPLACEMENT CHARACTER. These
  are two different rules from two different parts of the same spec,
  producing two different outcomes for what looks like "the same"
  character — a genuinely easy pair to conflate, and a good exam question.
- **Codepoints above U+10FFFF and surrogate codepoints (U+D800–U+DFFF)
  both become U+FFFD.** Neither is a valid standalone Unicode scalar
  value — a surrogate code point only means something as half of a pair,
  never on its own — so the spec defines both as parse errors mapping to
  the same replacement.
- **The Windows-1252-range table (0x80–0x9F) is a fixed, specific
  substitution table**, not a general "C1 controls are invalid" rule. It
  exists for historical compatibility: numeric character references in
  that range were extremely common in real-world HTML written against
  Windows-1252-encoded source, using this table to determine what the
  author actually meant even inside a supposedly Unicode-based document.
- **A missing semicolon is a parse error but the reference still decodes.**
  Both named and numeric references support this.
- **A named reference lookup uses longest-match, not first-match.** This is
  necessary for the real ~2000-entry spec table, which contains many
  genuinely overlapping prefixes (e.g., some names are prefixes of others).
  Not deeply exercised by this course's small subset, but the algorithm is
  built correctly regardless — see Module 11 for where this genuinely
  matters at scale.

## (b) Forced by an external contract

- **`CharacterToken.data` must be able to hold a full code point (1–2
  UTF-16 code units), not just one code unit.** This isn't stated
  explicitly by the tokenization spec as a data-structure requirement —
  it's forced by the *combination* of two spec facts: numeric character
  references can reference any code point up to U+10FFFF (an external,
  Unicode-standard contract this spec inherits, not invents), and this
  course's own Module 1 decision that a Character token = "one character."
  Module 1's `DECISIONS.md` flagged this as a documented simplification
  precisely because this contract was already known to be coming.

## (c) Our convention

- **The named-reference table is a ~25-entry documented subset**, not the
  real spec's ~2000+ entries. A production tokenizer needs the full table;
  a course proving the *algorithm* (longest-match, semicolon handling,
  fallback-to-literal) does not need every entry to prove the mechanism
  works. Extending the table later requires zero algorithm changes — see
  each language's "Try it yourself."
- **Only `amp`, `lt`, `gt`, and `quot` model the legacy no-semicolon form**;
  the real table permits this for a larger specific set. Chosen because
  these four are the ones every HTML author has actually encountered.
- **The full "disallowed character reference" parse-error enumeration is
  not exhaustively implemented** — only the four cases that change *output*
  (NUL, out-of-range, surrogate, Windows-1252) are. The remainder of the
  spec's disallowed list affects only whether an additional parse error is
  logged for an otherwise-unchanged output, which doesn't change what a
  downstream consumer of the token stream ever sees.
- **`peek()` returns a boxed/nullable type** (`undefined` in JS,
  `Character` in Java) rather than a sentinel character value, specifically
  to avoid the exact bug class the NUL-vs-space confusion in Module 3
  demonstrated: a sentinel that is itself a valid character value is a
  trap waiting to be mistaken for real input.

## Decisions We Made

| # | Decision | Category |
|---|---|---|
| 1 | `&#0;` → U+FFFD (differs from Data state's own NUL rule) | (a) forced by spec |
| 2 | Out-of-range / surrogate codepoints → U+FFFD | (a) forced by spec |
| 3 | Windows-1252 legacy substitution table | (a) forced by spec |
| 4 | Missing semicolon is a parse error, not a failure | (a) forced by spec |
| 5 | Named-reference matching is longest-match | (a) forced by spec |
| 6 | `CharacterToken.data` holds a full code point (1–2 code units) | (b) external contract (Unicode) |
| 7 | ~25-entry named-reference subset, not the full table | (c) convention — documented scope cut |
| 8 | Only 4 names get the legacy no-semicolon form | (c) convention — documented scope cut |
| 9 | Only output-changing disallowed-reference cases implemented | (c) convention — documented scope cut |
| 10 | `peek()` returns nullable, not a sentinel character | (c) convention — avoids a known bug class |

## What We Proved

- The shared "consume a character reference" algorithm works correctly
  from more than one calling state (`CHARACTER_REFERENCE_IN_DATA` and
  `CHARACTER_REFERENCE_IN_RCDATA`), verified by directly forcing the
  RCDATA-flavored state before RCDATA itself exists — proof the algorithm
  is genuinely state-independent, not accidentally coupled to Data state.
- Numeric references correctly produce astral code points as real
  surrogate pairs in JavaScript, and — the harder case — Java's
  `CharacterToken` correctly evolved from a `char`-based design that
  literally could not represent this, to a `String`-based one that can,
  without breaking any single-character call site.
- All four output-changing special cases in numeric reference resolution
  (NUL, out-of-range, surrogate, Windows-1252) are independently verified
  against real, run output — not asserted from memory of the spec text.
- A named reference lookup failure correctly backtracks to leave every
  character available for literal, character-by-character tokenizing —
  proving the "no match" path doesn't lose or corrupt input.
